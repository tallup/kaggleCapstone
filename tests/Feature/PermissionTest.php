<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class PermissionTest extends TestCase
{
    use RefreshDatabase, SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
    }

    public function test_administrator_can_access_users_list(): void
    {
        $this->createAndActAs('administrator');

        $response = $this->getJson('/api/v1/users');

        $response->assertOk();
    }

    public function test_caregiver_can_access_residents(): void
    {
        $this->createAndActAs('caregiver');

        $response = $this->getJson('/api/v1/residents');

        $response->assertOk();
    }

    public function test_administrator_can_create_users(): void
    {
        $this->createAndActAs('administrator');

        $response = $this->postJson('/api/v1/users', [
            'name' => 'New Staff',
            'email' => 'staff@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'first_name' => 'New',
            'last_name' => 'Staff',
            'phone_number' => '555-0200',
            'date_of_birth' => '1988-03-20',
            'sex' => 'female',
            'date_employed' => '2021-06-01',
            'role' => 'caregiver',
            'assigned_branch_id' => $this->branch->id,
        ]);

        $this->assertTrue(
            in_array($response->status(), [200, 201]),
            "Expected 200 or 201 but got {$response->status()}: ".$response->content()
        );
    }

    public function test_caregiver_cannot_create_users(): void
    {
        $this->createAndActAs('caregiver');

        $response = $this->postJson('/api/v1/users', [
            'name' => 'Sneaky User',
            'email' => 'sneaky@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'caregiver',
            'assigned_branch_id' => $this->branch->id,
        ]);

        $this->assertTrue(
            in_array($response->status(), [401, 403]),
            "Expected 401 or 403 but got {$response->status()}"
        );
    }

    public function test_inactive_user_cannot_login(): void
    {
        User::factory()->create([
            'facility_id' => $this->facility->id,
            'email' => 'inactive@test.com',
            'password' => Hash::make('password123'),
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/v1/login', [
            'email' => 'inactive@test.com',
            'password' => 'password123',
        ]);

        $this->assertTrue(
            in_array($response->status(), [401, 403]),
            "Expected 401 or 403 but got {$response->status()}"
        );
    }

    public function test_user_can_change_own_password(): void
    {
        $user = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'administrator',
            'password' => Hash::make('old-password'),
            'is_active' => true,
        ]);

        Sanctum::actingAs($user, ['*']);
        app()->instance('facility', $this->facility);

        $response = $this->putJson('/api/v1/user/password', [
            'current_password' => 'old-password',
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response->assertOk();

        $this->assertTrue(
            Hash::check('new-password123', $user->fresh()->password)
        );
    }
}
