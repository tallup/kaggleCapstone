<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medication;
use App\Models\Resident;
use App\Models\User;
use App\Services\MedicationLogReportService;
use App\Services\PremiumReportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class MedicationLogReportController extends Controller
{
    public function __construct(
        private MedicationLogReportService $medicationLogReportService,
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

        // Note: do not use the strict `boolean` rule on query strings — browsers and proxies send
        // values like "on", "true", 1/0, etc. Use $request->boolean() when reading flags.
        $validated = $request->validate([
            'date_from' => 'required|date_format:Y-m-d',
            'date_to' => 'required|date_format:Y-m-d|after_or_equal:date_from',
            'orientation' => 'sometimes|in:portrait,landscape',
            'medication_ids' => 'sometimes|array',
            'medication_ids.*' => 'integer|min:1',
            'administration_outcomes' => 'sometimes|in:all,taken,missed',
        ]);

        if (! $request->boolean('include_scheduled', true) && ! $request->boolean('include_prn', true)) {
            return response()->json([
                'message' => 'Select at least one of scheduled medications or PRN for the MAR.',
            ], 422);
        }

        $medicationIds = null;
        if (! empty($validated['medication_ids'])) {
            $requested = array_values(array_unique(array_map('intval', $validated['medication_ids'])));
            $validCount = Medication::withoutGlobalScopes()
                ->where('resident_id', $resident->id)
                ->whereIn('id', $requested)
                ->count();
            if ($validCount !== count($requested)) {
                return response()->json([
                    'message' => 'One or more selected medications are not valid for this resident.',
                ], 422);
            }
            $medicationIds = $requested;
        }

        $tz = config('app.timezone');
        $dateFrom = Carbon::createFromFormat('Y-m-d', $validated['date_from'], $tz)->startOfDay();
        $dateTo = Carbon::createFromFormat('Y-m-d', $validated['date_to'], $tz)->endOfDay();

        $serviceOptions = [
            'include_scheduled' => $request->boolean('include_scheduled', true),
            'include_prn' => $request->boolean('include_prn', true),
            'include_resident_card' => $request->boolean('include_resident_card', true),
            'include_legend' => $request->boolean('include_legend', true),
            'include_prn_admin_notes' => $request->boolean('include_prn_admin_notes', true),
            'medication_ids' => $medicationIds,
            'administration_outcomes' => $validated['administration_outcomes'] ?? 'all',
        ];

        $orientation = $validated['orientation'] ?? 'landscape';

        try {
            $data = $this->medicationLogReportService->buildViewData($resident, $dateFrom, $dateTo, $serviceOptions);
            $data['pdfOrientation'] = $orientation;

            $safeName = preg_replace('/[^a-zA-Z0-9_-]+/', '_', $resident->last_name ?: 'resident');
            $filename = sprintf(
                'Premium_Medication_Log_%s_%s_%s.pdf',
                $validated['date_from'],
                $validated['date_to'],
                $safeName
            );

            $pdfBinary = $this->premiumReportService->generate(
                'reports.premium-medication-log',
                $data,
                $filename,
                ['orientation' => $orientation]
            );

            return response($pdfBinary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.$filename.'"',
            ]);
        } catch (\Throwable $e) {
            Log::error('Premium Medication Log generation failed', [
                'resident_id' => $resident->id,
                'date_from' => $validated['date_from'],
                'date_to' => $validated['date_to'],
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to generate report.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function isCaregiver(?User $user): bool
    {
        return $user && in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse'], true);
    }
}
