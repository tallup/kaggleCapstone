<?php

namespace App\Observers;

use App\Models\FireDrill;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;

class FireDrillObserver
{
    /**
     * Handle the FireDrill "created" event.
     */
    public function created(FireDrill $fireDrill): void
    {
        // Only create notification for scheduled drills
        if ($fireDrill->status !== 'scheduled') {
            return;
        }

        // Load relationships
        $fireDrill->load(['branch', 'createdBy']);

        // Get all staff in the branch and admins
        $users = User::where(function($query) use ($fireDrill) {
            $query->where('assigned_branch_id', $fireDrill->branch_id)
                ->orWhereIn('role', ['administrator', 'admin', 'manager', 'super_admin']);
        })
        ->where('is_active', true)
        ->get();

        foreach ($users as $user) {
            $drillDate = Carbon::parse($fireDrill->scheduled_date)->format('M d, Y');
            $drillTime = $fireDrill->scheduled_time ? Carbon::parse($fireDrill->scheduled_time)->format('g:i A') : 'TBD';
            
            Notification::create([
                'user_id' => $user->id,
                'facility_id' => $fireDrill->branch?->facility_id ?? null,
                'branch_id' => $fireDrill->branch_id ?? null,
                'type' => 'fire_drill_scheduled',
                'title' => 'Fire Drill Scheduled',
                'message' => "Fire drill scheduled for {$fireDrill->branch->name} on {$drillDate} at {$drillTime}",
                'icon' => 'alert-triangle',
                'icon_color' => 'text-orange-600',
                'action_url' => '/fire-drills',
                'metadata' => [
                    'fire_drill_id' => $fireDrill->id,
                    'branch_id' => $fireDrill->branch_id,
                    'scheduled_date' => $fireDrill->scheduled_date->toDateString(),
                ],
            ]);
        }

        // Send email notifications
        $notificationService = app(NotificationService::class);
        $notificationService->sendFireDrillEmail($fireDrill, $users);
    }

    /**
     * Handle the FireDrill "updated" event.
     */
    public function updated(FireDrill $fireDrill): void
    {
        //
    }

    /**
     * Handle the FireDrill "deleted" event.
     */
    public function deleted(FireDrill $fireDrill): void
    {
        //
    }

    /**
     * Handle the FireDrill "restored" event.
     */
    public function restored(FireDrill $fireDrill): void
    {
        //
    }

    /**
     * Handle the FireDrill "force deleted" event.
     */
    public function forceDeleted(FireDrill $fireDrill): void
    {
        //
    }
}
