<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicStaffClockInRateLimitTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_staff_verify_endpoint_is_route_throttled_before_validation(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.50']);

        for ($i = 0; $i < 30; $i++) {
            $this->postJson('/api/public/staff/verify-employee', [])
                ->assertStatus(422);
        }

        $this->postJson('/api/public/staff/verify-employee', [])
            ->assertStatus(429);
    }
}
