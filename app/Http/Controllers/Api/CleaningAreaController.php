<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\CleaningArea;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CleaningAreaController extends BaseApiController
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

        $query = CleaningArea::query()
            ->where('branch_id', $branchId)
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = $request->input('search');
                $query->where('name', 'like', "%{$term}%")
                    ->orWhere('shift_label', 'like', "%{$term}%")
                    ->orWhere('location', 'like', "%{$term}%");
            })
            ->orderBy('display_order')
            ->orderBy('name')
            ->withCount('tasks');

        return response()->json([
            'data' => $query->get()->map(fn (CleaningArea $area) => [
                'id' => $area->id,
                'name' => $area->name,
                'shift_label' => $area->shift_label,
                'location' => $area->location,
                'description' => $area->description,
                'display_order' => $area->display_order,
                'is_active' => $area->is_active,
                'tasks_count' => $area->tasks_count,
            ]),
        ]);
    }

    public function store(Request $request)
    {
        try {
            $this->ensureCanManage($request, 'create_cleaning_areas');
        } catch (\Exception $e) {
            return response()->json([
                'message' => $e->getMessage() ?: 'You do not have permission to create cleaning areas.',
            ], 403);
        }

        try {
            $user = $request->user();
            $data = $request->validate([
                'branch_id' => 'required|exists:branches,id',
                'name' => 'required|string|max:255',
                'shift_label' => 'nullable|string|max:255',
                'location' => 'nullable|string|max:255',
                'description' => 'nullable|string',
                'display_order' => 'nullable|integer|min:0',
                'is_active' => 'boolean',
            ]);

            // Validate branch access for facility admins
            if ($user && $user->facility_id && $user->role !== 'super_admin') {
                $branch = Branch::find($data['branch_id']);
                if (!$branch || $branch->facility_id !== $user->facility_id) {
                    return response()->json([
                        'message' => 'You can only create cleaning areas for branches in your facility.',
                    ], 403);
                }
            }

            $area = CleaningArea::create($data);

            return response()->json([
                'message' => 'Cleaning area created.',
                'data' => $area,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed.',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Error creating cleaning area: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'An error occurred while creating the cleaning area: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, CleaningArea $cleaningArea)
    {
        $this->ensureCanManage($request, 'edit_cleaning_areas');

        $user = $request->user();
        $data = $request->validate([
            'branch_id' => 'sometimes|required|exists:branches,id',
            'name' => 'sometimes|required|string|max:255',
            'shift_label' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'display_order' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
        ]);

        // Validate branch access for facility admins if branch_id is being updated
        if (isset($data['branch_id']) && $user && $user->facility_id && $user->role !== 'super_admin') {
            $branch = \App\Models\Branch::find($data['branch_id']);
            if (!$branch || $branch->facility_id !== $user->facility_id) {
                return response()->json([
                    'message' => 'You can only assign cleaning areas to branches in your facility.',
                ], 403);
            }
        }

        $cleaningArea->update($data);

        return response()->json([
            'message' => 'Cleaning area updated.',
            'data' => $cleaningArea->fresh(),
        ]);
    }

    public function destroy(Request $request, CleaningArea $cleaningArea)
    {
        $this->ensureCanManage($request, 'delete_cleaning_areas');

        if ($cleaningArea->tasks()->exists()) {
            throw ValidationException::withMessages([
                'area' => 'Cannot delete an area that still has tasks. Remove or reassign tasks first.',
            ]);
        }

        $cleaningArea->delete();

        return response()->json([
            'message' => 'Cleaning area deleted.',
        ]);
    }

    private function ensureCanManage(Request $request, string $permission): void
    {
        $user = $request->user();

        $isAdmin = in_array(strtolower($user->role ?? ''), ['super_admin', 'administrator', 'admin'], true);

        if (!$user || (!$isAdmin && !$user->hasPermission($permission))) {
            abort(403, 'You do not have permission to manage cleaning schedules.');
        }
    }
}
