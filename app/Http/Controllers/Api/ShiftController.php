<?php

namespace App\Http\Controllers\Api;

use App\Models\Shift;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ShiftController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::STAFF_SCHEDULING)) {
            return $error;
        }

        $query = Shift::with(['branch', 'user']);

        $this->applyFacilityFilter($query, $request->user());
        $this->applyBranchFilter($query, $request);

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->get('user_id'));
        }
        if ($request->filled('date_from')) {
            $query->where('start_at', '>=', $request->get('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->where('end_at', '<=', $request->get('date_to') . ' 23:59:59');
        }

        $shifts = $query->orderBy('start_at', 'asc')->paginate($request->get('per_page', 50));

        return response()->json($shifts);
    }

    public function store(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::STAFF_SCHEDULING)) {
            return $error;
        }
        if ($error = $this->requireScheduleManagement()) {
            return $error;
        }

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'user_id' => 'required|exists:users,id',
            'start_at' => 'required|date',
            'end_at' => 'required|date|after:start_at',
            'shift_type' => 'nullable|in:regular,morning,evening,night',
            'notes' => 'nullable|string|max:1000',
            'is_published' => 'nullable|boolean',
        ]);

        $validated['shift_type'] = $validated['shift_type'] ?? 'regular';
        $validated['is_published'] = $validated['is_published'] ?? true;

        if (!$this->checkBranchAccess(Branch::find($validated['branch_id']))) {
            return $this->error('You do not have access to this branch.', 403);
        }

        $shift = Shift::create($validated);

        return response()->json($shift->load(['branch', 'user']), 201);
    }

    public function show($id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::STAFF_SCHEDULING)) {
            return $error;
        }

        $shift = Shift::with(['branch', 'user'])->findOrFail($id);
        if (!$this->checkBranchAccess($shift)) {
            return $this->error('Shift not found.', 404);
        }

        return response()->json($shift);
    }

    public function update(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::STAFF_SCHEDULING)) {
            return $error;
        }
        if ($error = $this->requireScheduleManagement()) {
            return $error;
        }

        $shift = Shift::findOrFail($id);
        if (!$this->checkBranchAccess($shift)) {
            return $this->error('Shift not found.', 404);
        }

        $validated = $request->validate([
            'branch_id' => 'sometimes|exists:branches,id',
            'user_id' => 'sometimes|exists:users,id',
            'start_at' => 'sometimes|date',
            'end_at' => 'sometimes|date',
            'shift_type' => 'nullable|in:regular,morning,evening,night',
            'notes' => 'nullable|string|max:1000',
            'is_published' => 'nullable|boolean',
        ]);

        if (isset($validated['branch_id']) && !$this->checkBranchAccess(Branch::find($validated['branch_id']))) {
            return $this->error('You do not have access to this branch.', 403);
        }

        $shift->update($validated);

        return response()->json($shift->load(['branch', 'user']));
    }

    public function destroy($id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::STAFF_SCHEDULING)) {
            return $error;
        }
        if ($error = $this->requireScheduleManagement()) {
            return $error;
        }

        $shift = Shift::findOrFail($id);
        if (!$this->checkBranchAccess($shift)) {
            return $this->error('Shift not found.', 404);
        }

        $shift->delete();

        return response()->json(['message' => 'Shift deleted successfully']);
    }

    protected function requireScheduleManagement(): ?JsonResponse
    {
        $user = auth()->user();
        if (!$user) {
            return $this->error('Unauthorized.', 401);
        }
        if ($user->role === 'super_admin' || $user->isAnyAdmin() || $user->hasPermission('manage_schedules')) {
            return null;
        }
        return $this->error('You do not have permission to manage schedules.', 403);
    }
}
