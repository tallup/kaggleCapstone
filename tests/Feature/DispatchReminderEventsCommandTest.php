<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Reminder;
use App\Models\ReminderEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class DispatchReminderEventsCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_dispatch_does_not_create_duplicate_notification_when_retrying_pending_event(): void
    {
        $user = User::factory()->create();

        $reminder = Reminder::create([
            'user_id' => $user->id,
            'title' => 'Pay invoice',
            'category' => 'bill',
            'schedule_type' => 'one_time',
            'due_at' => now()->subMinutes(5),
            'status' => 'active',
            'channel' => 'in_app',
        ]);

        $event = ReminderEvent::create([
            'reminder_id' => $reminder->id,
            'scheduled_for' => now()->subMinutes(2),
            'status' => 'pending',
            'channel' => 'in_app',
        ]);

        // Simulate a crash after the notification was created but before the event was marked delivered.
        Notification::create([
            'user_id' => $user->id,
            'type' => 'reminder',
            'title' => $reminder->title,
            'message' => 'Bill due soon',
            'icon' => 'clock',
            'icon_color' => 'info',
            'is_read' => false,
            'metadata' => [
                'reminder_id' => $reminder->id,
                'reminder_event_id' => $event->id,
            ],
        ]);

        Artisan::call('reminders:dispatch');

        $this->assertSame(1, Notification::query()
            ->where('user_id', $user->id)
            ->where('type', 'reminder')
            ->where('metadata->reminder_event_id', $event->id)
            ->count());

        $this->assertDatabaseHas('reminder_events', [
            'id' => $event->id,
            'status' => 'delivered',
        ]);
    }

    public function test_dispatch_is_idempotent_for_already_delivered_event(): void
    {
        $user = User::factory()->create();

        $reminder = Reminder::create([
            'user_id' => $user->id,
            'title' => 'Weekly check-in',
            'category' => 'appointment',
            'schedule_type' => 'one_time',
            'due_at' => now()->subHour(),
            'status' => 'active',
            'channel' => 'in_app',
        ]);

        $event = ReminderEvent::create([
            'reminder_id' => $reminder->id,
            'scheduled_for' => now()->subMinutes(30),
            'status' => 'delivered',
            'delivered_at' => now()->subMinutes(25),
            'channel' => 'in_app',
        ]);

        Notification::create([
            'user_id' => $user->id,
            'type' => 'reminder',
            'title' => $reminder->title,
            'message' => 'Appointment due',
            'icon' => 'clock',
            'icon_color' => 'info',
            'is_read' => false,
            'metadata' => [
                'reminder_id' => $reminder->id,
                'reminder_event_id' => $event->id,
            ],
        ]);

        Artisan::call('reminders:dispatch');

        $this->assertSame(1, Notification::query()
            ->where('user_id', $user->id)
            ->where('type', 'reminder')
            ->where('metadata->reminder_event_id', $event->id)
            ->count());
    }
}
