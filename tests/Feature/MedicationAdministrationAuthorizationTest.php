<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class MedicationAdministrationAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
    }

    public function test_branch_admin_cannot_show_administration_from_another_branch(): void
    {
        $otherBranch = Branch::factory()->create(['facility_id' => $this->facility->id]);
        $resident = $this->createResident($otherBranch);
        $admin = $this->createAndActAs('administrator');

        $medication = Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $otherBranch->id,
            'name' => 'Aspirin',
            'instructions' => 'a.m',
            'time_1' => '08:00:00',
            'created_by' => $admin->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        $administration = MedicationAdministration::create([
            'medication_id' => $medication->id,
            'resident_id' => $resident->id,
            'branch_id' => $otherBranch->id,
            'administered_by' => $admin->id,
            'administered_at' => Carbon::parse('2026-04-15 08:05:00', config('app.timezone')),
            'status' => 'completed',
        ]);

        $branchAdmin = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'admin',
            'is_active' => true,
        ]);
        Sanctum::actingAs($branchAdmin, ['*']);
        app()->instance('facility', $this->facility);

        $this->getJson('/api/v1/medication-administrations/'.$administration->id)
            ->assertNotFound();
    }

    public function test_branch_admin_cannot_store_administration_for_another_branch(): void
    {
        $otherBranch = Branch::factory()->create(['facility_id' => $this->facility->id]);
        $resident = $this->createResident($otherBranch);
        $facilityAdmin = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'administrator',
            'is_active' => true,
        ]);

        $medication = Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $otherBranch->id,
            'name' => 'Aspirin',
            'instructions' => 'a.m',
            'time_1' => '08:00:00',
            'created_by' => $facilityAdmin->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        $branchAdmin = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'admin',
            'is_active' => true,
        ]);
        Sanctum::actingAs($branchAdmin, ['*']);
        app()->instance('facility', $this->facility);

        $this->postJson('/api/v1/medication-administrations', [
            'medication_id' => $medication->id,
            'resident_id' => $resident->id,
            'branch_id' => $otherBranch->id,
            'administered_at' => Carbon::parse('2026-04-15 08:05:00', config('app.timezone'))->utc()->toIso8601String(),
            'status' => 'completed',
        ])->assertForbidden();
    }

    public function test_caregiver_can_store_administration_for_own_branch(): void
    {
        $resident = $this->createResident($this->branch);
        $admin = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'administrator',
            'is_active' => true,
        ]);

        $medication = Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'name' => 'Aspirin',
            'instructions' => 'a.m',
            'time_1' => '08:00:00',
            'created_by' => $admin->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        $caregiver = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'caregiver',
            'is_active' => true,
        ]);
        Sanctum::actingAs($caregiver, ['*']);
        app()->instance('facility', $this->facility);

        Carbon::setTestNow(Carbon::parse('2026-04-15 08:05:00', config('app.timezone')));

        $this->postJson('/api/v1/medication-administrations', [
            'medication_id' => $medication->id,
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'administered_at' => Carbon::now(config('app.timezone'))->utc()->toIso8601String(),
            'status' => 'completed',
        ])->assertCreated();

        Carbon::setTestNow();
    }
}
