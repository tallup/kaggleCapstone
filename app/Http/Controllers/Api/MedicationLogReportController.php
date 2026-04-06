<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\User;
use App\Services\MedicationLogReportService;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MedicationLogReportController extends Controller
{
    public function __construct(
        private MedicationLogReportService $medicationLogReportService
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
            'date_from' => 'required|date_format:Y-m-d',
            'date_to' => 'required|date_format:Y-m-d|after_or_equal:date_from',
        ]);

        $tz = config('app.timezone');
        $dateFrom = Carbon::createFromFormat('Y-m-d', $validated['date_from'], $tz)->startOfDay();
        $dateTo = Carbon::createFromFormat('Y-m-d', $validated['date_to'], $tz)->endOfDay();

        $data = $this->medicationLogReportService->buildViewData($resident, $dateFrom, $dateTo);

        $safeName = preg_replace('/[^a-zA-Z0-9_-]+/', '_', $resident->last_name ?: 'resident');
        $filename = sprintf(
            'Medication_Log_%s_%s_%s.pdf',
            $validated['date_from'],
            $validated['date_to'],
            $safeName
        );

        $pdf = Pdf::loadView('reports.medication-log', $data)
            ->setPaper('letter', 'landscape')
            ->setOption('isRemoteEnabled', true);

        return $pdf->download($filename);
    }

    private function isCaregiver(?User $user): bool
    {
        return $user && in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse'], true);
    }
}
