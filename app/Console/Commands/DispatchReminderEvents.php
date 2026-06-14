<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\ReminderEvent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DispatchReminderEvents extends Command
{
    protected $signature = 'reminders:dispatch {--batch=100 : Max events to process per run}';

    protected $description = 'Dispatch due reminders as in-app notifications (email hook-ready).';

    public function handle(): int
    {
        $batch = max(1, min(500, (int) $this->option('batch')));

        $dueEvents = ReminderEvent::with('reminder')
            ->whereIn('status', ['pending', 'snoozed'])
            ->where(function ($q) {
                $q->whereNull('snoozed_until')->orWhere('snoozed_until', '<=', now());
            })
            ->where('scheduled_for', '<=', now())
            ->orderBy('scheduled_for')
            ->limit($batch)
            ->get();

        $this->info("Dispatching {$dueEvents->count()} reminder events");

        foreach ($dueEvents as $event) {
            $reminder = $event->reminder;

            if (! $reminder || $reminder->status !== 'active') {
                $event->update(['status' => 'cancelled']);

                continue;
            }

            try {
                DB::transaction(function () use ($event): void {
                    $lockedEvent = ReminderEvent::query()
                        ->whereKey($event->id)
                        ->lockForUpdate()
                        ->first();

                    if (! $lockedEvent || ! in_array($lockedEvent->status, ['pending', 'snoozed'], true)) {
                        return;
                    }

                    $lockedEvent->loadMissing('reminder');
                    $reminder = $lockedEvent->reminder;

                    if (! $reminder || $reminder->status !== 'active') {
                        $lockedEvent->update(['status' => 'cancelled']);

                        return;
                    }

                    if (! $this->notificationAlreadyDispatched($lockedEvent)) {
                        $this->dispatchInAppNotification($lockedEvent);
                    }

                    $lockedEvent->update([
                        'status' => 'delivered',
                        'delivered_at' => $lockedEvent->delivered_at ?? now(),
                    ]);
                });
            } catch (\Throwable $e) {
                $event->refresh()->update([
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                ]);

                Log::error('Failed to dispatch reminder event', [
                    'event_id' => $event->id,
                    'reminder_id' => $reminder->id ?? null,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return Command::SUCCESS;
    }

    private function notificationAlreadyDispatched(ReminderEvent $event): bool
    {
        $reminder = $event->reminder;

        if (! $reminder) {
            return false;
        }

        return Notification::query()
            ->where('user_id', $reminder->user_id)
            ->where('type', 'reminder')
            ->where('metadata->reminder_event_id', $event->id)
            ->exists();
    }

    private function dispatchInAppNotification(ReminderEvent $event): void
    {
        $reminder = $event->reminder;

        Notification::create([
            'user_id' => $reminder->user_id,
            'type' => 'reminder',
            'title' => $reminder->title,
            'message' => $this->buildMessage($reminder->category, $event),
            'icon' => 'clock',
            'icon_color' => 'info',
            'is_read' => false,
            'action_url' => $reminder->action_url,
            'metadata' => [
                'reminder_id' => $reminder->id,
                'reminder_event_id' => $event->id,
                'category' => $reminder->category,
                'scheduled_for' => $event->scheduled_for,
                'facility_id' => $reminder->facility_id,
                ...($reminder->metadata ?? []),
            ],
        ]);
    }

    private function buildMessage(?string $category, ReminderEvent $event): string
    {
        $when = $event->scheduled_for?->format('M j, g:ia');
        $category = $category ?: 'reminder';

        return ucfirst($category).' due '.($when ?? 'soon');
    }
}
