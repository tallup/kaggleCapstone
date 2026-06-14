<?php

namespace App\Observers;

use App\Models\Branch;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;

class BranchObserver
{
    /**
     * Handle the Branch "created" event.
     */
    public function created(Branch $branch): void
    {
        // Load relationships
        $branch->load(['facility']);

        // Notify all admins/managers when a new branch is added
        $admins = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        foreach ($admins as $admin) {
            $branchName = $branch->name ?? 'New Branch';
            $facilityName = $branch->facility?->name ?? 'Unknown Facility';
            
            Notification::create([
                'user_id' => $admin->id,
                'facility_id' => $branch->facility_id ?? null,
                'branch_id' => $branch->branch_id ?? $branch->assigned_branch_id ?? null,
                'type' => 'branch_created',
                'title' => 'New Branch Added',
                'message' => "A new branch, {$branchName}, has been added to {$facilityName}",
                'icon' => 'calendar',
                'icon_color' => 'text-[#25603E]',
                'action_url' => '/administration/branches',
                'metadata' => [
                    'branch_id' => $branch->id,
                    'facility_id' => $branch->facility_id,
                ],
            ]);
        }
    }
}

