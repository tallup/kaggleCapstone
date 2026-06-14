<?php

namespace Tests\Feature;

use App\Models\BehaviorChart;
use App\Models\Medication;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class ApiPerPageCapTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
    }

    public function test_medication_index_caps_per_page_at_100(): void
    {
        $user = $this->createAndActAs('administrator');
        $resident = $this->createResident();

        for ($i = 0; $i < 3; $i++) {
            Medication::create([
                'resident_id' => $resident->id,
                'branch_id' => $this->branch->id,
                'name' => "Medication {$i}",
                'instructions' => 'daily',
                'time_1' => '08:00:00',
                'created_by' => $user->id,
                'is_active' => true,
                'start_date' => '2020-01-01',
            ]);
        }

        $response = $this->getJson('/api/v1/medications?'.http_build_query([
            'resident_id' => $resident->id,
            'per_page' => 500,
        ]));

        $response->assertOk();
        $response->assertJsonPath('per_page', 100);
    }

    public function test_medication_for_administration_caps_per_page_at_100(): void
    {
        $user = $this->createAndActAs('administrator');
        $resident = $this->createResident();

        Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'name' => 'Aspirin Tablet',
            'instructions' => 'b.i.d',
            'time_1' => '08:00:00',
            'created_by' => $user->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        $response = $this->getJson('/api/v1/medications?'.http_build_query([
            'resident_id' => $resident->id,
            'for_administration' => 'true',
            'active_only' => 'true',
            'per_page' => 9999,
        ]));

        $response->assertOk();
        $response->assertJsonPath('per_page', 100);
    }

    public function test_medication_index_floors_per_page_at_1(): void
    {
        $user = $this->createAndActAs('administrator');
        $resident = $this->createResident();

        Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'name' => 'Aspirin Tablet',
            'instructions' => 'daily',
            'time_1' => '08:00:00',
            'created_by' => $user->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        $response = $this->getJson('/api/v1/medications?'.http_build_query([
            'resident_id' => $resident->id,
            'per_page' => 0,
        ]));

        $response->assertOk();
        $response->assertJsonPath('per_page', 1);
    }

    public function test_resident_charts_caps_per_page_at_100(): void
    {
        $user = $this->createAndActAs('administrator');
        $resident = $this->createResident();

        BehaviorChart::create([
            'resident_id' => $resident->id,
            'caregiver_id' => $user->id,
            'chart_date' => '2026-05-01',
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/resident-charts?'.http_build_query([
            'resident_id' => $resident->id,
            'per_page' => 500,
        ]));

        $response->assertOk();
        $response->assertJsonPath('per_page', 100);
    }

    public function test_medication_for_administration_returns_json_array_data(): void
    {
        $user = $this->createAndActAs('administrator');
        $resident = $this->createResident();

        for ($i = 0; $i < 5; $i++) {
            Medication::create([
                'resident_id' => $resident->id,
                'branch_id' => $this->branch->id,
                'name' => "Med {$i}",
                'instructions' => $i % 2 === 0 ? 'daily' : 'prn',
                'time_1' => '08:00:00',
                'created_by' => $user->id,
                'is_active' => true,
                'start_date' => '2020-01-01',
            ]);
        }

        $response = $this->getJson('/api/v1/medications?'.http_build_query([
            'resident_id' => $resident->id,
            'for_administration' => 'true',
            'active_only' => 'true',
            'hide_administered' => 'true',
            'per_page' => 100,
        ]));

        $response->assertOk();
        $payload = json_decode($response->getContent(), true);
        $this->assertIsArray($payload['data']);
        $this->assertSame(array_keys($payload['data']), range(0, count($payload['data']) - 1));
    }
}
