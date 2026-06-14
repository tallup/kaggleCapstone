<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FireDrill;
use App\Models\FireDrillTemplate;
use App\Models\Branch;
use App\Constants\Modules;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class FireDrillController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $query = FireDrill::with(['branch', 'createdBy']);
        $user = $request->user();
        $currentUser = Auth::user();
        $isCaregiver = $user && in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse']);

        // Facility scoping via helper (covers super-admin context switching)
        $this->applyFacilityFilter($query, $currentUser);
        
        // Filter by branch for caregivers
        if ($isCaregiver && $user->assigned_branch_id) {
            $query->where('branch_id', $user->assigned_branch_id);
        }

        // Filter by branch_id parameter (for non-caregivers - caregivers are already filtered above)
        if (!$isCaregiver && $request->has('branch_id') && !empty($request->get('branch_id'))) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        // Filter by date range
        if ($request->has('date_from')) {
            $query->whereDate('scheduled_date', '>=', $request->get('date_from'));
        }

        if ($request->has('date_to')) {
            $query->whereDate('scheduled_date', '<=', $request->get('date_to'));
        }

        // Filter upcoming drills
        if ($request->has('upcoming') && $request->get('upcoming') === 'true') {
            $query->where('status', 'scheduled')
                  ->whereDate('scheduled_date', '>=', now()->toDateString());
        }

        $perPage = (int) $request->get('per_page', 50);
        $perPage = max(1, min(100, $perPage));
        $drills = $query->orderBy('scheduled_date', 'desc')
                       ->orderBy('scheduled_time', 'desc')
                       ->paginate($perPage);

        return response()->json($drills);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'scheduled_date' => 'required|date',
            'scheduled_time' => 'required|date_format:H:i:s',
            'status' => 'required|in:scheduled,completed,cancelled',
            'notes' => 'nullable|string',
            'completed_at' => 'nullable|date',
        ]);

        // Ensure branch belongs to the current facility (except super admins without context)
        $facility = $this->getCurrentFacility($request->user());
        if ($facility) {
            $branch = Branch::find($validated['branch_id']);
            if (!$branch || $branch->facility_id !== $facility->id) {
                return response()->json([
                    'message' => 'The selected branch does not belong to your facility.',
                ], 403);
            }
        }

        $validated['created_by'] = auth()->id();

        // Set completed_at if status is completed
        if ($validated['status'] === 'completed' && !isset($validated['completed_at'])) {
            $validated['completed_at'] = now();
        }

        $drill = FireDrill::create($validated);

        return response()->json($drill->load(['branch', 'createdBy']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id): JsonResponse
    {
        $drill = FireDrill::with(['branch', 'createdBy'])->findOrFail($id);

        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        if (!$this->checkFacilityAccess($drill)) {
                return response()->json(['message' => 'Fire drill not found'], 404);
        }

        return response()->json($drill);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $drill = FireDrill::findOrFail($id);

        if (!$this->checkFacilityAccess($drill)) {
            return response()->json(['message' => 'Fire drill not found'], 404);
        }

        $validated = $request->validate([
            'branch_id' => 'sometimes|required|exists:branches,id',
            'scheduled_date' => 'sometimes|required|date',
            'scheduled_time' => 'sometimes|required|date_format:H:i:s',
            'status' => 'sometimes|required|in:scheduled,completed,cancelled',
            'notes' => 'nullable|string',
            'completed_at' => 'nullable|date',
        ]);

        // Set completed_at if status is being changed to completed
        if (isset($validated['status']) && $validated['status'] === 'completed' && !isset($validated['completed_at'])) {
            $validated['completed_at'] = now();
        }

        // Clear completed_at if status is changed from completed
        if (isset($validated['status']) && $validated['status'] !== 'completed') {
            $validated['completed_at'] = null;
        }

        // Ensure branch stays within facility context when changed
        if (isset($validated['branch_id'])) {
            $facility = $this->getCurrentFacility($request->user());
            if ($facility) {
                $branch = Branch::find($validated['branch_id']);
                if (!$branch || $branch->facility_id !== $facility->id) {
                    return response()->json([
                        'message' => 'The selected branch does not belong to your facility.',
                    ], 403);
                }
            }
        }

        $drill->update($validated);

        return response()->json($drill->load(['branch', 'createdBy']));
    }

    /**
     * Mark fire drill as complete.
     */
    public function markComplete($id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $drill = FireDrill::findOrFail($id);

        if (!$this->checkFacilityAccess($drill)) {
            return response()->json(['message' => 'Fire drill not found'], 404);
        }
        
        if ($drill->status !== 'scheduled') {
            return response()->json([
                'message' => 'Only scheduled fire drills can be marked as complete.',
            ], 400);
        }

        $drill->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        return response()->json($drill->load(['branch', 'createdBy']));
    }

    /**
     * Cancel fire drill.
     */
    public function cancel($id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $drill = FireDrill::findOrFail($id);

        if (!$this->checkFacilityAccess($drill)) {
            return response()->json(['message' => 'Fire drill not found'], 404);
        }
        
        if ($drill->status !== 'scheduled') {
            return response()->json([
                'message' => 'Only scheduled fire drills can be cancelled.',
            ], 400);
        }

        $drill->update([
            'status' => 'cancelled',
        ]);

        return response()->json($drill->load(['branch', 'createdBy']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $drill = FireDrill::findOrFail($id);

        if (!$this->checkFacilityAccess($drill)) {
            return response()->json(['message' => 'Fire drill not found'], 404);
        }
        $drill->delete();

        return response()->json(['message' => 'Fire drill deleted successfully']);
    }

    /**
     * Create fire drills from a template (supports recurring generation)
     */
    public function createFromTemplate(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FIRE_DRILLS)) {
            return $error;
        }

        $validated = $request->validate([
            'template_id' => 'required|exists:fire_drill_templates,id',
            'start_date' => 'required|date',
            'occurrences' => 'nullable|integer|min:1|max:12',
        ]);

        $template = FireDrillTemplate::with('branch')->findOrFail($validated['template_id']);

        if (!$this->checkFacilityAccess($template)) {
            return response()->json(['message' => 'Template not found'], 404);
        }

        $occurrences = $validated['occurrences'] ?? 1;
        $startDate = Carbon::parse($validated['start_date']);
        $dayOfMonth = $template->day_of_month ?? $startDate->day;

        $createdIds = [];
        for ($i = 0; $i < $occurrences; $i++) {
            $date = $startDate->copy();
            if ($i > 0) {
                $incrementMonths = $template->frequency === 'quarterly' ? 3 * $i : 1 * $i;
                $date->addMonths($incrementMonths);
            }
            $date->day($dayOfMonth);

            $drill = FireDrill::create([
                'branch_id' => $template->branch_id,
                'scheduled_date' => $date->toDateString(),
                'scheduled_time' => $template->scheduled_time ?? '10:00:00',
                'status' => 'scheduled',
                'notes' => $template->notes,
                'created_by' => auth()->id(),
            ]);

            $createdIds[] = $drill->id;
        }

        $created = FireDrill::with(['branch', 'createdBy'])->whereIn('id', $createdIds)->get();

        return response()->json([
            'message' => 'Fire drills created from template.',
            'data' => $created,
        ], 201);
    }
}