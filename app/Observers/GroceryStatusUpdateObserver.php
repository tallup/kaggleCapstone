<?php

namespace App\Observers;

use App\Models\GroceryStatusUpdate;
use App\Models\Notification;
use App\Models\User;

class GroceryStatusUpdateObserver
{
    /**
     * Handle the GroceryStatusUpdate "created" event.
     */
    public function created(GroceryStatusUpdate $update): void
    {
        $update->load(['branch', 'updatedBy']);

        $facility = $update->branch?->facility ?? null;
        if (!$facility) {
            return;
        }

        // Notify admins/managers in the facility and the creator (if not already included).
        $recipients = User::where('facility_id', $facility->id)
            ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        if ($update->updatedBy && !$recipients->contains('id', $update->updated_by)) {
            $recipients->push($update->updatedBy);
        }

        $branchName = $update->branch?->name ?? 'Branch';
        $statusLabel = str_replace('_', ' ', $update->status);
        $week = $update->week_start_date;

        foreach ($recipients as $user) {
            Notification::create([
                'user_id' => $user->id,
                'type' => 'grocery_status_update',
                'title' => 'Grocery Status Updated',
                'message' => "{$branchName} updated grocery status ({$statusLabel}) for week starting {$week}.",
                'icon' => 'shopping-cart',
                'icon_color' => 'text-[var(--theme-primary)]',
                'action_url' => '/grocery-status',
                'metadata' => [
                    'grocery_status_update_id' => $update->id,
                    'branch_id' => $update->branch_id,
                    'facility_id' => $facility->id,
                    'week_start_date' => $week,
                    'status' => $update->status,
                ],
            ]);
        }
    }
}


