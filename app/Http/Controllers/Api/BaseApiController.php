<?php

namespace App\Http\Controllers\Api;

use App\Constants\UserRoles;
use App\Http\Controllers\Controller;
use App\Models\Facility;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

abstract class BaseApiController extends Controller
{
    /**
     * Check if user is a caregiver
     */
    protected function isCaregiver(?object $user = null): bool
    {
        $user = $user ?? auth()->user();
        if (! $user) {
            return false;
        }

        return UserRoles::isCaregiverRole($user->role);
    }

    /**
     * Caregivers may view assessments but must not create, edit, delete, or submit answers.
     */
    protected function forbidCaregiverMutation(?object $user = null): ?JsonResponse
    {
        $user = $user ?? auth()->user();
        if ($this->isCaregiver($user)) {
            return $this->error('Caregivers can view assessments but cannot modify them.', 403);
        }

        return null;
    }

    /**
     * Apply branch filtering for caregivers and branch admins
     */
    protected function applyBranchFilter(Builder $query, Request $request, ?object $user = null): void
    {
        $user = $user ?? $request->user();

        // Caregivers are restricted to their assigned branch
        if ($this->isCaregiver($user) && $user->assigned_branch_id) {
            $query->where('branch_id', $user->assigned_branch_id);
        }
        // Branch admins are restricted to their assigned branch
        elseif ($user && $user->isBranchAdmin() && $user->assigned_branch_id) {
            $query->where('branch_id', $user->assigned_branch_id);
        }
        // Facility administrators can see all branches (no filter)
        // Other users can filter by branch_id if provided
        elseif ($request->has('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }
    }

    /**
     * Standardized pagination
     */
    protected function paginate(Request $request, Builder $query, int $defaultPerPage = 50): JsonResponse
    {
        $perPage = (int) $request->get('per_page', $defaultPerPage);
        $perPage = max(1, min(100, $perPage));

        $results = $query->paginate($perPage);

        return response()->json($results);
    }

    /**
     * Standardized success response
     */
    protected function success($data = null, ?string $message = null, int $status = 200): JsonResponse
    {
        $response = [];

        if ($message) {
            $response['message'] = $message;
        }

        if ($data !== null) {
            $response['data'] = $data;
        }

        return response()->json($response, $status);
    }

    /**
     * Standardized error response
     */
    protected function error(string $message, int $status = 400, array $errors = []): JsonResponse
    {
        $response = ['message' => $message];

        if (! empty($errors)) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $status);
    }

    /**
     * Check branch access for caregivers and branch admins
     */
    protected function checkBranchAccess($resource, ?object $user = null): bool
    {
        $user = $user ?? auth()->user();

        // Super admins have access to all resources
        if ($user && ($user->role === 'super_admin' || $user->hasRole('super_admin'))) {
            return true;
        }

        // Facility administrators have access to all branches in their facility
        if ($user && $user->isFacilityAdministrator()) {
            // Check if resource belongs to user's facility
            $branchId = $resource->branch_id ?? $resource->branch?->id ?? null;
            if ($branchId) {
                $branch = \App\Models\Branch::find($branchId);

                return $branch && $branch->facility_id === $user->facility_id;
            }

            return true; // If no branch, allow access
        }

        // Branch admins are restricted to their assigned branch
        if ($user && $user->isBranchAdmin()) {
            $branchId = $resource->branch_id ?? $resource->branch?->id ?? null;

            return $user->assigned_branch_id === $branchId;
        }

        // Caregivers are restricted to their assigned branch
        if ($this->isCaregiver($user)) {
            $branchId = $resource->branch_id ?? $resource->branch?->id ?? null;

            return $user->assigned_branch_id === $branchId;
        }

        return true; // Default: allow access
    }

    /**
     * Check if user has access to a module
     */
    protected function checkModuleAccess(string $module, ?object $user = null): bool
    {
        $user = $user ?? auth()->user();

        if (! $user) {
            return false;
        }

        return $user->hasModuleAccess($module);
    }

    /**
     * Return error response if module access is denied
     */
    protected function requireModuleAccess(string $module, ?object $user = null): ?JsonResponse
    {
        if (! $this->checkModuleAccess($module, $user)) {
            $moduleName = \App\Constants\Modules::getDisplayName($module);

            return $this->error("{$moduleName} module is not available for your facility.", 403);
        }

        return null;
    }

    /**
     * Apply facility filtering to a query builder
     * Filters through branch->facility_id relationship for models with branch_id
     */
    protected function applyFacilityFilter(Builder $query, ?object $user = null): void
    {
        $user = $user ?? auth()->user();

        // Super admins can see all data (no filtering)
        if ($user && $user->role === 'super_admin') {
            return;
        }

        // Facility administrators see all branches in their facility
        // Branch admins see only their assigned branch (handled in applyBranchFilter)
        // Both need facility-level filtering
        $facility = null;
        try {
            $facility = app()->bound('facility') ? app('facility') : null;
        } catch (\Exception $e) {
            $facility = null;
        }

        if (! $facility && $user && $user->facility_id) {
            $facility = \App\Models\Facility::find($user->facility_id);
        }

        if ($facility) {
            // Filter through branch->facility_id relationship
            $query->whereHas('branch', function ($q) use ($facility) {
                $q->where('facility_id', $facility->id);
            });
        }
    }

    /**
     * Check if user has access to a resource through facility
     * Returns true if user is super admin or resource belongs to user's facility
     */
    protected function checkFacilityAccess($resource, ?object $user = null): bool
    {
        $user = $user ?? auth()->user();

        // Super admins have access to all resources
        if ($user && $user->role === 'super_admin') {
            return true;
        }

        // Get facility from app container or user's facility
        $facility = null;
        try {
            $facility = app()->bound('facility') ? app('facility') : null;
        } catch (\Exception $e) {
            $facility = null;
        }

        if (! $facility && $user && $user->facility_id) {
            $facility = \App\Models\Facility::find($user->facility_id);
        }

        if (! $facility) {
            return false;
        }

        // Check if resource's branch belongs to user's facility
        $branchId = $resource->branch_id ?? $resource->branch?->id ?? null;
        if ($branchId) {
            $branch = \App\Models\Branch::find($branchId);

            // Verify branch belongs to facility
            if (! $branch || $branch->facility_id !== $facility->id) {
                return false;
            }

            // If user is branch admin, verify it's their assigned branch
            if ($user && $user->isBranchAdmin() && $user->assigned_branch_id !== $branchId) {
                return false;
            }

            return true;
        }

        return false;
    }

    /**
     * Check if user has a specific permission
     * Returns null if allowed, JsonResponse error if denied
     */
    protected function requirePermission(string $permission, ?object $user = null): ?JsonResponse
    {
        $user = $user ?? auth()->user();

        if (! $user) {
            return $this->error('Unauthorized.', 401);
        }

        if (! $user->hasPermission($permission)) {
            return $this->error('Unauthorized. You do not have permission to perform this action.', 403);
        }

        return null;
    }

    /**
     * Resolve current facility from app container or user record.
     * Returns null for super admins when no facility context is set.
     */
    protected function getCurrentFacility(?object $user = null): ?Facility
    {
        $user = $user ?? auth()->user();

        // Super admins can float between facilities; prefer explicit context
        if ($user && $user->role === 'super_admin') {
            try {
                return app()->bound('facility') ? app('facility') : null;
            } catch (\Exception $e) {
                return null;
            }
        }

        try {
            $facility = app()->bound('facility') ? app('facility') : null;
        } catch (\Exception $e) {
            $facility = null;
        }

        if ($facility) {
            return $facility;
        }

        if ($user && $user->facility_id) {
            return Facility::find($user->facility_id);
        }

        return null;
    }

    /**
     * Resident IDs the user may act on for bulk facility operations (e.g. bulk MAR delete).
     *
     * @param  array<int>  $residentIds
     * @param  int|null  $facilityIdOverride  Super admin: facility to scope residents (when user has no facility_id)
     * @return array<int>
     */
    protected function resolveResidentIdsForBulk(Request $request, array $residentIds, ?int $facilityIdOverride = null): array
    {
        $user = $request->user();
        if (! $user) {
            return [];
        }

        $q = \App\Models\Resident::query()->whereIn('id', $residentIds);

        if ($user->isBranchAdmin() && $user->assigned_branch_id) {
            $q->where('branch_id', $user->assigned_branch_id);
        } else {
            $facilityId = $facilityIdOverride ?? $user->facility_id;
            if ($facilityId) {
                $q->whereHas('branch', function ($b) use ($facilityId) {
                    $b->where('facility_id', $facilityId);
                });
            } else {
                return [];
            }
        }

        return $q->pluck('id')->map(fn ($id) => (int) $id)->all();
    }

    /**
     * Get facility branch IDs with caching for performance.
     * Use this method instead of whereHas('branch') when filtering by facility.
     *
     * @return array Array of branch IDs for the facility
     */
    protected function getFacilityBranchIds(int $facilityId): array
    {
        $cacheKey = "facility.{$facilityId}.branches";

        return Cache::remember($cacheKey, 3600, function () use ($facilityId) {
            return \App\Models\Branch::where('facility_id', $facilityId)
                ->pluck('id')
                ->toArray();
        });
    }
}
