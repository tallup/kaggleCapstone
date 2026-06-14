<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class CrudTest extends TestCase
{
    use RefreshDatabase, SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
        $this->createAndActAs('administrator');
    }

    // ----- Branch CRUD -----

    public function test_can_list_branches(): void
    {
        $response = $this->getJson('/api/v1/branches');

        $response->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_branch(): void
    {
        $response = $this->postJson('/api/v1/branches', [
            'name' => 'New Branch',
            'address' => '123 Test St',
            'phone' => '555-1234',
            'email' => 'branch@test.com',
            'facility_id' => $this->facility->id,
        ]);

        $this->assertTrue(
            in_array($response->status(), [200, 201]),
            "Expected 200 or 201 but got {$response->status()}: ".$response->content()
        );
    }

    public function test_can_view_branch(): void
    {
        $response = $this->getJson("/api/v1/branches/{$this->branch->id}");

        $response->assertOk()
            ->assertJsonFragment(['name' => $this->branch->name]);
    }

    public function test_can_update_branch(): void
    {
        $response = $this->putJson("/api/v1/branches/{$this->branch->id}", [
            'name' => 'Updated Branch Name',
        ]);

        $response->assertOk();

        $this->assertEquals('Updated Branch Name', $this->branch->fresh()->name);
    }

    // ----- Resident CRUD -----

    public function test_can_list_residents(): void
    {
        $this->createResident();

        $response = $this->getJson('/api/v1/residents');

        $response->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_resident(): void
    {
        $response = $this->postJson('/api/v1/residents', [
            'name' => 'Jane Doe',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'date_of_birth' => '1950-06-15',
            'gender' => 'female',
            'branch_id' => $this->branch->id,
            'admission_date' => '2024-03-01',
            'room_number' => '101',
        ]);

        $this->assertTrue(
            in_array($response->status(), [200, 201]),
            "Expected 200 or 201 but got {$response->status()}: ".$response->content()
        );
    }

    public function test_can_view_resident(): void
    {
        $resident = $this->createResident();

        $response = $this->getJson("/api/v1/residents/{$resident->id}");

        $response->assertOk()
            ->assertJsonFragment(['name' => $resident->name]);
    }

    // ----- User Management -----

    public function test_can_list_users(): void
    {
        $response = $this->getJson('/api/v1/users');

        $response->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_can_create_user(): void
    {
        $response = $this->postJson('/api/v1/users', [
            'name' => 'Test Caregiver',
            'email' => 'caregiver@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'first_name' => 'Test',
            'last_name' => 'Caregiver',
            'phone_number' => '555-0100',
            'date_of_birth' => '1990-06-15',
            'sex' => 'other',
            'date_employed' => '2020-01-01',
            'role' => 'caregiver',
            'assigned_branch_id' => $this->branch->id,
        ]);

        $this->assertTrue(
            in_array($response->status(), [200, 201]),
            "Expected 200 or 201 but got {$response->status()}: ".$response->content()
        );
    }

    public function test_can_view_user(): void
    {
        $user = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'caregiver',
            'is_active' => true,
        ]);

        $response = $this->getJson("/api/v1/users/{$user->id}");

        $response->assertOk()
            ->assertJsonFragment(['email' => $user->email]);
    }
}
