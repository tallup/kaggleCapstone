<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Seeds the canonical permission sets for all roles.
 *
 * Agreed spec:
 *   administrator – sees everything in their facility
 *   admin         – same as administrator but scoped to their branch only (enforced at data layer)
 *   caregiver     – care tasks only; NO admin panel; CAN create appointments; sees branch reports
 *   nurse         – same as caregiver + can edit vitals & medication administration
 */
class RolePermissionSeeder extends Seeder
{
    private array $rolePermissions = [
        'administrator' => [
            'view_admin_panel',
            'view_dashboard',
            'view_users', 'create_users', 'edit_users', 'delete_users',
            'view_own_profile', 'edit_own_profile',
            'view_residents', 'create_residents', 'edit_residents', 'delete_residents',
            'view_medications', 'create_medications', 'edit_medications', 'delete_medications',
            'view_medication_administration', 'create_medication_administration', 'edit_medication_administration',
            'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments',
            'view_assessments', 'create_assessments', 'edit_assessments', 'delete_assessments',
            'view_vital_signs', 'create_vital_signs', 'edit_vital_signs', 'delete_vital_signs',
            'view_facilities', 'create_facilities', 'edit_facilities', 'delete_facilities',
            'view_branches', 'create_branches', 'edit_branches', 'delete_branches',
            'view_cleaning_areas', 'create_cleaning_areas', 'edit_cleaning_areas', 'delete_cleaning_areas',
            'assign_cleaning_tasks',
            'view_roles', 'create_roles', 'edit_roles', 'delete_roles',
            'view_permissions', 'create_permissions', 'edit_permissions', 'delete_permissions',
            'view_assignments', 'create_assignments', 'edit_assignments', 'delete_assignments',
            'view_leave_requests', 'create_leave_requests', 'edit_leave_requests', 'approve_leave_requests',
            'view_schedules', 'manage_schedules',
            'view_employee_documents', 'create_employee_documents', 'edit_employee_documents', 'delete_employee_documents',
            'view_activity_logs', 'delete_activity_logs',
            'view_reports', 'export_reports',
            'view_incidents', 'create_incidents', 'edit_incidents', 'delete_incidents',
            'view_behaviors', 'create_behaviors', 'edit_behaviors',
            'view_sleep_records', 'create_sleep_records', 'edit_sleep_records',
            'view_drugs', 'create_drugs', 'edit_drugs', 'delete_drugs',
        ],

        // Branch admin: same full access, but data is restricted to their branch by FacilityScope
        'admin' => [
            'view_admin_panel',
            'view_dashboard',
            'view_users', 'create_users', 'edit_users', 'delete_users',
            'view_own_profile', 'edit_own_profile',
            'view_residents', 'create_residents', 'edit_residents', 'delete_residents',
            'view_medications', 'create_medications', 'edit_medications', 'delete_medications',
            'view_medication_administration', 'create_medication_administration', 'edit_medication_administration',
            'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments',
            'view_assessments', 'create_assessments', 'edit_assessments', 'delete_assessments',
            'view_vital_signs', 'create_vital_signs', 'edit_vital_signs', 'delete_vital_signs',
            'view_branches', 'create_branches', 'edit_branches',
            'view_cleaning_areas', 'create_cleaning_areas', 'edit_cleaning_areas', 'delete_cleaning_areas',
            'assign_cleaning_tasks',
            'view_roles', 'view_permissions',
            'view_assignments', 'create_assignments', 'edit_assignments', 'delete_assignments',
            'view_leave_requests', 'create_leave_requests', 'edit_leave_requests', 'approve_leave_requests',
            'view_schedules', 'manage_schedules',
            'view_employee_documents', 'create_employee_documents', 'edit_employee_documents', 'delete_employee_documents',
            'view_activity_logs',
            'view_reports', 'export_reports',
            'view_incidents', 'create_incidents', 'edit_incidents', 'delete_incidents',
            'view_behaviors', 'create_behaviors', 'edit_behaviors',
            'view_sleep_records', 'create_sleep_records', 'edit_sleep_records',
            'view_drugs', 'create_drugs', 'edit_drugs',
        ],

        // Caregiver: care tasks only — NO admin panel access, NO prescription management
        'caregiver' => [
            'view_dashboard',
            'view_own_profile', 'edit_own_profile',
            'view_residents',
            'view_medications', 'view_medication_administration', 'create_medication_administration',
            'view_appointments', 'create_appointments',
            'view_assessments', 'create_assessments',
            'view_vital_signs', 'create_vital_signs',
            'view_incidents', 'create_incidents',
            'view_behaviors', 'create_behaviors',
            'view_sleep_records', 'create_sleep_records',
            'assign_cleaning_tasks',
            'view_assignments',
            'view_leave_requests', 'create_leave_requests',
            'view_schedules',
            'view_reports',
        ],

        'nurse' => [
            'view_dashboard',
            'view_own_profile', 'edit_own_profile',
            'view_residents',
            'view_medications', 'view_medication_administration', 'create_medication_administration', 'edit_medication_administration',
            'view_appointments', 'create_appointments',
            'view_assessments', 'create_assessments',
            'view_vital_signs', 'create_vital_signs', 'edit_vital_signs',
            'view_incidents', 'create_incidents',
            'view_behaviors', 'create_behaviors',
            'view_sleep_records', 'create_sleep_records',
            'assign_cleaning_tasks',
            'view_assignments',
            'view_leave_requests', 'create_leave_requests',
            'view_schedules',
            'view_reports',
        ],

        'family_member' => [
            'view_own_profile', 'edit_own_profile',
            'view_residents',
            'view_resident_medications',
            'view_notifications',
        ],
    ];

    public function run(): void
    {
        // Ensure all referenced permissions exist
        $allPerms = array_unique(array_merge(...array_values($this->rolePermissions)));
        foreach ($allPerms as $name) {
            Permission::firstOrCreate(['name' => $name], ['guard_name' => 'web']);
        }
        $this->command->info('Ensured ' . count($allPerms) . ' permissions exist.');

        foreach ($this->rolePermissions as $roleName => $permissionNames) {
            $role = Role::firstOrCreate(['name' => $roleName], ['guard_name' => 'web']);
            $permissions = Permission::whereIn('name', $permissionNames)->pluck('id');
            $role->permissions()->sync($permissions);
            $this->command->info("  ✔ [{$roleName}] → {$permissions->count()} permissions");
        }

        $this->command->info('Role permissions seeded successfully.');
    }
}
