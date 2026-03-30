<?php

namespace App\Http\Controllers\Api;

use App\Models\Reminder;
use App\Models\ReminderEvent;
use App\Models\FireDrill;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\User;
use App\Services\ReminderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class ReminderController extends BaseApiController
{
    public function __construct(private ReminderService $reminderService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Reminder::with(['events' => fn ($q) => $q->orderBy('scheduled_for', 'asc')])
            ->where('user_id', $user->id);

        if ($user->role !== 'super_admin' && $user->facility_id) {
            $query->where(function ($q) use ($user) {
                $q->whereNull('facility_id')->orWhere('facility_id', $user->facility_id);
            });
        }

        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        return response()->json([
            'reminders' => $query->orderByDesc('created_at')->paginate(
                max(1, min(100, (int) $request->get('per_page', 25)))
            ),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateReminder($request);
        $user = $request->user();

        $assigneeUserId = $data['assignee_user_id'] ?? null;
        unset($data['assignee_user_id']);

        $reminderUserId = $user->id;
        $facilityId = $user->facility_id;

        if ($assigneeUserId !== null) {
            $assignee = User::findOrFail($assigneeUserId);
            $this->assertCanAssignReminderToUser(
                $user,
                $assignee,
                isset($data['branch_id']) ? (int) $data['branch_id'] : null
            );
            $reminderUserId = $assignee->id;
            if ($assignee->facility_id) {
                $facilityId = $assignee->facility_id;
            }
        }

        $clientMeta = $data['metadata'] ?? [];
        if (! is_array($clientMeta)) {
            $clientMeta = [];
        }
        if ($assigneeUserId !== null) {
            $clientMeta['scheduled_by_user_id'] = $user->id;
        }
        $data['metadata'] = $clientMeta;

        $reminder = Reminder::create([
            ...$data,
            'user_id' => $reminderUserId,
            'facility_id' => $facilityId,
        ]);

        $this->reminderService->syncEvents($reminder);

        return response()->json([
            'message' => 'Reminder created',
            'reminder' => $reminder->fresh('events'),
        ], 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $reminder = $this->findReminderForUser($request, $id);
        return response()->json(['reminder' => $reminder->load('events')]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $reminder = $this->findReminderForUser($request, $id);
        $data = $this->validateReminder($request, $reminder);

        $reminder->update($data);
        $this->reminderService->syncEvents($reminder);

        return response()->json([
            'message' => 'Reminder updated',
            'reminder' => $reminder->fresh('events'),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $reminder = $this->findReminderForUser($request, $id);
        $reminder->update(['status' => 'cancelled']);
        $reminder->events()->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Reminder cancelled']);
    }

    public function pause(Request $request, int $id): JsonResponse
    {
        $reminder = $this->findReminderForUser($request, $id);
        $reminder->update(['status' => 'paused']);
        $reminder->events()
            ->whereIn('status', ['pending', 'snoozed'])
            ->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Reminder paused']);
    }

    public function resume(Request $request, int $id): JsonResponse
    {
        $reminder = $this->findReminderForUser($request, $id);
        $reminder->update(['status' => 'active']);
        $this->reminderService->syncEvents($reminder);

        return response()->json(['message' => 'Reminder resumed', 'reminder' => $reminder->fresh('events')]);
    }

    public function upcoming(Request $request): JsonResponse
    {
        $user = $request->user();
        $limit = max(1, min(100, (int) $request->get('limit', 50)));

        // Fetch reminder events
        $reminderEvents = ReminderEvent::with('reminder')
            ->whereHas('reminder', function ($q) use ($user) {
                $q->where('user_id', $user->id)
                    ->where('status', 'active');

                if ($user->role !== 'super_admin' && $user->facility_id) {
                    $q->where(function ($sub) use ($user) {
                        $sub->whereNull('facility_id')->orWhere('facility_id', $user->facility_id);
                    });
                }
            })
            ->whereIn('status', ['pending', 'snoozed'])
            ->where(function ($q) {
                $q->whereNull('snoozed_until')->orWhere('snoozed_until', '<=', now());
            })
            ->get();

        // Fetch upcoming fire drills (scheduled status, date >= today, and if today, time must be in future)
        $fireDrills = FireDrill::with(['branch', 'createdBy'])
            ->where('status', 'scheduled')
            ->where(function ($q) {
                $today = now()->toDateString();
                $now = now();
                $q->whereDate('scheduled_date', '>', $today)
                  ->orWhere(function ($subQ) use ($today, $now) {
                      $subQ->whereDate('scheduled_date', $today)
                           ->whereTime('scheduled_time', '>', $now->format('H:i:s'));
                  });
            })
            ->orderBy('scheduled_date')
            ->orderBy('scheduled_time')
            ->get();

        // Format reminder events
        $formattedReminders = $reminderEvents->map(fn ($event) => [
            'id' => 'reminder_' . $event->id,
            'type' => 'reminder',
            'reminder_id' => $event->id,
                'title' => $event->reminder?->title,
            'category' => $event->reminder?->category ?? 'general',
                'status' => $event->status,
                'scheduled_for' => $event->scheduled_for,
                'snoozed_until' => $event->snoozed_until,
            'action_url' => $event->reminder?->action_url ?? '/reminders',
                'metadata' => $event->reminder?->metadata,
        ]);

        // Format fire drills
        $formattedFireDrills = $fireDrills->map(function ($drill) {
            // Combine scheduled_date and scheduled_time into a datetime
            $scheduledDateTime = Carbon::parse($drill->scheduled_date->format('Y-m-d') . ' ' . $drill->scheduled_time);
            
            return [
                'id' => 'firedrill_' . $drill->id,
                'type' => 'fire_drill',
                'firedrill_id' => $drill->id,
                'title' => 'Fire Drill: ' . ($drill->branch?->name ?? 'Unknown Branch'),
                'category' => 'fire_drill',
                'status' => $drill->status,
                'scheduled_for' => $scheduledDateTime->toIso8601String(),
                'snoozed_until' => null,
                'action_url' => '/fire-drills',
                'metadata' => [
                    'branch_id' => $drill->branch_id,
                    'branch_name' => $drill->branch?->name,
                    'notes' => $drill->notes,
                ],
            ];
        });

        // Fetch active medication windows
        $medicationWindows = $this->getActiveMedicationWindows($user);

        // Merge and sort by scheduled_for
        $allEvents = $formattedReminders
            ->concat($formattedFireDrills)
            ->concat($medicationWindows)
            ->sortBy('scheduled_for')
            ->take($limit)
            ->values();

        return response()->json([
            'events' => $allEvents,
        ]);
    }

    private function validateReminder(Request $request, ?Reminder $reminder = null): array
    {
        $rules = [
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', Rule::in(['medication', 'bill', 'appointment', 'renewal', 'general'])],
            'description' => ['nullable', 'string'],
            'channel' => ['nullable', Rule::in(['in_app', 'email'])],
            'schedule_type' => $reminder
                ? ['sometimes', Rule::in(['one_time', 'recurring'])]
                : ['required', Rule::in(['one_time', 'recurring'])],
            'due_at' => ['nullable', 'date'],
            'recurrence_pattern' => ['nullable', 'array'],
            'recurrence_pattern.frequency' => ['required_if:schedule_type,recurring', Rule::in(['daily', 'weekly', 'monthly', 'interval'])],
            'recurrence_pattern.interval' => ['nullable', 'integer', 'min:1'],
            'recurrence_pattern.interval_unit' => ['nullable', Rule::in(['minutes', 'hours', 'days', 'weeks', 'months'])],
            'recurrence_pattern.days_of_week' => ['nullable', 'array'],
            'recurrence_pattern.days_of_week.*' => ['string'],
            'recurrence_pattern.time_of_day' => ['nullable', 'date_format:H:i'],
            'recurrence_pattern.start_date' => ['nullable', 'date'],
            'recurrence_pattern.end_date' => ['nullable', 'date', 'after_or_equal:recurrence_pattern.start_date'],
            'action_url' => ['nullable', 'string', 'max:255'],
            'metadata' => ['nullable', 'array'],
            'status' => ['nullable', Rule::in(['active', 'paused', 'completed', 'cancelled'])],
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'assignee_user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];

        $validated = $request->validate($rules);

        if (($validated['schedule_type'] ?? $reminder?->schedule_type) === 'one_time' && empty($validated['due_at'])) {
            abort(422, 'due_at is required for one-time reminders.');
        }

        return $validated;
    }

    private function findReminderForUser(Request $request, int $id): Reminder
    {
        $user = $request->user();

        $reminder = Reminder::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if ($user->role !== 'super_admin' && $user->facility_id) {
            if ($reminder->facility_id && $reminder->facility_id !== $user->facility_id) {
                abort(403, 'You do not have access to this reminder.');
            }
        }

        return $reminder;
    }

    private function assertCanAssignReminderToUser(User $auth, User $assignee, ?int $branchId): void
    {
        if ((int) $assignee->id === (int) $auth->id) {
            return;
        }

        if (! $assignee->is_active) {
            abort(422, 'Selected user is not active.');
        }

        if ($auth->role === 'super_admin') {
            return;
        }

        if ($auth->facility_id && $assignee->facility_id
            && (int) $auth->facility_id !== (int) $assignee->facility_id) {
            abort(403, 'You can only schedule reminders for staff in your facility.');
        }

        $authBranch = $auth->assigned_branch_id ? (int) $auth->assigned_branch_id : null;
        $assigneeBranch = $assignee->assigned_branch_id ? (int) $assignee->assigned_branch_id : null;

        if (in_array($auth->role, ['caregiver', 'care_giver'], true)) {
            if ($authBranch !== null && $assigneeBranch !== null && $authBranch !== $assigneeBranch) {
                abort(403, 'You can only assign follow-ups to staff in your branch.');
            }
        }

        if ($branchId !== null && $assigneeBranch !== null && $assigneeBranch !== $branchId) {
            abort(422, 'Selected staff member is not assigned to this resident\'s branch.');
        }
    }

    private function getActiveMedicationWindows($user): \Illuminate\Support\Collection
    {
        $now = Carbon::now(config('app.timezone'));
        $windowBeforeMinutes = 60;
        $windowAfterMinutes = 60;
        
        // Get active medications
        $medications = Medication::with(['resident', 'branch'])
            ->where('is_active', true)
            ->where(function ($q) use ($now) {
                $q->whereNull('start_date')
                  ->orWhere('start_date', '<=', $now->toDateString());
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', $now->toDateString());
            })
            ->get();

        // Apply facility scope if needed
        if ($user->role !== 'super_admin' && $user->facility_id) {
            $medications = $medications->filter(function ($medication) use ($user) {
                return $medication->branch && $medication->branch->facility_id === $user->facility_id;
            });
        }

        // Filter by caregiver branch if applicable
        if (in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse']) && $user->assigned_branch_id) {
            $medications = $medications->filter(function ($medication) use ($user) {
                return $medication->branch_id === $user->assigned_branch_id;
            });
        }

        $windows = collect();

        foreach ($medications as $medication) {
            $times = array_filter([
                $medication->time_1,
                $medication->time_2,
                $medication->time_3,
                $medication->time_4,
            ]);

            if (empty($times)) {
                continue; // Skip PRN medications without scheduled times
            }

            // Check today and tomorrow for each scheduled time
            foreach ([0, 1] as $dayOffset) {
                $targetDate = $now->copy()->addDays($dayOffset)->startOfDay();

                foreach ($times as $timeValue) {
                    if (empty($timeValue)) {
                        continue;
                    }

                    // Parse time (format: "HH:MM" or "HH:MM:SS")
                    try {
                        $timeParts = explode(':', $timeValue);
                        $hour = (int) $timeParts[0];
                        $minute = (int) ($timeParts[1] ?? 0);
                        
                        $scheduledTime = $targetDate->copy()->setTime($hour, $minute, 0);
                        
                        // Calculate window
                        $windowStart = $scheduledTime->copy()->subMinutes($windowBeforeMinutes);
                        $windowEnd = $scheduledTime->copy()->addMinutes($windowAfterMinutes);
                        
                        // Check if window is currently open
                        if ($now->greaterThanOrEqualTo($windowStart) && $now->lessThanOrEqualTo($windowEnd)) {
                            // Check if already administered
                            $hasAdministration = MedicationAdministration::where('medication_id', $medication->id)
                                ->whereBetween('administered_at', [
                                    $windowStart->copy()->subMinutes(30),
                                    $windowEnd->copy()->addMinutes(30)
                                ])
                                ->where('status', 'completed')
                                ->exists();

                            if (!$hasAdministration) {
                                $windows->push([
                                    'id' => 'medication_window_' . $medication->id . '_' . $scheduledTime->format('Y-m-d_H-i'),
                                    'type' => 'medication_window',
                                    'medication_id' => $medication->id,
                                    'title' => $medication->name . ' - ' . ($medication->resident?->first_name ?? 'Unknown') . ' ' . ($medication->resident?->last_name ?? ''),
                                    'category' => 'medication',
                                    'status' => 'active',
                                    'scheduled_for' => $scheduledTime->toIso8601String(),
                                    'window_closes_at' => $windowEnd->toIso8601String(),
                                    'snoozed_until' => null,
                                    'action_url' => '/medications',
                                    'metadata' => [
                                        'medication_id' => $medication->id,
                                        'resident_id' => $medication->resident_id,
                                        'resident_name' => ($medication->resident?->first_name ?? '') . ' ' . ($medication->resident?->last_name ?? ''),
                                        'branch_name' => $medication->branch?->name ?? '',
                                        'scheduled_time' => $scheduledTime->format('H:i'),
                                        'window_start' => $windowStart->toIso8601String(),
                                        'window_end' => $windowEnd->toIso8601String(),
                                    ],
                                ]);
                            }
                        }
                    } catch (\Exception $e) {
                        // Skip invalid time formats
                        continue;
                    }
                }
            }
        }

        return $windows;
    }
}

