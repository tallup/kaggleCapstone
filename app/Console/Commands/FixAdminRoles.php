<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;

class FixAdminRoles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'users:fix-admin-roles';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix admin user roles - assign administrator role to all users with admin/administrator role field';

    /**
     * Execute the console command.
     */
    public function handle()
   Margin {
        $this->info('🔧 Fixing admin user roles...');
        $this->line('');

        // Get or create administrator role
        $adminRole = Role::firstOrCreate(
            ['name' => 'administrator'],
            ['guard_name' => 'web']
        );

        // Get all permissions and assign to administrator role
        $permissions = Permission::all();
        if ($permissions->count() > 0) {
            $adminRole->permissions()->sync($permissions->pluck('id'));
            $this->info("✅ Assigned all {$permissions->count()} permissions to administrator role");
        }

        // Fix all users with role='admin' or role='administrator'
        $adminUsers = User::whereIn('role', ['admin', 'administrator'])->get();

        $this->line('');
        $this->info("📋 Found {$adminUsers->count()} admin user(s):");

        foreach ($adminUsers as $user) {
            $this->line('');
            $this->line("  👤 {$user->email} (role field: {$user->role})");
            
            // Check if user has the administrator role model
            if ($user->hasRole('administrator')) {
                $this->line("    ✅ Already has 'administrator' role model");
            } else {
                // Assign the administrator role
                $user->assignRole('administrator');
                $this->line("    ✅ Assigned 'administrator' role model");
            }
            
            // Show current roles
            $roles = $user->roles->pluck('name')->toArray();
            $this->line("    📋 Current roles: " . (empty($roles) ? 'None' : implode(', ', $roles)));
            
            // Show permissions via roles
            $permissionCount = $user->roles()->withCount('permissions')->get()->sum('permissions_count');
            $this->line("    🔑 Permissions via roles: {$permissionCount}");
        }

        $this->line('');
        $this->info('✅ Done! All admin users should now have the administrator role with all permissions.');
        $this->warn('💡 Remember to log out and log back in for changes to take effect!');

        return 0;
    }
}
