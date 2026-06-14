<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Branch;
use App\Models\Incident;
use App\Models\Resident;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class ResidentIncidentAssessmentReportTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
    }

    public function test_incident_history_pdf_returns_pdf_for_authenticated_staff(): void
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

        Incident::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'incident_type' => 'Fall',
            'description' => 'Test incident for PDF.',
            'incident_date' => Carbon::parse('2026-04-15 14:00:00', config('app.timezone')),
            'reported_by' => $user->id,
        ]);

        $response = $this->get('/api/v1/residents/'.$resident->id.'/reports/incidents');

        $response->assertOk();
        $this->assertStringStartsWith('%PDF', $response->getContent());
        $this->assertStringContainsString('application/pdf', (string) $response->headers->get('Content-Type'));
    }

    public function test_assessment_summary_pdf_returns_pdf_for_authenticated_staff(): void
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

        Assessment::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'assessor_id' => $user->id,
            'assessment_type' => 'Initial',
            'assessment_date' => '2026-04-10',
            'status' => 'completed',
            'notes' => 'Summary notes for PDF.',
            'scores' => ['mobility' => 2],
            'recommendations' => ['follow_up' => 'PT'],
        ]);

        $response = $this->get('/api/v1/residents/'.$resident->id.'/reports/assessments');

        $response->assertOk();
        $this->assertStringStartsWith('%PDF', $response->getContent());
        $this->assertStringContainsString('application/pdf', (string) $response->headers->get('Content-Type'));
    }

    public function test_incident_report_returns_403_for_caregiver_wrong_branch(): void
    {
        $otherBranch = Branch::factory()->create([
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

        $this->get('/api/v1/residents/'.$resident->id.'/reports/incidents')
            ->assertForbidden();
    }

    public function test_assessment_report_returns_403_for_caregiver_wrong_branch(): void
    {
        $otherBranch = Branch::factory()->create([
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

        $this->get('/api/v1/residents/'.$resident->id.'/reports/assessments')
            ->assertForbidden();
    }

    public function test_incident_report_validates_date_range(): void
    {
        $this->createAndActAs('administrator');

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

        $this->get('/api/v1/residents/'.$resident->id.'/reports/incidents?date_from=2026-04-30&date_to=2026-04-01')
            ->assertStatus(422);
    }
}
