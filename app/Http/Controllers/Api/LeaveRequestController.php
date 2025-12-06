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
        $query = LeaveRequest::with(['staff', 'approvedBy', 'branch']);
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
                $query->where(function($q) use ($facilityId) {
                    $q->whereHas('staff', function($userQuery) use ($facilityId) {
                        $userQuery->where('facility_id', $facilityId);
                    })->orWhereHas('branch', function($branchQuery) use ($facilityId) {
                        $branchQuery->where('facility_id', $facilityId);
                    });
                });
            }
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
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

        // Caregivers can always create their own leave requests
        // Non-caregivers need the create_leave_requests permission
        // Check both the role column and Spatie roles
        $isCaregiver = $user->isCaregiver() || $user->hasRole('caregiver') || 
                       strtolower(trim($user->role ?? '')) === 'caregiver';
        
        if (!$isCaregiver) {
            if ($error = $this->requirePermission('create_leave_requests')) {
                return $error;
            }
        }

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
            
            // If user is a caregiver, force staff_id to be their own ID and status to pending
            if ($isCaregiver) {
                $validated['staff_id'] = $user->id;
                $validated['status'] = 'pending';
                // Set branch_id from user's assigned branch
                if ($user->assigned_branch_id) {
                    $validated['branch_id'] = $user->assigned_branch_id;
                } else {
                    return response()->json([
                        'message' => 'You must be assigned to a branch to submit leave requests. Please contact an administrator.',
                        'errors' => ['branch_id' => ['No branch assigned to your account']]
                    ], 422);
                }
            } else {
                // Admins must provide staff_id
                if (!isset($validated['staff_id'])) {
                    return response()->json([
                        'message' => 'Staff member is required',
                        'errors' => ['staff_id' => ['Please select a staff member']]
                    ], 422);
                }
                // Default status to pending if not provided
                $validated['status'] = $validated['status'] ?? 'pending';
                
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


