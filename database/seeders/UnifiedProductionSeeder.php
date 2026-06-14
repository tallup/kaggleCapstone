<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Facility;
use App\Models\Branch;
use App\Models\VitalRange;

class UnifiedProductionSeeder extends Seeder
{
    /**
     * Run the database seeds for production deployment.
     * This seeder ensures all essential data is created correctly.
     */
    public function run(): void
    {
        $this->command->info('🚀 Starting unified production seeding...');

        // 1. Create all permissions first
        $this->createAllPermissions();
        
        // 2. Create roles and assign permissions
        $this->createRolesAndPermissions();
        
        // 3. Create facility and branch
        $this->createFacilityAndBranch();
        
        // 4. Create admin user with proper role assignment
        $this->createAdminUser();
        
        // 5. Create vital ranges
        $this->createVitalRanges();

        $this->command->info('✅ Unified production seeding completed!');
        $this->showSummary();
    }

    private function createAllPermissions(): void
    {
        $permissions = [
            // Admin panel access
            'view_admin_panel',
            'view_dashboard',
            
            // User management
            'view_users', 'create_users', 'edit_users', 'delete_users',
            'view_own_profile', 'edit_own_profile',
            
            // Resident management
            'view_residents', 'create_residents', 'edit_residents', 'delete_residents',
            
            // Medication management
            'view_medications', 'create_medications', 'edit_medications', 'delete_medications',
            'view_medication_administration', 'create_medication_administration', 'edit_medication_administration',
            
            // Appointment management
            'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments',
            
            // Assessment management
            'view_assessments', 'create_assessments', 'edit_assessments', 'delete_assessments',
            
            // Vital signs management
            'view_vital_signs', 'create_vital_signs', 'edit_vital_signs', 'delete_vital_signs',
            
            // Facility management
            'view_facilities', 'create_facilities', 'edit_facilities', 'delete_facilities',
            
            // Branch management
            'view_branches', 'create_branches', 'edit_branches', 'delete_branches',

            // Housekeeping management
            'view_cleaning_areas', 'create_cleaning_areas', 'edit_cleaning_areas', 'delete_cleaning_areas',
            'assign_cleaning_tasks',
            
            // Role and permission management
            'view_roles', 'create_roles', 'edit_roles', 'delete_roles',
            'view_permissions', 'create_permissions', 'edit_permissions', 'delete_permissions',
            
            // Assignment management
            'view_assignments', 'create_assignments', 'edit_assignments', 'delete_assignments',
            
            // Leave request management
            'view_leave_requests', 'create_leave_requests', 'edit_leave_requests', 'approve_leave_requests',
            
            // Staff scheduling
            'view_schedules', 'manage_schedules',
            
            // Employee document management
            'view_employee_documents', 'create_employee_documents', 'edit_employee_documents', 'delete_employee_documents',

            // Audit / activity logs (Filament + SPA navigation)
            'view_activity_logs', 'delete_activity_logs',
            
            // Reports and exports
            'view_reports', 'create_reports', 'export_reports',
            
            // Incident management
            'view_incidents', 'create_incidents', 'edit_incidents', 'delete_incidents',
            
            // Behavior management
            'view_behaviors', 'create_behaviors', 'edit_behaviors', 'delete_behaviors',
            
            // Sleep monitoring
            'view_sleep_records', 'create_sleep_records', 'edit_sleep_records', 'delete_sleep_records',
        ];

        foreach ($permissions as $permissionName) {
            Permission::firstOrCreate([
                'name' => $permissionName,
                'guard_name' => 'web'
            ]);
        }

        $this->command->info("✅ Created " . count($permissions) . " permissions");
    }

