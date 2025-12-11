<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FireDrillTemplate;
use App\Models\Branch;
use App\Constants\Modules;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FireDrillTemplateController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $query = FireDrillTemplate::with(['branch', 'createdBy']);
        $user = $request->user();
        $isCaregiver = $user && in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse']);
        
        // Facility scoping
        $this->applyFacilityFilter($query, $user);
        
        // Filter by branch for caregivers
        if ($isCaregiver && $user->assigned_branch_id) {
            $query->where('branch_id', $user->assigned_branch_id);
        }

        // Filter by branch
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        // Filter by frequency
        if ($request->has('frequency')) {
            $query->where('frequency', $request->get('frequency'));
        }

        $perPage = (int) $request->get('per_page', 50);
        $perPage = max(1, min(100, $perPage));
        $templates = $query->orderBy('name')->paginate($perPage);

        return response()->json($templates);
    }

    public function store(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'frequency' => 'required|in:monthly,quarterly',
            'day_of_month' => 'nullable|integer|min:1|max:31',
            'scheduled_time' => 'required|date_format:H:i:s',
            'notes' => 'nullable|string',
        ]);

        $facility = $this->getCurrentFacility($request->user());
        if ($facility) {
            $branch = Branch::find($validated['branch_id']);
            if (!$branch || $branch->facility_id !== $facility->id) {
                return response()->json(['message' => 'The selected branch does not belong to your facility.'], 403);
            }
        }

        $validated['created_by'] = auth()->id();
        $template = FireDrillTemplate::create($validated);

        return response()->json($template->load(['branch', 'createdBy']), 201);
    }

    public function show(string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $template = FireDrillTemplate::with(['branch', 'createdBy'])->findOrFail($id);

        if (!$this->checkFacilityAccess($template)) {
            return response()->json(['message' => 'Template not found'], 404);
        }

        return response()->json($template);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $template = FireDrillTemplate::findOrFail($id);

        if (!$this->checkFacilityAccess($template)) {
            return response()->json(['message' => 'Template not found'], 404);
        }

        $validated = $request->validate([
            'branch_id' => 'sometimes|exists:branches,id',
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'frequency' => 'sometimes|in:monthly,quarterly',
            'day_of_month' => 'nullable|integer|min:1|max:31',
            'scheduled_time' => 'sometimes|date_format:H:i:s',
            'notes' => 'nullable|string',
        ]);

        if (isset($validated['branch_id'])) {
            $facility = $this->getCurrentFacility($request->user());
            if ($facility) {
                $branch = Branch::find($validated['branch_id']);
                if (!$branch || $branch->facility_id !== $facility->id) {
                    return response()->json(['message' => 'The selected branch does not belong to your facility.'], 403);
                }
            }
        }

        $template->update($validated);

        return response()->json($template->load(['branch', 'createdBy']));
    }

    public function destroy(string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $template = FireDrillTemplate::findOrFail($id);

        if (!$this->checkFacilityAccess($template)) {
            return response()->json(['message' => 'Template not found'], 404);
        }

        $template->delete();

        return response()->json(['message' => 'Fire drill template deleted successfully']);
    }
}
