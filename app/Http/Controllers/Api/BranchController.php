<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Branch::with('facility');
        if ($request->has('facility_id')) {
            $query->where('facility_id', $request->get('facility_id'));
        }

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('address', 'like', "%{$search}%");
        }

        $branches = $query->orderBy('name')
            ->paginate($request->get('per_page', 15));

        return response()->json($branches);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:1000',
            'facility_id' => 'required|exists:facilities,id',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'is_active' => 'boolean',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ]);

        $branch = Branch::create($validated);
        return response()->json($branch->load('facility'), 201);
    }

    public function show($id): JsonResponse
    {
        return response()->json(Branch::with('facility')->findOrFail($id));
    }

    public function update(Request $request, $id): JsonResponse
    {
        $branch = Branch::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'address' => 'nullable|string|max:1000',
            'facility_id' => 'sometimes|exists:facilities,id',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'is_active' => 'boolean',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ]);
        $branch->update($validated);
        return response()->json($branch->load('facility'));
    }

    public function destroy($id): JsonResponse
    {
        $branch = Branch::findOrFail($id);
        $branch->delete();
        return response()->json(['message' => 'Branch deleted']);
    }

    /**
     * Get residents for a branch
     */
    public function residents(Request $request, $id): JsonResponse
    {
        $branch = Branch::findOrFail($id);
        
        $query = $branch->residents()->with(['branch']);
        
        // Search
        if ($request->has('search') && !empty($request->get('search'))) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('middle_names', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%")
                  ->orWhere('room_number', 'like', "%{$search}%")
                  ->orWhere('room', 'like', "%{$search}%");
            });
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->get('is_active') === 'true');
        } else {
            $query->where('is_active', true); // Default to active only
        }

        $residents = $query->orderBy('first_name')
            ->orderBy('last_name')
            ->paginate($request->get('per_page', 50));

        return response()->json($residents);
    }

    /**
     * Transfer residents from one branch to another
     */
    public function transferResidents(Request $request, $id): JsonResponse
    {
        $branch = Branch::findOrFail($id);
        
        $validated = $request->validate([
            'resident_ids' => 'required|array',
            'resident_ids.*' => 'required|integer|exists:residents,id',
            'target_branch_id' => 'required|integer|exists:branches,id',
        ]);

        $targetBranch = Branch::findOrFail($validated['target_branch_id']);
        
        // Verify both branches belong to the same facility
        if ($branch->facility_id !== $targetBranch->facility_id) {
            return $this->error('Cannot transfer residents between branches of different facilities.', 400);
        }

        // Verify all residents belong to the source branch
        $residents = \App\Models\Resident::whereIn('id', $validated['resident_ids'])
            ->where('branch_id', $branch->id)
            ->get();

        if ($residents->count() !== count($validated['resident_ids'])) {
            return $this->error('Some residents do not belong to this branch.', 400);
        }

        // Transfer residents
        \App\Models\Resident::whereIn('id', $validated['resident_ids'])
            ->update(['branch_id' => $targetBranch->id]);

        return $this->success([
            'message' => 'Residents transferred successfully',
            'transferred_count' => $residents->count(),
        ]);
    }
}


