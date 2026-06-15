<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\Incident;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class DashboardInsightMetricsTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
    }

    private function insightMetrics(): array
    {
        $admin = $this->createAndActAs('administrator');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/dashboard/stats');

        $response->assertOk();

        return $response->json('data');
    }

    public function test_compliance_uses_assessment_date_and_returns_null_without_due_assessments(): void
    {
        $metrics = $this->insightMetrics();

        $this->assertNull($metrics['compliance_score']);

        $resident = $this->createResident();

        Assessment::withoutGlobalScopes()->create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'assessor_id' => User::factory()->create(['facility_id' => $this->facility->id])->id,
            'assessment_type' => 'annual',
            'assessment_date' => now()->subDays(5)->toDateString(),
            'status' => 'completed',
        ]);

        Assessment::withoutGlobalScopes()->create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'assessor_id' => User::factory()->create(['facility_id' => $this->facility->id])->id,
            'assessment_type' => 'quarterly',
            'assessment_date' => now()->subDays(3)->toDateString(),
            'status' => 'draft',
        ]);

        $metrics = $this->insightMetrics();

        $this->assertEquals(50.0, $metrics['compliance_score']);
    }

    public function test_compliance_includes_overdue_incomplete_assessments_outside_thirty_day_window(): void
    {
        $resident = $this->createResident();

        Assessment::withoutGlobalScopes()->create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'assessor_id' => User::factory()->create(['facility_id' => $this->facility->id])->id,
            'assessment_type' => 'annual',
            'assessment_date' => now()->subDays(90)->toDateString(),
            'status' => 'draft',
        ]);

        Assessment::withoutGlobalScopes()->create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'assessor_id' => User::factory()->create(['facility_id' => $this->facility->id])->id,
            'assessment_type' => 'quarterly',
            'assessment_date' => now()->subDays(75)->toDateString(),
            'status' => 'in_progress',
        ]);

        $metrics = $this->insightMetrics();

        $this->assertEquals(0.0, $metrics['compliance_score']);
    }

    public function test_medication_adherence_uses_scheduled_slots_and_returns_null_without_schedule(): void
    {
        $metrics = $this->insightMetrics();

        $this->assertNull($metrics['medication_adherence_rate']);

        $resident = $this->createResident();
        $today = Carbon::now(config('app.timezone'))->startOfDay();

        $medication = Medication::withoutGlobalScopes()->create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'name' => 'Aspirin',
            'instructions' => 'b.i.d',
            'time_1' => '08:00:00',
            'time_2' => '20:00:00',
            'created_by' => User::factory()->create(['facility_id' => $this->facility->id])->id,
            'is_active' => true,
            'start_date' => $today->copy()->subMonth()->toDateString(),
        ]);

        MedicationAdministration::withoutGlobalScopes()->create([
            'medication_id' => $medication->id,
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'administered_by' => User::factory()->create(['facility_id' => $this->facility->id])->id,
            'status' => 'completed',
            'administered_at' => $today->copy()->setTime(8, 0),
        ]);

        $metrics = $this->insightMetrics();

        $this->assertSame(7.1, $metrics['medication_adherence_rate']);
    }

    public function test_average_incident_response_time_returns_null_without_resolved_incidents(): void
    {
        $metrics = $this->insightMetrics();

        $this->assertNull($metrics['average_incident_response_time']);

        $resident = $this->createResident();
        $createdAt = now()->subDays(2)->setTime(10, 0);
        $resolvedAt = $createdAt->copy()->addHours(4);

        $incident = Incident::withoutGlobalScopes()->create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'reported_by' => User::factory()->create([
                'facility_id' => $this->facility->id,
                'assigned_branch_id' => $this->branch->id,
            ])->id,
            'incident_type' => 'fall',
            'severity' => 'low',
            'description' => 'Test incident',
            'incident_date' => $createdAt,
            'status' => 'resolved',
            'resolved_at' => $resolvedAt,
        ]);

        $incident->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ])->saveQuietly();

        $metrics = $this->insightMetrics();

        $this->assertEquals(4.0, $metrics['average_incident_response_time']);
    }

    public function test_average_incident_response_time_uses_status_when_resolved_at_missing(): void
    {
        $resident = $this->createResident();
        $createdAt = now()->subDays(4)->setTime(9, 0);

        $incident = Incident::withoutGlobalScopes()->create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'reported_by' => User::factory()->create([
                'facility_id' => $this->facility->id,
                'assigned_branch_id' => $this->branch->id,
            ])->id,
            'incident_type' => 'fall',
            'severity' => 'low',
            'description' => 'Legacy resolved incident',
            'incident_date' => $createdAt,
            'status' => 'resolved',
            'resolved_at' => null,
        ]);

        $incident->forceFill([
            'created_at' => $createdAt,
            'updated_at' => $createdAt->copy()->addHours(2),
        ])->saveQuietly();

        $metrics = $this->insightMetrics();

        $this->assertEquals(2.0, $metrics['average_incident_response_time']);
    }
}
