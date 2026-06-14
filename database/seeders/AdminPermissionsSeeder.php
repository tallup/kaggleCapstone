<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

class AdminPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create comprehensive permissions for all resources
        $permissions = [
            // Dashboard permissions
            ['name' => 'view_dashboard', 'group' => 'Dashboard', 'description' => 'View main dashboard'],
            ['name' => 'view_admin_dashboard', 'group' => 'Dashboard', 'description' => 'View admin dashboard'],
            ['name' => 'view_caregiver_dashboard', 'group' => 'Dashboard', 'description' => 'View caregiver dashboard'],
            
            // Resident permissions
            ['name' => 'view_residents', 'group' => 'Residents', 'description' => 'View residents list'],
            ['name' => 'create_residents', 'group' => 'Residents', 'description' => 'Create new residents'],
            ['name' => 'edit_residents', 'group' => 'Residents', 'description' => 'Edit resident information'],
            ['name' => 'delete_residents', 'group' => 'Residents', 'description' => 'Delete residents'],
            ['name' => 'view_resident_details', 'group' => 'Residents', 'description' => 'View detailed resident information'],
            
            // Medication permissions
            ['name' => 'view_medications', 'group' => 'Medications', 'description' => 'View medications list'],
            ['name' => 'create_medications', 'group' => 'Medications', 'description' => 'Create new medications'],
            ['name' => 'edit_medications', 'group' => 'Medications', 'description' => 'Edit medication information'],
            ['name' => 'delete_medications', 'group' => 'Medications', 'description' => 'Delete medications'],
            ['name' => 'view_medication_history', 'group' => 'Medications', 'description' => 'View medication history'],
            ['name' => 'administer_medications', 'group' => 'Medications', 'description' => 'Administer medications to residents'],
            
            // Assessment permissions
            ['name' => 'view_assessments', 'group' => 'Assessments', 'description' => 'View assessments list'],
            ['name' => 'create_assessments', 'group' => 'Assessments', 'description' => 'Create new assessments'],
            ['name' => 'edit_assessments', 'group' => 'Assessments', 'description' => 'Edit assessment information'],
            ['name' => 'delete_assessments', 'group' => 'Assessments', 'description' => 'Delete assessments'],
            ['name' => 'complete_assessments', 'group' => 'Assessments', 'description' => 'Complete assessments'],
            
            // Appointment permissions
            ['name' => 'view_appointments', 'group' => 'Appointments', 'description' => 'View appointments list'],
            ['name' => 'create_appointments', 'group' => 'Appointments', 'description' => 'Create new appointments'],
            ['name' => 'edit_appointments', 'group' => 'Appointments', 'description' => 'Edit appointment information'],
            ['name' => 'delete_appointments', 'group' => 'Appointments', 'description' => 'Delete appointments'],
            ['name' => 'view_appointment_history', 'group' => 'Appointments', 'description' => 'View appointment history'],
            
            // Vitals permissions
            ['name' => 'view_vitals', 'group' => 'Vitals', 'description' => 'View vital signs'],
            ['name' => 'create_vitals', 'group' => 'Vitals', 'description' => 'Record vital signs'],
            ['name' => 'edit_vitals', 'group' => 'Vitals', 'description' => 'Edit vital signs'],
            ['name' => 'delete_vitals', 'group' => 'Vitals', 'description' => 'Delete vital signs'],
            ['name' => 'view_vitals_history', 'group' => 'Vitals', 'description' => 'View vital signs history'],
            
            // Sleep permissions
            ['name' => 'view_sleep_records', 'group' => 'Sleep', 'description' => 'View sleep records'],
            ['name' => 'create_sleep_records', 'group' => 'Sleep', 'description' => 'Create sleep records'],
            ['name' => 'edit_sleep_records', 'group' => 'Sleep', 'description' => 'Edit sleep records'],
            ['name' => 'delete_sleep_records', 'group' => 'Sleep', 'description' => 'Delete sleep records'],
            ['name' => 'view_sleep_patterns', 'group' => 'Sleep', 'description' => 'View sleep patterns'],
            
            // Staff permissions
            ['name' => 'view_users', 'group' => 'Staff', 'description' => 'View staff/users list'],
            ['name' => 'create_users', 'group' => 'Staff', 'description' => 'Create new staff/users'],
            ['name' => 'edit_users', 'group' => 'Staff', 'description' => 'Edit staff/user information'],
            ['name' => 'delete_users', 'group' => 'Staff', 'description' => 'Delete staff/users'],
            ['name' => 'view_leave_requests', 'group' => 'Staff', 'description' => 'View leave requests'],
            ['name' => 'create_leave_requests', 'group' => 'Staff', 'description' => 'Create leave requests'],
            ['name' => 'edit_leave_requests', 'group' => 'Staff', 'description' => 'Edit leave requests'],
            ['name' => 'approve_leave_requests', 'group' => 'Staff', 'description' => 'Approve leave requests'],
            ['name' => 'reject_leave_requests', 'group' => 'Staff', 'description' => 'Reject leave requests'],
            ['name' => 'view_schedules', 'group' => 'Staff', 'description' => 'View staff schedules'],
            ['name' => 'manage_schedules', 'group' => 'Staff', 'description' => 'Create, edit and delete shifts and availability'],
            
            // Role & Permission permissions
            ['name' => 'view_roles', 'group' => 'Roles', 'description' => 'View roles list'],
            ['name' => 'create_roles', 'group' => 'Roles', 'description' => 'Create new roles'],
            ['name' => 'edit_roles', 'group' => 'Roles', 'description' => 'Edit role information'],
            ['name' => 'delete_roles', 'group' => 'Roles', 'description' => 'Delete roles'],
            ['name' => 'view_permissions', 'group' => 'Roles', 'description' => 'View permissions list'],
            ['name' => 'assign_permissions', 'group' => 'Roles', 'description' => 'Assign permissions to roles'],
            
            // Facility permissions
            ['name' => 'view_facilities', 'group' => 'Facilities', 'description' => 'View facilities list'],
            ['name' => 'create_facilities', 'group' => 'Facilities', 'description' => 'Create new facilities'],
            ['name' => 'edit_facilities', 'group' => 'Facilities', 'description' => 'Edit facility information'],
            ['name' => 'delete_facilities', 'group' => 'Facilities', 'description' => 'Delete facilities'],
            
            // Branch permissions
            ['name' => 'view_branches', 'group' => 'Branches', 'description' => 'View branches list'],
            ['name' => 'create_branches', 'group' => 'Branches', 'description' => 'Create new branches'],
            ['name' => 'edit_branches', 'group' => 'Branches', 'description' => 'Edit branch information'],
            ['name' => 'delete_branches', 'group' => 'Branches', 'description' => 'Delete branches'],

            // Housekeeping permissions
            ['name' => 'view_cleaning_areas', 'group' => 'Housekeeping', 'description' => 'View cleaning areas and shifts'],
            ['name' => 'create_cleaning_areas', 'group' => 'Housekeeping', 'description' => 'Create cleaning areas and assignments'],
            ['name' => 'edit_cleaning_areas', 'group' => 'Housekeeping', 'description' => 'Edit cleaning areas and assignments'],
            ['name' => 'delete_cleaning_areas', 'group' => 'Housekeeping', 'description' => 'Archive cleaning areas'],
            ['name' => 'assign_cleaning_tasks', 'group' => 'Housekeeping', 'description' => 'Assign caregivers to cleaning tasks'],
            
            // Vital Ranges permissions
            ['name' => 'view_vital_ranges', 'group' => 'Vital Ranges', 'description' => 'View vital ranges'],
            ['name' => 'create_vital_ranges', 'group' => 'Vital Ranges', 'description' => 'Create vital ranges'],
            ['name' => 'edit_vital_ranges', 'group' => 'Vital Ranges', 'description' => 'Edit vital ranges'],
            ['name' => 'delete_vital_ranges', 'group' => 'Vital Ranges', 'description' => 'Delete vital ranges'],
            
            // Reports permissions
            ['name' => 'view_reports', 'group' => 'Reports', 'description' => 'View all reports'],
            ['name' => 'view_resident_reports', 'group' => 'Reports', 'description' => 'View resident reports'],
            ['name' => 'view_medication_reports', 'group' => 'Reports', 'description' => 'View medication reports'],
            ['name' => 'view_assessment_reports', 'group' => 'Reports', 'description' => 'View assessment reports'],
            ['name' => 'view_staff_reports', 'group' => 'Reports', 'description' => 'View staff reports'],
            ['name' => 'view_vitals_reports', 'group' => 'Reports', 'description' => 'View vitals reports'],
            ['name' => 'view_sleep_reports', 'group' => 'Reports', 'description' => 'View sleep reports'],
            ['name' => 'view_appointment_reports', 'group' => 'Reports', 'description' => 'View appointment reports'],
            ['name' => 'export_reports', 'group' => 'Reports', 'description' => 'Export reports'],
            
            // System permissions
            ['name' => 'manage_system_settings', 'group' => 'System', 'description' => 'Manage system settings'],
            ['name' => 'view_system_logs', 'group' => 'System', 'description' => 'View system logs'],
            ['name' => 'backup_data', 'group' => 'System', 'description' => 'Backup system data'],
            ['name' => 'restore_data', 'group' => 'System', 'description' => 'Restore system data'],
            
            // Assignment permissions
            ['name' => 'view_assignments', 'group' => 'Assignments', 'description' => 'View assignments'],
            ['name' => 'create_assignments', 'group' => 'Assignments', 'description' => 'Create assignments'],
            ['name' => 'edit_assignments', 'group' => 'Assignments', 'description' => 'Edit assignments'],
            ['name' => 'delete_assignments', 'group' => 'Assignments', 'description' => 'Delete assignments'],
            
            // Behavior permissions
            ['name' => 'view_behaviors', 'group' => 'Behaviors', 'description' => 'View behaviors'],
            ['name' => 'create_behaviors', 'group' => 'Behaviors', 'description' => 'Create behaviors'],
            ['name' => 'edit_behaviors', 'group' => 'Behaviors', 'description' => 'Edit behaviors'],
            ['name' => 'delete_behaviors', 'group' => 'Behaviors', 'description' => 'Delete behaviors'],
            
            // Incident permissions
            ['name' => 'view_incidents', 'group' => 'Incidents', 'description' => 'View incidents'],
            ['name' => 'create_incidents', 'group' => 'Incidents', 'description' => 'Create incidents'],
            ['name' => 'edit_incidents', 'group' => 'Incidents', 'description' => 'Edit incidents'],
            ['name' => 'delete_incidents', 'group' => 'Incidents', 'description' => 'Delete incidents'],
            
            // Healthcare Provider permissions
            ['name' => 'view_healthcare_providers', 'group' => 'Healthcare Providers', 'description' => 'View healthcare providers'],
            ['name' => 'create_healthcare_providers', 'group' => 'Healthcare Providers', 'description' => 'Create healthcare providers'],
            ['name' => 'edit_healthcare_providers', 'group' => 'Healthcare Providers', 'description' => 'Edit healthcare providers'],
            ['name' => 'delete_healthcare_providers', 'group' => 'Healthcare Providers', 'description' => 'Delete healthcare providers'],
            
            // Drug permissions
            ['name' => 'view_drugs', 'group' => 'Drugs', 'description' => 'View drugs list'],
            ['name' => 'create_drugs', 'group' => 'Drugs', 'description' => 'Create drugs'],
            ['name' => 'edit_drugs', 'group' => 'Drugs', 'description' => 'Edit drugs'],
            ['name' => 'delete_drugs', 'group' => 'Drugs', 'description' => 'Delete drugs'],
        ];

        // Create all permissions
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission['name']],
                [
                    'guard_name' => 'web',
                    'group' => $permission['group'],
                    'description' => $permission['description'],
                ]
            );
        }

        // Create or get admin role
        $adminRole = Role::firstOrCreate(
            ['name' => 'admin'],
            ['guard_name' => 'web']
        );

        // Get all permission IDs
        $permissionIds = Permission::pluck('id')->toArray();

        // Assign all permissions to admin role
        $adminRole->syncPermissions($permissionIds);

        // Find admin user and assign admin role
        $adminUser = User::where('email', 'admin@edmondserenity.com')->first();
        
        if ($adminUser) {
            // Remove any existing roles
            $adminUser->roles()->detach();
            
            // Assign admin role
            $adminUser->assignRole('admin');
            
            // Also set role field to admin for compatibility
            $adminUser->update(['role' => 'admin']);
            
            $this->command->info("Admin user '{$adminUser->email}' has been granted full access to everything!");
            $this->command->info("Total permissions assigned: " . count($permissions));
        } else {
            $this->command->error('Admin user not found! Please create an admin user first.');
        }
    }
}
