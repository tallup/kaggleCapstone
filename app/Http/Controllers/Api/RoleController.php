<?php

namespace App\Http\Controllers\Api;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        if (auth()->user()?->isSuperAdmin()) {
            // Only platform admins may mutate global role records during a read.
            $this->ensureRequiredRolesExist();
        }

        $query = Role::with('permissions');

        // Filter to only show allowed roles: administrator, admin, caregiver, and nurse
        $allowedRoles = ['administrator', 'admin', 'caregiver', 'nurse', 'registered_nurse', 'licensed_nurse', 'care_giver'];
        $query->whereIn('name', $allowedRoles);

        // Exclude 'duty roster' roles
        $query->whereNotIn('name', ['duty_roster', 'duty roster']);

        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where('name', 'like', "%{$search}%");
        }
        $roles = $query->orderBy('name')->paginate($request->get('per_page', 20));

        return response()->json($roles);
    }

    /**
     * Ensure required roles exist in the database
     */
    private function ensureRequiredRolesExist(): void
    {
        // Check if administrator role exists
        $administratorRole = Role::where('name', 'administrator')->first();
        if (! $administratorRole) {
            // Create administrator role if it doesn't exist
            $administratorRole = Role::create([
                'name' => 'administrator',
                'guard_name' => 'web',
            ]);

            // Sync all permissions to administrator role
            $permissions = Permission::all();
            if ($permissions->count() > 0) {
                $administratorRole->permissions()->sync($permissions->pluck('id'));
            }
        }

        // Ensure other required roles exist
        $requiredRoles = ['admin', 'caregiver', 'nurse'];
        foreach ($requiredRoles as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if (! $role) {
                Role::create([
                    'name' => $roleName,
                    'guard_name' => 'web',
                ]);
            }
        }
    }

    public function permissions(): JsonResponse
    {
        return response()->json(Permission::orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        if ($error = $this->requireSuperAdmin()) {
            return $error;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'permissions' => 'array',
        ]);
        $role = Role::create(['name' => $validated['name']]);
        if (! empty($validated['permissions'])) {
            $role->permissions()->sync(Permission::whereIn('name', $validated['permissions'])->pluck('id'));
        }

        return response()->json($role->load('permissions'), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireSuperAdmin()) {
            return $error;
        }

        $role = Role::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:roles,name,'.$role->id,
            'permissions' => 'array',
        ]);
        if (isset($validated['name'])) {
            $role->name = $validated['name'];
            $role->save();
        }
        if (isset($validated['permissions'])) {
            $role->permissions()->sync(Permission::whereIn('name', $validated['permissions'])->pluck('id'));
        }

        return response()->json($role->load('permissions'));
    }

    public function destroy($id): JsonResponse
    {
        if ($error = $this->requireSuperAdmin()) {
            return $error;
        }

        $role = Role::findOrFail($id);
        $role->permissions()->detach();
        $role->delete();

        return response()->json(['message' => 'Role deleted']);
    }

    /**
     * Ensure required roles (administrator, admin, caregiver, nurse) exist
     */
    public function ensureRolesExist(): JsonResponse
    {
        if ($error = $this->requireSuperAdmin()) {
            return $error;
        }

        try {
            // Check if permissions exist first
            $permissionCount = Permission::count();
            if ($permissionCount === 0) {
                return $this->error('No permissions found in database. Please run the PermissionSeeder first: php artisan db:seed --class=PermissionSeeder', 400);
            }

            // Create administrator role if it doesn't exist
            $administratorRole = Role::firstOrCreate(
                ['name' => 'administrator'],
                ['guard_name' => 'web']
            );

            // Create admin role (alias) if it doesn't exist
            $adminRole = Role::firstOrCreate(
                ['name' => 'admin'],
                ['guard_name' => 'web']
            );

            // Create caregiver role if it doesn't exist
            $caregiverRole = Role::firstOrCreate(
                ['name' => 'caregiver'],
                ['guard_name' => 'web']
            );

            // Create nurse role if it doesn't exist
            $nurseRole = Role::firstOrCreate(
                ['name' => 'nurse'],
                ['guard_name' => 'web']
            );

            // Get all permissions
            $permissions = Permission::all();

            // Sync all permissions to administrator role
            $adminPermissionCount = 0;
            if ($permissions->count() > 0) {
                $administratorRole->permissions()->sync($permissions->pluck('id'));
                $adminRole->permissions()->sync($permissions->pluck('id'));
                $adminPermissionCount = $permissions->count();
            }

            // Sync specific permissions to caregiver role
            $caregiverPermissions = Permission::whereIn('name', [
                'view_admin_panel',
                'view_dashboard',
                'view_own_profile',
                'edit_own_profile',
                'view_residents',
                'view_medications',
                'view_appointments',
                'view_assessments',
                'view_vital_signs',
                'create_vital_signs',
                'view_assignments',
                'create_leave_requests',
                'view_leave_requests',
                'view_incidents',
                'create_incidents',
                'view_behaviors',
                'create_behaviors',
                'view_sleep_records',
                'create_sleep_records',
            ])->pluck('id');

            $caregiverPermissionCount = 0;
            if ($caregiverPermissions->count() > 0) {
                $caregiverRole->permissions()->sync($caregiverPermissions);
                $caregiverPermissionCount = $caregiverPermissions->count();
            }

            // Sync specific permissions to nurse role
            $nursePermissions = Permission::whereIn('name', [
                'view_admin_panel',
                'view_dashboard',
                'view_own_profile',
                'edit_own_profile',
                'view_residents',
                'edit_residents',
                'view_medications',
                'create_medications',
                'edit_medications',
                'view_appointments',
                'create_appointments',
                'edit_appointments',
                'view_assessments',
                'create_assessments',
                'edit_assessments',
                'view_vital_signs',
                'create_vital_signs',
                'edit_vital_signs',
                'view_drugs',
                'create_drugs',
                'edit_drugs',
                'view_incidents',
                'create_incidents',
                'edit_incidents',
            ])->pluck('id');

            $nursePermissionCount = 0;
            if ($nursePermissions->count() > 0) {
                $nurseRole->permissions()->sync($nursePermissions);
                $nursePermissionCount = $nursePermissions->count();
            }

            return $this->success([
                'message' => 'Required roles ensured successfully',
                'roles' => [
                    'administrator' => [
                        'created' => $administratorRole->wasRecentlyCreated,
                        'permissions_count' => $adminPermissionCount,
                    ],
                    'admin' => [
                        'created' => $adminRole->wasRecentlyCreated,
                        'permissions_count' => $adminPermissionCount,
                    ],
                    'caregiver' => [
                        'created' => $caregiverRole->wasRecentlyCreated,
                        'permissions_count' => $caregiverPermissionCount,
                    ],
                    'nurse' => [
                        'created' => $nurseRole->wasRecentlyCreated,
                        'permissions_count' => $nursePermissionCount,
                    ],
                ],
                'total_permissions_in_db' => $permissionCount,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error ensuring roles exist: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return $this->error('Failed to ensure roles exist: '.$e->getMessage(), 500);
        }
    }

    /**
     * Diagnostic endpoint to check roles and permissions status
     */
    public function diagnostic(): JsonResponse
    {
        if ($error = $this->requireSuperAdmin()) {
            return $error;
        }

        try {
            $administratorRole = Role::where(function ($query) {
                $query->where('name', 'administrator')->orWhere('name', 'admin');
            })->first();

            $caregiverRole = Role::where('name', 'caregiver')->first();

            $permissionCount = Permission::count();
            $adminPermissionCount = $administratorRole ? $administratorRole->permissions()->count() : 0;
            $caregiverPermissionCount = $caregiverRole ? $caregiverRole->permissions()->count() : 0;

            return $this->success([
                'permissions' => [
                    'total_in_database' => $permissionCount,
                    'status' => $permissionCount > 0 ? 'ok' : 'missing',
                    'message' => $permissionCount > 0
                        ? "Found {$permissionCount} permissions in database"
                        : 'No permissions found. Run: php artisan db:seed --class=PermissionSeeder',
                ],
                'roles' => [
                    'administrator' => [
                        'exists' => $administratorRole !== null,
                        'id' => $administratorRole?->id,
                        'name' => $administratorRole?->name,
                        'permissions_count' => $adminPermissionCount,
                        'status' => $administratorRole && $adminPermissionCount > 0 ? 'ok' : ($administratorRole ? 'no_permissions' : 'missing'),
                    ],
                    'caregiver' => [
                        'exists' => $caregiverRole !== null,
                        'id' => $caregiverRole?->id,
                        'name' => $caregiverRole?->name,
                        'permissions_count' => $caregiverPermissionCount,
                        'status' => $caregiverRole && $caregiverPermissionCount > 0 ? 'ok' : ($caregiverRole ? 'no_permissions' : 'missing'),
                    ],
                ],
                'recommendations' => $this->getRecommendations($permissionCount, $administratorRole, $caregiverRole, $adminPermissionCount, $caregiverPermissionCount),
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in diagnostic: '.$e->getMessage());

            return $this->error('Failed to run diagnostic: '.$e->getMessage(), 500);
        }
    }

    private function getRecommendations($permissionCount, $administratorRole, $caregiverRole, $adminPermissionCount, $caregiverPermissionCount): array
    {
        $recommendations = [];

        if ($permissionCount === 0) {
            $recommendations[] = 'Run PermissionSeeder: php artisan db:seed --class=PermissionSeeder';
        }

        if (! $administratorRole) {
            $recommendations[] = 'Administrator role is missing. Click "Create Required Roles" button or run: php artisan roles:ensure-exist';
        } elseif ($adminPermissionCount === 0) {
            $recommendations[] = 'Administrator role exists but has no permissions. Click "Create Required Roles" button or run: php artisan roles:ensure-exist';
        }

        if (! $caregiverRole) {
            $recommendations[] = 'Caregiver role is missing. Click "Create Required Roles" button or run: php artisan roles:ensure-exist';
        } elseif ($caregiverPermissionCount === 0) {
            $recommendations[] = 'Caregiver role exists but has no permissions. Click "Create Required Roles" button or run: php artisan roles:ensure-exist';
        }

        if (empty($recommendations)) {
            $recommendations[] = 'All roles and permissions are properly configured!';
        }

        return $recommendations;
    }

    private function requireSuperAdmin(): ?JsonResponse
    {
        $user = auth()->user();

        if (! $user) {
            return $this->error('Unauthorized.', 401);
        }

        if (! $user->isSuperAdmin()) {
            return $this->error('Unauthorized. Super admin access required.', 403);
        }

        return null;
    }
}
