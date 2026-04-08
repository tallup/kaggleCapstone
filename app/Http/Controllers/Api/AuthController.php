<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogService;
use App\Services\LocationService;
use App\Models\Facility;
use App\Models\StaffClockIn;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
            'provider_code' => 'nullable|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ]);

        // Check if email exists in multiple facilities
        $usersWithEmail = \App\Models\User::where('email', $credentials['email'])->get();
        $facilityIds = $usersWithEmail->pluck('facility_id')->filter()->unique()->values();
        $hasMultipleFacilities = $facilityIds->count() > 1;
        
        // If email exists in multiple facilities, provider_code is required
        if ($hasMultipleFacilities) {
            if (!$request->filled('provider_code')) {
                return response()->json([
                    'message' => 'This email is registered in multiple facilities. Please provide a provider code.',
                    'requires_provider_code' => true,
                ], 422);
            }
            
            // Find facility by provider code (excludes soft-deleted)
            $facility = Facility::whereRaw('LOWER(provider_code) = ?', [strtolower($request->provider_code)])->first();
            
            if (!$facility || !$facility->is_active) {
                return response()->json([
                    'message' => 'Invalid provider code or facility is no longer active.',
                ], 422);
            }
            
            // Find user with this email in the specified facility
            $user = \App\Models\User::where('email', $credentials['email'])
                ->where('facility_id', $facility->id)
                ->first();
            
            if (!$user) {
                return response()->json([
                    'message' => 'This email is not registered in the facility with the provided provider code.',
                ], 401);
            }
            
            // Verify password
            if (!Hash::check($credentials['password'], $user->password)) {
                return response()->json([
                    'message' => 'Invalid credentials',
                ], 401);
            }

            if (!$user->is_active) {
                return response()->json([
                    'message' => 'This account has been deactivated. Please contact an administrator.',
                ], 403);
            }

            if ($request->hasSession()) {
                $request->session()->flush();
            }
            Auth::guard('web')->login($user);
            if ($request->hasSession()) {
                $request->session()->regenerate();
            }
        } else {
            // Single facility or no facility - use normal authentication
            // Try to find the user first to verify they exist
            $user = \App\Models\User::where('email', $credentials['email'])->first();
            
            if (!$user) {
                \Log::warning('Login attempt failed - user not found', [
                    'email' => $credentials['email'],
                    'ip' => $request->ip(),
                ]);
                return response()->json([
                    'message' => 'Invalid credentials',
                ], 401);
            }
            
            // Verify password manually
            if (!Hash::check($credentials['password'], $user->password)) {
                \Log::warning('Login attempt failed - invalid password', [
                    'email' => $credentials['email'],
                    'user_id' => $user->id,
                    'ip' => $request->ip(),
                ]);
                return response()->json([
                    'message' => 'Invalid credentials',
                ], 401);
            }
            
            // Check if user is active
            if (!$user->is_active) {
                return response()->json([
                    'message' => 'This account has been deactivated. Please contact an administrator.',
                ], 403);
            }

            // Block login if user belongs to a deleted or inactive facility
            if ($user->facility_id) {
                $userFacility = Facility::find($user->facility_id);
                if (!$userFacility || !$userFacility->is_active) {
                    return response()->json([
                        'message' => 'This facility is no longer active. Please contact an administrator.',
                    ], 403);
                }
            }
            
            // Clear guest session data without invalidate() — invalidating before login can 500 on the
            // first POST after an expired/stale session cookie (session driver edge case).
            if ($request->hasSession()) {
                $request->session()->flush();
            }

            Auth::guard('web')->login($user, true);
            if ($request->hasSession()) {
                $request->session()->regenerate();
            }
        }

        if (Auth::guard('web')->check()) {
            /** @var \App\Models\User $user */
            $user = Auth::guard('web')->user();

            if (!$user?->is_active) {
                // Immediately end the session and block login for inactive accounts
                Auth::guard('web')->logout();
                if ($request->hasSession()) {
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();
                }

                return response()->json([
                    'message' => 'This account has been deactivated. Please contact an administrator.',
                ], 403);
            }

            // Block access if user's facility has been deleted or marked inactive
            if ($user->facility_id) {
                $userFacility = Facility::find($user->facility_id);
                if (!$userFacility || !$userFacility->is_active) {
                    // Revoke tokens before clearing auth (after logout, $request->user() is null)
                    $user->tokens()->delete();
                    Auth::guard('web')->logout();
                    if ($request->hasSession()) {
                        $request->session()->invalidate();
                        $request->session()->regenerateToken();
                    }

                    return response()->json([
                        'message' => 'This facility is no longer active. Please contact an administrator.',
                    ], 403);
                }
            }

            // Validate provider code if provided (for single-facility emails, provider_code is optional but validated if provided)
            if ($request->filled('provider_code') && !$hasMultipleFacilities) {
                // Super admins don't have facility_id, so skip provider code validation
                if ($user->role !== 'super_admin') {
                    // Find facility by provider code (case-insensitive)
                    $facility = Facility::whereRaw('LOWER(provider_code) = ?', [strtolower($request->provider_code)])->first();

                    if (!$facility || !$facility->is_active) {
                        Auth::guard('web')->logout();
                        if ($request->hasSession()) {
                            $request->session()->invalidate();
                            $request->session()->regenerateToken();
                        }

                        return response()->json([
                            'message' => 'Invalid provider code or facility is no longer active.',
                        ], 422);
                    }

                    // Verify user belongs to this facility
                    if ($user->facility_id !== $facility->id) {
                        Auth::guard('web')->logout();
                        if ($request->hasSession()) {
                            $request->session()->invalidate();
                            $request->session()->regenerateToken();
                        }

                        return response()->json([
                            'message' => 'You don\'t belong to this facility',
                        ], 403);
                    }
                }
            }

            // Location-based access control for caregivers
            $locationService = app(LocationService::class);
            $locationCheckResult = $this->validateUserLocation($user, $request, $locationService);
            
            if ($locationCheckResult !== null) {
                // Location check failed
                Auth::guard('web')->logout();
                if ($request->hasSession()) {
                    $request->session()->invalidate();
                    $request->session()->regenerateToken();
                }

                return response()->json([
                    'message' => $locationCheckResult['message'],
                    'distance' => $locationCheckResult['distance'] ?? null,
                ], 403);
            }

            $token = $user->createToken('api-token')->plainTextToken;

            // Log login (non-fatal — activity log failures must not block sign-in)
            try {
                ActivityLogService::login($user, [
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);
            } catch (\Throwable $e) {
                Log::warning('Activity log login failed', [
                    'user_id' => $user->id,
                    'message' => $e->getMessage(),
                ]);
            }

            // Automatically clock in the user if they have an assigned branch
            $this->autoClockIn($user, $request);

            try {
                $userPayload = $this->transformUser($user);
            } catch (\Throwable $e) {
                Log::error('transformUser failed during login', [
                    'user_id' => $user->id,
                    'message' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
                $userPayload = $this->minimalLoginUserPayload($user);
            }

            return response()->json([
                'user' => $userPayload,
                'token' => $token,
            ]);
        }

        return response()->json([
            'message' => 'Invalid credentials',
        ], 401);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        // Automatically clock out the user if they're clocked in
        if ($user) {
            $this->autoClockOut($user, $request);

            // Log logout before deleting tokens
            ActivityLogService::logout($user, [
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            $user->tokens()->delete();
        }

        // Clear web session guard so the next login does not inherit a stale session (avoids edge-case 500s)
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            // Reject if user's facility has been deleted or marked inactive (so frontend redirects to login)
            if ($user->facility_id) {
                $facility = Facility::find($user->facility_id);
                if (!$facility || !$facility->is_active) {
                    $request->user()->currentAccessToken()->delete();
                    return response()->json(['message' => 'This facility is no longer active.'], 401);
                }
            }
            return response()->json($this->transformUser($user));
        } catch (\Exception $e) {
            \Log::error('Error in user endpoint: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Failed to load user data',
                'error' => config('app.debug') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        // Verify current password
        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect',
            ], 422);
        }

        // Update password
        $user->password = Hash::make($validated['password']);
        $user->save();

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }

    public function refreshToken(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $request->user()->currentAccessToken()->delete();

        $newToken = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'token' => $newToken,
            'token_issued_at' => now()->toIso8601String(),
        ]);
    }

    public function validateToken(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['valid' => false], 401);
        }

        // Invalidate token if user's facility has been deleted or marked inactive
        if ($user->facility_id) {
            $facility = Facility::find($user->facility_id);
            if (!$facility || !$facility->is_active) {
                $request->user()->currentAccessToken()->delete();
                return response()->json(['valid' => false], 401);
            }
        }

        return response()->json([
            'valid' => true,
            'user_id' => $user->id,
        ]);
    }

    public function updateCredentials(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'email' => 'nullable|email|max:255',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect',
            ], 422);
        }

        $newEmail = isset($validated['email']) ? strtolower(trim($validated['email'])) : null;
        $hasEmailChange = $newEmail !== null && $newEmail !== '' && $newEmail !== $user->email;
        $hasPasswordChange = !empty($validated['password']);

        if (!$hasEmailChange && !$hasPasswordChange) {
            return response()->json([
                'message' => 'No credential changes were provided',
            ], 422);
        }

        if ($hasEmailChange) {
            $emailQuery = \App\Models\User::query()
                ->where('email', $newEmail)
                ->where('id', '!=', $user->id);

            if ($user->facility_id) {
                $emailQuery->where('facility_id', $user->facility_id);
            } else {
                $emailQuery->whereNull('facility_id');
            }

            if ($emailQuery->exists()) {
                return response()->json([
                    'message' => 'That email is already in use',
                ], 422);
            }

            $user->email = $newEmail;
        }

        if ($hasPasswordChange) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        return response()->json([
            'message' => 'Credentials updated successfully',
            'user' => $this->transformUser($user->fresh()),
        ]);
    }

    /**
     * Minimal user payload when full transformUser fails (keeps sign-in working).
     */
    protected function minimalLoginUserPayload(\App\Models\User $user): array
    {
        try {
            $user->loadMissing(['assignedBranch', 'facility']);
        } catch (\Throwable $e) {
            Log::warning('minimalLoginUserPayload: loadMissing failed', [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);
        }

        $facility = null;
        try {
            $facility = $user->facility ?? ($user->assignedBranch ? $user->assignedBranch->facility : null);
        } catch (\Throwable $e) {
            Log::warning('minimalLoginUserPayload: facility resolve failed', [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);
        }

        $brandingName = 'HomeLogic360';
        if ($facility && $facility->name) {
            $brandingName = $facility->name;
        }

        $tz = config('app.timezone', 'UTC');
        $now = Carbon::now($tz);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'facility_id' => $user->facility_id,
            'assigned_branch_id' => $user->assigned_branch_id,
            'facility_branding' => [
                'name' => $brandingName,
                'logo' => asset('images/logonew.png'),
                'primary_color' => '#1E3A5F',
                'secondary_color' => '#86EFAC',
                'accent_color' => '#FFFFFF',
            ],
            'enabled_modules' => ($user->role === 'super_admin' || $user->hasRole('super_admin'))
                ? array_keys(\App\Constants\Modules::all())
                : [],
            'permissions' => [],
            'report_context' => [
                'facility_name' => $facility ? $facility->name : $brandingName,
                'facility_address' => $facility ? (string) ($facility->address ?? '') : '',
                'facility_phone' => $facility ? (string) ($facility->phone ?? '') : '',
                'branch_name' => $user->assignedBranch ? $user->assignedBranch->name : null,
                'branch_address' => $user->assignedBranch ? (string) ($user->assignedBranch->address ?? '') : '',
            ],
            'app_timezone' => $tz,
            'app_timezone_abbr' => $now->format('T'),
            'app_timezone_offset' => $now->format('P'),
            'app_current_time' => $now->toIso8601String(),
        ];
    }

    /**
     * Attach application timezone metadata to the user payload.
     */
    protected function transformUser(?\App\Models\User $user): array
    {
        if (!$user) {
            return [];
        }

        // Make sure commonly-used relationships are available in the API payload.
        // This includes the user's assigned branch and its facility so that
        // frontend pages (e.g. profile, housekeeping, medications) can safely
        // reference `user.assigned_branch` without needing extra API calls.
        $user->loadMissing([
            'assignedBranch.facility.modules',
            'facility.modules',
            'roles.permissions', // Eager load roles and permissions to avoid N+1
        ]);

        $appTimezone = config('app.timezone', 'UTC');
        $now = Carbon::now($appTimezone);

        $payload = $user->toArray();
        $payload['app_timezone'] = $appTimezone;
        $payload['app_timezone_abbr'] = $now->format('T');
        $payload['app_timezone_offset'] = $now->format('P');
        $payload['app_current_time'] = $now->toIso8601String();
        
        // Include facility branding if available
        $facility = $user->facility ?? ($user->assignedBranch ? $user->assignedBranch->facility : null);
        
        if ($facility) {
            $payload['facility_branding'] = $facility->branding;
            
            // Include enabled modules for this facility (hasModuleAccess treats "no record" as enabled)
            $allModuleKeys = array_keys(\App\Constants\Modules::all());
            $enabledModules = array_values(array_filter($allModuleKeys, fn ($key) => $facility->hasModuleAccess($key)));
            $payload['enabled_modules'] = $enabledModules;
        } else {
            // Default branding for super admin / HomeLogic360
            $payload['facility_branding'] = [
                'name' => 'HomeLogic360',
                'logo' => asset('images/logonew.png'),
                'primary_color' => '#1E3A5F', // Dark blue from logo
                'secondary_color' => '#86EFAC', // Light green from logo
                'accent_color' => '#FFFFFF', // White from logo
            ];
            
            // Super admins have access to all modules
            if ($user->role === 'super_admin' || $user->hasRole('super_admin')) {
                $payload['enabled_modules'] = array_keys(\App\Constants\Modules::all());
            } else {
                $payload['enabled_modules'] = [];
            }
        }

        // Report header context for printable reports (facility/branch name and address)
        $payload['report_context'] = [
            'facility_name' => $facility ? $facility->name : ($payload['facility_branding']['name'] ?? ''),
            'facility_address' => $facility ? ($facility->address ?? '') : '',
            'facility_phone' => $facility ? ($facility->phone ?? '') : '',
            'branch_name' => $user->assignedBranch ? $user->assignedBranch->name : null,
            'branch_address' => $user->assignedBranch ? ($user->assignedBranch->address ?? '') : '',
        ];

        // Include effective permissions for navigation checks
        // Get all permissions the user effectively has (considering facility overrides)
        // Ensure it's always an array to prevent frontend errors
        try {
            $permissions = $this->getEffectivePermissions($user);
        } catch (\Throwable $e) {
            Log::error('getEffectivePermissions failed during transformUser', [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            $permissions = [];
        }
        $payload['permissions'] = is_array($permissions) ? $permissions : [];

        return $payload;
    }

    /**
     * Get all effective permissions for a user (considering facility-specific overrides)
     */
    protected function getEffectivePermissions(\App\Models\User $user): array
    {
        // Super admins have all permissions
        if ($user->role === 'super_admin' || $user->hasRole('super_admin')) {
            return \App\Models\Permission::pluck('name')->toArray();
        }

        // Spatie roles when present; else legacy `users.role` → roles table (must match User::hasPermission)
        $userRoles = $user->rolesForPermissionResolution();

        if ($userRoles->isEmpty()) {
            return [];
        }

        // Get facility for module access checks (use already loaded if available)
        $facility = null;
        if ($user->relationLoaded('facility') && $user->facility) {
            $facility = $user->facility;
        } elseif ($user->relationLoaded('assignedBranch') && $user->assignedBranch) {
            if ($user->assignedBranch->relationLoaded('facility')) {
                $facility = $user->assignedBranch->facility;
            } else {
                $facility = $user->assignedBranch->facility;
            }
        } else {
            $facility = $user->facility ?? ($user->assignedBranch ? $user->assignedBranch->facility : null);
        }
        
        // Get enabled modules for this facility (use already loaded if available)
        $enabledModules = [];
        if ($facility) {
            if ($facility->relationLoaded('modules')) {
                $enabledModules = $facility->modules->where('is_enabled', true)->pluck('module')->toArray();
            } else {
                $enabledModules = $facility->modules()->where('is_enabled', true)->pluck('module')->toArray();
            }
        }

        // Get ALL facility overrides at once to avoid N+1 queries
        $allFacilityOverrides = collect();
        if ($facility) {
            $roleIds = $userRoles->pluck('id')->toArray();
            $allFacilityOverrides = $facility->rolePermissions()
                ->whereIn('role_id', $roleIds)
                ->with('permission')
                ->get()
                ->groupBy('role_id')
                ->map(function ($items) {
                    return $items->keyBy(function ($item) {
                        return $item->permission ? $item->permission->name : null;
                    })->filter(function ($item) {
                        return $item->permission !== null;
                    });
                });
        }

        // Get facility-specific overrides for user's roles
        $effectivePermissions = [];
        
        // Pre-load module mapping for all permissions to avoid repeated calls
        $permissionModuleMap = [];
        
        foreach ($userRoles as $role) {
            // Get global permissions for this role (use already loaded if available)
            $roleGlobalPermissions = $role->relationLoaded('permissions')
                ? $role->permissions->pluck('name')->toArray()
                : $role->permissions()->pluck('name')->toArray();
            
            // Get facility overrides for this role (if facility exists)
            $roleFacilityOverrides = $allFacilityOverrides->get($role->id, collect());

            // Merge: facility overrides take precedence
            foreach ($roleGlobalPermissions as $permissionName) {
                $isAllowed = true;
                
                if ($roleFacilityOverrides->has($permissionName)) {
                    // Facility override exists - use it
                    $isAllowed = $roleFacilityOverrides[$permissionName]->is_allowed;
                }
                
                if ($isAllowed) {
                    // Check if permission requires module access
                    // Cache module mapping to avoid repeated calls
                    if (!isset($permissionModuleMap[$permissionName])) {
                        try {
                            $permissionModuleMap[$permissionName] = \App\Helpers\ModulePermissionMapper::getModuleForPermission($permissionName);
                        } catch (\Exception $e) {
                            \Log::warning('ModulePermissionMapper error for permission: ' . $permissionName, [
                                'error' => $e->getMessage(),
                            ]);
                            $permissionModuleMap[$permissionName] = null; // Allow permission if mapper fails
                        }
                    }
                    
                    $module = $permissionModuleMap[$permissionName];
                    
                    if ($module === null) {
                        // Permission doesn't map to a module, allow it
                        $effectivePermissions[] = $permissionName;
                    } elseif ($facility && in_array($module, $enabledModules)) {
                        // Module is enabled, allow permission
                        $effectivePermissions[] = $permissionName;
                    }
                    // If module is disabled, don't add permission
                }
                // If explicitly denied, don't add permission
            }

            // Facility-only grants (UI "Added"): not on global role but allowed for this facility
            foreach ($roleFacilityOverrides as $permissionName => $override) {
                if (! $override->is_allowed) {
                    continue;
                }
                if (in_array($permissionName, $roleGlobalPermissions, true)) {
                    continue;
                }
                if (! isset($permissionModuleMap[$permissionName])) {
                    try {
                        $permissionModuleMap[$permissionName] = \App\Helpers\ModulePermissionMapper::getModuleForPermission($permissionName);
                    } catch (\Exception $e) {
                        \Log::warning('ModulePermissionMapper error for permission: ' . $permissionName, [
                            'error' => $e->getMessage(),
                        ]);
                        $permissionModuleMap[$permissionName] = null;
                    }
                }
                $module = $permissionModuleMap[$permissionName];
                if ($module === null) {
                    $effectivePermissions[] = $permissionName;
                } elseif ($facility && in_array($module, $enabledModules, true)) {
                    $effectivePermissions[] = $permissionName;
                }
            }
        }

        // Remove duplicates and ensure it's a proper array
        return array_values(array_unique($effectivePermissions));
    }

    /**
     * Validate user location for caregivers
     * 
     * @param \App\Models\User $user
     * @param \Illuminate\Http\Request $request
     * @param \App\Services\LocationService $locationService
     * @return array|null Returns error array on failure, null on success
     */
    protected function validateUserLocation($user, Request $request, LocationService $locationService): ?array
    {
        // Check if location checking is enabled globally
        if (!config('location.enabled', true)) {
            return null;
        }

        // Skip location check for non-caregivers, super admins, or users with bypass enabled
        if (!$user->isCaregiver() 
            || $user->role === 'super_admin' 
            || $user->location_check_bypass) {
            return null;
        }

        // Get user's location coordinates (from browser or IP fallback)
        $userLat = $request->input('latitude');
        $userLon = $request->input('longitude');
        $userIp = $request->ip();

        // If browser geolocation not provided, try IP-based geolocation
        if ($userLat === null || $userLon === null) {
            $ipLocation = $locationService->getLocationFromIp($userIp);
            if ($ipLocation) {
                $userLat = $ipLocation['latitude'];
                $userLon = $ipLocation['longitude'];
                Log::info('Using IP-based geolocation for login', [
                    'user_id' => $user->id,
                    'ip' => $userIp,
                ]);
            } else {
                // No location available - allow login but log warning
                Log::warning('Location check skipped - no coordinates available', [
                    'user_id' => $user->id,
                    'ip' => $userIp,
                ]);
                return null;
            }
        }

        // Validate user coordinates
        if (!$locationService->validateCoordinates($userLat, $userLon)) {
            Log::warning('Invalid user coordinates provided', [
                'user_id' => $user->id,
                'latitude' => $userLat,
                'longitude' => $userLon,
            ]);
            return null; // Allow login if coordinates are invalid (graceful degradation)
        }

        // Get assigned branch or facility coordinates
        $branch = $user->assignedBranch;
        $facility = $user->facility ?? ($branch ? $branch->facility : null);

        $targetLat = null;
        $targetLon = null;
        $targetName = null;

        // Prefer branch coordinates, fallback to facility coordinates
        if ($branch && $branch->hasCoordinates()) {
            $targetLat = $branch->latitude;
            $targetLon = $branch->longitude;
            $targetName = $branch->name;
        } elseif ($facility && $facility->hasCoordinates()) {
            $targetLat = $facility->latitude;
            $targetLon = $facility->longitude;
            $targetName = $facility->name;
        }

        // If no coordinates available for branch/facility, allow login but log warning
        if ($targetLat === null || $targetLon === null) {
            Log::warning('Location check skipped - branch/facility has no coordinates', [
                'user_id' => $user->id,
                'branch_id' => $branch?->id,
                'facility_id' => $facility?->id,
            ]);
            return null;
        }

        // Calculate distance
        $distanceKm = $locationService->calculateDistance(
            $userLat,
            $userLon,
            $targetLat,
            $targetLon
        );

        // Check if within allowed distance
        if (!$locationService->isWithinAllowedDistance($distanceKm)) {
            $formattedDistance = $locationService->formatDistance($distanceKm);
            
            Log::warning('Login blocked due to distance', [
                'user_id' => $user->id,
                'distance_km' => $distanceKm,
                'target' => $targetName,
            ]);

            $maxDistanceFormatted = LocationService::MAX_LOGIN_DISTANCE_KM < 1 
                ? (LocationService::MAX_LOGIN_DISTANCE_KM * 1000) . ' meters'
                : LocationService::MAX_LOGIN_DISTANCE_KM . 'km';
            
            return [
                'message' => "You are too far from your assigned location ({$targetName}). You are {$formattedDistance} away, but must be within {$maxDistanceFormatted} to log in.",
                'distance' => $distanceKm,
            ];
        }

        // Location check passed
        Log::info('Location check passed', [
            'user_id' => $user->id,
            'distance_km' => $distanceKm,
            'target' => $targetName,
        ]);

        return null;
    }

    /**
     * Automatically clock in user after successful login
     * 
     * @param \App\Models\User $user
     * @param \Illuminate\Http\Request $request
     * @return void
     */
    protected function autoClockIn(\App\Models\User $user, Request $request): void
    {
        // Only clock in users who have an assigned branch (staff members)
        if (!$user->assigned_branch_id) {
            return;
        }

        // Check if user is already clocked in
        if ($user->hasActiveClockIn()) {
            Log::info('User already clocked in, skipping auto clock-in', [
                'user_id' => $user->id,
            ]);
            return;
        }

        try {
            $locationService = app(LocationService::class);
            
            // Get location from request (may be null if not provided)
            $latitude = $request->input('latitude');
            $longitude = $request->input('longitude');

            // If location not provided in request, try to get from IP
            if ($latitude === null || $longitude === null) {
                $ipLocation = $locationService->getLocationFromIp($request->ip());
                if ($ipLocation) {
                    $latitude = $ipLocation['latitude'];
                    $longitude = $ipLocation['longitude'];
                }
            }

            // Validate location if provided (optional for auto clock-in)
            if ($latitude !== null && $longitude !== null) {
                $locationError = $locationService->validateCheckInLocation(
                    $user,
                    $latitude,
                    $longitude
                );

                // If location validation fails, still clock in but log warning
                // This allows auto clock-in even if location check fails
                if ($locationError) {
                    Log::warning('Auto clock-in location validation failed, clocking in anyway', [
                        'user_id' => $user->id,
                        'error' => $locationError['message'] ?? 'Unknown error',
                    ]);
                }
            } else {
                // No location available - log but still allow clock-in
                Log::info('Auto clock-in without location coordinates', [
                    'user_id' => $user->id,
                    'ip' => $request->ip(),
                ]);
            }

            // Create clock-in record
            $clockIn = StaffClockIn::create([
                'staff_id' => $user->id,
                'branch_id' => $user->assigned_branch_id,
                'facility_id' => $user->facility_id,
                'clock_in_at' => now(),
                'clock_in_latitude' => $latitude,
                'clock_in_longitude' => $longitude,
                'is_active' => true,
                'clock_method' => 'authenticated',
            ]);

            $clockIn->load(['staff', 'branch', 'facility']);

            // Create notifications for admins
            $this->notifyStaffClockIn($clockIn);

            Log::info('User automatically clocked in on login', [
                'user_id' => $user->id,
                'clock_in_id' => $clockIn->id,
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail login if clock-in fails
            Log::error('Failed to auto clock-in user on login', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Notify admins about staff clock-in
     */
    private function notifyStaffClockIn(StaffClockIn $clockIn): void
    {
        $clockIn->load(['staff', 'branch', 'facility']);
        
        // Get admins and facility admins
        $users = \App\Models\User::where(function($query) use ($clockIn) {
            $query->whereIn('role', ['super_admin', 'administrator', 'admin', 'manager']);
            
            // Filter by facility if applicable
            if ($clockIn->facility_id) {
                $query->where(function($q) use ($clockIn) {
                    $q->where('facility_id', $clockIn->facility_id)
                      ->orWhereNull('facility_id'); // Super admins
                });
            }
        })
        ->where('is_active', true)
        ->where('id', '!=', $clockIn->staff_id) // Don't notify the staff member themselves
        ->get();

        $branchName = $clockIn->branch?->name ?? 'Unknown Branch';
        $staffName = $clockIn->staff?->name ?? 'Unknown Staff';
        $time = Carbon::parse($clockIn->clock_in_at)->format('g:i A');

        foreach ($users as $admin) {
            \App\Models\Notification::create([
                'user_id' => $admin->id,
                'type' => 'staff_clock_in',
                'title' => 'Staff Clocked In',
                'message' => "{$staffName} clocked in at {$branchName} at {$time}",
                'icon' => 'clock',
                'icon_color' => 'text-green-600',
                'action_url' => '/check-in-dashboard',
                'metadata' => [
                    'clock_in_id' => $clockIn->id,
                    'staff_id' => $clockIn->staff_id,
                    'branch_id' => $clockIn->branch_id,
                    'facility_id' => $clockIn->facility_id,
                ],
            ]);
        }

        // Send email notifications
        try {
            $notificationService = app(\App\Services\NotificationService::class);
            $notificationService->sendStaffClockInEmail($clockIn, $users, 'clocked_in');
        } catch (\Exception $e) {
            Log::warning('Failed to send clock-in email notification', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Automatically clock out user on logout
     * 
     * @param \App\Models\User $user
     * @param \Illuminate\Http\Request $request
     * @return void
     */
    protected function autoClockOut(\App\Models\User $user, Request $request): void
    {
        // Check if user has an active clock-in
        if (!$user->hasActiveClockIn()) {
            return;
        }

        try {
            $activeClockIn = $user->activeClockIn;

            // Get location from request (optional)
            $latitude = $request->input('latitude');
            $longitude = $request->input('longitude');

            // Clock out
            $activeClockIn->clockOut($latitude, $longitude);

            // Reload relationships
            $activeClockIn->load(['staff', 'branch', 'facility']);

            // Notify admins
            $this->notifyStaffClockOut($activeClockIn, $user);

            Log::info('User automatically clocked out on logout', [
                'user_id' => $user->id,
                'clock_in_id' => $activeClockIn->id,
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail logout if clock-out fails
            Log::error('Failed to auto clock-out user on logout', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }

    /**
     * Notify admins about staff clock-out
     */
    private function notifyStaffClockOut(StaffClockIn $clockIn, ?\App\Models\User $actionBy = null): void
    {
        $clockIn->load(['staff', 'branch', 'facility']);
        
        // Get admins and facility admins
        $users = \App\Models\User::where(function($query) use ($clockIn) {
            $query->whereIn('role', ['super_admin', 'administrator', 'admin', 'manager']);
            
            // Filter by facility if applicable
            if ($clockIn->facility_id) {
                $query->where(function($q) use ($clockIn) {
                    $q->where('facility_id', $clockIn->facility_id)
                      ->orWhereNull('facility_id'); // Super admins
                });
            }
        })
        ->where('is_active', true)
        ->where('id', '!=', $clockIn->staff_id) // Don't notify the staff member themselves
        ->get();

        $branchName = $clockIn->branch?->name ?? 'Unknown Branch';
        $staffName = $clockIn->staff?->name ?? 'Unknown Staff';
        $time = Carbon::parse($clockIn->clock_out_at)->format('g:i A');
        $duration = $clockIn->total_hours ? round($clockIn->total_hours, 2) . ' hours' : 'N/A';
        
        $actionByText = $actionBy && $actionBy->id !== $clockIn->staff_id 
            ? " by {$actionBy->name}" 
            : '';

        foreach ($users as $admin) {
            \App\Models\Notification::create([
                'user_id' => $admin->id,
                'type' => 'staff_clock_out',
                'title' => 'Staff Clocked Out',
                'message' => "{$staffName} clocked out{$actionByText} at {$branchName} at {$time} (Duration: {$duration})",
                'icon' => 'clock',
                'icon_color' => 'text-blue-600',
                'action_url' => '/check-in-dashboard',
                'metadata' => [
                    'clock_in_id' => $clockIn->id,
                    'staff_id' => $clockIn->staff_id,
                    'branch_id' => $clockIn->branch_id,
                    'facility_id' => $clockIn->facility_id,
                ],
            ]);
        }

        // Send email notifications
        try {
            $notificationService = app(\App\Services\NotificationService::class);
            $notificationService->sendStaffClockInEmail($clockIn, $users, 'clocked_out');
        } catch (\Exception $e) {
            Log::warning('Failed to send clock-out email notification', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}

