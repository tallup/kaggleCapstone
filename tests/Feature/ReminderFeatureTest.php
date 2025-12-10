<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Reminder;
use App\Models\ReminderEvent;
use App\Models\User;
use App\Services\ReminderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReminderFeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_one_time_reminder_and_event_is_generated(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $dueAt = now()->addHour()->toISOString();

        $response = $this->postJson('/api/v1/reminders', [
            'title' => 'Take medication',
            'category' => 'medication',
            'schedule_type' => 'one_time',
            'due_at' => $dueAt,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('reminders', ['title' => 'Take medication', 'category' => 'medication']);
        $this->assertDatabaseCount('reminder_events', 1);
    }

    public function test_dispatch_command_creates_notification_for_due_event(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $reminder = Reminder::create([
            'user_id' => $user->id,
            'title' => 'Pay invoice',
            'category' => 'bill',
            'schedule_type' => 'one_time',
            'due_at' => now()->subMinutes(5),
            'status' => 'active',
            'channel' => 'in_app',
        ]);

        ReminderEvent::create([
            'reminder_id' => $reminder->id,
            'scheduled_for' => now()->subMinutes(2),
            'status' => 'pending',
            'channel' => 'in_app',
        ]);

        Artisan::call('reminders:dispatch');

        $this->assertDatabaseHas('notifications', [
            'user_id' => $user->id,
            'type' => 'reminder',
            'title' => 'Pay invoice',
        ]);

        $this->assertDatabaseHas('reminder_events', [
            'reminder_id' => $reminder->id,
            'status' => 'delivered',
        ]);
    }

    public function test_recurring_reminder_generates_multiple_events(): void
    {
        $user = User::factory()->create();
        $reminder = Reminder::create([
            'user_id' => $user->id,
            'title' => 'Weekly appointment',
            'category' => 'appointment',
            'schedule_type' => 'recurring',
            'recurrence_pattern' => [
                'frequency' => 'weekly',
                'interval' => 1,
                'days_of_week' => ['mon', 'wed'],
                'time_of_day' => '10:00',
            ],
            'status' => 'active',
            'channel' => 'in_app',
        ]);

        $service = app(ReminderService::class);
        $service->syncEvents($reminder, 7);

        $this->assertDatabaseHas('reminder_events', [
            'reminder_id' => $reminder->id,
            'status' => 'pending',
        ]);

        $this->assertTrue(ReminderEvent::where('reminder_id', $reminder->id)->count() >= 2);
    }
}

