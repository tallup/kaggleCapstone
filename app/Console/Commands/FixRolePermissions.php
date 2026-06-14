<?php

namespace App\Console\Commands;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Console\Command;

/**
 * Synchronises the caregiver, administrator, and admin roles to the agreed
 * permission contract:
 *
 *   administrator – sees everything in their facility
 *   admin (branch) – sees everything in their branch
 *   caregiver     – care tasks only; NO admin-panel access; CAN create appointments
 *                   and sees branch-scoped reports
 */
class FixRolePermissions extends Command
{
    protected $signature = 'permissions:fix-roles';

    protected $description = 'Fix caregiver / admin / administrator role permissions to the agreed spec';

    // ─────────────────────────────────────────────────────────────────────────
    // The canonical permission sets
    // ─────────────────────────────────────────────────────────────────────────

    /** Facility-wide administrator — gets everything (explicit list for clarity). */
    private array $administratorPermissions = [
        'view_admin_panel',
        'view_dashboard',
        // Users
        'view_users', 'create_users', 'edit_users', 'delete_users',
        'view_own_profile', 'edit_own_profile',
        // Residents
        'view_residents', 'create_residents', 'edit_residents', 'delete_residents',
        // Medications
        'view_medications', 'create_medications', 'edit_medications', 'delete_medications',
        'view_medication_administration', 'create_medication_administration', 'edit_medication_administration',
        // Appointments
        'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments',
        // Assessments
        'view_assessments', 'create_assessments', 'edit_assessments', 'delete_assessments',
        // Vitals
        'view_vital_signs', 'create_vital_signs', 'edit_vital_signs', 'delete_vital_signs',
        // Facilities & Branches
        'view_facilities', 'create_facilities', 'edit_facilities', 'delete_facilities',
        'view_branches', 'create_branches', 'edit_branches', 'delete_branches',
        // Housekeeping
        'view_cleaning_areas', 'create_cleaning_areas', 'edit_cleaning_areas', 'delete_cleaning_areas',
        'assign_cleaning_tasks',
        // Roles & Permissions
        'view_roles', 'create_roles', 'edit_roles', 'delete_roles',
        'view_permissions', 'create_permissions', 'edit_permissions', 'delete_permissions',
        // Assignments
        'view_assignments', 'create_assignments', 'edit_assignments', 'delete_assignments',
        // Leave requests
        'view_leave_requests', 'create_leave_requests', 'edit_leave_requests', 'approve_leave_requests',
        // Staff scheduling
        'view_schedules', 'manage_schedules',
        // Employee documents
        'view_employee_documents', 'create_employee_documents', 'edit_employee_documents', 'delete_employee_documents',
        // Logs & reports
        'view_activity_logs', 'delete_activity_logs',
        'view_reports', 'export_reports',
        // Incidents & behaviours
        'view_incidents', 'create_incidents', 'edit_incidents', 'delete_incidents',
        'view_behaviors', 'create_behaviors', 'edit_behaviors',
        // Sleep
        'view_sleep_records', 'create_sleep_records', 'edit_sleep_records',
        // Drugs
        'view_drugs', 'create_drugs', 'edit_drugs', 'delete_drugs',
    ];

    /**
     * Branch-level admin — same as administrator except no facility management
     * (create/edit/delete facilities and deleting branches).
     */
    private array $adminPermissions = [
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
        // branches — can view but not delete
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
    ];

    /**
     * Caregiver — care tasks only. Key decisions:
     *   ✅ view_admin_panel REMOVED (no Filament access)
     *   ✅ can create appointments
     *   ✅ view_reports (branch-scoped, frontend filters the Administrative tab)
     *   ❌ no user/role/branch/facility management
     *   ❌ no create/edit medications (prescriptions)
     *   ❌ no pharmacy/billing
     */
    private array $caregiverPermissions = [
        'view_dashboard',
        'view_own_profile', 'edit_own_profile',
        // Residents — view only (only assigned, enforced by FacilityScope/assignment filter)
        'view_residents',
        // Medications — view MAR only, no prescription management
        'view_medications', 'view_medication_administration', 'create_medication_administration',
        // Appointments — can view and create
        'view_appointments', 'create_appointments',
        // Assessments — view & create
        'view_assessments', 'create_assessments',
        // Vitals — view & create
        'view_vital_signs', 'create_vital_signs',
        // Incidents — view & create (branch-scoped)
        'view_incidents', 'create_incidents',
        // Behaviours — view & create
        'view_behaviors', 'create_behaviors',
        // Sleep — view & create
        'view_sleep_records', 'create_sleep_records',
        // Housekeeping tasks assigned to them
        'assign_cleaning_tasks',
        // Assignments — view own
        'view_assignments',
        // Leave requests — own only
        'view_leave_requests', 'create_leave_requests',
        // Schedules — view only
        'view_schedules',
        // Reports — branch-scoped; Administrative tab hidden by frontend
        'view_reports',
    ];

    public function handle(): int
    {
        $this->info('🔐 Fixing role permissions...');
        $this->newLine();

        $this->syncRole('administrator', $this->administratorPermissions);
        $this->syncRole('admin', $this->adminPermissions);
        $this->syncRole('caregiver', $this->caregiverPermissions);

        // Also fix nurse and registered_nurse if they exist (same as caregiver + some extras)
        $nurseExtras = ['edit_vital_signs', 'edit_medications', 'edit_medication_administration'];
        $this->syncRole('nurse', array_unique(array_merge($this->caregiverPermissions, $nurseExtras)));
        $this->syncRole('registered_nurse', array_unique(array_merge($this->caregiverPermissions, $nurseExtras)));

        $this->newLine();
        $this->info('✅ All role permissions updated successfully.');
        $this->warn('   → Remember to run this on production:  php artisan permissions:fix-roles');
        $this->newLine();

        return self::SUCCESS;
    }

    private function syncRole(string $roleName, array $permissionNames): void
    {
        $role = Role::where('name', $roleName)->first();
        if (! $role) {
            $this->line("  ⏭  Role [{$roleName}] not found — skipping.");
            return;
        }

        // Ensure all permissions exist before attaching
        $this->ensurePermissionsExist($permissionNames);

        $permissions = Permission::whereIn('name', $permissionNames)->pluck('id');
        $role->permissions()->sync($permissions);

        $count = $permissions->count();
        $this->line("  ✔  [{$roleName}] synced with {$count} permissions.");
    }

    private function ensurePermissionsExist(array $names): void
    {
        foreach ($names as $name) {
            Permission::firstOrCreate(['name' => $name], ['guard_name' => 'web']);
        }
    }
}
