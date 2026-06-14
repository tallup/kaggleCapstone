<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class PreLaunchAdminConfigBoundaryTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createFacilityAndBranch('Owner Facility');
    }

    public function test_facility_admin_cannot_create_global_roles(): void
    {
        $this->createAndActAs('administrator');

        $response = $this->postJson('/api/v1/roles', [
            'name' => 'regional_admin',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('roles', ['name' => 'regional_admin']);
    }

    public function test_facility_admin_cannot_update_or_delete_global_roles(): void
    {
        $this->createAndActAs('administrator');
        $role = Role::create(['name' => 'caregiver', 'guard_name' => 'web']);

        $update = $this->putJson("/api/v1/roles/{$role->id}", [
            'name' => 'caregiver_changed',
        ]);
        $update->assertStatus(403);

        $delete = $this->deleteJson("/api/v1/roles/{$role->id}");
        $delete->assertStatus(403);

        $this->assertDatabaseHas('roles', [
            'id' => $role->id,
            'name' => 'caregiver',
        ]);
    }

    public function test_facility_admin_cannot_seed_or_resync_global_roles(): void
    {
        Permission::create(['name' => 'view_dashboard', 'guard_name' => 'web']);
        $this->createAndActAs('administrator');

        $response = $this->postJson('/api/v1/roles/ensure-exist');

        $response->assertStatus(403);
        $this->assertDatabaseMissing('roles', ['name' => 'administrator']);
    }

    public function test_facility_admin_cannot_update_facility_role_permissions(): void
    {
        $permission = Permission::create(['name' => 'view_dashboard', 'guard_name' => 'web']);
        $role = Role::create(['name' => 'caregiver', 'guard_name' => 'web']);
        $this->createAndActAs('administrator');

        $response = $this->putJson("/api/v1/facilities/{$this->facility->id}/permissions/roles/{$role->id}", [
            'permissions' => [$permission->name],
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseMissing('facility_role_permissions', [
            'facility_id' => $this->facility->id,
            'role_id' => $role->id,
            'permission_id' => $permission->id,
        ]);
    }

    public function test_super_admin_can_still_create_global_roles(): void
    {
        $superAdmin = User::factory()->superAdmin()->create(['is_active' => true]);
        Sanctum::actingAs($superAdmin, ['*']);

        $response = $this->postJson('/api/v1/roles', [
            'name' => 'platform_operator',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('roles', ['name' => 'platform_operator']);
    }
}