    private function createRolesAndPermissions(): void
    {
        // Create administrator role
        $adminRole = Role::firstOrCreate([
            'name' => 'administrator',
            'guard_name' => 'web'
        ]);

        // Create caregiver role
        $caregiverRole = Role::firstOrCreate([
            'name' => 'caregiver',
            'guard_name' => 'web'
        ]);

        // Create nurse role
        $nurseRole = Role::firstOrCreate([
            'name' => 'nurse',
            'guard_name' => 'web'
        ]);

        $familyRole = Role::firstOrCreate([
            'name' => 'family',
            'guard_name' => 'web'
        ]);

        // Assign ALL permissions to administrator role
        $allPermissions = Permission::all();
        $adminRole->permissions()->sync($allPermissions->pluck('id'));

        // Assign specific permissions to caregiver role
        $caregiverPermissions = Permission::whereIn('name', [
            'view_admin_panel', 'view_dashboard',
            'view_own_profile', 'edit_own_profile',
            'view_residents', 'view_medications', 'view_appointments',
            'view_assessments', 'view_vital_signs', 'create_vital_signs',
            'view_assignments', 'create_leave_requests', 'view_leave_requests',
            'view_schedules',
            'view_incidents', 'create_incidents', 'view_behaviors', 'create_behaviors',
            'view_sleep_records', 'create_sleep_records', 'assign_cleaning_tasks'
        ])->pluck('id');
        $caregiverRole->permissions()->sync($caregiverPermissions);

        // Assign specific permissions to nurse role
        $nursePermissions = Permission::whereIn('name', [
            'view_admin_panel', 'view_dashboard',
            'view_own_profile', 'edit_own_profile',
            'view_residents', 'create_residents', 'edit_residents',
            'view_medications', 'create_medications', 'edit_medications',
            'view_appointments', 'create_appointments', 'edit_appointments',
            'view_assessments', 'create_assessments', 'edit_assessments',
            'view_vital_signs', 'create_vital_signs', 'edit_vital_signs',
            'view_assignments', 'create_assignments', 'edit_assignments',
            'view_schedules',
            'view_reports', 'create_reports', 'view_incidents', 'create_incidents', 'edit_incidents',
            'view_behaviors', 'create_behaviors', 'edit_behaviors',
            'view_sleep_records', 'create_sleep_records', 'edit_sleep_records',
            'assign_cleaning_tasks'
        ])->pluck('id');
        $nurseRole->permissions()->sync($nursePermissions);

        $familyPermissions = Permission::whereIn('name', [
            'view_own_profile',
            'edit_own_profile'
        ])->pluck('id');
        $familyRole->permissions()->sync($familyPermissions);

        $this->command->info("✅ Created roles and assigned permissions");
    }

    private function createFacilityAndBranch(): void
    {
        // Create facility with multi-tenant fields
        $facility = Facility::firstOrCreate(
            ['name' => 'Edmond Serenity AFH'],
            [
                'description' => 'Adult Family Home providing compassionate care',
                'address' => '123 Main Street, Edmond, WA 98020',
                'phone' => '(206) 555-0123',
                'email' => 'info@edmondserenity.com',
                'website' => 'https://edmondserenity.com',
                'license_number' => 'AFH-2024-001',
                'license_expiry' => now()->addYear(),
                'primary_color' => '#25603E',
                'secondary_color' => '#8B4513',
                'accent_color' => '#F5F5DC',
                'registration_status' => 'approved',
                'is_active' => true,
            ]
        );

        // Create branch
        $branch = Branch::firstOrCreate(
            ['name' => 'Main Branch'],
            [
                'address' => '123 Main Street, Edmond, WA 98020',
                'facility_id' => $facility->id,
                'phone' => '(206) 555-0123',
                'email' => 'info@edmondserenity.com',
                'is_active' => true,
            ]
        );

        $this->command->info("✅ Created facility and branch");
    }

