<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VitalRange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class VitalRangeController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = VitalRange::query();
        $ranges = $query->orderBy('parameter')->paginate($request->get('per_page', 50));
        return response()->json($ranges);
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Allow administrators and super admins to create vital ranges even without specific permission
            $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
            $isAdmin = $user && $user->isAnyAdmin();
            
            // Check permission only if user is not an admin or super admin
            if (!$isSuperAdmin && !$isAdmin) {
                if ($error = $this->requirePermission('create_vital_ranges')) {
                    return $error;
                }
            }

            $validated = $request->validate([
                'parameter' => 'required|string|max:100|unique:vital_ranges,parameter',
                'min_normal' => 'nullable|numeric',
                'max_normal' => 'nullable|numeric',
                'min_warning' => 'nullable|numeric',
                'max_warning' => 'nullable|numeric',
                'min_critical' => 'nullable|numeric',
                'max_critical' => 'nullable|numeric',
                'unit' => 'nullable|string|max:50',
                'description' => 'nullable|string',
                'is_active' => 'nullable|boolean',
            ]);

            $range = VitalRange::create($validated);
            return response()->json($range, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating vital range', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);
            
            return response()->json([
                'message' => 'Failed to create vital range',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred while creating the vital range.',
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Allow administrators and super admins to edit vital ranges even without specific permission
            $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
            $isAdmin = $user && $user->isAnyAdmin();
            
            // Check permission only if user is not an admin or super admin
            if (!$isSuperAdmin && !$isAdmin) {
                if ($error = $this->requirePermission('edit_vital_ranges')) {
                    return $error;
                }
            }

            $range = VitalRange::findOrFail($id);
            $validated = $request->validate([
                'parameter' => 'sometimes|required|string|max:100|unique:vital_ranges,parameter,' . $id,
                'min_normal' => 'nullable|numeric',
                'max_normal' => 'nullable|numeric',
                'min_warning' => 'nullable|numeric',
                'max_warning' => 'nullable|numeric',
                'min_critical' => 'nullable|numeric',
                'max_critical' => 'nullable|numeric',
                'unit' => 'nullable|string|max:50',
                'description' => 'nullable|string',
                'is_active' => 'nullable|boolean',
            ]);
            $range->update($validated);
            return response()->json($range);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error updating vital range', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'id' => $id,
                'request' => $request->all(),
            ]);
            
            return response()->json([
                'message' => 'Failed to update vital range',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred while updating the vital range.',
            ], 500);
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $user = auth()->user();
            
            // Allow administrators and super admins to delete vital ranges even without specific permission
            $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
            $isAdmin = $user && $user->isAnyAdmin();
            
            // Check permission only if user is not an admin or super admin
            if (!$isSuperAdmin && !$isAdmin) {
                if ($error = $this->requirePermission('delete_vital_ranges')) {
                    return $error;
                }
            }

            VitalRange::findOrFail($id)->delete();
            return response()->json(['message' => 'Vital range deleted']);
        } catch (\Exception $e) {
            Log::error('Error deleting vital range', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'id' => $id,
            ]);
            
            return response()->json([
                'message' => 'Failed to delete vital range',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred while deleting the vital range.',
            ], 500);
        }
    }
}


