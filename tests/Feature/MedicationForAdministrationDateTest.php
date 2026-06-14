<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class MedicationForAdministrationDateTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
    }

    public function test_for_administration_marks_slot_fully_administered_for_given_administration_date(): void
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

        $onDay = $this->getJson('/api/v1/medications?'.http_build_query([
            'resident_id' => $resident->id,
            'for_administration' => 'true',
            'active_only' => 'true',
            'hide_administered' => 'false',
            'per_page' => 100,
            'administration_date' => '2026-04-15',
        ]));

        $onDay->assertOk();
        $payload = $onDay->json('data.0');
        $this->assertNotNull($payload);
        $this->assertTrue($payload['is_fully_administered_today']);

        $otherDay = $this->getJson('/api/v1/medications?'.http_build_query([
            'resident_id' => $resident->id,
            'for_administration' => 'true',
            'active_only' => 'true',
            'hide_administered' => 'false',
            'per_page' => 100,
            'administration_date' => '2026-04-14',
        ]));

        $otherDay->assertOk();
        $payload2 = $otherDay->json('data.0');
        $this->assertNotNull($payload2);
        $this->assertFalse($payload2['is_fully_administered_today']);
    }

    public function test_for_administration_validates_administration_date_format(): void
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

        $response = $this->getJson('/api/v1/medications?'.http_build_query([
            'resident_id' => $resident->id,
            'for_administration' => 'true',
            'administration_date' => 'not-a-date',
        ]));

        $response->assertStatus(422);
    }

    public function test_for_administration_caregiver_sees_no_medications_for_resident_outside_branch(): void
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
        $caregiverRole = Role::firstOrCreate(
            ['name' => 'caregiver'],
            ['guard_name' => 'web'],
        );
        $caregiver->roles()->syncWithoutDetaching([$caregiverRole->id]);
        Sanctum::actingAs($caregiver, ['*']);
        app()->instance('facility', $this->facility);

        $admin = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $otherBranch->id,
            'role' => 'administrator',
            'is_active' => true,
        ]);

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

        Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $otherBranch->id,
            'name' => 'Med X',
            'instructions' => 'daily',
            'time_1' => '08:00:00',
            'created_by' => $admin->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        $response = $this->getJson('/api/v1/medications?'.http_build_query([
            'resident_id' => $resident->id,
            'for_administration' => 'true',
            'active_only' => 'true',
            'administration_date' => '2026-04-15',
            'per_page' => 100,
        ]));

        $response->assertOk();
        $this->assertSame(0, (int) $response->json('total'));
    }
}
