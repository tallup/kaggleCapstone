<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\SetupFacility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase, SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'administrator',
            'email' => 'admin@test.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/login', [
            'email' => 'admin@test.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_user_can_login_again_after_logout(): void
    {
        $user = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'administrator',
            'email' => 'relogin@test.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        $login = $this->postJson('/api/v1/login', [
            'email' => 'relogin@test.com',
            'password' => 'password123',
        ]);
        $login->assertOk();
        $token = $login->json('token');

        $this->postJson('/api/v1/logout', [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();

        $again = $this->postJson('/api/v1/login', [
            'email' => 'relogin@test.com',
            'password' => 'password123',
        ]);

        $again->assertOk()
            ->assertJsonStructure(['token', 'user']);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $user = User::factory()->create([
            'facility_id' => $this->facility->id,
            'email' => 'admin@test.com',
            'password' => Hash::make('password123'),
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/login', [
            'email' => 'admin@test.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_login_fails_with_nonexistent_email(): void
    {
        $response = $this->postJson('/api/v1/login', [
            'email' => 'noone@test.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_logout(): void
    {
        $user = $this->createAndActAs('administrator');

        $response = $this->postJson('/api/v1/logout');

        $response->assertOk();
    }

    public function test_unauthenticated_user_gets_401(): void
    {
        $response = $this->getJson('/api/v1/user');

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_fetch_profile(): void
    {
        $user = $this->createAndActAs('administrator');

        $response = $this->getJson('/api/v1/user');

        $response->assertOk()
            ->assertJsonFragment(['email' => $user->email]);
    }

    public function test_token_refresh_returns_new_token(): void
    {
        $user = $this->createAndActAs('administrator');

        $response = $this->postJson('/api/v1/token/refresh');

        $response->assertOk()
            ->assertJsonStructure(['token', 'token_issued_at']);

        $this->assertNotEmpty($response->json('token'));
    }

    public function test_token_validate_returns_valid_for_authenticated_user(): void
    {
        $user = $this->createAndActAs('administrator');

        $response = $this->postJson('/api/v1/token/validate');

        $response->assertOk()
            ->assertJsonFragment(['valid' => true, 'user_id' => $user->id]);
    }

    public function test_token_validate_returns_401_for_unauthenticated(): void
    {
        $response = $this->postJson('/api/v1/token/validate');

        $response->assertStatus(401);
    }
}
