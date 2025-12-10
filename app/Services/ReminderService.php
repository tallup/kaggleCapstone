<?php

namespace App\Services;

use App\Models\Reminder;
use App\Models\ReminderEvent;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ReminderService
{
    /**
     * Generate and persist upcoming reminder events for a reminder.
     */
    public function syncEvents(Reminder $reminder, int $horizonDays = 30): void
    {
        $now = now();
        $windowEnd = $now->copy()->addDays($horizonDays);

        // Clear future pending/snoozed events so we can rebuild the schedule
        $reminder->events()
            ->where('scheduled_for', '>=', $now->startOfDay())
            ->whereIn('status', ['pending', 'snoozed'])
            ->delete();

        $occurrences = $this->generateOccurrences($reminder, $now, $windowEnd);

        foreach ($occurrences as $dateTime) {
            $reminder->events()->create([
                'scheduled_for' => $dateTime,
                'status' => 'pending',
                'channel' => $reminder->channel,
                'metadata' => [
                    'category' => $reminder->category,
                    'action_url' => $reminder->action_url,
                ],
            ]);
        }

        $reminder->last_scheduled_at = now();
        $reminder->save();
    }

    /**
     * Build collection of Carbon instances for due occurrences within a window.
     */
    public function generateOccurrences(Reminder $reminder, Carbon $windowStart, Carbon $windowEnd): Collection
    {
        $results = collect();

        if ($reminder->schedule_type === 'one_time') {
            if ($reminder->due_at && $reminder->due_at->lessThanOrEqualTo($windowEnd)) {
                $results->push($reminder->due_at);
            }
            return $results;
        }

        $pattern = $reminder->recurrence_pattern ?? [];
        $frequency = $pattern['frequency'] ?? 'daily';
        $interval = max(1, (int) ($pattern['interval'] ?? 1));
        $timeOfDay = $pattern['time_of_day'] ?? ($reminder->due_at?->format('H:i') ?? '09:00');

        $startDate = $pattern['start_date'] ?? $reminder->due_at?->toDateString() ?? $windowStart->toDateString();
        $start = Carbon::parse($startDate)->setTimeFromTimeString($timeOfDay);

        if ($start->lessThan($windowStart)) {
            $start = $windowStart->copy()->setTimeFromTimeString($timeOfDay);
        }

        $endDate = $pattern['end_date'] ?? null;
        $end = $endDate ? Carbon::parse($endDate)->endOfDay() : $windowEnd;

        switch ($frequency) {
            case 'weekly':
                $daysOfWeek = $this->normalizeDaysOfWeek($pattern['days_of_week'] ?? []);
                $results = $this->generateWeeklyOccurrences($start, $end, $windowStart, $interval, $daysOfWeek);
                break;
            case 'monthly':
                $results = $this->generateMonthlyOccurrences($start, $end, $windowStart, $interval);
                break;
            case 'interval':
                $results = $this->generateIntervalOccurrences($start, $end, $windowStart, $interval, $pattern['interval_unit'] ?? 'minutes');
                break;
            case 'daily':
            default:
                $results = $this->generateDailyOccurrences($start, $end, $windowStart, $interval);
                break;
        }

        return $results->filter(fn ($dt) => $dt->lessThanOrEqualTo($windowEnd));
    }

    private function generateDailyOccurrences(Carbon $start, Carbon $end, Carbon $windowStart, int $interval): Collection
    {
        $dates = collect();
        $current = $start->copy();

        while ($current->lessThanOrEqualTo($end)) {
            if ($current->greaterThanOrEqualTo($windowStart)) {
                $dates->push($current->copy());
            }
            $current->addDays($interval);
        }

        return $dates;
    }

    private function generateWeeklyOccurrences(Carbon $start, Carbon $end, Carbon $windowStart, int $interval, array $daysOfWeek): Collection
    {
        $dates = collect();
        $dayCursor = $windowStart->copy()->startOfDay();
        $startWeek = $start->copy()->startOfWeek();

        while ($dayCursor->lessThanOrEqualTo($end)) {
            $weeksFromStart = $startWeek->diffInWeeks($dayCursor->copy()->startOfWeek());

            if ($weeksFromStart % $interval === 0) {
                $isoDay = $dayCursor->isoWeekday();
                if (empty($daysOfWeek) || in_array($isoDay, $daysOfWeek, true)) {
                    $dates->push($dayCursor->copy()->setTimeFromTimeString($start->format('H:i')));
                }
            }

            $dayCursor->addDay();
        }

        return $dates;
    }

    private function generateMonthlyOccurrences(Carbon $start, Carbon $end, Carbon $windowStart, int $interval): Collection
    {
        $dates = collect();
        $current = $start->copy();

        if ($current->lessThan($windowStart)) {
            // Align to the first occurrence on/after windowStart
            $monthsDiff = $current->diffInMonths($windowStart, false);
            if ($monthsDiff > 0) {
                $steps = (int) ceil($monthsDiff / $interval);
                $current->addMonths($steps * $interval);
            }
        }

        while ($current->lessThanOrEqualTo($end)) {
            if ($current->greaterThanOrEqualTo($windowStart)) {
                $dates->push($current->copy());
            }
            $current->addMonths($interval);
        }

        return $dates;
    }

    private function generateIntervalOccurrences(Carbon $start, Carbon $end, Carbon $windowStart, int $interval, string $unit): Collection
    {
        $dates = collect();
        $current = $start->copy();
        $unit = strtolower($unit);

        // Align start with window
        while ($current->lessThan($windowStart)) {
            $current = $this->addInterval($current, $interval, $unit);
        }

        while ($current->lessThanOrEqualTo($end)) {
            $dates->push($current->copy());
            $current = $this->addInterval($current, $interval, $unit);
        }

        return $dates;
    }

    private function normalizeDaysOfWeek(array $days): array
    {
        $map = [
            'mon' => 1, 'monday' => 1,
            'tue' => 2, 'tuesday' => 2,
            'wed' => 3, 'wednesday' => 3,
            'thu' => 4, 'thursday' => 4,
            'fri' => 5, 'friday' => 5,
            'sat' => 6, 'saturday' => 6,
            'sun' => 7, 'sunday' => 7,
        ];

        return collect($days)
            ->map(fn ($d) => $map[strtolower($d)] ?? null)
            ->filter()
            ->unique()
            ->values()
            ->toArray();
    }

    private function addInterval(Carbon $dateTime, int $interval, string $unit): Carbon
    {
        return match ($unit) {
            'minutes', 'minute' => $dateTime->copy()->addMinutes($interval),
            'hours', 'hour' => $dateTime->copy()->addHours($interval),
            'weeks', 'week' => $dateTime->copy()->addWeeks($interval),
            'months', 'month' => $dateTime->copy()->addMonths($interval),
            default => $dateTime->copy()->addDays($interval),
        };
    }
}

