<?php

namespace App\Http\Controllers\Api;

use App\Mail\WelcomeToFacilityNotification;
use App\Models\Branch;
use App\Models\User;
use App\Services\MailConfigurationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class UserController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['assignedBranch', 'roles', 'facility']);

        // Apply facility scope for non-super admins
        $currentUser = Auth::user();
        $requestedFacilityId = $request->get('facility_id');

        // Check if facility_id column exists on users table
        $hasFacilityIdColumn = Schema::hasColumn('users', 'facility_id');

        if ($currentUser && $currentUser->role !== 'super_admin') {
            // For non-super admins, ensure they can only see users from their facility
            if ($hasFacilityIdColumn) {
                // If facility_id is requested, verify it matches their facility
                if ($requestedFacilityId && $requestedFacilityId != $currentUser->facility_id) {
                    // Facility admin trying to access different facility - return empty result
                    return response()->json([
                        'data' => [],
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => $request->get('per_page', 20),
                        'total' => 0,
                    ]);
                }
                // Filter by user's facility
                if ($currentUser->facility_id) {
                    $query->where('facility_id', $currentUser->facility_id);
                }
            } else {
                // Fallback: filter by assigned_branch_id if facility_id column doesn't exist
                if ($currentUser->assigned_branch_id) {
                    $query->where('assigned_branch_id', $currentUser->assigned_branch_id);
                }
            }

            // Branch admins can only see users from their assigned branch
            if ($currentUser->isBranchAdmin() && $currentUser->assigned_branch_id) {
                $query->where('assigned_branch_id', $currentUser->assigned_branch_id);
            }
        } else {
            // For super admins, filter by facility_id if provided
            if ($hasFacilityIdColumn && $requestedFacilityId) {
                $query->where('facility_id', $requestedFacilityId);
            }
        }

        // Filter by status
        if ($request->has('status')) {
            if ($request->get('status') === 'active') {
                $query->where('is_active', true);
            } elseif ($request->get('status') === 'inactive') {
                $query->where('is_active', false);
            }
        } elseif ($request->has('active_only') && $request->get('active_only') === 'true') {
            // Legacy support for older clients
            $query->where('is_active', true);
        }

        // Filter by branch
        if ($request->has('branch_id')) {
            $query->where('assigned_branch_id', $request->get('branch_id'));
        }

        // Filter by role
        if ($request->has('role')) {
            $query->where('role', $request->get('role'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('name')->paginate($request->get('per_page', 20));

        return response()->json($users);
    }

    public function show($id): JsonResponse
    {
        $user = User::with(['assignedBranch', 'roles', 'roles.permissions', 'facility'])
            ->findOrFail($id);
        if (! $this->canAccessUser($user, Auth::user())) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json($user);
    }

    public function stats($id): JsonResponse
    {
        $currentUser = Auth::user();
        $user = User::findOrFail($id);
        if (! $this->canAccessUser($user, $currentUser)) {
            return response()->json(['message' => 'Not found'], 404);
        }

        // Check if current user has permission to view stats
        if ($currentUser->role !== 'super_admin' && ! $currentUser->isFacilityAdministrator() && ! $currentUser->isBranchAdmin()) {
            // Only allow users to view their own stats
            if ($currentUser->id != $id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        // Get user statistics
        $stats = [
            'active_assignments' => \App\Models\Assignment::where('caregiver_id', $id)
                ->where('is_active', true)
                ->count(),
            'vitals_recorded' => \App\Models\VitalSign::where('taken_by', $id)
                ->count(),
            'assessments' => \App\Models\Assessment::where('assessor_id', $id)
                ->count(),
            'leave_requests' => \App\Models\LeaveRequest::where('staff_id', $id)
                ->count(),
            'appointments_created' => \App\Models\Appointment::where('created_by', $id)
                ->count(),
        ];

        return response()->json($stats);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();

        // Allow administrators and super admins to create users even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAnyAdmin = $user && $user->isAnyAdmin();

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAnyAdmin) {
            if ($error = $this->requirePermission('create_users')) {
                return $error;
            }
        }

        // Determine facility_id for email uniqueness validation and user creation
        $currentUser = Auth::user();
        $facilityId = $request->input('facility_id');

        // For non-super admins, force the target facility to the creator's tenant.
        if ($currentUser && $currentUser->role !== 'super_admin') {
            $facilityId = $currentUser->facility_id;

            if (! $facilityId && $currentUser->assigned_branch_id) {
                $branch = Branch::find($currentUser->assigned_branch_id);
                if ($branch && $branch->facility_id) {
                    $facilityId = $branch->facility_id;
                }
            }

            if (! $facilityId) {
                return $this->error('Unable to determine your facility.', 403);
            }

            if ($facilityId) {
                $request->merge(['facility_id' => $facilityId]);
            }
        }

        // Build email validation rule scoped by facility_id
        $emailRule = 'required|string|email|max:255';
        if ($facilityId) {
            $emailRule .= '|unique:users,email,NULL,id,facility_id,'.$facilityId;
        } else {
            // For super admins (NULL facility_id), keep global uniqueness
            $emailRule .= '|unique:users,email,NULL,id,facility_id,NULL';
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => $emailRule,
            'password' => 'required|string|min:8',
            'first_name' => 'required|string|max:255',
            'middle_names' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'phone_number' => 'required|string|max:50',
            'date_of_birth' => 'required|date|before:'.now()->subYears(18)->format('Y-m-d'),
            'marital_status' => 'nullable|string|max:50',
            'sex' => 'required|string|in:male,female,other',
            'position' => 'nullable|string|max:255',
            'credentials' => 'nullable|string|max:255',
            'credential_details' => 'nullable|string',
            'date_employed' => 'required|date|before_or_equal:today',
            'hire_date' => 'nullable|date',
            'supervisor_name' => 'nullable|string|max:255',
            'provider_name' => 'nullable|string|max:255',
            'role' => 'required|string|max:255',
            'facility_id' => 'nullable|exists:facilities,id',
            'assigned_branch_id' => 'nullable|exists:branches,id',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
            'profile_image' => 'nullable|image|mimes:jpeg,jpg,png,gif|max:5120',
            'role_ids' => 'array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        // Convert empty string to null for nullable fields
        if (array_key_exists('assigned_branch_id', $validated)) {
            $validated['assigned_branch_id'] = $validated['assigned_branch_id'] ?: null;
        }
        if (
            $currentUser
            && $currentUser->role !== 'super_admin'
            && ! $this->branchBelongsToFacility($validated['assigned_branch_id'] ?? null, $facilityId ? (int) $facilityId : null)
        ) {
            return $this->error('Assigned branch does not belong to your facility.', 403);
        }
        // For super admins, preserve their facility_id selection (or null if not provided)
        if ($currentUser && $currentUser->role === 'super_admin' && array_key_exists('facility_id', $validated)) {
            $validated['facility_id'] = $validated['facility_id'] ?: null;
        }

        // Remove position if column doesn't exist in database or if it's empty
        if (! Schema::hasColumn('users', 'position')) {
            unset($validated['position']);
        } elseif (array_key_exists('position', $validated) && empty($validated['position'])) {
            unset($validated['position']);
        }

        // Handle profile image upload
        if ($request->hasFile('profile_image')) {
            $file = $request->file('profile_image');
            $fileName = time().'_'.$file->getClientOriginalName();
            $filePath = $file->storeAs('profile-images', $fileName, 'public');
            $validated['profile_image'] = $filePath;
        }

        // Hash password
        $validated['password'] = Hash::make($validated['password']);

        // For non-super admins, ensure facility_id is set to creator's facility
        // (This is a safety check in case validation didn't include it)
        if ($currentUser && $currentUser->role !== 'super_admin' && $facilityId) {
            // Always set to creator's facility_id - they can only create users for their facility
            $validated['facility_id'] = $facilityId;
        }

        // IMPORTANT: If creating an admin/administrator user and no facility_id is set,
        // try to derive it from assigned_branch_id if provided
        $isCreatingAdmin = in_array($validated['role'] ?? '', ['administrator', 'admin']);
        if ($isCreatingAdmin && empty($validated['facility_id']) && ! empty($validated['assigned_branch_id'])) {
            $branch = Branch::find($validated['assigned_branch_id']);
            if ($branch && $branch->facility_id) {
                $validated['facility_id'] = $branch->facility_id;
                Log::info('UserController: Derived facility_id from assigned_branch_id for admin user', [
                    'branch_id' => $validated['assigned_branch_id'],
                    'facility_id' => $branch->facility_id,
                ]);
            }
        }

        // Branch admins must have an assigned_branch_id
        if (($validated['role'] ?? '') === 'admin') {
            if (empty($validated['assigned_branch_id'])) {
                return $this->error('Branch admins must have an assigned branch.', 422);
            }
        }

        // Extract role_ids if provided
        $roleIds = $validated['role_ids'] ?? null;
        unset($validated['role_ids']);

        $user = User::create($validated);

        // Assign roles if provided
        if ($roleIds) {
            $user->roles()->sync($roleIds);
        }

        // Refresh the model to get accessors (like profile_image_url)
        $user->refresh();

        // Send welcome email if user has email and facility
        if ($user->email && $user->facility_id) {
            try {
                $mailConfigService = app(MailConfigurationService::class);
                $facility = $user->facility;

                // Configure mail for facility
                if ($facility) {
                    $mailConfigService->configureForFacility($facility);
                }

                // Get temporary password if it was just created (we have it in validated before hashing)
                $temporaryPassword = $request->input('password'); // This is the plain password before hashing

                // Send welcome email
                Mail::to($user->email)->send(
                    new WelcomeToFacilityNotification($user, $facility, $user->assignedBranch, $temporaryPassword)
                );

                Log::info('Welcome email sent to new user', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'facility_id' => $user->facility_id,
                ]);
            } catch (\Exception $e) {
                // Log error but don't fail user creation
                Log::error('Failed to send welcome email to new user', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json($user->load(['assignedBranch', 'roles', 'facility']), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $currentUser = Auth::user();

        // Allow administrators and super admins to edit users even without specific permission
        $isSuperAdmin = $currentUser && ($currentUser->role === 'super_admin' || $currentUser->hasRole('super_admin'));
        $isAnyAdmin = $currentUser && $currentUser->isAnyAdmin();

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAnyAdmin) {
            if ($error = $this->requirePermission('edit_users')) {
                return $error;
            }
        }

        $user = User::findOrFail($id);
        if (! $this->canAccessUser($user, $currentUser)) {
            return response()->json(['message' => 'Not found'], 404);
        }

        // Convert is_active from FormData string to boolean if present (like residents do)
        // This handles both FormData ('1'/'0') and JSON (true/false) formats
        if ($request->has('is_active')) {
            $isActive = $request->input('is_active');
            if (is_string($isActive)) {
                $request->merge(['is_active' => filter_var($isActive, FILTER_VALIDATE_BOOLEAN)]);
            }
        }

        // Convert empty strings to null for date fields before validation
        $input = $request->all();
        foreach (['date_of_birth', 'date_employed', 'hire_date'] as $dateField) {
            if (isset($input[$dateField]) && $input[$dateField] === '') {
                $input[$dateField] = null;
            }
        }

        // Replace request data with cleaned input for validation
        $request->merge($input);

        // Determine facility_id for email uniqueness validation
        $facilityId = $request->input('facility_id', $user->facility_id);

        // For non-super admins updating users, use their facility_id if not provided
        if ($currentUser && $currentUser->role !== 'super_admin' && ! $facilityId) {
            $facilityId = $currentUser->facility_id;
        }

        // Build email validation rule scoped by facility_id
        $emailRule = 'sometimes|required|string|email|max:255';
        if ($facilityId) {
            $emailRule .= '|unique:users,email,'.$user->id.',id,facility_id,'.$facilityId;
        } else {
            // For super admins (NULL facility_id), keep global uniqueness
            $emailRule .= '|unique:users,email,'.$user->id.',id,facility_id,NULL';
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => $emailRule,
            'password' => 'nullable|string|min:8',
            'first_name' => 'sometimes|required|string|max:255',
            'middle_names' => 'nullable|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'phone_number' => 'sometimes|required|string|max:50',
            'date_of_birth' => 'nullable|date|before:'.now()->subYears(18)->format('Y-m-d'),
            'marital_status' => 'nullable|string|max:50',
            'sex' => 'sometimes|required|string|in:male,female,other',
            'position' => 'nullable|string|max:255',
            'credentials' => 'nullable|string|max:255',
            'credential_details' => 'nullable|string',
            'date_employed' => 'nullable|date|before_or_equal:today',
            'hire_date' => 'nullable|date',
            'supervisor_name' => 'nullable|string|max:255',
            'provider_name' => 'nullable|string|max:255',
            'role' => 'sometimes|required|string|max:255',
            'facility_id' => 'nullable|exists:facilities,id',
            'assigned_branch_id' => 'nullable|exists:branches,id',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
            'profile_image' => 'nullable|image|mimes:jpeg,jpg,png,gif|max:5120',
            'remove_profile_image' => 'nullable|boolean',
            'role_ids' => 'array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        // Convert empty string to null for nullable fields
        if (array_key_exists('assigned_branch_id', $validated)) {
            $validated['assigned_branch_id'] = $validated['assigned_branch_id'] ?: null;
        }
        if ($currentUser && $currentUser->role !== 'super_admin') {
            unset($validated['facility_id']);

            if (
                array_key_exists('assigned_branch_id', $validated)
                && ! $this->branchBelongsToFacility($validated['assigned_branch_id'], (int) $currentUser->facility_id)
            ) {
                return $this->error('Assigned branch does not belong to your facility.', 403);
            }
        }

        // Remove position if column doesn't exist in database or if it's empty
        if (! Schema::hasColumn('users', 'position')) {
            unset($validated['position']);
        } elseif (array_key_exists('position', $validated) && empty($validated['position'])) {
            unset($validated['position']);
        }

        // Debug: Log request information for profile image
        \Log::info('User update request - profile image check', [
            'user_id' => $user->id,
            'has_file' => $request->hasFile('profile_image'),
            'has_remove_flag' => $request->has('remove_profile_image'),
            'remove_flag_value' => $request->get('remove_profile_image'),
            'all_request_keys' => array_keys($request->all()),
            'files_keys' => array_keys($request->allFiles()),
        ]);

        // Handle profile image removal if requested
        if ($request->has('remove_profile_image') && $request->get('remove_profile_image') === '1') {
            // Delete old profile image if exists
            if ($user->profile_image && Storage::disk('public')->exists($user->profile_image)) {
                Storage::disk('public')->delete($user->profile_image);
            }
            $validated['profile_image'] = null;
            // Remove the flag from validated array since it's not a user field
            unset($validated['remove_profile_image']);
        }
        // Handle profile image upload if provided
        elseif ($request->hasFile('profile_image')) {
            try {
                // Delete old profile image if exists
                if ($user->profile_image && Storage::disk('public')->exists($user->profile_image)) {
                    Storage::disk('public')->delete($user->profile_image);
                }

                $file = $request->file('profile_image');

                // Validate file was uploaded successfully
                if (! $file->isValid()) {
                    \Log::error('Profile image upload failed: Invalid file', [
                        'user_id' => $user->id,
                        'error' => $file->getError(),
                    ]);
                    throw new \Exception('Invalid file upload');
                }

                $fileName = time().'_'.$file->getClientOriginalName();
                $filePath = $file->storeAs('profile-images', $fileName, 'public');

                if (! $filePath) {
                    \Log::error('Profile image upload failed: Storage failed', [
                        'user_id' => $user->id,
                        'file_name' => $fileName,
                    ]);
                    throw new \Exception('Failed to store file');
                }

                $validated['profile_image'] = $filePath;
                \Log::info('Profile image uploaded successfully', [
                    'user_id' => $user->id,
                    'file_path' => $filePath,
                ]);
            } catch (\Exception $e) {
                \Log::error('Profile image upload error: '.$e->getMessage(), [
                    'user_id' => $user->id,
                    'trace' => $e->getTraceAsString(),
                ]);
                // Don't fail the entire update if image upload fails, but log it
            }
        }
        // If neither remove flag nor new file, preserve existing image by not including it in validated array
        // Remove remove_profile_image flag if it exists (shouldn't be in validated, but just in case)
        if (isset($validated['remove_profile_image'])) {
            unset($validated['remove_profile_image']);
        }

        // Hash password if provided
        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        // Extract role_ids if provided
        $roleIds = $validated['role_ids'] ?? null;
        if (isset($validated['role_ids'])) {
            unset($validated['role_ids']);
        }

        // Branch admins must have an assigned_branch_id
        if (($validated['role'] ?? $user->role) === 'admin') {
            $assignedBranchId = $validated['assigned_branch_id'] ?? $user->assigned_branch_id;
            if (empty($assignedBranchId)) {
                return $this->error('Branch admins must have an assigned branch.', 422);
            }
        }

        $wasActive = (bool) $user->is_active;

        $user->update($validated);

        // Revoke any active API tokens when an account is deactivated
        if (
            array_key_exists('is_active', $validated)
            && $wasActive
            && $validated['is_active'] === false
        ) {
            $user->tokens()->delete();
        }

        // Update roles if provided
        if ($roleIds !== null) {
            $user->roles()->sync($roleIds);
        }

        // Refresh the model to get updated accessors (like profile_image_url)
        $user->refresh();

        return response()->json($user->load(['assignedBranch', 'roles', 'facility']));
    }

    public function destroy($id): JsonResponse
    {
        $user = auth()->user();

        // Allow administrators and super admins to delete users even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAnyAdmin = $user && $user->isAnyAdmin();

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAnyAdmin) {
            if ($error = $this->requirePermission('delete_users')) {
                return $error;
            }
        }

        $user = User::findOrFail($id);
        if (! $this->canAccessUser($user, auth()->user())) {
            return response()->json(['message' => 'Not found'], 404);
        }

        // Prevent deleting yourself
        if ($user->id === auth()->id()) {
            return response()->json([
                'message' => 'You cannot delete your own account.',
            ], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    private function canAccessUser(User $targetUser, ?User $currentUser = null): bool
    {
        $currentUser = $currentUser ?? Auth::user();
        if (! $currentUser) {
            return false;
        }

        if ($currentUser->isSuperAdmin()) {
            return true;
        }

        if (! $currentUser->facility_id || (int) $targetUser->facility_id !== (int) $currentUser->facility_id) {
            return false;
        }

        return ! $currentUser->isBranchAdmin()
            || ! $currentUser->assigned_branch_id
            || (int) $targetUser->assigned_branch_id === (int) $currentUser->assigned_branch_id;
    }

    private function branchBelongsToFacility(null|int|string $branchId, ?int $facilityId): bool
    {
        if ($branchId === null || $branchId === '' || ! $facilityId) {
            return true;
        }

        return Branch::withoutGlobalScopes()
            ->whereKey((int) $branchId)
            ->where('facility_id', $facilityId)
            ->exists();
    }
}
