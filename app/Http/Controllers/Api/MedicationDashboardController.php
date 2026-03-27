<?php

namespace App\Http\Controllers\Api;

use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\MedicationDelivery;
use App\Models\Resident;
use App\Services\MedicationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MedicationDashboardController extends BaseApiController
{
    protected $medicationService;

    public function __construct(MedicationService $medicationService)
    {
        $this->medicationService = $medicationService;
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $now = Carbon::now(config('app.timezone'));
            $today = $now->toDateString();

            $isCaregiver = $this->isCaregiver($user);
            $branchIds = $this->resolveBranchIds($user, $isCaregiver);

            if (empty($branchIds)) {
                return response()->json([
                    'today' => ['scheduled' => 0, 'administered' => 0, 'missed' => 0, 'refused' => 0, 'adherence' => 0, 'active_medications' => 0],
                    'upcoming' => [],
                    'missed_today' => [],
                    'adherence_trend' => [],
                    'recent_activity' => [],
                    'resident_summary' => [],
                    'delivery_status' => ['today_count' => 0, 'pending_verification' => 0, 'recent' => []],
                ]);
            }

            $activeMeds = $this->getActiveMedications($branchIds, $today);

            return response()->json([
                'today' => $this->getTodayStats($branchIds, $today, $activeMeds),
                'upcoming' => $this->getUpcomingMedications($activeMeds, $now),
                'missed_today' => $this->getMissedToday($branchIds, $today),
                'adherence_trend' => $this->getAdherenceTrend($branchIds, $now),
                'recent_activity' => $this->getRecentActivity($branchIds),
                'resident_summary' => $this->getResidentSummary($branchIds, $today, $activeMeds),
                'delivery_status' => $this->getDeliveryStatus($branchIds, $today),
            ]);
        } catch (\Exception $e) {
            Log::error('Medication dashboard error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'Failed to load medication dashboard.',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error',
            ], 500);
        }
    }

    private function resolveBranchIds($user, bool $isCaregiver): array
    {
        if ($isCaregiver && $user->assigned_branch_id) {
            return [$user->assigned_branch_id];
        }

        if ($user->facility_id) {
            return $this->getFacilityBranchIds($user->facility_id);
        }

        return [];
    }

    private function getActiveMedications(array $branchIds, string $today)
    {
        return Medication::with(['resident:id,first_name,last_name', 'drug:id,name'])
            ->where('is_active', true)
            ->whereIn('branch_id', $branchIds)
            ->where('start_date', '<=', $today)
            ->where(fn ($q) => $q->whereNull('end_date')->orWhere('end_date', '>=', $today))
            ->get();
    }


    private function getTodayStats(array $branchIds, string $today, $activeMeds): array
    {
        // Use MedicationService to get status for all active medications
        $medsWithStatus = $this->medicationService->getMedicationsWithStatus($activeMeds, $today);
        
        $scheduled = 0;
        $administered = 0;
        $missed = 0;
        $refused = 0;

        foreach ($medsWithStatus as $med) {
            // Count total slots across all meds
            for ($i = 1; $i <= 4; $i++) {
                if ($med->{"time_{$i}"}) $scheduled++;
            }

            // Count completed/missed/refused from administrations
            foreach ($med->administrations as $admin) {
                if ($admin->administered_at && Carbon::parse($admin->administered_at)->toDateString() === $today) {
                    if ($admin->status === 'completed') $administered++;
                    elseif ($admin->status === 'missed') $missed++;
                    elseif ($admin->status === 'refused') $refused++;
                }
            }
        }

        $adherence = $scheduled > 0 ? round(($administered / $scheduled) * 100) : 0;

        return [
            'scheduled' => $scheduled,
            'administered' => $administered,
            'missed' => $missed,
            'refused' => $refused,
            'adherence' => min($adherence, 100),
            'active_medications' => $activeMeds->count(),
        ];
    }

    private function getUpcomingMedications($activeMeds, Carbon $now): array
    {
        $timezone = config('app.timezone');
        $cutoff = $now->copy()->addHours(4);
        
        // Use MedicationService to find soonest doses
        $medsWithStatus = $this->medicationService->getMedicationsWithStatus($activeMeds, $now->toDateString());
        
        $upcoming = [];
        foreach ($medsWithStatus as $med) {
            // MedicationService provides next_dose_at which is pre-calculated/validated
            if ($med->next_dose_at) {
                $nextDose = Carbon::parse($med->next_dose_at)->setTimezone($timezone);
                
                // Only include if it's within the 4-hour window
                if ($nextDose->gt($now) && $nextDose->lte($cutoff)) {
                    $upcoming[] = [
                        'medication_id' => $med->id,
                        'medication_name' => $med->name ?: $med->drug?->name ?? 'Unknown',
                        'resident_id' => $med->resident_id,
                        'resident_name' => $med->resident
                            ? trim($med->resident->first_name . ' ' . $med->resident->last_name)
                            : 'Unknown',
                        'scheduled_time' => $nextDose->format('g:i A'),
                        'scheduled_at' => $nextDose->toIso8601String(),
                        'instructions' => $med->instructions,
                        'minutes_until' => (int) $now->diffInMinutes($nextDose, false),
                    ];
                }
            }
        }

        usort($upcoming, fn ($a, $b) => $a['minutes_until'] - $b['minutes_until']);
        return array_slice($upcoming, 0, 15);
    }

    private function getMissedToday(array $branchIds, string $today): array
    {
        return MedicationAdministration::with([
            'medication:id,name,drug_id,instructions',
            'medication.drug:id,name',
            'resident:id,first_name,last_name',
        ])
            ->whereIn('branch_id', $branchIds)
            ->whereDate('administered_at', $today)
            ->where('status', 'missed')
            ->orderBy('administered_at', 'desc')
            ->limit(20)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'medication_name' => $a->medication?->name ?: $a->medication?->drug?->name ?? 'Unknown',
                'resident_id' => $a->resident_id,
                'resident_name' => $a->resident
                    ? trim($a->resident->first_name . ' ' . $a->resident->last_name)
                    : 'Unknown',
                'scheduled_time' => $a->administered_at
                    ? Carbon::parse($a->administered_at)->setTimezone(config('app.timezone'))->format('g:i A')
                    : null,
                'instructions' => $a->medication?->instructions,
            ])
            ->toArray();
    }

    private function getAdherenceTrend(array $branchIds, Carbon $now): array
    {
        $dateFrom = $now->copy()->subDays(6)->startOfDay();
        $dateTo = $now->copy()->endOfDay();

        $dailyData = MedicationAdministration::whereIn('branch_id', $branchIds)
            ->whereBetween('administered_at', [$dateFrom, $dateTo])
            ->selectRaw('DATE(administered_at) as date, status, count(*) as count')
            ->groupBy('date', 'status')
            ->get();

        $trend = [];
        for ($daysAgo = 6; $daysAgo >= 0; $daysAgo--) {
            $date = $now->copy()->subDays($daysAgo);
            $dateStr = $date->toDateString();

            $activeMeds = Medication::where('is_active', true)
                ->whereIn('branch_id', $branchIds)
                ->where('start_date', '<=', $dateStr)
                ->where(fn ($q) => $q->whereNull('end_date')->orWhere('end_date', '>=', $dateStr))
                ->get();

            // Use MedicationService for consistent counting
            $medsWithStatus = $this->medicationService->getMedicationsWithStatus($activeMeds, $dateStr);
            
            $scheduled = 0;
            foreach ($medsWithStatus as $med) {
                for ($i = 1; $i <= 4; $i++) {
                    if ($med->{"time_{$i}"}) $scheduled++;
                }
            }

            $dayData = $dailyData->where('date', $dateStr);
            $administered = (int) $dayData->where('status', 'completed')->sum('count');
            $missed = (int) $dayData->where('status', 'missed')->sum('count');
            $refused = (int) $dayData->where('status', 'refused')->sum('count');

            $adherence = $scheduled > 0 ? round(($administered / $scheduled) * 100) : 0;

            $trend[] = [
                'date' => $dateStr,
                'day' => $date->format('D'),
                'scheduled' => $scheduled,
                'administered' => $administered,
                'missed' => $missed,
                'refused' => $refused,
                'adherence' => min($adherence, 100),
            ];
        }

        return $trend;
    }

    private function getRecentActivity(array $branchIds): array
    {
        return MedicationAdministration::with([
            'medication:id,name,drug_id',
            'medication.drug:id,name',
            'resident:id,first_name,last_name',
            'administeredBy:id,first_name,last_name,name',
        ])
            ->whereIn('branch_id', $branchIds)
            ->orderBy('administered_at', 'desc')
            ->limit(15)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'medication_name' => $a->medication?->name ?: $a->medication?->drug?->name ?? 'Unknown',
                'resident_name' => $a->resident
                    ? trim($a->resident->first_name . ' ' . $a->resident->last_name)
                    : 'Unknown',
                'administered_by' => $a->administeredBy?->name
                    ?: trim(($a->administeredBy?->first_name ?? '') . ' ' . ($a->administeredBy?->last_name ?? ''))
                    ?: 'System',
                'status' => $a->status,
                'administered_at' => $a->administered_at,
                'dosage_given' => $a->dosage_given,
                'notes' => $a->notes,
            ])
            ->toArray();
    }

    private function getResidentSummary(array $branchIds, string $today, $activeMeds): array
    {
        $medsByResident = $activeMeds->groupBy('resident_id');

        if ($medsByResident->isEmpty()) {
            return [];
        }

        $residentIds = $medsByResident->keys()->toArray();

        $residents = Resident::whereIn('id', $residentIds)
            ->where('status', 'active')
            ->select('id', 'first_name', 'last_name')
            ->get()
            ->keyBy('id');

        // Use MedicationService for uniform status calculation per resident
        $summary = [];
        foreach ($medsByResident as $residentId => $meds) {
            $resident = $residents->get($residentId);
            if (!$resident) continue;

            $medsWithStatus = $this->medicationService->getMedicationsWithStatus($meds, $today);
            
            $scheduled = 0;
            $administered = 0;
            $missedToday = 0;

            foreach ($medsWithStatus as $med) {
                // Count slots
                for ($i = 1; $i <= 4; $i++) {
                    if ($med->{"time_{$i}"}) $scheduled++;
                }

                // Count admins from the loaded administrations
                foreach ($med->administrations as $admin) {
                    if ($admin->administered_at && Carbon::parse($admin->administered_at)->toDateString() === $today) {
                        if ($admin->status === 'completed') $administered++;
                        elseif ($admin->status === 'missed') $missedToday++;
                    }
                }
            }

            $adherence = $scheduled > 0 ? round(($administered / $scheduled) * 100) : 0;

            $summary[] = [
                'resident_id' => $residentId,
                'resident_name' => trim($resident->first_name . ' ' . $resident->last_name),
                'active_medications' => $meds->count(),
                'scheduled_today' => $scheduled,
                'administered_today' => $administered,
                'missed_today' => $missedToday,
                'adherence' => min($adherence, 100),
            ];
        }

        usort($summary, function ($a, $b) {
            if ($b['missed_today'] !== $a['missed_today']) {
                return $b['missed_today'] - $a['missed_today'];
            }
            return $a['adherence'] - $b['adherence'];
        });

        return $summary;
    }

    private function getDeliveryStatus(array $branchIds, string $today): array
    {
        $todayCount = MedicationDelivery::whereIn('branch_id', $branchIds)
            ->where('received_date', $today)
            ->count();

        $pendingVerification = MedicationDelivery::whereIn('branch_id', $branchIds)
            ->where('status', 'received')
            ->count();

        $recentDeliveries = MedicationDelivery::with([
            'resident:id,first_name,last_name',
            'receivedBy:id,first_name,last_name,name',
        ])
            ->whereIn('branch_id', $branchIds)
            ->orderBy('received_date', 'desc')
            ->orderBy('received_time', 'desc')
            ->limit(5)
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'pharmacy_name' => $d->pharmacy_name,
                'resident_name' => $d->resident
                    ? trim($d->resident->first_name . ' ' . $d->resident->last_name)
                    : 'Batch Delivery',
                'quantity' => $d->quantity_received,
                'status' => $d->status,
                'delivery_type' => $d->delivery_type,
                'received_date' => $d->received_date,
                'received_by' => $d->receivedBy?->name
                    ?: trim(($d->receivedBy?->first_name ?? '') . ' ' . ($d->receivedBy?->last_name ?? ''))
                    ?: 'Unknown',
            ])
            ->toArray();

        return [
            'today_count' => $todayCount,
            'pending_verification' => $pendingVerification,
            'recent' => $recentDeliveries,
        ];
    }
}
