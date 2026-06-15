<?php

namespace App\Observers;

use App\Models\Notification;
use App\Models\Resident;
use App\Models\User;
use App\Services\DashboardService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ResidentObserver
{
    /**
     * Handle the Resident "created" event.
     */
    public function created(Resident $resident): void
    {
        $this->clearDashboardCache($resident);

        // Load relationships
        $resident->load(['branch']);

        // Notify all admins/managers when a new resident is added
        $admins = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        foreach ($admins as $admin) {
            $residentName = trim(($resident->first_name ?? '').' '.($resident->last_name ?? ''));
            $branchName = $resident->branch?->name ?? 'Unknown Branch';
            $admissionDate = $resident->admission_date ? Carbon::parse($resident->admission_date)->format('M d, Y') : 'TBD';

            // Get facility_id from branch
            $facilityId = $resident->branch?->facility_id ?? null;

            Notification::create([
                'user_id' => $admin->id,
                'facility_id' => $resident->facility_id ?? null,
                'branch_id' => $resident->branch_id ?? $resident->assigned_branch_id ?? null,
                'type' => 'resident_created',
                'title' => 'New Resident Added',
                'message' => "A new resident, {$residentName}, has been added to {$branchName}. Admission date: {$admissionDate}",
                'icon' => 'user',
                'icon_color' => 'text-[#25603E]',
                'action_url' => '/administration/residents',
                'metadata' => [
                    'resident_id' => $resident->id,
                    'branch_id' => $resident->branch_id,
                    'facility_id' => $facilityId,
                ],
            ]);
        }
    }

    /**
     * Handle the Resident "updated" event.
     */
    public function updated(Resident $resident): void
    {
        if ($resident->wasChanged(['is_active', 'branch_id', 'status'])) {
            $this->clearDashboardCache($resident);
        }
    }

    /**
     * Handle the Resident "deleted" event.
     */
    public function deleted(Resident $resident): void
    {
        $this->clearDashboardCache($resident);
    }

    private function clearDashboardCache(Resident $resident): void
    {
        $facilityId = $resident->branch?->facility_id ?? $resident->facility_id;

        if (! $facilityId) {
            return;
        }

        try {
            app(DashboardService::class)->clearCacheForFacility($facilityId);
        } catch (\Exception $e) {
            Log::warning('ResidentObserver: Failed to clear dashboard cache', [
                'resident_id' => $resident->id,
                'facility_id' => $facilityId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