    private function createAdminUser(): void
    {
        // Get the administrator role
        $adminRole = Role::where('name', 'administrator')->first();
        
        if (!$adminRole) {
            $this->command->error('Administrator role not found!');
            return;
        }

        // Get the facility and branch
        $facility = Facility::where('name', 'Edmond Serenity AFH')->first();
        $branch = Branch::where('name', 'Main Branch')->first();

        if (!$facility || !$branch) {
            $this->command->error('Facility or branch not found!');
            return;
        }

        // Create or update admin user with facility and branch assignment
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@edmondserenity.com'],
            [
                'name' => 'Admin User',
                'email' => 'admin@edmondserenity.com',
                'password' => Hash::make('password'),
                'role' => 'administrator',
                'facility_id' => $facility->id,
                'assigned_branch_id' => $branch->id,
                'is_active' => true,
            ]
        );

        // Update existing user if it already exists but doesn't have facility/branch
        if ($adminUser->wasRecentlyCreated === false) {
            $adminUser->update([
                'facility_id' => $facility->id,
                'assigned_branch_id' => $branch->id,
            ]);
        }

        // Ensure admin user has the administrator role
        if (!$adminUser->hasRole('administrator')) {
            $adminUser->assignRole('administrator');
        }

        $this->command->info("✅ Created admin user with administrator role, facility, and branch assignment");
    }

    private function createVitalRanges(): void
    {
        $vitalRanges = [
            [
                'parameter' => 'systolic',
                'min_normal' => 90,
                'max_normal' => 120,
                'min_warning' => 80,
                'max_warning' => 140,
                'min_critical' => 70,
                'max_critical' => 180,
                'unit' => 'mmHg',
                'description' => 'Systolic blood pressure ranges',
            ],
            [
                'parameter' => 'diastolic',
                'min_normal' => 60,
                'max_normal' => 80,
                'min_warning' => 50,
                'max_warning' => 90,
                'min_critical' => 40,
                'max_critical' => 110,
                'unit' => 'mmHg',
                'description' => 'Diastolic blood pressure ranges',
            ],
            [
                'parameter' => 'temperature',
                'min_normal' => 97.0,
                'max_normal' => 99.0,
                'min_warning' => 96.0,
                'max_warning' => 100.0,
                'min_critical' => 95.0,
                'max_critical' => 102.0,
                'unit' => '°F',
                'description' => 'Body temperature ranges',
            ],
            [
                'parameter' => 'pulse',
                'min_normal' => 60,
                'max_normal' => 100,
                'min_warning' => 50,
                'max_warning' => 110,
                'min_critical' => 40,
                'max_critical' => 120,
                'unit' => 'BPM',
                'description' => 'Heart rate ranges',
            ],
            [
                'parameter' => 'oxygen_saturation',
                'min_normal' => 95,
                'max_normal' => 100,
                'min_warning' => 90,
                'max_warning' => 94,
                'min_critical' => 85,
                'max_critical' => 89,
                'unit' => '%',
                'description' => 'Oxygen saturation ranges',
            ],
        ];

        foreach ($vitalRanges as $range) {
            VitalRange::firstOrCreate(
                ['parameter' => $range['parameter']],
                $range
            );
        }

        $this->command->info("✅ Created vital ranges");
    }

    private function showSummary(): void
    {
        $this->command->line('');
        $this->command->line('📋 Production Seeding Summary:');
        $this->command->line('  👤 Admin User: admin@edmondserenity.com');
        $this->command->line('  🔑 Password: password');
        $this->command->line('  🏥 Facility: Edmond Serenity AFH');
        $this->command->line('  🏢 Branch: Main Branch');
        $this->command->line('  🔐 Total Permissions: ' . Permission::count());
        $this->command->line('  👥 Total Roles: ' . Role::count());
        
        $adminUser = User::where('email', 'admin@edmondserenity.com')->first();
        if ($adminUser) {
            $this->command->line('  ✅ Admin has administrator role: ' . ($adminUser->hasRole('administrator') ? 'YES' : 'NO'));
            $this->command->line('  ✅ Admin has view_users permission: ' . ($adminUser->hasPermission('view_users') ? 'YES' : 'NO'));
        }
        
        $this->command->line('');
        $this->command->line('🎉 Your production environment is ready!');
    }
}
