<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Role;
use App\Models\Permission;

class EnsureRolesExist extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'roles:ensure-exist';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ensure that administrator and caregiver roles exist in the database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔧 Ensuring required roles exist...');
        $this->line('');

        // Create administrator role if it doesn't exist
        $administratorRole = Role::firstOrCreate(
            ['name' => 'administrator'],
            ['guard_name' => 'web']
        );

        if ($administratorRole->wasRecentlyCreated) {
            $this->info('✅ Created administrator role');
        } else {
            $this->info('✅ Administrator role already exists');
        }
        
        // Always sync permissions to administrator role (even if role already existed)
        $permissions = Permission::all();
        if ($permissions->count() > 0) {
            $administratorRole->permissions()->sync($permissions->pluck('id'));
            $this->info("   Synced {$permissions->count()} permissions to administrator role");
        } else {
            $this->warn("   ⚠️  No permissions found in database. Run PermissionSeeder first.");
        }

        // Also create 'admin' role as an alias (some code checks for both)
        $adminRole = Role::firstOrCreate(
            ['name' => 'admin'],
            ['guard_name' => 'web']
        );

        if ($adminRole->wasRecentlyCreated) {
            $this->info('✅ Created admin role (alias)');
        } else {
            $this->info('✅ Admin role (alias) already exists');
        }
        
        // Always sync permissions to admin role (even if role already existed)
        if ($permissions->count() > 0) {
            $adminRole->permissions()->sync($permissions->pluck('id'));
            $this->info("   Synced {$permissions->count()} permissions to admin role");
        }

        // Create caregiver role if it doesn't exist
        $caregiverRole = Role::firstOrCreate(
            ['name' => 'caregiver'],
            ['guard_name' => 'web']
        );

        if ($caregiverRole->wasRecentlyCreated) {
            $this->info('✅ Created caregiver role');
        } else {
            $this->info('✅ Caregiver role already exists');
        }
        
        // Always sync permissions to caregiver role (even if role already existed)
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
        
        if ($caregiverPermissions->count() > 0) {
            $caregiverRole->permissions()->sync($caregiverPermissions);
            $this->info("   Synced {$caregiverPermissions->count()} permissions to caregiver role");
        } else {
            $this->warn("   ⚠️  No caregiver permissions found. Run PermissionSeeder first.");
        }

        // Create nurse role if it doesn't exist
        $nurseRole = Role::firstOrCreate(
            ['name' => 'nurse'],
            ['guard_name' => 'web']
        );

        if ($nurseRole->wasRecentlyCreated) {
            $this->info('✅ Created nurse role');
        } else {
            $this->info('✅ Nurse role already exists');
        }
        
        // Always sync permissions to nurse role (even if role already existed)
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
        
        if ($nursePermissions->count() > 0) {
            $nurseRole->permissions()->sync($nursePermissions);
            $this->info("   Synced {$nursePermissions->count()} permissions to nurse role");
        } else {
            $this->warn("   ⚠️  No nurse permissions found. Run PermissionSeeder first.");
        }

        $this->line('');
        $this->info('✅ All required roles are now present in the database!');
        
        // Show summary
        $this->line('');
        $this->line('📋 Role Summary:');
        $this->line('  👤 Administrator: ' . ($administratorRole ? '✅' : '❌'));
        $this->line('  👤 Admin (alias): ' . ($adminRole ? '✅' : '❌'));
        $this->line('  👤 Caregiver: ' . ($caregiverRole ? '✅' : '❌'));
        $this->line('  👤 Nurse: ' . ($nurseRole ? '✅' : '❌'));

        return 0;
    }
}

