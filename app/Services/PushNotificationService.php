<?php

namespace App\Services;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription as WebPushSubscription;

class PushNotificationService
{
    protected ?WebPush $webPush = null;

    public function __construct()
    {
        $publicKey = config('webpush.vapid.public_key');
        $privateKey = config('webpush.vapid.private_key');
        $subject = config('webpush.vapid.subject', 'mailto:admin@' . parse_url(config('app.url'), PHP_URL_HOST));

        if ($publicKey && $privateKey) {
            $this->webPush = new WebPush([
                'VAPID' => [
                    'subject' => $subject,
                    'publicKey' => $publicKey,
                    'privateKey' => $privateKey,
                ],
            ]);
        }
    }

    /**
     * Send a push notification to a user (all their registered devices).
     */
    public function sendToUser(User $user, string $title, string $body, array $data = []): void
    {
        if (!$this->webPush) {
            Log::debug('[PushNotification] VAPID not configured, skipping push');
            return;
        }

        $subscriptions = PushSubscription::where('user_id', $user->id)->get();
        if ($subscriptions->isEmpty()) {
            Log::debug("[PushNotification] No subscriptions for user {$user->id}");
            return;
        }

        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'icon' => $data['icon'] ?? '/images/logonew.png',
            'badge' => $data['badge'] ?? '/images/logonew.png',
            'tag' => $data['tag'] ?? 'notification',
            'data' => array_merge($data['data'] ?? [], ['url' => $data['url'] ?? '/']),
        ]);

        foreach ($subscriptions as $model) {
            $this->sendToOne($model, $payload);
        }
    }

    /**
     * Send push payload for an in-app Notification model (used by observer).
     */
    public function sendForNotification(\App\Models\Notification $notification): void
    {
        $user = $notification->user;
        if (!$user) {
            return;
        }

        $actionUrl = $notification->action_url ?? '/notifications';
        $this->sendToUser($user, $notification->title, $notification->message, [
            'tag' => 'notification-' . $notification->id,
            'url' => $actionUrl,
            'data' => [
                'notificationId' => $notification->id,
                'url' => $actionUrl,
            ],
        ]);
    }

    /**
     * Send to a single subscription; remove if expired/invalid.
     */
    protected function sendToOne(PushSubscription $model, string $payload): void
    {
        try {
            $subscription = $model->toWebPushSubscription();
            $report = $this->webPush->sendOneNotification($subscription, $payload);

            if ($report->isSuccess()) {
                return;
            }

            // 404/410 = subscription expired or invalid, remove it
            $statusCode = $report->getResponse()?->getStatusCode();
            if (in_array($statusCode, [404, 410], true)) {
                $model->delete();
                Log::info("[PushNotification] Removed invalid subscription for user {$model->user_id}");
            } else {
                Log::warning("[PushNotification] Push failed for user {$model->user_id}: " . $report->getReason());
            }
        } catch (\Throwable $e) {
            Log::warning('[PushNotification] Send failed: ' . $e->getMessage(), ['subscription_id' => $model->id]);
        }
    }
}
