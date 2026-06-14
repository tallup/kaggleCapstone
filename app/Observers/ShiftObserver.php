<?php

namespace App\Observers;

use App\Events\ShiftCreated;
use App\Events\ShiftUpdated;
use App\Events\ShiftDeleted;
use App\Models\Notification;
use App\Models\Shift;

class ShiftObserver
{
    public function created(Shift $shift): void
    {
        $this->notifyStaff($shift, 'created', 'Your schedule was updated', 'A new shift has been assigned to you.');
    }

    public function updated(Shift $shift): void
    {
        $this->notifyStaff($shift, 'updated', 'Schedule change', 'One of your shifts has been updated.');
    }

    public function deleted(Shift $shift): void
    {
        $this->notifyStaff($shift, 'deleted', 'Shift removed', 'A shift has been removed from your schedule.');
    }

    private function notifyStaff(Shift $shift, string $action, string $title, string $message): void
    {
        $userId = $shift->user_id ?? $shift->user?->id;
        if (!$userId) {
            return;
        }
        $user = $shift->user ?? \App\Models\User::find($userId);
        if (!$user) {
            return;
        }

        $branchName = $shift->branch?->name ?? \App\Models\Branch::find($shift->branch_id)?->name ?? 'Branch';
        $start = $shift->start_at ? (is_string($shift->start_at) ? \Carbon\Carbon::parse($shift->start_at)->format('M j, Y g:i A') : $shift->start_at->format('M j, Y g:i A')) : '';
        $msg = $message . ' ' . $branchName . ($start ? ' – ' . $start : '');

        Notification::create([
            'user_id' => $userId,
            'facility_id' => $shift->branch?->facility_id ?? null,
            'branch_id' => $shift->branch_id ?? null,
            'type' => 'shift_' . $action,
            'title' => $title,
            'message' => $msg,
            'icon' => 'calendar',
            'icon_color' => 'text-blue-600',
            'action_url' => '/staff/schedule',
            'metadata' => [
                'shift_id' => $shift->id,
                'branch_id' => $shift->branch_id,
                'action' => $action,
            ],
        ]);
    }
}
