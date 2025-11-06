<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveRequestController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = LeaveRequest::with(['staff', 'approvedBy']);
        
        // If user is a caregiver, only show their own leave requests
        if (auth()->user()->hasRole('caregiver')) {
            $query->where('staff_id', auth()->id());
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
        $validated = $request->validate([
            'staff_id' => 'sometimes|exists:users,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'required|string|min:10',
            'status' => 'nullable|in:pending,approved,declined',
        ]);
        
        // If user is a caregiver, force staff_id to be their own ID and status to pending
        if (auth()->user()->hasRole('caregiver')) {
            $validated['staff_id'] = auth()->id();
            $validated['status'] = 'pending';
        } else {
            // Admins must provide staff_id
            if (!isset($validated['staff_id'])) {
                return response()->json(['message' => 'staff_id is required'], 422);
            }
            // Default status to pending if not provided
            $validated['status'] = $validated['status'] ?? 'pending';
        }
        
        $leave = LeaveRequest::create($validated);
        return response()->json($leave->load(['staff', 'approvedBy']), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $leave = LeaveRequest::findOrFail($id);
        
        // Caregivers can only edit their own leave requests
        if (auth()->user()->hasRole('caregiver') && $leave->staff_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $validated = $request->validate([
            'staff_id' => 'sometimes|exists:users,id',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'reason' => 'sometimes|string|min:10',
            'status' => 'nullable|in:pending,approved,declined',
            'approved_by' => 'nullable|exists:users,id',
        ]);
        
        // Caregivers cannot change status or staff_id
        if (auth()->user()->hasRole('caregiver')) {
            unset($validated['status']);
            unset($validated['staff_id']);
            unset($validated['approved_by']);
        }
        
        $leave->update($validated);
        return response()->json($leave->load(['staff', 'approvedBy']));
    }

    public function destroy($id): JsonResponse
    {
        $leave = LeaveRequest::findOrFail($id);
        
        // Caregivers can only delete their own leave requests
        if (auth()->user()->hasRole('caregiver') && $leave->staff_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $leave->delete();
        return response()->json(['message' => 'Leave request deleted']);
    }
}


