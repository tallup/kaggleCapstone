<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveRequestController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        // Use withoutGlobalScopes to prevent any global scope from adding facility_id directly
        $query = LeaveRequest::withoutGlobalScopes()->with(['staff', 'approvedBy', 'branch']);
        $currentUser = auth()->user();
        
        // If user is a caregiver, only show their own leave requests
        $isCaregiver = $currentUser->isCaregiver() || $currentUser->hasRole('caregiver') || 
                       strtolower(trim($currentUser->role ?? '')) === 'caregiver';
        
        if ($isCaregiver) {
            $query->where('staff_id', $currentUser->id);
        } else {
            // For non-caregivers, filter by facility
            // Super admins can see all leave requests
            if ($currentUser->role !== 'super_admin' && $currentUser->facility_id) {
                // Filter by leave requests where the staff member belongs to the user's facility
                // OR where the branch belongs to the user's facility
                $facilityId = $currentUser->facility_id;
                // Use optimized whereIn pattern for branch filtering
                $branchIds = $this->getFacilityBranchIds($facilityId);
                $query->where(function($q) use ($facilityId, $branchIds) {
                    $q->whereHas('staff', function($userQuery) use ($facilityId) {
                        $userQuery->where('facility_id', $facilityId);
                    });
                    if (!empty($branchIds)) {
                        $q->orWhereIn('branch_id', $branchIds);
                    }
                });
            }
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }
        
        // Filter by date range if provided
        if ($request->has('date_from')) {
            $query->whereDate('start_date', '>=', $request->get('date_from'));
        }
        if ($request->has('date_to')) {
            $query->whereDate('end_date', '<=', $request->get('date_to'));
        }
        
        $leaves = $query->orderBy('start_date', 'desc')
            ->paginate($request->get('per_page', 15));
        
        return response()->json($leaves);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // All authenticated users can create their own leave requests
        // Check if user is creating for themselves or for another staff member
        $isCaregiver = $user->isCaregiver() || $user->hasRole('caregiver') || 
                       strtolower(trim($user->role ?? '')) === 'caregiver';
        
        // If creating for another staff member (not themselves), need permission
        $requestedStaffId = $request->input('staff_id');
        if ($requestedStaffId && $requestedStaffId != $user->id) {
            // Creating leave request for someone else - need permission
            if ($error = $this->requirePermission('create_leave_requests')) {
                return $error;
            }
        }
        // If creating for themselves, no permission check needed

        try {
            $validated = $request->validate([
                'staff_id' => 'sometimes|exists:users,id',
                'start_date' => 'required|date',
                'end_date' => 'required|date|after_or_equal:start_date',
                'leave_type' => 'nullable|string',
                'reason' => 'required|string|min:10',
                'status' => 'nullable|in:pending,approved,declined',
            ]);
            
            // Set default leave_type if not provided
            if (!isset($validated['leave_type']) || empty($validated['leave_type'])) {
                $validated['leave_type'] = 'Personal';
            }
            
            // If staff_id is not provided, assume user is creating for themselves
            if (!isset($validated['staff_id'])) {
                $validated['staff_id'] = $user->id;
            }
            
            // If user is creating for themselves, force status to pending
            if ($validated['staff_id'] == $user->id) {
                $validated['status'] = 'pending';
            } else {
                // Creating for someone else - default to pending if not provided
                $validated['status'] = $validated['status'] ?? 'pending';
            }
            
            // Get branch_id from the selected staff member
            $staff = \App\Models\User::find($validated['staff_id']);
            if ($staff && $staff->assigned_branch_id) {
                $validated['branch_id'] = $staff->assigned_branch_id;
            } else {
                return response()->json([
                    'message' => 'The selected staff member must be assigned to a branch.',
                    'errors' => ['staff_id' => ['Selected staff member has no branch assignment']]
                ], 422);
            }
            
            // Ensure branch_id is set (required by database)
            if (!isset($validated['branch_id'])) {
                return response()->json([
                    'message' => 'Unable to determine branch. Please ensure the staff member has an assigned branch.',
                    'errors' => ['branch_id' => ['Branch assignment required']]
                ], 422);
            }
            
            $leave = LeaveRequest::create($validated);
            return response()->json($leave->load(['staff', 'approvedBy']), 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Leave request creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => auth()->id(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'message' => 'An error occurred while creating the leave request. Please try again or contact support.',
                'error' => config('app.debug') ? $e->getMessage() : 'Server error'
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        if ($error = $this->requirePermission('edit_leave_requests')) {
            return $error;
        }

        $leave = LeaveRequest::findOrFail($id);
        
        // Caregivers can only edit their own leave requests
        $isCaregiver = auth()->user()->isCaregiver() || auth()->user()->hasRole('caregiver') || 
                       strtolower(trim(auth()->user()->role ?? '')) === 'caregiver';
        
        if ($isCaregiver && $leave->staff_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $validated = $request->validate([
            'staff_id' => 'sometimes|exists:users,id',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'leave_type' => 'nullable|string',
            'reason' => 'sometimes|string|min:10',
            'status' => 'nullable|in:pending,approved,declined',
            'approved_by' => 'nullable|exists:users,id',
        ]);
        
        // Set default leave_type if not provided
        if (isset($validated['leave_type']) && empty($validated['leave_type'])) {
            $validated['leave_type'] = 'Personal';
        } elseif (!isset($validated['leave_type'])) {
            // Keep existing leave_type if not being updated
            unset($validated['leave_type']);
        }
        
        // Caregivers cannot change status or staff_id
        if ($isCaregiver) {
            unset($validated['status']);
            unset($validated['staff_id']);
            unset($validated['approved_by']);
        }
        
        // If staff_id is being updated, update branch_id accordingly
        if (isset($validated['staff_id']) && $validated['staff_id'] != $leave->staff_id) {
            $staff = \App\Models\User::find($validated['staff_id']);
            if ($staff && $staff->assigned_branch_id) {
                $validated['branch_id'] = $staff->assigned_branch_id;
            }
        }
        
        // If status is being changed to approved or declined, set approved_by and approved_at
        if (isset($validated['status']) && in_array($validated['status'], ['approved', 'declined'])) {
            if (!isset($validated['approved_by'])) {
                $validated['approved_by'] = auth()->id();
            }
            if (!isset($validated['approved_at'])) {
                $validated['approved_at'] = now();
            }
        }
        
        $leave->update($validated);
        return response()->json($leave->load(['staff', 'approvedBy']));
    }

    public function destroy($id): JsonResponse
    {
        if ($error = $this->requirePermission('delete_leave_requests')) {
            return $error;
        }

        $leave = LeaveRequest::findOrFail($id);
        
        // Caregivers can only delete their own leave requests
        $isCaregiver = auth()->user()->isCaregiver() || auth()->user()->hasRole('caregiver') || 
                       strtolower(trim(auth()->user()->role ?? '')) === 'caregiver';
        
        if ($isCaregiver && $leave->staff_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $leave->delete();
        return response()->json(['message' => 'Leave request deleted']);
    }
}


