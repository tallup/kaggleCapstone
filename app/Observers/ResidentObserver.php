<?php

namespace App\Observers;

use App\Models\Resident;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;

class ResidentObserver
{
    /**
     * Handle the Resident "created" event.
     */
    public function created(Resident $resident): void
    {
        // Load relationships
        $resident->load(['branch']);

        // Notify all admins/managers when a new resident is added
        $admins = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        foreach ($admins as $admin) {
            $residentName = trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? ''));
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
}


