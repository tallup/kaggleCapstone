<?php

namespace App\Observers;

use App\Models\Notification;
use App\Events\NotificationCreated;

class NotificationObserver
{
    /**
     * Handle the Notification "created" event.
     */
    public function created(Notification $notification): void
    {
        // Broadcast real-time notification
        event(new NotificationCreated($notification));
    }

    /**
     * Handle the Notification "updated" event.
     */
    public function updated(Notification $notification): void
    {
        // Optionally broadcast updates (e.g., when marked as read)
        // This can be added later if needed
    }

    /**
     * Handle the Notification "deleted" event.
     */
    public function deleted(Notification $notification): void
    {
        // Optionally broadcast deletions
        // This can be added later if needed
    }
}
