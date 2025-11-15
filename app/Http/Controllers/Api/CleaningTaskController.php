<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CleaningArea;
use App\Models\CleaningTask;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CleaningTaskController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $branchId = (int) ($request->input('branch_id') ?? $user->assigned_branch_id);

        if (!$branchId) {
            throw ValidationException::withMessages([
                'branch_id' => 'A branch must be specified or assigned to your profile.',
            ]);
        }

        $dateFilter = $request->input('date');

        $query = CleaningTask::query()
            ->whereHas('area', fn ($q) => $q->where('branch_id', $branchId))
            ->with([
                'area',
                'assignments' => function ($query) use ($dateFilter) {
                    $query->with('user:id,name')
                        ->when($dateFilter, fn ($q) => $q->whereDate('scheduled_date', $dateFilter));
                },
            ])
            ->when($request->filled('area_id'), fn ($q) => $q->where('cleaning_area_id', $request->input('area_id')))
            ->when($request->filled('frequency'), fn ($q) => $q->where('frequency', $request->input('frequency')))
            ->when($request->filled('status'), function ($q) use ($request) {
                if ($request->input('status') === 'active') {
                    $q->where('is_active', true);
                } elseif ($request->input('status') === 'inactive') {
                    $q->where('is_active', false);
                }
            })
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = $request->input('search');
                $q->where(function ($query) use ($term) {
                    $query->where('title', 'like', "%{$term}%")
                        ->orWhere('instructions', 'like', "%{$term}%");
                });
            })
            ->orderBy('display_order')
            ->orderBy('title');

        $perPage = (int) $request->input('per_page', 50);

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request)
    {
        $this->ensureCanManage($request, 'create_cleaning_areas');

        $data = $this->validateTask($request);

        $task = CleaningTask::create($data);

        return response()->json([
            'message' => 'Cleaning task created.',
            'data' => $task->load('area'),
        ], 201);
    }

    public function update(Request $request, CleaningTask $cleaningTask)
    {
        $this->ensureCanManage($request, 'edit_cleaning_areas');

        $data = $this->validateTask($request, $cleaningTask);

        $cleaningTask->update($data);

        return response()->json([
            'message' => 'Cleaning task updated.',
            'data' => $cleaningTask->load('area'),
        ]);
    }

    public function destroy(Request $request, CleaningTask $cleaningTask)
    {
        $this->ensureCanManage($request, 'delete_cleaning_areas');

        if ($cleaningTask->logs()->exists()) {
            throw ValidationException::withMessages([
                'task' => 'Cannot delete a task that already has completion logs. Archive instead.',
            ]);
        }

        $cleaningTask->delete();

        return response()->json([
            'message' => 'Cleaning task deleted.',
        ]);
    }

    private function validateTask(Request $request, ?CleaningTask $task = null): array
    {
        $rules = [
            'cleaning_area_id' => 'required|exists:cleaning_areas,id',
            'title' => 'required|string|max:255',
            'instructions' => 'nullable|string',
            'frequency' => 'required|in:daily,weekly,monthly,adhoc',
            'window_start' => 'nullable|date_format:H:i',
            'window_end' => 'nullable|date_format:H:i',
            'days_of_week' => 'nullable|array',
            'days_of_week.*' => 'string|max:20',
            'is_required' => 'boolean',
            'display_order' => 'nullable|integer|min:0',
            'estimated_minutes' => 'nullable|integer|min:1|max:480',
            'is_active' => 'boolean',
        ];

        $data = $request->validate($rules);

        $area = CleaningArea::findOrFail($data['cleaning_area_id']);
        $user = $request->user();

        if ($user->assigned_branch_id && $user->assigned_branch_id !== $area->branch_id) {
            abort(403, 'You cannot manage tasks for another branch.');
        }

        return $data;
    }

    private function ensureCanManage(Request $request, string $permission): void
    {
        $user = $request->user();

        if (!$user || !$user->hasPermission($permission)) {
            abort(403, 'You do not have permission to manage cleaning schedules.');
        }
    }
}
