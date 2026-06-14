<?php

namespace App\Observers;

use App\Models\Notification;
use App\Events\NotificationCreated;
use App\Services\PushNotificationService;

class NotificationObserver
{
    /**
     * Handle the Notification "created" event.
     */
    public function created(Notification $notification): void
    {
        // Broadcast real-time notification (in-app when tab is open)
        event(new NotificationCreated($notification));

        // Send PWA push notification (device notification when app is in background/closed)
        try {
            app(PushNotificationService::class)->sendForNotification($notification);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('[NotificationObserver] Push send failed: ' . $e->getMessage());
        }
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
