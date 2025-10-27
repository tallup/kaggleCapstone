<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

class SetupReportPages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reports:setup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Ensure all report pages are accessible and permissions are set up';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Setting up all report pages and permissions...");
        
        // Report page permissions
        $reportPermissions = [
            'view_chart_reports',
            'view_resident_charts', 
            'view_vitals_charts',
            'view_vitals_reports',
            'view_assessment_charts',
            'view_medication_history',
            'view_medication_reports',
            'view_appointments_charts',
            'view_vitals_history',
            'view_sleep_charts',
            'view_staff_charts',
        ];

        // Create all report permissions
        foreach ($reportPermissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission],
                ['guard_name' => 'web']
            );
        }

        $this->info("Created " . count($reportPermissions) . " report permissions");

        // Get admin role and assign all report permissions
        $adminRole = Role::where('name', 'admin')->first();
        
        if ($adminRole) {
            $permissionIds = Permission::whereIn('name', $reportPermissions)->pluck('id')->toArray();
            $adminRole->permissions()->syncWithoutDetaching($permissionIds);
            $this->info("Assigned all report permissions to admin role");
        } else {
            $this->error("Admin role not found!");
            return 1;
        }

        // Verify admin user has access
        $adminUser = User::where('email', 'admin@edmondserenity.com')->first();
        
        if ($adminUser && $adminUser->hasRole('admin')) {
            $this->info("✅ Admin user has access to all report pages");
        } else {
            $this->error("❌ Admin user doesn't have proper access");
            return 1;
        }

        $this->info("✅ All report pages are now accessible!");
        $this->info("Report pages available:");
        foreach ($reportPermissions as $permission) {
            $this->line("  - " . str_replace('_', ' ', $permission));
        }

        return 0;
    }
}
