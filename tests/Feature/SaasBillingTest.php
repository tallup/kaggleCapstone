<?php

namespace Tests\Feature;

use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SaasBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_administrator_cannot_view_saas_billing(): void
    {
        $facility = Facility::factory()->create();
        $user = User::factory()->create([
            'facility_id' => $facility->id,
            'role' => 'caregiver',
        ]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/saas-billing');

        $response->assertStatus(403);
    }
}
