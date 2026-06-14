<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Constants\UserRoles;
use App\Models\CleaningArea;
use App\Models\CleaningTask;
use App\Models\CleaningTaskAssignment;
use App\Models\CleaningTaskLog;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Mail;
use App\Mail\CleaningTaskCompletedNotification;
use App\Models\Branch; // For finding facility

class CleaningChecklistController extends BaseApiController
{
    public function index(Request $request)
    {
        $user = $request->user();
        $date = $this->resolveDate($request->input('date'));
        $branchId = (int) ($request->input('branch_id') ?? $user->assigned_branch_id);

        if (!$branchId) {
            throw ValidationException::withMessages([
                'branch_id' => 'A branch must be specified or assigned to your profile to view cleaning tasks.',
            ]);
        }

        $areas = CleaningArea::query()
            ->with(['tasks' => function ($query) {
                $query->where('is_active', true)
                    ->orderBy('display_order')
                    ->orderBy('title');
            }])
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();

        $tasks = $areas->flatMap(fn (CleaningArea $area) => $area->tasks);

        $logs = CleaningTaskLog::query()
            ->with('completedBy')
            ->whereIn('cleaning_task_id', $tasks->pluck('id'))
            ->whereDate('scheduled_date', $date->toDateString())
            ->get()
            ->keyBy('cleaning_task_id');

        $response = [
            'date' => $date->toDateString(),
            'branch_id' => $branchId,
            'areas' => $areas->map(function (CleaningArea $area) use ($date, $logs) {
                $tasksForDate = $area->tasks
                    ->filter(fn (CleaningTask $task) => $task->isScheduledForDate($date))
                    ->values();

                return [
                    'id' => $area->id,
                    'name' => $area->name,
                    'shift_label' => $area->shift_label,
                    'location' => $area->location,
                    'description' => $area->description,
                    'tasks' => $tasksForDate->map(function (CleaningTask $task) use ($logs) {
                        $log = $logs->get($task->id);

                        return [
                            'id' => $task->id,
                            'title' => $task->title,
                            'instructions' => $task->instructions,
                            'frequency' => $task->frequency,
                            'is_required' => $task->is_required,
                            'estimated_minutes' => $task->estimated_minutes,
                            // Expose optional time window so clients can enforce when tasks are actionable
                            'window_start' => optional($task->window_start)->format('H:i'),
                            'window_end' => optional($task->window_end)->format('H:i'),
                            'status' => $log?->status ?? 'pending',
                            'initials' => $log?->initials,
                            'completed_by_name' => $log?->completedBy?->name ?? null,
                            'notes' => $log?->notes,
                            'log_id' => $log?->id,
                            'completed_at' => optional($log?->completed_at)->toDateTimeString(),
                        ];
                    }),
                ];
            })->values(),
        ];

        return response()->json($response);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'task_id' => 'required|exists:cleaning_tasks,id',
            'scheduled_date' => 'nullable|date',
            'status' => 'required|in:pending,completed,skipped',
            'initials' => 'nullable|string|max:8',
            'notes' => 'nullable|string|max:1000',
        ]);

        $task = CleaningTask::with('area')->findOrFail($data['task_id']);
        $user = $request->user();

        $isCaregiver = \App\Constants\UserRoles::isCaregiverRole($user->role ?? null);
        $isAdmin = in_array(strtolower($user->role ?? ''), ['super_admin', 'administrator', 'admin'], true);

        // Only caregivers are restricted to their assigned branch; admins/super admins can update any branch
        if ($isCaregiver && $user->assigned_branch_id && $user->assigned_branch_id !== $task->area->branch_id) {
            abort(403, 'You are not allowed to update tasks for this branch.');
        }

        $scheduledDate = $this->resolveDate($data['scheduled_date'] ?? null)->toDateString();
        $status = $data['status'];
        // Auto-derive initials from user's name (always use authenticated user)
        $initials = $this->deriveInitials($user->name ?? $user->email ?? 'User', null);

        $log = CleaningTaskLog::updateOrCreate(
            [
                'cleaning_task_id' => $task->id,
                'scheduled_date' => $scheduledDate,
            ],
            [
                'cleaning_area_id' => $task->cleaning_area_id,
                'branch_id' => $task->area->branch_id,
                'shift_label' => $task->area->shift_label,
                'status' => $status,
                // Always set completed_by to track who performed the action
                'completed_by' => $user->id,
                'initials' => $initials,
                'notes' => $data['notes'] ?? null,
                'completed_at' => $status === 'completed' ? now() : null,
                'updated_at' => now(), // Ensure updated_at is set for skipped tasks
            ]
        );

        if ($status === 'completed') {
            $this->completeAssignmentsForTask($task, $scheduledDate, $user);
            $this->notifyAdminsOfTaskUpdate($task, $user, $scheduledDate, 'completed', $data['notes'] ?? null);
        } elseif ($status === 'skipped') {
            $this->notifyAdminsOfTaskUpdate($task, $user, $scheduledDate, 'skipped', $data['notes'] ?? null);
        }

        return response()->json([
            'message' => 'Task log saved.',
            'log' => $log->fresh(['completedBy']),
        ]);
    }

    private function completeAssignmentsForTask(CleaningTask $task, string $scheduledDate, $caregiver): void
    {
        $assignments = CleaningTaskAssignment::where('cleaning_task_id', $task->id)
            ->whereDate('scheduled_date', $scheduledDate)
            ->get();

        if ($assignments->isEmpty()) {
            return;
        }

        foreach ($assignments as $assignment) {
            $assignment->update([
                'status' => 'completed',
                'acknowledged_at' => $assignment->acknowledged_at ?? now(),
            ]);
        }
        
        // Notification is handled in store() to avoid duplicates
    }

    private function notifyAdminsOfTaskUpdate(CleaningTask $task, $caregiver, string $scheduledDate, string $status, ?string $notes = null): void
    {
        // Get admins - try roles relationship first, fallback to role column
        $admins = collect();
        
        if (method_exists(User::class, 'roles')) {
            $admins = User::whereHas('roles', function ($query) {
                $query->whereIn('name', ['admin', 'administrator']);
            })->get();
        }
        
        if ($admins->isEmpty()) {
            $admins = User::whereIn('role', ['admin', 'administrator'])->get();
        }

        $statusLabel = $status === 'completed' ? 'Completed' : 'Skipped';
        $icon = $status === 'completed' ? 'heroicon-o-check-circle' : 'heroicon-o-x-circle';
        $iconColor = $status === 'completed' ? '#059669' : '#d97706';
        $type = $status === 'completed' ? 'housekeeping_task_completed' : 'housekeeping_task_skipped';

        foreach ($admins as $admin) {
            // Create in-app notification
            Notification::create([
                'user_id' => $admin->id,
                'type' => $type,
                'title' => "Housekeeping Task {$statusLabel}",
                'message' => sprintf(
                    '%s %s "%s" (%s) on %s.',
                    $caregiver->name ?? 'A caregiver',
                    $status === 'completed' ? 'completed' : 'skipped',
                    $task->title,
                    $task->area->name ?? 'Housekeeping',
                    Carbon::parse($scheduledDate)->toFormattedDateString()
                ),
                'icon' => $icon,
                'icon_color' => $iconColor,
                'action_url' => '/app/housekeeping/dashboard',
                'metadata' => [
                    'task_id' => $task->id,
                    'scheduled_date' => $scheduledDate,
                    'status' => $status,
                ],
            ]);

            // Send Email Notification for completed tasks
            if ($status === 'completed' && $admin->email) {
                // Determine facility for the email context
                // User may not be assigned to the facility where the task happened, 
                // but usually admins are relevant to the facility.
                // We'll try to get the facility from the task's area -> branch.
                $facility = null;
                if ($task->area && $task->area->branch_id) {
                     $branch = Branch::find($task->area->branch_id);
                     $facility = $branch?->facility;
                }
                
                try {
                    Mail::to($admin)->send(new CleaningTaskCompletedNotification(
                        $task,
                        $caregiver,
                        $scheduledDate,
                        $notes,
                        now()->setTimezone($admin->timezone ?? 'UTC')->format('H:i'), // Try to use admin timezone if available, else system
                        $facility
                    ));
                } catch (\Exception $e) {
                    // Log error but don't fail the request
                    \Log::error("Failed to send task completion email to {$admin->email}: " . $e->getMessage());
                }
            }
        }
    }

    private function notifyAdminsOfCompletion(CleaningTask $task, $caregiver, string $scheduledDate): void
    {
        // Legacy method - redirect to new method
        $this->notifyAdminsOfTaskUpdate($task, $caregiver, $scheduledDate, 'completed');
    }

    private function resolveDate(?string $date): Carbon
    {
        if ($date) {
            return Carbon::parse($date)->startOfDay();
        }

        return now()->startOfDay();
    }

    private function deriveInitials(string $fullName, ?string $provided): string
    {
        if ($provided) {
            return strtoupper(Str::limit($provided, 8, ''));
        }

        $parts = collect(preg_split('/\s+/', trim($fullName)) ?: [])
            ->filter()
            ->map(fn ($part) => Str::upper(Str::substr($part, 0, 1)));

        if ($parts->isEmpty()) {
            return '';
        }

        return Str::limit($parts->join(''), 8, '');
    }
}
