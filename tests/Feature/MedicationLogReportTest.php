<?php

namespace Tests\Feature;

use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class MedicationLogReportTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
    }

    public function test_medication_log_pdf_returns_pdf_for_authenticated_user(): void
    {
        $user = $this->createAndActAs('administrator');

        $resident = Resident::withoutGlobalScopes()->create([
            'name' => 'Jane Doe',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'branch_id' => $this->branch->id,
            'date_of_birth' => '1950-01-15',
            'gender' => 'female',
            'admission_date' => '2024-01-01',
            'is_active' => true,
            'status' => 'active',
        ]);

        $medication = Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'name' => 'Aspirin Tablet',
            'instructions' => 'b.i.d',
            'time_1' => '08:00:00',
            'created_by' => $user->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        MedicationAdministration::create([
            'medication_id' => $medication->id,
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'administered_by' => $user->id,
            'administered_at' => Carbon::parse('2026-04-15 08:05:00', config('app.timezone')),
            'status' => 'completed',
        ]);

        $response = $this->get(
            '/api/v1/residents/'.$resident->id.'/reports/medication-log?date_from=2026-04-01&date_to=2026-04-30'
        );

        $response->assertOk();
        $this->assertStringStartsWith('%PDF', $response->getContent());
        $this->assertStringContainsString('application/pdf', (string) $response->headers->get('Content-Type'));
    }

    public function test_medication_log_pdf_returns_401_when_unauthenticated(): void
    {
        $resident = Resident::withoutGlobalScopes()->create([
            'name' => 'Jane Doe',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'branch_id' => $this->branch->id,
            'date_of_birth' => '1950-01-15',
            'gender' => 'female',
            'admission_date' => '2024-01-01',
            'is_active' => true,
            'status' => 'active',
        ]);

        $response = $this->get(
            '/api/v1/residents/'.$resident->id.'/reports/medication-log?date_from=2026-04-01&date_to=2026-04-30'
        );

        $response->assertUnauthorized();
    }

    public function test_medication_log_pdf_returns_403_for_caregiver_wrong_branch(): void
    {
        $otherBranch = \App\Models\Branch::factory()->create([
            'facility_id' => $this->facility->id,
        ]);

        $caregiver = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'caregiver',
            'is_active' => true,
        ]);
        Sanctum::actingAs($caregiver, ['*']);
        app()->instance('facility', $this->facility);

        $resident = Resident::withoutGlobalScopes()->create([
            'name' => 'Other Resident',
            'first_name' => 'Other',
            'last_name' => 'Resident',
            'branch_id' => $otherBranch->id,
            'date_of_birth' => '1950-01-15',
            'gender' => 'female',
            'admission_date' => '2024-01-01',
            'is_active' => true,
            'status' => 'active',
        ]);

        $response = $this->get(
            '/api/v1/residents/'.$resident->id.'/reports/medication-log?date_from=2026-04-01&date_to=2026-04-30'
        );

        $response->assertForbidden();
    }

    public function test_medication_log_pdf_validates_dates(): void
    {
        $user = $this->createAndActAs('administrator');

        $resident = Resident::withoutGlobalScopes()->create([
            'name' => 'Jane Doe',
            'first_name' => 'Jane',
            'last_name' => 'Doe',
            'branch_id' => $this->branch->id,
            'date_of_birth' => '1950-01-15',
            'gender' => 'female',
            'admission_date' => '2024-01-01',
            'is_active' => true,
            'status' => 'active',
        ]);

        $response = $this->get(
            '/api/v1/residents/'.$resident->id.'/reports/medication-log?date_from=2026-04-30&date_to=2026-04-01'
        );

        $response->assertStatus(422);
    }
}
