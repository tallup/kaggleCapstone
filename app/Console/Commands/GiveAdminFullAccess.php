<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

class GiveAdminFullAccess extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'admin:give-full-access {email=admin@edmondserenity.com}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Give admin user full access to everything in the system';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        
        $this->info("Setting up full admin access for: {$email}");
        
        // Create comprehensive permissions
        $permissions = [
            // Dashboard permissions
            'view_dashboard', 'view_admin_dashboard', 'view_caregiver_dashboard',
            
            // Resident permissions
            'view_residents', 'create_residents', 'edit_residents', 'delete_residents', 'view_resident_details',
            
            // Medication permissions
            'view_medications', 'create_medications', 'edit_medications', 'delete_medications', 
            'view_medication_history', 'administer_medications',
            
            // Assessment permissions
            'view_assessments', 'create_assessments', 'edit_assessments', 'delete_assessments', 'complete_assessments',
            
            // Appointment permissions
            'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments', 'view_appointment_history',
            
            // Vitals permissions
            'view_vitals', 'create_vitals', 'edit_vitals', 'delete_vitals', 'view_vitals_history',
            
            // Sleep permissions
            'view_sleep_records', 'create_sleep_records', 'edit_sleep_records', 'delete_sleep_records', 'view_sleep_patterns',
            
            // Staff permissions
            'view_users', 'create_users', 'edit_users', 'delete_users',
            'view_leave_requests', 'create_leave_requests', 'edit_leave_requests', 'approve_leave_requests', 'reject_leave_requests',
            
            // Role & Permission permissions
            'view_roles', 'create_roles', 'edit_roles', 'delete_roles', 'view_permissions', 'assign_permissions',
            
            // Facility permissions
            'view_facilities', 'create_facilities', 'edit_facilities', 'delete_facilities',
            
            // Branch permissions
            'view_branches', 'create_branches', 'edit_branches', 'delete_branches',

            // Housekeeping permissions
            'view_cleaning_areas', 'create_cleaning_areas', 'edit_cleaning_areas', 'delete_cleaning_areas',
            
            // Vital Ranges permissions
            'view_vital_ranges', 'create_vital_ranges', 'edit_vital_ranges', 'delete_vital_ranges',
            
            // Reports permissions
            'view_reports', 'view_resident_reports', 'view_medication_reports', 'view_assessment_reports',
            'view_staff_reports', 'view_vitals_reports', 'view_sleep_reports', 'view_appointment_reports', 'export_reports',
            
            // System permissions
            'manage_system_settings', 'view_system_logs', 'backup_data', 'restore_data',
            
            // Additional permissions
            'view_assignments', 'create_assignments', 'edit_assignments', 'delete_assignments',
            'view_behaviors', 'create_behaviors', 'edit_behaviors', 'delete_behaviors',
            'view_incidents', 'create_incidents', 'edit_incidents', 'delete_incidents',
            'view_healthcare_providers', 'create_healthcare_providers', 'edit_healthcare_providers', 'delete_healthcare_providers',
            'view_drugs', 'create_drugs', 'edit_drugs', 'delete_drugs',
        ];

        // Create all permissions
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission],
                ['guard_name' => 'web']
            );
        }

        $this->info("Created " . count($permissions) . " permissions");

        // Create or get admin role
        $adminRole = Role::firstOrCreate(
            ['name' => 'admin'],
            ['guard_name' => 'web']
        );

        // Get all permission IDs
        $permissionIds = Permission::pluck('id')->toArray();

        // Assign all permissions to admin role
        $adminRole->syncPermissions($permissionIds);

        $this->info("Assigned all permissions to admin role");

        // Find admin user
        $adminUser = User::where('email', $email)->first();
        
        if (!$adminUser) {
            $this->error("User with email '{$email}' not found!");
            return 1;
        }

        // Remove any existing roles
        $adminUser->roles()->detach();
        
        // Assign admin role
        $adminUser->assignRole('admin');
        
        // Also set role field to admin for compatibility
        $adminUser->update(['role' => 'admin']);
        
        $this->info("✅ Admin user '{$adminUser->email}' now has full access to everything!");
        $this->info("✅ Total permissions: " . count($permissions));
        $this->info("✅ Role: admin");
        
        return 0;
    }
}
