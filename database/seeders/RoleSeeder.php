<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create roles
        $superAdmin = Role::create([
            'name' => 'super-admin',
            'guard_name' => 'web',
        ]);

        $administrator = Role::create([
            'name' => 'administrator',
            'guard_name' => 'web',
        ]);

        $admin = Role::create([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);

        $manager = Role::create([
            'name' => 'manager',
            'guard_name' => 'web',
        ]);

        $supervisor = Role::create([
            'name' => 'supervisor',
            'guard_name' => 'web',
        ]);

        $nurse = Role::create([
            'name' => 'nurse',
            'guard_name' => 'web',
        ]);

        $caregiver = Role::create([
            'name' => 'caregiver',
            'guard_name' => 'web',
        ]);

        $supportStaff = Role::create([
            'name' => 'support-staff',
            'guard_name' => 'web',
        ]);

        $family = Role::create([
            'name' => 'family',
            'guard_name' => 'web',
        ]);

        // Get all permissions
        $allPermissions = Permission::all()->pluck('id')->toArray();

        // Super Admin - All permissions
        $superAdmin->syncPermissions($allPermissions);

        // Administrator - Full facility access (all permissions except system admin)
        $adminPermissions = Permission::whereNotIn('group', ['System Administration'])->pluck('id')->toArray();
        $administrator->syncPermissions($adminPermissions);

        // Admin - Branch-level admin (same permissions but data scoped to branch)
        $admin->syncPermissions($adminPermissions);

        // Manager - Management and operational permissions
        $managerPermissions = Permission::whereIn('group', [
            'Panel Access',
            'Staff Management',
            'Resident Management',
            'Medication Management',
            'Leave Management',
            'Assignment Management',
            'Facility Management',
            'Reports & Analytics',
            'Notifications'
        ])->pluck('id')->toArray();
        $managerPermissions = array_merge($managerPermissions, Permission::whereIn('name', ['view_schedules', 'manage_schedules'])->pluck('id')->toArray());
        $manager->syncPermissions(array_unique($managerPermissions));

        // Supervisor - Supervisory permissions
        $supervisorPermissions = Permission::whereIn('group', [
            'Panel Access',
            'Staff Management',
            'Resident Management',
            'Medication Management',
            'Leave Management',
            'Assignment Management',
            'Notifications'
        ])->whereNotIn('name', [
            'delete_users',
            'delete_residents',
            'delete_medications',
            'delete_leave_requests',
            'delete_assignments'
        ])->pluck('id')->toArray();
        $supervisorPermissions = array_merge($supervisorPermissions, Permission::whereIn('name', ['view_schedules', 'manage_schedules'])->pluck('id')->toArray());
        $supervisor->syncPermissions(array_unique($supervisorPermissions));

        // Nurse - Clinical permissions
        $nursePermissions = Permission::whereIn('group', [
            'Panel Access',
            'Resident Management',
            'Medication Management',
            'Assignment Management',
            'Notifications'
        ])->whereNotIn('name', [
            'delete_residents',
            'delete_medications',
            'delete_assignments'
        ])->pluck('id')->toArray();
        $nursePermissions = array_merge($nursePermissions, Permission::whereIn('name', [
            'view_own_profile',
            'edit_own_profile',
            'view_own_leave_requests',
            'create_leave_requests',
            'edit_own_leave_requests',
            'view_schedules'
        ])->pluck('id')->toArray());
        $nurse->syncPermissions($nursePermissions);

        // Caregiver - Basic care permissions
        $caregiverPermissions = Permission::whereIn('name', [
            'view_dashboard',
            'view_own_profile',
            'edit_own_profile',
            'view_residents',
            'view_resident_medications',
            'administer_medications',
            'view_assignments',
            'view_own_leave_requests',
            'create_leave_requests',
            'edit_own_leave_requests',
            'view_notifications',
            'view_schedules'
        ])->pluck('id')->toArray();
        $caregiver->syncPermissions($caregiverPermissions);

        // Support Staff - Limited permissions
        $supportPermissions = Permission::whereIn('name', [
            'view_dashboard',
            'view_own_profile',
            'edit_own_profile',
            'view_own_leave_requests',
            'create_leave_requests',
            'edit_own_leave_requests',
            'view_notifications'
        ])->pluck('id')->toArray();
        $supportStaff->syncPermissions($supportPermissions);

        // Family - portal access only; data scoped via resident_contacts in API
        $familyPermissions = Permission::whereIn('name', [
            'view_own_profile',
            'edit_own_profile',
            'view_notifications'
        ])->pluck('id')->toArray();
        $family->syncPermissions($familyPermissions);

        $this->command->info('Roles and permissions assigned successfully.');
    }
}
