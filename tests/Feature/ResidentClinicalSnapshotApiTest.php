<?php

namespace Tests\Feature;

use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class ResidentClinicalSnapshotApiTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
        $this->createAndActAs('administrator');
    }

    public function test_resident_show_includes_clinical_snapshot_fields(): void
    {
        $resident = Resident::factory()->create([
            'branch_id' => $this->branch->id,
            'dietary_restrictions' => 'No added salt; diabetic',
            'code_status' => 'Full code',
            'primary_language' => 'English',
            'pharmacy_name' => 'Sunrise Pharmacy',
            'general_medication_instructions' => 'Take with food when possible',
        ]);

        $response = $this->getJson("/api/v1/residents/{$resident->id}");

        $response->assertOk();
        $response->assertJsonPath('data.diet', 'No added salt; diabetic');
        $response->assertJsonPath('data.dietary_restrictions', 'No added salt; diabetic');
        $response->assertJsonPath('data.code_status', 'Full code');
        $response->assertJsonPath('data.primary_language', 'English');
        $response->assertJsonPath('data.language', 'English');
        $response->assertJsonPath('data.pharmacy_name', 'Sunrise Pharmacy');
        $response->assertJsonPath('data.pharmacy.name', 'Sunrise Pharmacy');
        $response->assertJsonPath('data.general_medication_instructions', 'Take with food when possible');
    }
}
