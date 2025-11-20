<?php

namespace App\Http\Controllers\Api;

use App\Constants\UserRoles;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class BaseApiController extends Controller
{
    /**
     * Check if user is a caregiver
     */
    protected function isCaregiver(?object $user = null): bool
    {
        $user = $user ?? auth()->user();
        if (!$user) {
            return false;
        }

        return UserRoles::isCaregiverRole($user->role);
    }

    /**
     * Apply branch filtering for caregivers
     */
    protected function applyBranchFilter(Builder $query, Request $request, ?object $user = null): void
    {
        $user = $user ?? $request->user();

        if ($this->isCaregiver($user) && $user->assigned_branch_id) {
            $query->where('branch_id', $user->assigned_branch_id);
        } elseif ($request->has('branch_id')) {
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

        if (!empty($errors)) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $status);
    }

    /**
     * Check branch access for caregivers
     */
    protected function checkBranchAccess($resource, ?object $user = null): bool
    {
        $user = $user ?? auth()->user();

        if (!$this->isCaregiver($user)) {
            return true; // Admins have access
        }

        $branchId = $resource->branch_id ?? $resource->branch?->id ?? null;
        return $user->assigned_branch_id === $branchId;
    }
}


