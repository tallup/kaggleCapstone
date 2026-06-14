<?php

namespace App\Http\Controllers\Api;

use App\Models\Branch;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class FacilityController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Facility::query();
        $user = $request->user();

        if (! $this->isSuperAdmin($user)) {
            if (! $user?->facility_id) {
                return response()->json([
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $request->get('per_page', 15),
                    'total' => 0,
                ]);
            }

            $query->whereKey($user->facility_id);
        }

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        $facilities = $query->orderBy('name')
            ->paginate($request->get('per_page', 15));

        return response()->json($facilities);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        if (! $this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Allow administrators and super admins to create facilities even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('create_facilities')) {
                return $error;
            }
        }

        $rules = [
            'name' => 'required|string|max:255',
            'address' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'primary_color' => 'nullable|string|max:7',
            'secondary_color' => 'nullable|string|max:7',
            'accent_color' => 'nullable|string|max:7',
            'is_active' => 'nullable|boolean',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ];

        // Only validate subdomain if it's provided and not empty
        if ($request->has('subdomain') && ! empty($request->input('subdomain'))) {
            $rules['subdomain'] = 'nullable|string|max:255|unique:facilities,subdomain|regex:/^[a-z0-9-]+$/';
        }

        // Validate owner and branch fields if creating new facility AND owner email is provided
        // If owner_email is provided, all owner fields become required
        if ($request->has('owner_email') && ! empty(trim($request->input('owner_email')))) {
            $rules['owner_name'] = 'required|string|max:255';
            // Email validation - we'll check uniqueness scoped by facility_id after facility is created
            $rules['owner_email'] = 'required|email';
            $rules['owner_role'] = 'required|string|in:administrator,manager,clinical_supervisor';
            $rules['owner_password'] = 'required|string|min:8';
            $rules['branch_name'] = 'required|string|max:255';
            $rules['branch_address'] = 'nullable|string';
        }

        $validated = $request->validate($rules);

        // Convert is_active to boolean if present
        if (isset($validated['is_active'])) {
            // Handle both string and boolean values
            if (is_string($validated['is_active'])) {
                $validated['is_active'] = in_array(strtolower($validated['is_active']), ['1', 'true', 'yes', 'on']);
            } else {
                $validated['is_active'] = (bool) $validated['is_active'];
            }
        } else {
            $validated['is_active'] = true; // Default to true
        }

        // Only include subdomain if provided and not empty
        if ($request->has('subdomain')) {
            $subdomain = trim($request->input('subdomain'));
            if (! empty($subdomain)) {
                $validated['subdomain'] = $subdomain;
            }
            // If empty, don't include it (will be null in database)
        }

        // Handle logo upload
        if ($request->hasFile('logo')) {
            $logo = $request->file('logo');
            $logoPath = $logo->store('facilities/logos', 'public');
            $validated['logo'] = $logoPath;
        }

        return DB::transaction(function () use ($validated, $request) {
            // Extract facility data
            $facilityData = array_filter($validated, function ($key) {
                return ! in_array($key, ['owner_name', 'owner_email', 'owner_role', 'owner_password', 'branch_name', 'branch_address']);
            }, ARRAY_FILTER_USE_KEY);

            // Create facility
            $facility = Facility::create($facilityData);

            $owner = null;
            $branch = null;

            // Create owner account and branch if provided (all owner fields must be present)
            if ($request->has('owner_email') &&
                ! empty(trim($request->input('owner_email'))) &&
                $request->has('owner_name') &&
                ! empty(trim($request->input('owner_name'))) &&
                $request->has('owner_password') &&
                ! empty($request->input('owner_password'))) {
                // Create initial branch
                $branch = $facility->branches()->create([
                    'name' => $validated['branch_name'] ?? 'Main Branch',
                    'address' => $validated['branch_address'] ?? $validated['address'] ?? null,
                    'is_active' => true,
                ]);

                // Check if email already exists in this facility (shouldn't happen for new facility, but check anyway)
                $existingUser = User::where('email', $validated['owner_email'])
                    ->where('facility_id', $facility->id)
                    ->first();

                if ($existingUser) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'owner_email' => 'This email is already registered in this facility.',
                    ]);
                }

                // Create facility owner account
                $owner = User::create([
                    'name' => $validated['owner_name'],
                    'email' => $validated['owner_email'],
                    'password' => Hash::make($validated['owner_password']),
                    'role' => $validated['owner_role'],
                    'facility_id' => $facility->id,
                    'assigned_branch_id' => $branch->id,
                    'is_active' => true,
                ]);

                // Update facility with owner reference
                $facility->update([
                    'registered_by_user_id' => $owner->id,
                    'registration_status' => 'approved',
                ]);
            }

            $facility->refresh(); // Refresh to get logo_url accessor
            $facility->load(['branches', 'owner']); // Load relationships

            $response = [
                'facility' => $facility,
                'message' => $owner ? 'Facility created with owner account and initial branch' : 'Facility created successfully',
            ];

            if ($owner) {
                $response['owner'] = $owner;
            }

            if ($branch) {
                $response['branch'] = $branch;
            }

            return response()->json($response, 201);
        });
    }

    public function show($id): JsonResponse
    {
        $facility = Facility::findOrFail($id);
        if (! $this->canAccessFacility($facility, auth()->user())) {
            return response()->json(['message' => 'Not found'], 404);
        }

        return response()->json($facility);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = auth()->user();
        if (! $this->isSuperAdmin($user) && (int) $user?->facility_id !== (int) $id) {
            return response()->json(['message' => 'Not found'], 404);
        }

        // Allow administrators and super admins to edit facilities even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('edit_facilities')) {
                return $error;
            }
        }

        $facility = Facility::findOrFail($id);

        // Separate file validation from other fields
        $rules = [
            'name' => 'sometimes|required|string|max:255',
            'address' => 'nullable|string|max:1000',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'primary_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'secondary_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'accent_color' => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'is_active' => 'nullable|boolean',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ];

        // Only validate subdomain if it's provided and not empty
        if ($request->has('subdomain') && ! empty(trim($request->input('subdomain')))) {
            $rules['subdomain'] = 'nullable|string|max:255|unique:facilities,subdomain,'.$id.'|regex:/^[a-z0-9-]+$/';
        }

        // Add logo validation only if file is present
        if ($request->hasFile('logo')) {
            $rules['logo'] = 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048';
        }

        $validated = $request->validate($rules);

        // Convert is_active to boolean if present
        if (isset($validated['is_active'])) {
            if (is_string($validated['is_active'])) {
                $validated['is_active'] = in_array(strtolower($validated['is_active']), ['1', 'true', 'yes', 'on']);
            } else {
                $validated['is_active'] = (bool) $validated['is_active'];
            }
        }

        // Only include subdomain if provided and not empty
        if ($request->has('subdomain')) {
            $subdomain = trim($request->input('subdomain'));
            if (! empty($subdomain)) {
                $validated['subdomain'] = $subdomain;
            } else {
                $validated['subdomain'] = null; // Set to null if empty string
            }
        }

        // Ensure color values are included if provided (even if empty, to allow clearing)
        if ($request->has('primary_color')) {
            $validated['primary_color'] = $request->input('primary_color') ?: null;
        }
        if ($request->has('secondary_color')) {
            $validated['secondary_color'] = $request->input('secondary_color') ?: null;
        }
        if ($request->has('accent_color')) {
            $validated['accent_color'] = $request->input('accent_color') ?: null;
        }

        // Handle logo upload
        if ($request->hasFile('logo')) {
            // Delete old logo if exists
            if ($facility->logo) {
                Storage::disk('public')->delete($facility->logo);
            }
            $logo = $request->file('logo');
            $logoPath = $logo->store('facilities/logos', 'public');
            $validated['logo'] = $logoPath;
        }

        // Update facility with validated data (including colors)
        $facility->update($validated);

        // Reload facility to get logo_url accessor
        $facility->refresh();

        return response()->json($facility);
    }

    public function approveRegistration(Request $request, $registrationId): JsonResponse
    {
        $registration = \App\Models\FacilityRegistration::findOrFail($registrationId);

        if ($registration->status !== 'pending') {
            return response()->json(['message' => 'Registration already processed'], 400);
        }

        $validated = $request->validate([
            'facility_name' => 'required|string|max:255',
            'subdomain' => 'required|string|max:255|unique:facilities,subdomain|regex:/^[a-z0-9-]+$/',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
            'branch_name' => 'required|string|max:255',
            'branch_address' => 'nullable|string',
            'owner_name' => 'required|string|max:255',
            // Email validation - we'll check uniqueness scoped by facility_id after facility is created
            'owner_email' => 'required|email',
            'owner_role' => 'required|string|in:administrator,manager,clinical_supervisor',
            'owner_password' => 'required|string|min:8',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'primary_color' => 'nullable|string|max:7',
            'secondary_color' => 'nullable|string|max:7',
            'accent_color' => 'nullable|string|max:7',
        ]);

        return DB::transaction(function () use ($validated, $registration, $request) {
            // Create facility
            $facilityData = [
                'name' => $validated['facility_name'],
                'address' => $validated['address'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'subdomain' => $validated['subdomain'],
                'registration_status' => 'approved',
                'is_active' => true,
            ];

            if (isset($validated['primary_color'])) {
                $facilityData['primary_color'] = $validated['primary_color'];
            }
            if (isset($validated['secondary_color'])) {
                $facilityData['secondary_color'] = $validated['secondary_color'];
            }
            if (isset($validated['accent_color'])) {
                $facilityData['accent_color'] = $validated['accent_color'];
            }

            $facility = Facility::create($facilityData);

            // Handle logo upload
            if ($request->hasFile('logo')) {
                $logo = $request->file('logo');
                $logoPath = $logo->store('facilities/logos', 'public');
                $facility->update(['logo' => $logoPath]);
            }

            // Create initial branch
            $branch = $facility->branches()->create([
                'name' => $validated['branch_name'] ?? 'Main Branch',
                'address' => $validated['branch_address'] ?? $validated['address'] ?? null,
                'is_active' => true,
            ]);

            // Check if email already exists in this facility (shouldn't happen for new facility, but check anyway)
            $existingUser = User::where('email', $validated['owner_email'])
                ->where('facility_id', $facility->id)
                ->first();

            if ($existingUser) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'owner_email' => 'This email is already registered in this facility.',
                ]);
            }

            // Create facility owner account
            $owner = User::create([
                'name' => $validated['owner_name'],
                'email' => $validated['owner_email'],
                'password' => Hash::make($validated['owner_password']),
                'role' => $validated['owner_role'],
                'facility_id' => $facility->id,
                'assigned_branch_id' => $branch->id,
                'is_active' => true,
            ]);

            // Update facility with owner reference
            $facility->update([
                'registered_by_user_id' => $owner->id,
            ]);

            // Update registration status
            $registration->update([
                'status' => 'approved',
                'approved_by_user_id' => auth()->id(),
            ]);

            return response()->json([
                'message' => 'Facility approved and set up successfully',
                'facility' => $facility->load('branches', 'owner'),
            ]);
        });
    }

    public function destroy($id): JsonResponse
    {
        $user = auth()->user();
        if (! $this->isSuperAdmin($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Allow administrators and super admins to delete facilities even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('delete_facilities')) {
                return $error;
            }
        }

        $facility = Facility::findOrFail($id);
        $facility->delete();

        return response()->json(['message' => 'Facility deleted']);
    }

    private function isSuperAdmin(?User $user): bool
    {
        return $user instanceof User && $user->isSuperAdmin();
    }

    private function canAccessFacility(Facility $facility, ?User $user): bool
    {
        if ($this->isSuperAdmin($user)) {
            return true;
        }

        return $user instanceof User && (int) $user->facility_id === (int) $facility->id;
    }
}
