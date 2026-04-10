<?php

namespace App\Observers;

use App\Models\Facility;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;

class FacilityObserver
{
    /**
     * Handle the Facility "created" event.
     */
    public function created(Facility $facility): void
    {
        // Notify all admins/managers when a new facility is added
        $admins = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        foreach ($admins as $admin) {
            $facilityName = $facility->name ?? 'New Facility';
            $location = $facility->location ?? 'Unknown Location';
            
            Notification::create([
                'user_id' => $admin->id,
                'facility_id' => $facility->facility_id ?? null,
                'branch_id' => $facility->branch_id ?? $facility->assigned_branch_id ?? null,
                'type' => 'facility_created',
                'title' => 'New Facility Added',
                'message' => "A new facility, {$facilityName}, has been added in {$location}",
                'icon' => 'calendar',
                'icon_color' => 'text-[#25603E]',
                'action_url' => '/administration/facilities',
                'metadata' => [
                    'facility_id' => $facility->id,
                ],
            ]);
        }
    }
}

