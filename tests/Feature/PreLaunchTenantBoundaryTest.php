<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class PreLaunchTenantBoundaryTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    private Facility $otherFacility;

    private Branch $otherBranch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createFacilityAndBranch('Owner Facility');

        $this->otherFacility = Facility::factory()->create(['name' => 'Other Facility']);
        $this->otherBranch = Branch::factory()->create([
            'facility_id' => $this->otherFacility->id,
            'name' => 'Other Branch',
        ]);
    }

    public function test_facility_admin_cannot_view_user_from_another_facility(): void
    {
        $this->createAndActAs('administrator');
        $foreignUser = $this->userInOtherFacility();

        $response = $this->getJson("/api/v1/users/{$foreignUser->id}");

        $this->assertContains($response->status(), [403, 404]);
    }

    public function test_facility_admin_cannot_update_user_from_another_facility(): void
    {
        $this->createAndActAs('administrator');
        $foreignUser = $this->userInOtherFacility();

        $response = $this->putJson("/api/v1/users/{$foreignUser->id}", [
            'first_name' => 'Changed',
        ]);

        $this->assertContains($response->status(), [403, 404]);
        $this->assertNotSame('Changed', $foreignUser->fresh()->first_name);
    }

    public function test_facility_admin_cannot_create_user_assigned_to_foreign_branch(): void
    {
        $this->createAndActAs('administrator');

        $response = $this->postJson('/api/v1/users', $this->validUserPayload([
            'email' => 'foreign-branch@example.test',
            'assigned_branch_id' => $this->otherBranch->id,
        ]));

        $this->assertContains($response->status(), [403, 422]);
        $this->assertDatabaseMissing('users', [
            'email' => 'foreign-branch@example.test',
            'assigned_branch_id' => $this->otherBranch->id,
        ]);
    }

    public function test_facility_admin_only_sees_own_facility(): void
    {
        $this->createAndActAs('administrator');

        $response = $this->getJson('/api/v1/facilities');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($this->facility->id, $ids);
        $this->assertNotContains($this->otherFacility->id, $ids);
    }

    public function test_facility_admin_cannot_update_or_delete_other_facility(): void
    {
        $this->createAndActAs('administrator');

        $update = $this->putJson("/api/v1/facilities/{$this->otherFacility->id}", [
            'name' => 'Compromised Facility',
        ]);
        $this->assertContains($update->status(), [403, 404]);

        $delete = $this->deleteJson("/api/v1/facilities/{$this->otherFacility->id}");
        $this->assertContains($delete->status(), [403, 404]);

        $this->assertDatabaseHas('facilities', [
            'id' => $this->otherFacility->id,
            'name' => 'Other Facility',
        ]);
    }

    public function test_facility_admin_cannot_create_or_move_branch_into_foreign_facility(): void
    {
        $this->createAndActAs('administrator');

        $create = $this->postJson('/api/v1/branches', [
            'name' => 'Foreign Branch',
            'facility_id' => $this->otherFacility->id,
        ]);
        $this->assertContains($create->status(), [403, 422]);

        $update = $this->putJson("/api/v1/branches/{$this->branch->id}", [
            'facility_id' => $this->otherFacility->id,
        ]);
        $this->assertContains($update->status(), [403, 422]);

        $this->assertSame($this->facility->id, $this->branch->fresh()->facility_id);
    }

    public function test_facility_admin_cannot_access_database_management_endpoints(): void
    {
        $this->createAndActAs('administrator');

        $this->getJson('/api/v1/database/stats')->assertStatus(403);
        $this->getJson('/api/v1/database/backups?facility_id='.$this->facility->id)->assertStatus(403);
        $this->getJson('/api/v1/database/backup/download?facility_id='.$this->facility->id.'&filename=backup_auto_facility_'.$this->facility->id.'_fake.sql')->assertStatus(403);
        $this->postJson('/api/v1/database/refresh')->assertStatus(403);
    }

    public function test_super_admin_keeps_platform_database_access(): void
    {
        $superAdmin = User::factory()->superAdmin()->create(['is_active' => true]);
        Sanctum::actingAs($superAdmin, ['*']);

        $this->getJson('/api/v1/database/stats')->assertOk();
    }

    private function userInOtherFacility(): User
    {
        return User::factory()->create([
            'facility_id' => $this->otherFacility->id,
            'assigned_branch_id' => $this->otherBranch->id,
            'role' => 'caregiver',
            'first_name' => 'Foreign',
            'last_name' => 'Caregiver',
            'is_active' => true,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function validUserPayload(array $overrides = []): array
    {
        return array_merge([
            'first_name' => 'Launch',
            'last_name' => 'User',
            'email' => 'launch-user@example.test',
            'password' => 'password123',
            'phone_number' => '555-0100',
            'date_of_birth' => '1985-01-01',
            'sex' => 'female',
            'date_employed' => '2024-01-01',
            'role' => 'caregiver',
            'assigned_branch_id' => $this->branch->id,
            'is_active' => true,
        ], $overrides);
    }
}
