<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CleaningTask;
use App\Models\CleaningTaskAssignment;
use App\Models\Notification;
use App\Models\User;
use App\Mail\TaskAssignmentNotification;
use App\Services\EmailPreferenceService;
use App\Services\MailConfigurationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class CleaningTaskAssignmentController extends BaseApiController
{
    public function index(Request $request, CleaningTask $cleaningTask)
    {
        $this->authorizeAssignments($request->user(), $cleaningTask);

        $assignments = $cleaningTask->assignments()
            ->with('user:id,name')
            ->when($request->filled('date'), fn ($query) => $query->whereDate('scheduled_date', $request->input('date')))
            ->orderBy('scheduled_date')
            ->get();

        return response()->json($assignments);
    }

    public function store(Request $request, CleaningTask $cleaningTask)
    {
        try {
            // Ensure task has an area before proceeding
            if (!$cleaningTask->cleaning_area_id) {
                \Log::error('Cleaning task missing area_id', [
                    'task_id' => $cleaningTask->id,
                ]);
                return response()->json([
                    'message' => 'This task is not associated with a cleaning area. Please contact support.',
                ], 422);
            }

            $this->authorizeAssignments($request->user(), $cleaningTask);

            // Validate that task has required relationships
            if (!$cleaningTask->relationLoaded('area')) {
                $cleaningTask->load('area');
            }
            
            if (!$cleaningTask->area) {
                \Log::error('Cleaning task missing area relationship', [
                    'task_id' => $cleaningTask->id,
                    'task_title' => $cleaningTask->title,
                ]);
                return response()->json([
                    'message' => 'This task is not associated with a cleaning area. Please contact support.',
                ], 422);
            }

            if (!$cleaningTask->area->branch_id) {
                \Log::error('Cleaning area missing branch_id', [
                    'task_id' => $cleaningTask->id,
                    'area_id' => $cleaningTask->area->id,
                    'area_name' => $cleaningTask->area->name,
                ]);
                return response()->json([
                    'message' => 'This task\'s cleaning area is not associated with a branch. Please contact support.',
                ], 422);
            }

            $data = $request->validate([
                'user_id' => 'required|exists:users,id',
                'scheduled_date' => 'required|date',
            ]);

            // Parse and validate the scheduled date
            try {
                $scheduledDate = Carbon::parse($data['scheduled_date'])->toDateString();
            } catch (\Exception $e) {
                \Log::error('Invalid scheduled_date format', [
                    'scheduled_date' => $data['scheduled_date'],
                    'error' => $e->getMessage(),
                ]);
                return response()->json([
                    'message' => 'Invalid date format. Please use YYYY-MM-DD format.',
                ], 422);
            }

            $keys = [
                'cleaning_task_id' => $cleaningTask->id,
                'user_id' => $data['user_id'],
                'scheduled_date' => $scheduledDate,
            ];

            // Use database-level upsert to avoid race-condition duplicate key errors
            try {
                CleaningTaskAssignment::upsert(
                    [[
                        'cleaning_task_id' => $keys['cleaning_task_id'],
                        'user_id' => $keys['user_id'],
                        'scheduled_date' => $keys['scheduled_date'],
                        'status' => 'assigned',
                        'notified_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]],
                    ['cleaning_task_id', 'user_id', 'scheduled_date'],
                    ['status', 'notified_at', 'updated_at']
                );
            } catch (\Exception $e) {
                \Log::error('Failed to upsert cleaning task assignment', [
                    'keys' => $keys,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                throw new \Exception('Failed to create assignment. Please try again.');
            }

            // Retrieve the upserted record - use whereDate for scheduled_date to handle date comparison properly
            $assignment = CleaningTaskAssignment::where('cleaning_task_id', $keys['cleaning_task_id'])
                ->where('user_id', $keys['user_id'])
                ->whereDate('scheduled_date', $keys['scheduled_date'])
                ->first();

            if (!$assignment) {
                \Log::error('Assignment not found after upsert', [
                    'keys' => $keys,
                ]);
                throw new \Exception('Failed to create or retrieve assignment after upsert.');
            }

            // Load relationships for notification - handle missing relationships gracefully
            try {
                $assignment->load('user', 'task.area');
            } catch (\Exception $e) {
                \Log::warning('Failed to load relationships for assignment', [
                    'assignment_id' => $assignment->id,
                    'error' => $e->getMessage(),
                ]);
                // Continue anyway - relationships might not be critical for the response
            }

            // Try to send notification, but don't fail the assignment if it fails
            try {
                $this->notifyCaregiverAssignment($assignment);
            } catch (\Exception $e) {
                // Log the notification error but don't fail the assignment
                \Log::warning('Failed to send notification for caregiver assignment', [
                    'assignment_id' => $assignment->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json([
                'message' => 'Caregiver assigned.',
                'data' => $assignment,
            ], 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            \Log::error('Error assigning caregiver to task', [
                'task_id' => $cleaningTask->id,
                'user_id' => $request->input('user_id'),
                'scheduled_date' => $request->input('scheduled_date'),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => config('app.debug') 
                    ? $e->getMessage() 
                    : 'Failed to assign caregiver. Please try again.',
            ], 500);
        }
    }

    public function destroy(Request $request, $cleaningTaskAssignment)
    {
        $assignment = CleaningTaskAssignment::findOrFail($cleaningTaskAssignment);
        $this->authorizeAssignments($request->user(), $assignment->task);

        $assignment->delete();

        return response()->json([
            'message' => 'Assignment removed.',
        ]);
    }

    private function authorizeAssignments($user, CleaningTask $task): void
    {
        if (!$user) {
            abort(401, 'You must be authenticated to assign housekeeping tasks.');
        }

        try {
            if (!$user->hasPermission('assign_cleaning_tasks')) {
                \Log::warning('User lacks permission for caregiver assignment', [
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                ]);
                abort(403, 'You do not have permission to assign housekeeping tasks.');
            }
        } catch (\BadMethodCallException $e) {
            // hasPermission method doesn't exist on user model
            \Log::error('hasPermission method not available on User model', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            abort(500, 'Permission system error. Please contact support.');
        } catch (\Exception $e) {
            \Log::error('Error checking permission for caregiver assignment', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            abort(403, 'Unable to verify permissions. Please contact support.');
        }

        // Load area relationship if not already loaded
        try {
            if (!$task->relationLoaded('area')) {
                $task->load('area');
            }
        } catch (\Exception $e) {
            \Log::warning('Failed to load area relationship for task', [
                'task_id' => $task->id,
                'error' => $e->getMessage(),
            ]);
        }

        // Check branch access if user has an assigned branch
        if ($user->assigned_branch_id) {
            // Check if task has an area
            if (!$task->area) {
                \Log::warning('Task missing area for branch access check', [
                    'task_id' => $task->id,
                    'user_id' => $user->id,
                    'user_branch_id' => $user->assigned_branch_id,
                ]);
                abort(422, 'This task is not associated with a cleaning area. Please contact support.');
            }

            // Check if area has a branch_id
            if (!$task->area->branch_id) {
                \Log::warning('Task area missing branch_id', [
                    'task_id' => $task->id,
                    'area_id' => $task->area->id,
                    'user_id' => $user->id,
                    'user_branch_id' => $user->assigned_branch_id,
                ]);
                abort(422, 'This task\'s cleaning area is not associated with a branch. Please contact support.');
            }

            if ($user->assigned_branch_id !== $task->area->branch_id) {
                abort(403, 'You cannot assign tasks for another branch.');
            }
        }
    }

    private function notifyCaregiverAssignment(CleaningTaskAssignment $assignment): void
    {
        $user = $assignment->user;
        if (!$user) {
            return;
        }

        // Ensure task and area are loaded
        if (!$assignment->relationLoaded('task')) {
            try {
                $assignment->load('task.area');
            } catch (\Exception $e) {
                \Log::warning('Failed to load task relationship for notification', [
                    'assignment_id' => $assignment->id,
                    'error' => $e->getMessage(),
                ]);
                // Continue without task - notification will use generic text
            }
        }

        $task = $assignment->task;
        if (!$task) {
            \Log::warning('Assignment has no task - skipping detailed notification', [
                'assignment_id' => $assignment->id,
            ]);
            return;
        }

        $areaName = $task->area?->name ?? 'Housekeeping';

        // Create in-app notification
        Notification::create([
            'user_id' => $user->id,
            'type' => 'housekeeping_assignment',
            'title' => 'New Housekeeping Task Assigned',
            'message' => sprintf(
                '%s (%s) on %s.',
                $task->title,
                $areaName,
                Carbon::parse($assignment->scheduled_date)->toFormattedDateString()
            ),
            'icon' => 'heroicon-o-sparkles',
            'icon_color' => '#059669',
            'action_url' => '/app/housekeeping',
            'metadata' => [
                'task_id' => $task->id,
                'scheduled_date' => $assignment->scheduled_date,
            ],
        ]);

        // Send email notification if user has email and preferences allow it
        if ($user->email) {
            try {
                $emailPreferenceService = app(EmailPreferenceService::class);
                $mailConfigService = app(MailConfigurationService::class);
                
                // Get facility from task area's branch
                $facility = $task->area?->branch?->facility;
                
                // Check if user should receive task assignment emails
                if ($emailPreferenceService->shouldSendEmail($user, 'task_assignment', $facility)) {
                    // Configure mail for facility if available
                    if ($facility) {
                        $mailConfigService->configureForFacility($facility);
                    }
                    
                    // Get the user who assigned the task (if available from request)
                    $assignedBy = request()->user();
                    
                    // Send email
                    Mail::to($user->email)->send(
                        new TaskAssignmentNotification($assignment, $assignedBy)
                    );
                    
                    Log::info('Task assignment email sent', [
                        'to' => $user->email,
                        'task_id' => $task->id,
                        'task_title' => $task->title,
                        'scheduled_date' => $assignment->scheduled_date,
                        'facility_id' => $facility?->id,
                    ]);
                } else {
                    Log::info('Task assignment email skipped - user preferences disabled', [
                        'user_id' => $user->id,
                        'task_id' => $task->id,
                    ]);
                }
            } catch (\Exception $e) {
                // Log error but don't fail the assignment
                Log::error('Failed to send task assignment email', [
                    'to' => $user->email,
                    'task_id' => $task->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}
