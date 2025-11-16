<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CleaningTask;
use App\Models\CleaningTaskAssignment;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CleaningTaskAssignmentController extends Controller
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
        $this->authorizeAssignments($request->user(), $cleaningTask);

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'scheduled_date' => 'required|date',
        ]);

        $scheduledDate = Carbon::parse($data['scheduled_date'])->toDateString();

        $keys = [
            'cleaning_task_id' => $cleaningTask->id,
            'user_id' => $data['user_id'],
            'scheduled_date' => $scheduledDate,
        ];

        // Use database-level upsert to avoid race-condition duplicate key errors
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

        // Retrieve the upserted record
        $assignment = CleaningTaskAssignment::where($keys)->firstOrFail();

        $this->notifyCaregiverAssignment($assignment->load('user', 'task'));

        return response()->json([
            'message' => 'Caregiver assigned.',
            'data' => $assignment,
        ], 201);
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
        if (!$user || !$user->hasPermission('edit_cleaning_areas')) {
            abort(403, 'You do not have permission to assign housekeeping tasks.');
        }

        if ($user->assigned_branch_id && $user->assigned_branch_id !== $task->area->branch_id) {
            abort(403, 'You cannot assign tasks for another branch.');
        }
    }

    private function notifyCaregiverAssignment(CleaningTaskAssignment $assignment): void
    {
        $user = $assignment->user;
        if (!$user) {
            return;
        }

        Notification::create([
            'user_id' => $user->id,
            'type' => 'housekeeping_assignment',
            'title' => 'New Housekeeping Task Assigned',
            'message' => sprintf(
                '%s (%s) on %s.',
                $assignment->task->title,
                $assignment->task->area->name ?? 'Housekeeping',
                Carbon::parse($assignment->scheduled_date)->toFormattedDateString()
            ),
            'icon' => 'heroicon-o-sparkles',
            'icon_color' => '#059669',
            'action_url' => '/app/housekeeping',
            'metadata' => [
                'task_id' => $assignment->task->id,
                'scheduled_date' => $assignment->scheduled_date,
            ],
        ]);
    }
}
