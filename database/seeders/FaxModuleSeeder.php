<?php

namespace Database\Seeders;

use App\Constants\Modules;
use App\Models\Facility;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class FaxModuleSeeder extends Seeder
{
    /**
     * Idempotently register the Fax module permissions and grant them to
     * full-access roles (administrator + admin).
     *
     * Roles `nurse`, `caregiver`, `family` are intentionally NOT granted
     * fax permissions by default — facilities should opt in per-user via
     * Filament's role manager.
     */
    public function run(): void
    {
        $permissions = [
            ['name' => 'fax.view', 'group' => 'Fax', 'description' => 'View fax inbox, sent, and detail pages'],
            ['name' => 'fax.send', 'group' => 'Fax', 'description' => 'Compose and send outbound faxes'],
            ['name' => 'fax.receive', 'group' => 'Fax', 'description' => 'Receive inbound faxes (system-level)'],
            ['name' => 'fax.delete', 'group' => 'Fax', 'description' => 'Delete fax records (soft delete)'],
            ['name' => 'fax.manage_contacts', 'group' => 'Fax', 'description' => 'Create, edit, delete fax contacts'],
            ['name' => 'fax.manage_numbers', 'group' => 'Fax', 'description' => 'Purchase, release, and configure facility fax numbers'],
            ['name' => 'fax.manage_settings', 'group' => 'Fax', 'description' => 'Configure facility fax provider and credentials'],
        ];

        foreach ($permissions as $permission) {
            Permission::updateOrCreate(
                ['name' => $permission['name'], 'guard_name' => 'web'],
                [
                    'group' => $permission['group'],
                    'description' => $permission['description'],
                ]
            );
        }

        $faxPermissionIds = Permission::whereIn('name', array_column($permissions, 'name'))
            ->pluck('id')
            ->toArray();

        foreach (['administrator', 'admin'] as $roleName) {
            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $role->permissions()->syncWithoutDetaching($faxPermissionIds);
            }
        }

        $this->command?->info('Fax module permissions registered ('.count($permissions).').');

        // Enable the FAX module on every existing facility so test/staging
        // environments have the SPA + Filament Fax UI surfaced by default.
        // Idempotent: re-runs will simply re-flip is_enabled=true on the
        // existing facility_modules row.
        $enabled = 0;
        Facility::query()->each(function (Facility $facility) use (&$enabled): void {
            $facility->modules()->updateOrCreate(
                ['module' => Modules::FAX],
                ['is_enabled' => true],
            );
            $enabled++;
        });

        $this->command?->info("Fax module enabled on {$enabled} facility(ies).");
    }
}
