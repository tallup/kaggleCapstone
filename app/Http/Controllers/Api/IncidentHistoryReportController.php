<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\Incident;
use App\Models\Resident;
use App\Models\User;
use App\Services\PremiumReportService;
use App\Support\ReportBranding;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class IncidentHistoryReportController extends Controller
{
    private const DEFAULT_LOOKBACK_DAYS = 365;

    private const MAX_ROWS = 200;

    public function __construct(
        private PremiumReportService $premiumReportService
    ) {}

    public function __invoke(Request $request, Resident $resident): JsonResponse|Response
    {
        $user = $request->user();
        if ($this->isCaregiver($user)) {
            $branchId = (int) ($user->assigned_branch_id ?? 0);
            if ($branchId === 0 || (int) $resident->branch_id !== $branchId) {
                return response()->json([
                    'message' => 'You do not have access to this resident.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'date_from' => 'nullable|date_format:Y-m-d|required_with:date_to',
            'date_to' => 'nullable|date_format:Y-m-d|required_with:date_from|after_or_equal:date_from',
        ]);

        $tz = config('app.timezone');
        if (! empty($validated['date_from']) && ! empty($validated['date_to'])) {
            $dateFrom = Carbon::createFromFormat('Y-m-d', $validated['date_from'], $tz)->startOfDay();
            $dateTo = Carbon::createFromFormat('Y-m-d', $validated['date_to'], $tz)->endOfDay();
            $rangeLabel = $dateFrom->format('M d, Y').' - '.$dateTo->format('M d, Y');
        } else {
            $dateTo = Carbon::now($tz)->endOfDay();
            $dateFrom = Carbon::now($tz)->subDays(self::DEFAULT_LOOKBACK_DAYS)->startOfDay();
            $rangeLabel = 'Last '.self::DEFAULT_LOOKBACK_DAYS.' days (default)';
        }

        try {
            $resident->load(['branch.facility']);

            $incidents = Incident::query()
                ->where('resident_id', $resident->id)
                ->whereBetween('incident_date', [$dateFrom, $dateTo])
                ->with(['branch', 'reportedBy', 'assignedTo', 'resolvedBy'])
                ->orderByDesc('incident_date')
                ->limit(self::MAX_ROWS)
                ->get();

            $facility = $resident->branch?->facility ?? Facility::first();
            $branding = ReportBranding::palette($facility);

            $rows = [];
            foreach ($incidents as $incident) {
                $rows[] = [
                    'number' => $incident->incident_number ?? '#'.$incident->id,
                    'datetime' => $incident->incident_date
                        ? $incident->incident_date->timezone($tz)->format('M j, Y g:i A')
                        : '—',
                    'type' => $incident->incident_type ?? '—',
                    'severity' => $incident->severity ?? '—',
                    'priority' => $incident->priority ?? '—',
                    'status' => $incident->status ?? '—',
                    'location' => $incident->location ?? '—',
                    'description' => $this->truncate((string) ($incident->description ?? ''), 280),
                    'action_taken' => $this->truncate((string) ($incident->action_taken ?? ''), 200),
                    'follow_up' => $this->truncate((string) ($incident->follow_up ?? ''), 200),
                    'reported_by' => $this->userDisplayName($incident->reportedBy),
                    'assigned_to' => $this->userDisplayName($incident->assignedTo),
                    'resolved_at' => $incident->resolved_at
                        ? $incident->resolved_at->timezone($tz)->format('M j, Y g:i A')
                        : '—',
                ];
            }

            $viewData = [
                'reportTitle' => 'Incident History: '.$resident->name,
                'facilityName' => $facility?->name ?? 'Facility',
                'branchName' => $resident->branch?->name,
                'facilityAddress' => $facility?->address ?? $resident->branch?->address,
                'facilityLogoDataUri' => ReportBranding::imageToDataUri($facility?->logo),
                'residentName' => $resident->name,
                'residentId' => $resident->id,
                'dateOfBirth' => $resident->date_of_birth?->format('M d, Y') ?? 'N/A',
                'roomNumber' => $resident->room_number ?: $resident->room ?? 'N/A',
                'rangeLabel' => $rangeLabel,
                'exportedAt' => now($tz)->format('M d, Y g:i A T'),
                'incidents' => $rows,
                'orientation' => 'landscape',
                'pageSize' => 'A4',
                ...$branding,
            ];

            $safe = preg_replace('/[^a-zA-Z0-9_-]+/', '_', $resident->last_name ?: 'resident');
            $filename = sprintf('Incident_History_%s_%s.pdf', $safe, now()->format('Y-m-d'));

            $pdfBinary = $this->premiumReportService->generate(
                'reports.premium-resident-incidents',
                $viewData,
                $filename,
                ['orientation' => 'landscape']
            );

            return response($pdfBinary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Incident history PDF failed', [
                'resident_id' => $resident->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to generate incident report.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function truncate(string $text, int $max): string
    {
        $text = trim($text);
        if ($text === '') {
            return '—';
        }
        if (mb_strlen($text) <= $max) {
            return $text;
        }

        return mb_substr($text, 0, $max).'…';
    }

    private function userDisplayName(?User $user): string
    {
        if (! $user) {
            return '—';
        }
        $first = trim((string) ($user->first_name ?? ''));
        $last = trim((string) ($user->last_name ?? ''));
        if ($first !== '' || $last !== '') {
            return trim($first.' '.$last);
        }
        $name = trim((string) ($user->name ?? ''));

        return $name !== '' ? $name : '—';
    }

    private function isCaregiver(?User $user): bool
    {
        return $user && in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse'], true);
    }
}
