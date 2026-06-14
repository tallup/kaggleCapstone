<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\SleepRecord;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

class SleepRecordController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = SleepRecord::with(['resident', 'branch', 'createdBy']);
        $currentUser = Auth::user();

        // Apply facility filtering for non-super admins
        if ($currentUser && $currentUser->role !== 'super_admin') {
            // Filter sleep records by branches that belong to the user's facility
            if ($currentUser->facility_id) {
                $query->whereHas('branch', function($q) use ($currentUser) {
                    $q->where('facility_id', $currentUser->facility_id);
                });
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

        // Apply branch filter for caregivers (using the helper method from BaseApiController)
        $this->applyBranchFilter($query, $request, $currentUser);

        // Filter by date
        if ($request->has('date_from')) {
            $query->where('sleep_date', '>=', $request->get('date_from'));
        }

        if ($request->has('date_to')) {
            $query->where('sleep_date', '<=', $request->get('date_to'));
        }

        // Filter by today
        if ($request->has('today') && $request->get('today') === 'true') {
            $query->whereDate('sleep_date', today());
        }

        // Filter by resident
        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        // Note: Branch filtering is handled by applyBranchFilter() above
        // The facility filter ensures only branches from the user's facility are accessible

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->whereHas('resident', function($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%");
            });
        }

        $perPage = (int) $request->get('per_page', 25);
        $perPage = max(1, min(100, $perPage));

        $sleepRecords = $query->orderBy('sleep_date', 'desc')
            ->orderBy('sleep_time', 'desc')
            ->paginate($perPage);

        return response()->json($sleepRecords);
    }

    public function show($id): JsonResponse
    {
        $sleepRecord = SleepRecord::with(['resident', 'branch', 'createdBy'])
            ->findOrFail($id);

        // Check facility access for non-super admins
        $currentUser = Auth::user();
        if ($currentUser && $currentUser->role !== 'super_admin') {
            if ($currentUser->facility_id) {
                // Verify the sleep record's branch belongs to the user's facility
                if (!$sleepRecord->branch || $sleepRecord->branch->facility_id !== $currentUser->facility_id) {
                    return response()->json(['message' => 'Sleep record not found'], 404);
                }
            } else {
                // User has no facility assigned
                return response()->json(['message' => 'Sleep record not found'], 404);
            }
        }

        return response()->json($sleepRecord);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        
        // Allow administrators, super admins, and caregivers to create sleep records without granular permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');
        $isCaregiver = $this->isCaregiver($user);

        if (!$isSuperAdmin && !$isAdmin && !$isCaregiver) {
            if ($error = $this->requirePermission('create_sleep_records')) {
                return $error;
            }
        }

        $validated = $request->validate([
            'resident_id' => 'required|exists:residents,id',
            'branch_id' => 'required|exists:branches,id',
            'sleep_date' => 'required|date',
            'sleep_time' => 'required',
            'wake_time' => 'required',
            'total_sleep_hours' => 'nullable|numeric|min:0|max:24',
            'sleep_quality' => 'nullable|integer|min:1|max:10',
            'restlessness_episodes' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        if ($isCaregiver && $user->assigned_branch_id) {
            $resident = Resident::find($validated['resident_id']);
            if (!$resident || (int) $resident->branch_id !== (int) $user->assigned_branch_id) {
                return response()->json([
                    'message' => 'You do not have permission to create sleep records for residents outside your assigned branch.',
                ], 403);
            }
            if ((int) $validated['branch_id'] !== (int) $user->assigned_branch_id) {
                return response()->json([
                    'message' => 'You do not have permission to create sleep records for residents outside your assigned branch.',
                ], 403);
            }
        }

        $validated['created_by'] = auth()->id();

        // Calculate total sleep hours if not provided
        if (!isset($validated['total_sleep_hours'])) {
            $sleepTime = \Carbon\Carbon::createFromFormat('H:i', $request->sleep_time);
            $wakeTime = \Carbon\Carbon::createFromFormat('H:i', $request->wake_time);
            
            if ($wakeTime->lessThan($sleepTime)) {
                $wakeTime->addDay();
            }
            
            $totalHours = $sleepTime->diffInHours($wakeTime) + ($sleepTime->diffInMinutes($wakeTime) % 60) / 60;
            $validated['total_sleep_hours'] = round($totalHours, 2);
        }

        // If database has 'date' column (old schema), also populate it
        if (Schema::hasColumn('sleep_records', 'date') && isset($validated['sleep_date'])) {
            $validated['date'] = $validated['sleep_date'];
        }

        $sleepRecord = SleepRecord::create($validated);

        return response()->json($sleepRecord->load(['resident', 'branch', 'createdBy']), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = auth()->user();
        
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');
        $isCaregiver = $this->isCaregiver($user);

        if (!$isSuperAdmin && !$isAdmin && !$isCaregiver) {
            if ($error = $this->requirePermission('edit_sleep_records')) {
                return $error;
            }
        }

        $sleepRecord = SleepRecord::findOrFail($id);

        if ($isCaregiver && $user->assigned_branch_id) {
            if (!$sleepRecord->branch_id || (int) $sleepRecord->branch_id !== (int) $user->assigned_branch_id) {
                return response()->json([
                    'message' => 'You do not have permission to edit sleep records outside your assigned branch.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'resident_id' => 'sometimes|exists:residents,id',
            'branch_id' => 'sometimes|exists:branches,id',
            'sleep_date' => 'sometimes|date',
            'sleep_time' => 'sometimes',
            'wake_time' => 'sometimes',
            'total_sleep_hours' => 'nullable|numeric|min:0|max:24',
            'sleep_quality' => 'nullable|integer|min:1|max:10',
            'restlessness_episodes' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        // Recalculate total sleep hours if sleep/wake times changed
        if ($request->has('sleep_time') || $request->has('wake_time')) {
            $sleepTime = \Carbon\Carbon::createFromFormat('H:i', $request->sleep_time ?? $sleepRecord->sleep_time);
            $wakeTime = \Carbon\Carbon::createFromFormat('H:i', $request->wake_time ?? $sleepRecord->wake_time);
            
            if ($wakeTime->lessThan($sleepTime)) {
                $wakeTime->addDay();
            }
            
            $totalHours = $sleepTime->diffInHours($wakeTime) + ($sleepTime->diffInMinutes($wakeTime) % 60) / 60;
            $validated['total_sleep_hours'] = round($totalHours, 2);
        }

        // If database has 'date' column (old schema), also populate it
        if (Schema::hasColumn('sleep_records', 'date') && isset($validated['sleep_date'])) {
            $validated['date'] = $validated['sleep_date'];
        }

        if ($isCaregiver && $user->assigned_branch_id) {
            $finalResidentId = $validated['resident_id'] ?? $sleepRecord->resident_id;
            $finalBranchId = $validated['branch_id'] ?? $sleepRecord->branch_id;
            $resident = Resident::find($finalResidentId);
            if (!$resident || (int) $resident->branch_id !== (int) $user->assigned_branch_id) {
                return response()->json([
                    'message' => 'You do not have permission to assign sleep records to residents outside your assigned branch.',
                ], 403);
            }
            if ((int) $finalBranchId !== (int) $user->assigned_branch_id) {
                return response()->json([
                    'message' => 'You do not have permission to assign sleep records to residents outside your assigned branch.',
                ], 403);
            }
        }
        
        $sleepRecord->update($validated);

        return response()->json($sleepRecord->load(['resident', 'branch', 'createdBy']));
    }

    public function destroy($id): JsonResponse
    {
        $user = auth()->user();
        
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');
        $isCaregiver = $this->isCaregiver($user);

        if (!$isSuperAdmin && !$isAdmin && !$isCaregiver) {
            if ($error = $this->requirePermission('delete_sleep_records')) {
                return $error;
            }
        }

        $sleepRecord = SleepRecord::findOrFail($id);

        if ($isCaregiver && $user->assigned_branch_id) {
            if (!$sleepRecord->branch_id || (int) $sleepRecord->branch_id !== (int) $user->assigned_branch_id) {
                return response()->json([
                    'message' => 'You do not have permission to delete sleep records outside your assigned branch.',
                ], 403);
            }
        }

        $sleepRecord->delete();

        return response()->json(['message' => 'Sleep record deleted successfully']);
    }
}

