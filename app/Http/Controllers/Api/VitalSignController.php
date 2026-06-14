<?php

namespace App\Http\Controllers\Api;

use App\Models\VitalSign;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class VitalSignController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = VitalSign::with(['resident', 'takenBy']);
        $user = $request->user();
        $currentUser = Auth::user();

        // Apply facility filtering for non-super admins
        if ($currentUser && $currentUser->role !== 'super_admin') {
            // Filter vital signs by branches that belong to the user's facility
            if ($currentUser->facility_id) {
                // Use optimized whereIn pattern instead of whereHas for better performance
                $branchIds = $this->getFacilityBranchIds($currentUser->facility_id);
                if (!empty($branchIds)) {
                    $query->whereIn('branch_id', $branchIds);
                } else {
                    // No branches for facility, return empty results
                    return response()->json([
                        'data' => [],
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => $request->get('per_page', 25),
                        'total' => 0
                    ]);
                }
            } else {
                // User has no facility assigned, return empty results
                return response()->json([
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $request->get('per_page', 25),
                    'total' => 0
                ]);
            }
        }

        // Apply branch filter for caregivers
        if ($this->isCaregiver($user)) {
            if ($user->assigned_branch_id) {
                $query->where('branch_id', $user->assigned_branch_id);
            } else {
                // Caregivers without a branch assignment should not see any vitals
                $query->whereRaw('1 = 0');
            }
        }

        // Filter by date
        if ($request->has('date_from')) {
            $query->where('measurement_date', '>=', $request->get('date_from'));
        }

        if ($request->has('date_to')) {
            $query->where('measurement_date', '<=', $request->get('date_to'));
        }

        // Filter by resident
        if ($request->has('resident_id')) {
            $residentId = $request->get('resident_id');

            if ($user && $user->hasRole('caregiver')) {
                $residentBranch = \App\Models\Resident::where('id', $residentId)->value('branch_id');
                if ($user->assigned_branch_id && (int) $residentBranch !== (int) $user->assigned_branch_id) {
                    return response()->json([
                        'message' => 'You do not have permission to view vitals for this resident.',
                    ], 403);
                }
            }

            $query->where('resident_id', $residentId);
        }

        // Filter by today
        if ($request->has('today') && $request->get('today') === 'true') {
            $query->whereDate('measurement_date', today());
        }

        $perPage = (int) $request->get('per_page', 25);
        $perPage = max(1, min(100, $perPage));

        $vitals = $query->orderBy('measurement_date', 'desc')
            ->paginate($perPage);

        return response()->json($vitals);
    }

    public function show($id): JsonResponse
    {
        $vital = VitalSign::with(['resident', 'takenBy', 'branch'])
            ->findOrFail($id);

        // Check facility access for non-super admins
        $currentUser = Auth::user();
        if ($currentUser && $currentUser->role !== 'super_admin') {
            if ($currentUser->facility_id) {
                // Verify the vital sign's branch belongs to the user's facility
                if (!$vital->branch || $vital->branch->facility_id !== $currentUser->facility_id) {
                    return response()->json(['message' => 'Vital sign not found'], 404);
                }
            } else {
                // User has no facility assigned
                return response()->json(['message' => 'Vital sign not found'], 404);
            }
        }

        return response()->json($vital);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        
        // Allow administrators, super admins, and caregivers to create vitals even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');
        $isCaregiver = $this->isCaregiver($user);
        
        // Check permission only if user is not an admin, super admin, or caregiver
        if (!$isSuperAdmin && !$isAdmin && !$isCaregiver) {
        if ($error = $this->requirePermission('create_vitals')) {
            return $error;
            }
        }

        $validated = $request->validate([
            'resident_id' => 'required|exists:residents,id',
            'branch_id' => 'nullable|exists:branches,id',
            'measurement_date' => 'required|date',
            'systolic' => 'nullable|integer|min:0|max:300',
            'diastolic' => 'nullable|integer|min:0|max:200',
            'temperature' => 'nullable|numeric|min:90|max:110',
            'pulse' => 'nullable|integer|min:0|max:200',
            'oxygen_saturation' => 'nullable|integer|min:0|max:100',
            'pain_level' => 'nullable|integer|min:0|max:10',
            'pain_description' => 'nullable|string|max:255',
            'reason_declined' => 'nullable|string|max:255',
            'status' => 'nullable|in:approved,pending_review,declined,critical',
            'notes' => 'nullable|string',
        ]);

        // If branch_id not provided, infer from resident
        if (!isset($validated['branch_id'])) {
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if ($resident) {
                $validated['branch_id'] = $resident->branch_id;
            }
        }

        // Check branch access for caregivers
        if ($isCaregiver && $user->assigned_branch_id) {
            // Verify the resident belongs to the caregiver's branch
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if (!$resident || (int) $resident->branch_id !== (int) $user->assigned_branch_id) {
                return response()->json([
                    'message' => 'You do not have permission to create vital signs for residents outside your assigned branch.',
                ], 403);
            }
            // Also verify branch_id matches if provided
            if (isset($validated['branch_id']) && (int) $validated['branch_id'] !== (int) $user->assigned_branch_id) {
                return response()->json([
                    'message' => 'You do not have permission to create vital signs for residents outside your assigned branch.',
                ], 403);
            }
        }

        // Set taken_by to current user
        $validated['taken_by'] = auth()->id();

        // Auto-determine status if not provided
        if (!isset($validated['status'])) {
            $vital = new \App\Models\VitalSign($validated);
            $validated['status'] = $vital->determineStatus();
        }

        $vital = VitalSign::create($validated);

        // Notify admins
        try {
            $admins = \App\Models\User::where(function($query) {
                    $query->whereIn('role', ['admin', 'administrator', 'super_admin']);
                })
                ->orWhereHas('roles', fn($q) => $q->whereIn('name', ['admin', 'administrator', 'super_admin']))
                ->get();
                
            app(\App\Services\NotificationService::class)->sendVitalSignEmail(
                $vital, 
                $admins,
                $vital->status === 'critical'
            );
        } catch (\Exception $e) {
            \Log::error('Failed to trigger vital sign notification', ['error' => $e->getMessage()]);
        }

        return response()->json($vital->load(['resident', 'takenBy']), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = auth()->user();
        
        // Allow administrators, super admins, and caregivers to edit vitals even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');
        $isCaregiver = $this->isCaregiver($user);
        
        // Check permission only if user is not an admin, super admin, or caregiver
        if (!$isSuperAdmin && !$isAdmin && !$isCaregiver) {
        if ($error = $this->requirePermission('edit_vitals')) {
            return $error;
            }
        }

        $vital = VitalSign::findOrFail($id);

        // Check branch access for caregivers
        if ($isCaregiver && $user->assigned_branch_id) {
            if (!$vital->branch_id || (int) $vital->branch_id !== (int) $user->assigned_branch_id) {
                return response()->json([
                    'message' => 'You do not have permission to edit vital signs outside your assigned branch.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'resident_id' => 'sometimes|exists:residents,id',
            'branch_id' => 'nullable|exists:branches,id',
            'measurement_date' => 'sometimes|date',
            'systolic' => 'nullable|integer|min:0|max:300',
            'diastolic' => 'nullable|integer|min:0|max:200',
            'temperature' => 'nullable|numeric|min:90|max:110',
            'pulse' => 'nullable|integer|min:0|max:200',
            'oxygen_saturation' => 'nullable|integer|min:0|max:100',
            'pain_level' => 'nullable|integer|min:0|max:10',
            'pain_description' => 'nullable|string|max:255',
            'reason_declined' => 'nullable|string|max:255',
            'status' => 'nullable|in:approved,pending_review,declined,critical',
            'notes' => 'nullable|string',
        ]);

        // Re-determine status if vital signs changed
        if (isset($validated['systolic']) || isset($validated['diastolic']) || 
            isset($validated['temperature']) || isset($validated['pulse']) || 
            isset($validated['oxygen_saturation'])) {
            $vital->fill($validated);
            $validated['status'] = $vital->determineStatus();
        }

        $vital->update($validated);

        return response()->json($vital->load(['resident', 'takenBy']));
    }

    public function destroy($id): JsonResponse
    {
        $user = auth()->user();
        
        // Allow administrators and super admins to delete vitals even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');
        
        // Check permission only if user is not an admin or super admin
        if (!$isSuperAdmin && !$isAdmin) {
        if ($error = $this->requirePermission('delete_vitals')) {
            return $error;
            }
        }

        $vital = VitalSign::findOrFail($id);
        $vital->delete();

        return response()->json(['message' => 'Vital sign deleted successfully']);
    }
}

