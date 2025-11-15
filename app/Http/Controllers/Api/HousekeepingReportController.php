<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CleaningArea;
use App\Models\CleaningTaskLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class HousekeepingReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->hasPermission('view_cleaning_areas')) {
            abort(403, 'You do not have permission to view housekeeping reports.');
        }

        $branchId = (int) ($request->input('branch_id') ?? $user->assigned_branch_id);

        if (!$branchId) {
            throw ValidationException::withMessages([
                'branch_id' => 'Select a branch or assign one to your profile.',
            ]);
        }

        $date = Carbon::parse($request->input('date', now()));

        $areasQuery = CleaningArea::query()
            ->where('branch_id', $branchId)
            ->where('is_active', true)
            ->with([
                'tasks' => function ($query) use ($request) {
                    $query->where('is_active', true)
                        ->orderBy('display_order')
                        ->orderBy('title');
                },
            ])
            ->orderBy('display_order');

        if ($request->filled('area_id')) {
            $areasQuery->where('id', $request->integer('area_id'));
        }

        if ($request->filled('shift')) {
            $areasQuery->where('shift_label', $request->input('shift'));
        }

        $areas = $areasQuery->get();
        $taskIds = $areas->flatMap(fn ($area) => $area->tasks->pluck('id'))->all();

        $logs = CleaningTaskLog::query()
            ->whereIn('cleaning_task_id', $taskIds)
            ->whereDate('scheduled_date', $date->toDateString())
            ->get()
            ->keyBy('cleaning_task_id');

        $summary = [
            'total' => 0,
            'completed' => 0,
            'skipped' => 0,
            'pending' => 0,
            'required_missing' => 0,
        ];

        $rows = collect();

        foreach ($areas as $area) {
            foreach ($area->tasks as $task) {
                if (!$task->isScheduledForDate($date)) {
                    continue;
                }

                $log = $logs->get($task->id);
                $status = $log?->status ?? 'pending';

                if ($request->filled('status') && $status !== $request->input('status')) {
                    continue;
                }

                $summary['total']++;

                match ($status) {
                    'completed' => $summary['completed']++,
                    'skipped' => $summary['skipped']++,
                    default => $summary['pending']++,
                };

                if ($status !== 'completed' && $task->is_required) {
                    $summary['required_missing']++;
                }

                $rows->push([
                    'area' => $area->name,
                    'shift' => $area->shift_label ?? 'N/A',
                    'task_id' => $task->id,
                    'task' => $task->title,
                    'window_start' => $task->window_start,
                    'window_end' => $task->window_end,
                    'required' => (bool) $task->is_required,
                    'status' => $status,
                    'initials' => $log?->initials,
                    'notes' => $log?->notes,
                    'completed_at' => optional($log?->completed_at)->toDateTimeString(),
                ]);
            }
        }

        $rows = $rows->values();

        return response()->json([
            'date' => $date->toDateString(),
            'branch_id' => $branchId,
            'areas' => $areas->map(fn ($area) => [
                'id' => $area->id,
                'name' => $area->name,
                'shift_label' => $area->shift_label,
            ]),
            'summary' => $summary,
            'rows' => $rows,
        ]);
    }
}
