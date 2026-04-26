<?php

namespace App\Http\Controllers\Api;

use App\Constants\UserRoles;
use App\Http\Requests\Api\Resident\StoreResidentRequest;
use App\Http\Requests\Api\Resident\UpdateResidentRequest;
use App\Http\Requests\Api\Resident\UpdateResidentStatusRequest;
use App\Http\Resources\Api\ResidentResource;
use App\Models\Resident;
use App\Models\ResidentStatusEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ResidentController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Resident::with(['branch']);
        $user = $request->user();
        $caregiverBranchId = null;

        // Check if user is a caregiver
        $isCaregiver = $this->isCaregiver($user);
        
        if ($isCaregiver) {
            $caregiverBranchId = (int) ($user->assigned_branch_id ?? 0);

            if ($caregiverBranchId === 0) {
                // No branch assignment means the caregiver should not see any residents
                $query->whereRaw('1 = 0');
            } else {
                if ($request->filled('branch_id') && (int) $request->get('branch_id') !== $caregiverBranchId) {
                    return $this->error('You may only view residents in your assigned branch.', 403);
                }

                $query->where('branch_id', $caregiverBranchId);
            }
        }

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

        // Filter by branch (only for non-caregivers - caregivers are already filtered above)
        if (!$isCaregiver && $request->has('branch_id') && !empty($request->get('branch_id'))) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        // Filter by status
        if ($request->has('status')) {
            if ($request->get('status') === 'active') {
                $query->active();
            } elseif ($request->get('status') === 'inactive') {
                $query->inactive();
            }
        }

        if ($request->filled('lifecycle_status')) {
            $query->lifecycleStatus($request->get('lifecycle_status'));
        }

        if ($request->has('temporary_status')) {
            $temporaryStatus = $request->get('temporary_status');
            $query->temporaryStatus($temporaryStatus === '' ? null : $temporaryStatus);
        }

        // Only filter by active if explicitly requested and show_all is not set
        if (!$request->has('show_all') && !$request->has('status')) {
            // Default: show active residents, but allow all if show_all is set
            $query->active();
        }

        $query->orderBy('created_at', 'desc');
        
        $perPage = (int) $request->get('per_page', 50);
        $perPage = max(1, min(100, $perPage));
        $residents = $query->paginate($perPage);

        return response()->json([
            'data' => ResidentResource::collection($residents->items()),
            'current_page' => $residents->currentPage(),
            'per_page' => $residents->perPage(),
            'total' => $residents->total(),
            'last_page' => $residents->lastPage(),
            'from' => $residents->firstItem(),
            'to' => $residents->lastItem(),
        ]);
    }

    public function show($id): JsonResponse
    {
        $resident = Resident::with([
                'branch',
                'appointments',
                'vitalSigns',
                'sleepRecords',
                'sleepPatterns',
                'medicationOrders' => function($query) {
                    // Remove global scope to ensure all medications for this resident are loaded
                    // We've already verified access to the resident, so we can show all their medications
                    $query->withoutGlobalScopes()
                        ->orderBy('start_date', 'desc');
                },
                'medicationOrders.drug',
            ])
            ->findOrFail($id);

        $user = request()->user();
        if ($this->isCaregiver($user)) {
            $caregiverBranchId = (int) ($user->assigned_branch_id ?? 0);
            if ($caregiverBranchId === 0 || (int) $resident->branch_id !== $caregiverBranchId) {
                return $this->error('You do not have permission to view this resident.', 403);
            }
        }

        return $this->success(new ResidentResource($resident));
    }

    public function appointments($id): JsonResponse
    {
        $resident = Resident::findOrFail($id);
        $user = request()->user();
        $isCaregiver = $user && in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse']);
        if ($isCaregiver) {
            $caregiverBranchId = (int) ($user->assigned_branch_id ?? 0);
            if ($caregiverBranchId === 0 || (int) $resident->branch_id !== $caregiverBranchId) {
                return response()->json([
                    'message' => 'You do not have permission to view appointments for this resident.',
                ], 403);
            }
        }

        $appointments = $resident->appointments()
            ->with(['healthcareProvider'])
            ->orderBy('appointment_date', 'desc')
            ->paginate(15);

        return response()->json($appointments);
    }

    public function vitals($id): JsonResponse
    {
        $resident = Resident::findOrFail($id);
        $user = request()->user();
        $isCaregiver = $user && in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse']);
        if ($isCaregiver) {
            $caregiverBranchId = (int) ($user->assigned_branch_id ?? 0);
            if ($caregiverBranchId === 0 || (int) $resident->branch_id !== $caregiverBranchId) {
                return response()->json([
                    'message' => 'You do not have permission to view vitals for this resident.',
                ], 403);
            }
        }

        $vitals = $resident->vitalSigns()
            ->orderBy('measurement_date', 'desc')
            ->paginate(15);

        return response()->json($vitals);
    }

    public function store(StoreResidentRequest $request): JsonResponse
    {
        $user = auth()->user();

        if ($this->isCaregiver($user)) {
            return $this->error('Caregivers cannot create or edit resident records.', 403);
        }

        // Allow administrators and super admins to create residents even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && $user->isAnyAdmin();
        
        // Check permission only if user is not an admin or super admin
        if (!$isSuperAdmin && !$isAdmin) {
        if ($error = $this->requirePermission('create_residents')) {
            return $error;
            }
        }

        $validated = $request->validated();

        $this->syncResidentLifecycleFields($validated);

        // Generate full name from first_name, middle_names, and last_name
        $nameParts = array_filter([
            $validated['first_name'] ?? '',
            $validated['middle_names'] ?? '',
            $validated['last_name'] ?? ''
        ]);
        $validated['name'] = implode(' ', $nameParts);

        // Handle allergies and medical_conditions - convert strings to arrays for storage
        if (isset($validated['allergies']) && is_string($validated['allergies'])) {
            $validated['allergies'] = !empty(trim($validated['allergies'])) 
                ? [$validated['allergies']] 
                : null;
        }
        
        if (isset($validated['medical_conditions']) && is_string($validated['medical_conditions'])) {
            $validated['medical_conditions'] = !empty(trim($validated['medical_conditions'])) 
                ? [$validated['medical_conditions']] 
                : null;
        }

        // Handle profile image upload
        if ($request->hasFile('profile_image')) {
            $image = $request->file('profile_image');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('residents/profile_images', $imageName, 'public');
            $validated['profile_image'] = $imagePath;
        }

        $resident = Resident::create($validated);

        return $this->success(
            new ResidentResource($resident->load(['branch'])),
            'Resident created successfully',
            201
        );
    }

    public function update(UpdateResidentRequest $request, $id): JsonResponse
    {
        $user = auth()->user();

        if ($this->isCaregiver($user)) {
            return $this->error('Caregivers cannot edit resident records.', 403);
        }

        // Allow administrators and super admins to edit residents even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && $user->isAnyAdmin();

        // Check permission only if user is not an admin or super admin
        if (!$isSuperAdmin && !$isAdmin) {
            if ($error = $this->requirePermission('edit_residents')) {
                return $error;
            }
        }

        // Find resident without global scope to check permissions manually
        $resident = Resident::withoutGlobalScope(\App\Models\Scopes\FacilityScope::class)->findOrFail($id);

        // Check facility access for non-super admins
        $currentUser = \Illuminate\Support\Facades\Auth::user();
        if ($currentUser && $currentUser->role !== 'super_admin') {
            $resident->load('branch');
            if ($currentUser->facility_id) {
                // Verify the resident's branch belongs to the user's facility
                if (!$resident->branch || $resident->branch->facility_id !== $currentUser->facility_id) {
                    return $this->error('You do not have permission to update this resident.', 403);
                }
            } else {
                // User has no facility assigned
                return $this->error('You do not have permission to update this resident.', 403);
            }
        }

        $validated = $request->validated();

        $this->syncResidentLifecycleFields($validated);

        // Handle profile image upload
        if ($request->hasFile('profile_image')) {
            // Delete old image if it exists
            if ($resident->profile_image && Storage::disk('public')->exists($resident->profile_image)) {
                Storage::disk('public')->delete($resident->profile_image);
            }
            
            $image = $request->file('profile_image');
            $imageName = time() . '_' . uniqid() . '.' . $image->getClientOriginalExtension();
            $imagePath = $image->storeAs('residents/profile_images', $imageName, 'public');
            $validated['profile_image'] = $imagePath;
        }

        // Handle array fields - convert to arrays if they come as strings or ensure they're arrays
        if (isset($validated['medical_conditions'])) {
            if (is_string($validated['medical_conditions'])) {
                $validated['medical_conditions'] = !empty(trim($validated['medical_conditions'])) 
                    ? [$validated['medical_conditions']] 
                    : null;
            } elseif (is_array($validated['medical_conditions'])) {
                $validated['medical_conditions'] = array_filter($validated['medical_conditions'], function($item) {
                    return !empty(trim($item));
                });
                $validated['medical_conditions'] = !empty($validated['medical_conditions']) 
                    ? array_values($validated['medical_conditions']) 
                    : null;
            }
        }
        
        if (isset($validated['allergies'])) {
            if (is_string($validated['allergies'])) {
                $validated['allergies'] = !empty(trim($validated['allergies'])) 
                    ? [$validated['allergies']] 
                    : null;
            } elseif (is_array($validated['allergies'])) {
                $validated['allergies'] = array_filter($validated['allergies'], function($item) {
                    return !empty(trim($item));
                });
                $validated['allergies'] = !empty($validated['allergies']) 
                    ? array_values($validated['allergies']) 
                    : null;
            }
        }

        // Update name if first/last name changed
        if (isset($validated['first_name']) || isset($validated['last_name']) || isset($validated['middle_names'])) {
            $first = $validated['first_name'] ?? $resident->first_name;
            $middle = $validated['middle_names'] ?? $resident->middle_names;
            $last = $validated['last_name'] ?? $resident->last_name;
            $parts = array_filter([$first, $middle, $last]);
            $validated['name'] = implode(' ', $parts);
        }

        // Handle text fields - convert empty strings to null
        foreach (['care_plan', 'notes', 'special_instructions', 'dietary_restrictions', 'code_status', 'primary_language', 'pharmacy_name', 'general_medication_instructions', 'diagnosis'] as $field) {
            if (isset($validated[$field]) && $validated[$field] === '') {
                $validated[$field] = null;
            }
        }

        try {
            $resident->update($validated);
            $resident->refresh();
        } catch (\Exception $e) {
            \Log::error('Failed to update resident', [
                'resident_id' => $id,
                'validated' => $validated,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return $this->error('Failed to update resident: ' . $e->getMessage(), 500);
        }

        return $this->success(
            new ResidentResource($resident->load(['branch'])),
            'Resident updated successfully'
        );
    }

    public function updateStatus(UpdateResidentStatusRequest $request, $resident): JsonResponse
    {
        $user = $request->user();

        $resident = Resident::withoutGlobalScope(\App\Models\Scopes\FacilityScope::class)->find($resident);
        if (!$resident) {
            return $this->error('Resident not found.', 404);
        }

        $resident->load('branch');
        $validated = $request->validated();
        $statusType = $validated['status_type'];

        if ($this->isCaregiver($user)) {
            if (
                !$user?->assigned_branch_id
                || !$this->checkBranchAccess($resident, $user)
                || !$this->checkFacilityAccess($resident, $user)
            ) {
                return $this->error('You may only update residents in your assigned branch.', 403);
            }

            if ($statusType !== 'temporary') {
                return $this->error('Caregivers can only update temporary resident status.', 403);
            }
        } else {
            $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
            $isAdmin = $user && $user->isAnyAdmin();

            if (!$isSuperAdmin && !$isAdmin) {
                if ($error = $this->requirePermission('edit_residents', $user)) {
                    return $error;
                }
            }

            if (!$this->checkFacilityAccess($resident, $user)) {
                return $this->error('You do not have permission to update this resident.', 403);
            }
        }

        $toStatus = $validated['status'] ?? null;
        $effectiveAt = Carbon::parse($validated['effective_at'] ?? now());

        $resident = DB::transaction(function () use ($resident, $validated, $statusType, $toStatus, $effectiveAt, $user) {
            $fromStatus = $statusType === 'lifecycle'
                ? ($resident->lifecycle_status ?? ($resident->is_active ? 'active' : 'discharged'))
                : $resident->temporary_status;

            $details = $validated['details'] ?? [];
            $updates = [];

            if ($statusType === 'lifecycle') {
                $updates = [
                    'lifecycle_status' => $toStatus,
                    'lifecycle_status_changed_at' => $effectiveAt,
                    'is_active' => Resident::isActiveLifecycleStatus($toStatus),
                    'status' => $toStatus,
                ];

                if ($toStatus === 'active') {
                    $updates['discharge_date'] = null;
                    $updates['discharge_reason'] = null;
                    $updates['discharge_destination'] = null;
                    $updates['discharge_notes'] = null;
                } else {
                    $updates['discharge_date'] = $validated['discharge_date'];
                    $updates['discharge_reason'] = $validated['discharge_reason'];
                    $updates['discharge_destination'] = $validated['discharge_destination'] ?? null;
                    $updates['discharge_notes'] = $validated['discharge_notes'] ?? null;
                    $updates['temporary_status'] = null;
                    $updates['temporary_status_started_at'] = null;
                    $updates['temporary_status_note'] = null;
                    $details = array_merge($details, [
                        'discharge_date' => $validated['discharge_date'],
                        'discharge_reason' => $validated['discharge_reason'],
                        'discharge_destination' => $validated['discharge_destination'] ?? null,
                        'discharge_notes' => $validated['discharge_notes'] ?? null,
                    ]);
                }
            } else {
                $temporaryNote = $validated['temporary_status_note']
                    ?? ($details['note'] ?? null);

                $updates = [
                    'temporary_status' => $toStatus,
                    'temporary_status_started_at' => $toStatus ? $effectiveAt : null,
                    'temporary_status_note' => $toStatus ? $temporaryNote : null,
                ];

                if ($temporaryNote !== null) {
                    $details['temporary_status_note'] = $temporaryNote;
                }
            }

            $resident->update($updates);

            ResidentStatusEvent::create([
                'resident_id' => $resident->id,
                'branch_id' => $resident->branch_id,
                'facility_id' => $resident->branch?->facility_id,
                'status_type' => $statusType,
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'effective_at' => $effectiveAt,
                'details' => $details === [] ? null : $details,
                'created_by' => $user?->id,
            ]);

            return $resident->refresh()->load('branch');
        });

        return $this->success(
            new ResidentResource($resident),
            'Resident status updated successfully'
        );
    }

    public function destroy($id): JsonResponse
    {
        $user = auth()->user();

        if ($this->isCaregiver($user)) {
            return $this->error('Caregivers cannot delete resident records.', 403);
        }

        // Allow administrators and super admins to delete residents even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && $user->isAnyAdmin();
        
        // Check permission only if user is not an admin or super admin
        if (!$isSuperAdmin && !$isAdmin) {
        if ($error = $this->requirePermission('delete_residents')) {
            return $error;
            }
        }

        $resident = Resident::findOrFail($id);
        $resident->delete();

        return $this->success(null, 'Resident deleted successfully');
    }

    private function syncResidentLifecycleFields(array &$validated): void
    {
        if (array_key_exists('lifecycle_status', $validated)) {
            $validated['is_active'] = Resident::isActiveLifecycleStatus($validated['lifecycle_status']);
            $validated['status'] = $validated['lifecycle_status'];
            $validated['lifecycle_status_changed_at'] = $validated['lifecycle_status_changed_at'] ?? now();
            if ($validated['lifecycle_status'] === Resident::LIFECYCLE_ACTIVE) {
                $validated['discharge_date'] = null;
                $validated['discharge_reason'] = null;
                $validated['discharge_destination'] = null;
                $validated['discharge_notes'] = null;
            }

            return;
        }

        if (array_key_exists('is_active', $validated)) {
            $validated['lifecycle_status'] = $validated['is_active'] ? 'active' : 'discharged';
            $validated['status'] = $validated['lifecycle_status'];
            $validated['lifecycle_status_changed_at'] = $validated['lifecycle_status_changed_at'] ?? now();
            if ($validated['lifecycle_status'] === Resident::LIFECYCLE_ACTIVE) {
                $validated['discharge_date'] = null;
                $validated['discharge_reason'] = null;
                $validated['discharge_destination'] = null;
                $validated['discharge_notes'] = null;
            }
        }
    }
}

