<?php

namespace App\Console\Commands;

use App\Models\Reminder;
use App\Services\ReminderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class GenerateReminderEvents extends Command
{
    protected $signature = 'reminders:generate {--horizon=30 : Days ahead to generate occurrences}';

    protected $description = 'Generate upcoming reminder events for active reminders.';

    public function handle(ReminderService $reminderService): int
    {
        $horizon = (int) $this->option('horizon');
        $horizon = max(1, min(90, $horizon));

        $reminders = Reminder::active()->get();
        $this->info("Generating events for {$reminders->count()} reminders (horizon: {$horizon} days)");

        foreach ($reminders as $reminder) {
            try {
                $reminderService->syncEvents($reminder, $horizon);
            } catch (\Throwable $e) {
                Log::error('Failed to generate reminder events', [
                    'reminder_id' => $reminder->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return Command::SUCCESS;
    }
}

