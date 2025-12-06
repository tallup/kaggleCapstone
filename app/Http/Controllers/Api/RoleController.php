<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Role::with('permissions');
        
        // Filter to only show allowed roles: administrator, caregiver, and nurse
        $allowedRoles = ['administrator', 'caregiver', 'nurse', 'registered_nurse', 'licensed_nurse', 'care_giver'];
        $query->whereIn('name', $allowedRoles);
        
        // Exclude 'admin' and 'duty roster' roles
        $query->whereNotIn('name', ['admin', 'duty_roster', 'duty roster']);
        
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where('name', 'like', "%{$search}%");
        }
        $roles = $query->orderBy('name')->paginate($request->get('per_page', 20));
        return response()->json($roles);
    }

    public function permissions(): JsonResponse
    {
        return response()->json(Permission::orderBy('name')->get());
    }

    public function store(Request $request): JsonResponse
    {
        if ($error = $this->requirePermission('create_roles')) {
            return $error;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'permissions' => 'array',
        ]);
        $role = Role::create(['name' => $validated['name']]);
        if (!empty($validated['permissions'])) {
            $role->permissions()->sync(Permission::whereIn('name', $validated['permissions'])->pluck('id'));
        }
        return response()->json($role->load('permissions'), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        if ($error = $this->requirePermission('edit_roles')) {
            return $error;
        }

        $role = Role::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:roles,name,' . $role->id,
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
        if ($error = $this->requirePermission('delete_roles')) {
            return $error;
        }

        $role = Role::findOrFail($id);
        $role->permissions()->detach();
        $role->delete();
        return response()->json(['message' => 'Role deleted']);
    }

    /**
     * Ensure required roles (administrator, admin, caregiver) exist
     */
    public function ensureRolesExist(): JsonResponse
    {
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
                ],
                'total_permissions_in_db' => $permissionCount,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error ensuring roles exist: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return $this->error('Failed to ensure roles exist: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Diagnostic endpoint to check roles and permissions status
     */
    public function diagnostic(): JsonResponse
    {
        try {
            $administratorRole = Role::where(function($query) {
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
            \Log::error('Error in diagnostic: ' . $e->getMessage());
            return $this->error('Failed to run diagnostic: ' . $e->getMessage(), 500);
        }
    }

    private function getRecommendations($permissionCount, $administratorRole, $caregiverRole, $adminPermissionCount, $caregiverPermissionCount): array
    {
        $recommendations = [];
        
        if ($permissionCount === 0) {
            $recommendations[] = 'Run PermissionSeeder: php artisan db:seed --class=PermissionSeeder';
        }
        
        if (!$administratorRole) {
            $recommendations[] = 'Administrator role is missing. Click "Create Required Roles" button or run: php artisan roles:ensure-exist';
        } elseif ($adminPermissionCount === 0) {
            $recommendations[] = 'Administrator role exists but has no permissions. Click "Create Required Roles" button or run: php artisan roles:ensure-exist';
        }
        
        if (!$caregiverRole) {
            $recommendations[] = 'Caregiver role is missing. Click "Create Required Roles" button or run: php artisan roles:ensure-exist';
        } elseif ($caregiverPermissionCount === 0) {
            $recommendations[] = 'Caregiver role exists but has no permissions. Click "Create Required Roles" button or run: php artisan roles:ensure-exist';
        }
        
        if (empty($recommendations)) {
            $recommendations[] = 'All roles and permissions are properly configured!';
        }
        
        return $recommendations;
    }
}


