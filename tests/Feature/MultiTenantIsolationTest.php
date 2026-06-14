<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Facility;
use App\Models\Resident;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class MultiTenantIsolationTest extends TestCase
{
    use RefreshDatabase, SetupFacility;

    private Facility $facilityB;

    private Branch $branchB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch('Facility A');

        $this->facilityB = Facility::factory()->create(['name' => 'Facility B']);
        $this->branchB = Branch::factory()->create([
            'facility_id' => $this->facilityB->id,
            'name' => 'Branch B',
        ]);
    }

    public function test_user_cannot_list_branches_from_other_facility(): void
    {
        $this->createAndActAs('administrator');

        $response = $this->getJson('/api/v1/branches');
        $response->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($this->branch->id, $ids);
        $this->assertNotContains($this->branchB->id, $ids);
    }

    public function test_user_cannot_view_resident_from_other_facility(): void
    {
        $this->createAndActAs('administrator');

        $residentB = Resident::withoutGlobalScopes()->create([
            'name' => 'Other Resident',
            'branch_id' => $this->branchB->id,
            'date_of_birth' => '1960-05-20',
            'gender' => 'male',
            'admission_date' => '2024-06-01',
            'is_active' => true,
        ]);

        $response = $this->getJson("/api/v1/residents/{$residentB->id}");

        $this->assertTrue(
            in_array($response->status(), [403, 404]),
            "Expected 403 or 404 but got {$response->status()}: ".$response->getContent()
        );
    }

    public function test_user_cannot_create_resource_in_other_facility_branch(): void
    {
        $this->createAndActAs('administrator');

        $response = $this->postJson('/api/v1/fire-drills', [
            'branch_id' => $this->branchB->id,
            'scheduled_date' => now()->toDateString(),
            'scheduled_time' => '10:00:00',
            'status' => 'scheduled',
        ]);

        $response->assertStatus(403);
    }

    public function test_residents_scoped_to_own_facility(): void
    {
        $this->createAndActAs('administrator');

        $ownResident = $this->createResident();

        Resident::withoutGlobalScopes()->create([
            'name' => 'Foreign Resident',
            'branch_id' => $this->branchB->id,
            'date_of_birth' => '1955-03-10',
            'gender' => 'female',
            'admission_date' => '2024-01-01',
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/v1/residents');
        $response->assertOk();

        $names = collect($response->json('data'))->pluck('name')->all();
        $this->assertContains($ownResident->name, $names);
        $this->assertNotContains('Foreign Resident', $names);
    }

    public function test_separate_facilities_have_independent_user_pools(): void
    {
        $userA = $this->createAndActAs('administrator');

        $userB = User::factory()->create([
            'facility_id' => $this->facilityB->id,
            'assigned_branch_id' => $this->branchB->id,
            'role' => 'caregiver',
            'is_active' => true,
        ]);

        $response = $this->getJson('/api/v1/users');
        $response->assertOk();

        $emails = collect($response->json('data'))->pluck('email')->all();
        $this->assertContains($userA->email, $emails);
        $this->assertNotContains($userB->email, $emails);
    }
}
