<?php

namespace App\Http\Controllers\Api;

use App\Models\Branch;
use App\Models\Resident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BranchController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Branch::with('facility')
            ->withCount(['residents', 'caregivers']);

        if (! $this->isSuperAdmin($user)) {
            if (! $user?->facility_id) {
                return response()->json([
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $request->get('per_page', 15),
                    'total' => 0,
                ]);
            }

            $query->where('facility_id', $user->facility_id);
        } elseif ($request->has('facility_id')) {
            $query->where('facility_id', $request->get('facility_id'));
        }

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        $branches = $query->orderBy('name')
            ->paginate($request->get('per_page', 15));

        return response()->json($branches);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();

        // Allow administrators and super admins to create branches even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && in_array($user->role, ['administrator', 'admin', 'facility_admin', 'manager'], true);

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('create_branches')) {
                return $error;
            }
        }

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

        if (! $isSuperAdmin && (int) $validated['facility_id'] !== (int) $user?->facility_id) {
            return response()->json(['message' => 'You cannot create branches for another facility.'], 403);
        }

        $branch = Branch::create($validated);

        return response()->json($branch->load('facility'), 201);
    }

    public function show($id): JsonResponse
    {
        $branch = Branch::with('facility')->findOrFail($id);
        if (! $this->canAccessBranch($branch, auth()->user())) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json($branch);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = auth()->user();

        // Allow administrators and super admins to edit branches even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && in_array($user->role, ['administrator', 'admin', 'facility_admin', 'manager'], true);

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('edit_branches')) {
                return $error;
            }
        }

        $branch = Branch::findOrFail($id);
        if (! $this->canAccessBranch($branch, $user)) {
            return response()->json(['message' => 'Not found'], 404);
        }

        // Ensure explicit clears from frontend are persisted as null values.
        foreach (['address', 'phone', 'email', 'latitude', 'longitude'] as $nullableField) {
            if ($request->exists($nullableField) && $request->input($nullableField) === '') {
                $request->merge([$nullableField => null]);
            }
        }

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
        if (! $isSuperAdmin && array_key_exists('facility_id', $validated)) {
            if ((int) $validated['facility_id'] !== (int) $user?->facility_id) {
                return response()->json(['message' => 'You cannot move branches to another facility.'], 403);
            }
        }
        $branch->update($validated);

        return response()->json($branch->load('facility'));
    }

    public function destroy($id): JsonResponse
    {
        $user = auth()->user();

        // Allow administrators and super admins to delete branches even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && in_array($user->role, ['administrator', 'admin', 'facility_admin', 'manager'], true);

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('delete_branches')) {
                return $error;
            }
        }

        $branch = Branch::findOrFail($id);
        if (! $this->canAccessBranch($branch, $user)) {
            return response()->json(['message' => 'Not found'], 404);
        }
        $branch->delete();

        return response()->json(['message' => 'Branch deleted']);
    }

    /**
     * Get residents for a branch
     */
    public function residents(Request $request, $id): JsonResponse
    {
        $branch = Branch::findOrFail($id);
        if (! $this->canAccessBranch($branch, $request->user())) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $query = $branch->residents()->with(['branch']);

        // Search
        if ($request->has('search') && ! empty($request->get('search'))) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
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
        $user = $request->user();
        $branch = Branch::findOrFail($id);

        $validated = $request->validate([
            'resident_ids' => 'required|array',
            'resident_ids.*' => 'required|integer|exists:residents,id',
            'target_branch_id' => 'required|integer|exists:branches,id',
        ]);

        $targetBranch = Branch::findOrFail($validated['target_branch_id']);

        if ($this->isCaregiver($user)) {
            return $this->error('Caregivers cannot transfer residents.', 403);
        }

        if (! $this->canAccessBranch($branch, $user) || ! $this->canAccessBranch($targetBranch, $user)) {
            return $this->error('Unauthorized to transfer residents for these branches.', 403);
        }

        // Verify both branches belong to the same facility
        if ($branch->facility_id !== $targetBranch->facility_id) {
            return $this->error('Cannot transfer residents between branches of different facilities.', 400);
        }

        // Verify all residents belong to the source branch
        $residents = Resident::whereIn('id', $validated['resident_ids'])
            ->where('branch_id', $branch->id)
            ->get();

        if ($residents->count() !== count($validated['resident_ids'])) {
            return $this->error('Some residents do not belong to this branch.', 400);
        }

        // Transfer residents
        Resident::whereIn('id', $validated['resident_ids'])
            ->update(['branch_id' => $targetBranch->id]);

        return $this->success([
            'message' => 'Residents transferred successfully',
            'transferred_count' => $residents->count(),
        ]);
    }

    private function isSuperAdmin(?object $user): bool
    {
        return $user instanceof \App\Models\User && $user->isSuperAdmin();
    }

    private function canAccessBranch(Branch $branch, ?object $user): bool
    {
        if ($this->isSuperAdmin($user)) {
            return true;
        }

        if (! $user instanceof \App\Models\User || ! $user->facility_id) {
            return false;
        }

        if ((int) $branch->facility_id !== (int) $user->facility_id) {
            return false;
        }

        if ($this->isCaregiver($user) || $user->isBranchAdmin()) {
            return $user->assigned_branch_id
                && (int) $branch->id === (int) $user->assigned_branch_id;
        }

        return true;
    }
}
