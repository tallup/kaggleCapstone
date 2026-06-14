<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CleaningArea;
use App\Models\CleaningTaskLog;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class HousekeepingReportController extends BaseApiController
{
    public function index(Request $request)
    {
        $user = $request->user();

        $isAdmin = $user->role === 'super_admin' || $user->isAnyAdmin();

        if (!$user || (!$isAdmin && !$user->hasPermission('view_cleaning_areas'))) {
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
            ->with('completedBy')
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
                    'completed_by_name' => $log?->completedBy?->name ?? null,
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

    public function completionReport(Request $request)
    {
        $user = $request->user();

        $isAdmin = $user->role === 'super_admin' || $user->isAnyAdmin();

        if (!$user || (!$isAdmin && !$user->hasPermission('view_cleaning_areas'))) {
            abort(403, 'You do not have permission to view housekeeping reports.');
        }

        $branchId = (int) ($request->input('branch_id') ?? $user->assigned_branch_id);

        if (!$branchId) {
            throw ValidationException::withMessages([
                'branch_id' => 'Select a branch or assign one to your profile.',
            ]);
        }

        $dateFrom = $request->input('date_from') 
            ? Carbon::parse($request->input('date_from'))->startOfDay()
            : Carbon::now()->subDays(7)->startOfDay();
        
        $dateTo = $request->input('date_to')
            ? Carbon::parse($request->input('date_to'))->endOfDay()
            : Carbon::now()->endOfDay();

        $logs = CleaningTaskLog::query()
            ->with(['task.area', 'completedBy'])
            ->where('branch_id', $branchId)
            ->whereBetween('scheduled_date', [$dateFrom->toDateString(), $dateTo->toDateString()])
            ->whereIn('status', ['completed', 'skipped'])
            ->orderBy('scheduled_date', 'desc')
            ->orderBy('completed_at', 'desc')
            ->get();

        $report = $logs->filter(function ($log) {
            // Filter out logs with missing task or area relationships
            return $log->task && $log->task->area;
        })->map(function ($log) {
            return [
                'id' => $log->id,
                'date' => $log->scheduled_date->toDateString(),
                'area' => $log->task->area->name ?? 'Unknown',
                'shift' => $log->shift_label ?? ($log->task->area->shift_label ?? 'N/A'),
                'task' => $log->task->title ?? 'Unknown Task',
                'status' => $log->status,
                'completed_by' => $log->completedBy ? [
                    'id' => $log->completedBy->id,
                    'name' => $log->completedBy->name,
                    'email' => $log->completedBy->email,
                ] : null,
                'initials' => $log->initials,
                'completed_at' => $log->completed_at ? $log->completed_at->toDateTimeString() : null,
                'skipped_at' => $log->status === 'skipped' && $log->updated_at ? $log->updated_at->toDateTimeString() : null,
                'notes' => $log->notes,
            ];
        });

        return response()->json([
            'date_from' => $dateFrom->toDateString(),
            'date_to' => $dateTo->toDateString(),
            'branch_id' => $branchId,
            'total_records' => $report->count(),
            'records' => $report->values(),
        ]);
    }
}
