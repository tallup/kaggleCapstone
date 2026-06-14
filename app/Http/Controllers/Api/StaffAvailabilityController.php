<?php

namespace App\Http\Controllers\Api;

use App\Models\StaffAvailability;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class StaffAvailabilityController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::STAFF_SCHEDULING)) {
            return $error;
        }

        $userId = $request->get('user_id');
        $authUser = $request->user();

        // Staff can list only their own unless they have manage_schedules
        if ($userId && (int) $userId !== (int) $authUser->id) {
            if ($error = $this->requireScheduleManagement()) {
                return $error;
            }
        }

        $query = StaffAvailability::with(['user', 'facility'])
            ->orderBy('day_of_week')
            ->orderBy('date')
            ->orderBy('start_time');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->get('user_id'));
        } else {
            // Default to current user's availability for staff without manage_schedules
            if (!$authUser->hasPermission('manage_schedules') && !$authUser->isAnyAdmin()) {
                $query->where('user_id', $authUser->id);
            }
        }

        if ($request->filled('recurring')) {
            if ($request->boolean('recurring')) {
                $query->recurring();
            } else {
                $query->oneOff();
            }
        }

        $perPage = (int) $request->get('per_page', 50);
        $perPage = max(1, min(100, $perPage));
        $items = $query->paginate($perPage);

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::STAFF_SCHEDULING)) {
            return $error;
        }

        $authUser = $request->user();
        $requestedUserId = $request->input('user_id', $authUser->id);

        // Staff can only set own availability unless they have manage_schedules
        if ((int) $requestedUserId !== (int) $authUser->id) {
            if ($error = $this->requireScheduleManagement()) {
                return $error;
            }
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'day_of_week' => 'nullable|integer|min:1|max:7',
            'date' => 'nullable|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'type' => 'nullable|in:available,unavailable',
        ]);

        // Either day_of_week (recurring) or date (one-off), not both
        if (!empty($validated['day_of_week']) && !empty($validated['date'])) {
            return $this->error('Provide either day_of_week (recurring) or date (one-off), not both.', 422);
        }
        if (empty($validated['day_of_week']) && empty($validated['date'])) {
            return $this->error('Provide either day_of_week (recurring) or date (one-off).', 422);
        }

        $facility = $this->getCurrentFacility($authUser);
        if (!$facility) {
            return $this->error('Facility context is required to set availability.', 403);
        }

        $validated['facility_id'] = $facility->id;
        $validated['type'] = $validated['type'] ?? StaffAvailability::TYPE_AVAILABLE;

        $availability = StaffAvailability::create($validated);

        return response()->json($availability->load(['user', 'facility']), 201);
    }

    public function show($id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::STAFF_SCHEDULING)) {
            return $error;
        }

        $availability = StaffAvailability::with(['user', 'facility'])->findOrFail($id);
        $authUser = auth()->user();

        if ((int) $availability->user_id !== (int) $authUser->id && ($err = $this->requireScheduleManagement())) {
            return $err;
        }

        return response()->json($availability);
    }

    public function update(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::STAFF_SCHEDULING)) {
            return $error;
        }

        $availability = StaffAvailability::findOrFail($id);
        $authUser = $request->user();

        if ((int) $availability->user_id !== (int) $authUser->id && ($err = $this->requireScheduleManagement())) {
            return $err;
        }

        $validated = $request->validate([
            'day_of_week' => 'nullable|integer|min:1|max:7',
            'date' => 'nullable|date',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i',
            'type' => 'nullable|in:available,unavailable',
        ]);

        if (isset($validated['end_time']) && isset($validated['start_time']) && $validated['end_time'] <= $validated['start_time']) {
            return $this->error('end_time must be after start_time.', 422);
        }

        $availability->update($validated);

        return response()->json($availability->load(['user', 'facility']));
    }

    public function destroy($id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::STAFF_SCHEDULING)) {
            return $error;
        }

        $availability = StaffAvailability::findOrFail($id);
        $authUser = auth()->user();

        if ((int) $availability->user_id !== (int) $authUser->id && ($err = $this->requireScheduleManagement())) {
            return $err;
        }

        $availability->delete();

        return response()->json(['message' => 'Availability deleted successfully']);
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
