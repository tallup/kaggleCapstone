<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Facility;
use App\Models\Branch;
use App\Models\Role;
use App\Models\Permission;
use App\Models\VitalRange;

class ProductionSeeder extends Seeder
{
    /**
     * Run the database seeds for production.
     */
    public function run(): void
    {
        $this->command->info('🌱 Seeding production database...');

        // Create facility
        $facility = Facility::create([
            'name' => 'Edmond Serenity AFH',
            'description' => 'Adult Family Home providing compassionate care',
            'address' => '123 Main Street, Edmond, WA 98020',
            'phone' => '(206) 555-0123',
            'email' => 'info@edmondserenity.com',
            'website' => 'https://edmondserenity.com',
            'license_number' => 'AFH-2024-001',
            'license_expiry' => now()->addYear(),
            'is_active' => true,
        ]);

        // Create branch
        $branch = Branch::create([
            'name' => 'Main Branch',
            'address' => '123 Main Street, Edmond, WA 98020',
            'facility_id' => $facility->id,
            'phone' => '(206) 555-0123',
            'email' => 'info@edmondserenity.com',
            'is_active' => true,
        ]);

        // Create permissions
        $permissions = [
            'view_users', 'create_users', 'edit_users', 'delete_users',
            'view_residents', 'create_residents', 'edit_residents', 'delete_residents',
            'view_medications', 'create_medications', 'edit_medications', 'delete_medications',
            'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments',
            'view_assessments', 'create_assessments', 'edit_assessments', 'delete_assessments',
            'view_vital_signs', 'create_vital_signs', 'edit_vital_signs', 'delete_vital_signs',
            'view_facilities', 'create_facilities', 'edit_facilities', 'delete_facilities',
            'view_branches', 'create_branches', 'edit_branches', 'delete_branches',
            'view_cleaning_areas', 'create_cleaning_areas', 'edit_cleaning_areas', 'delete_cleaning_areas',
            'assign_cleaning_tasks',
            'view_roles', 'create_roles', 'edit_roles', 'delete_roles',
            'view_permissions', 'create_permissions', 'edit_permissions', 'delete_permissions',
            'view_reports', 'create_reports', 'export_reports',
            'view_assignments', 'create_assignments', 'edit_assignments', 'delete_assignments',
            'view_leave_requests', 'create_leave_requests', 'edit_leave_requests', 'approve_leave_requests',
            'view_incidents', 'create_incidents', 'edit_incidents', 'delete_incidents',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission],
                [
                    'display_name' => ucwords(str_replace('_', ' ', $permission)),
                    'description' => 'Permission to ' . str_replace('_', ' ', $permission),
                ]
            );
        }

        // Create roles
        $adminRole = Role::firstOrCreate(
            ['name' => 'admin'],
            [
                'display_name' => 'Administrator',
                'description' => 'Full system access with all permissions',
            ]
        );

        $caregiverRole = Role::firstOrCreate(
            ['name' => 'caregiver'],
            [
                'display_name' => 'Caregiver',
                'description' => 'Caregiver with limited access to resident care functions',
            ]
        );

        $nurseRole = Role::firstOrCreate(
            ['name' => 'nurse'],
            [
                'display_name' => 'Registered Nurse',
                'description' => 'Nurse with access to medical functions and assessments',
            ]
        );

        // Assign all permissions to admin role
        $adminRole->permissions()->sync(Permission::all()->pluck('id'));

        // Assign specific permissions to caregiver role
        $caregiverPermissions = Permission::whereIn('name', [
            'view_residents', 'view_medications', 'view_appointments', 'view_assessments',
            'create_vital_signs', 'view_vital_signs', 'view_assignments', 'create_leave_requests',
            'view_leave_requests', 'view_incidents', 'create_incidents', 'assign_cleaning_tasks'
        ])->pluck('id');
        $caregiverRole->permissions()->sync($caregiverPermissions);

        // Assign specific permissions to nurse role
        $nursePermissions = Permission::whereIn('name', [
            'view_residents', 'create_residents', 'edit_residents',
            'view_medications', 'create_medications', 'edit_medications',
            'view_appointments', 'create_appointments', 'edit_appointments',
            'view_assessments', 'create_assessments', 'edit_assessments',
            'view_vital_signs', 'create_vital_signs', 'edit_vital_signs',
            'view_assignments', 'create_assignments', 'edit_assignments',
            'view_reports', 'create_reports',
            'view_incidents', 'create_incidents', 'edit_incidents',
            'assign_cleaning_tasks'
        ])->pluck('id');
        $nurseRole->permissions()->sync($nursePermissions);

        // Create or update admin user
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@edmondserenity.com'],
            [
                'name' => 'Administrator',
                'password' => Hash::make('admin123!'),
                'role' => 'admin',
                'assigned_branch_id' => $branch->id,
                'is_active' => true,
                'hire_date' => now(),
            ]
        );

        // Assign admin role to admin user (sync ensures it's assigned)
        $adminUser->roles()->sync([$adminRole->id]);

        // Create vital ranges
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
            VitalRange::create($range);
        }

        // Seed housekeeping areas, zones, and default tasks
        $this->call(HousekeepingSeeder::class);
        $this->command->info('🧹 Housekeeping data seeded successfully.');

        // Seed incidents (requires residents and users to exist)
        $this->call(IncidentSeeder::class);
        $this->command->info('🚨 Incident data seeded successfully.');

        $this->command->info('✅ Production database seeded successfully!');
        $this->command->info('👤 Admin user created: admin@edmondserenity.com');
        $this->command->info('🔑 Admin password: admin123!');
        $this->command->info('🏥 Facility: Edmond Serenity AFH');
        $this->command->info('🏢 Branch: Main Branch');
    }
}
