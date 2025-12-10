<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Facility;
use App\Models\Branch;
use App\Models\FireDrill;
use App\Models\GroceryStatusUpdate;
use App\Models\MedicationDelivery;
use App\Models\Incident;
use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Carbon\Carbon;

class AccessScopeTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsFacilityUser(Facility $facility, Branch $branch): User
    {
        $user = User::factory()->create([
            'facility_id' => $facility->id,
            'assigned_branch_id' => $branch->id,
            'role' => 'administrator',
            'is_active' => true,
        ]);

        Sanctum::actingAs($user, ['*']);

        // Mirror middleware behavior for FacilityScope
        app()->instance('facility', $facility);

        return $user;
    }

    public function test_branches_must_belong_to_facility_for_safety_and_medication_endpoints(): void
    {
        $facilityA = Facility::create(['name' => 'Alpha', 'is_active' => true]);
        $facilityB = Facility::create(['name' => 'Beta', 'is_active' => true]);
        $branchA = Branch::create(['name' => 'Alpha Main', 'facility_id' => $facilityA->id]);
        $branchB = Branch::create(['name' => 'Beta Main', 'facility_id' => $facilityB->id]);

        $this->actingAsFacilityUser($facilityA, $branchA);

        // Fire Drill creation should reject cross-facility branch
        $response = $this->postJson('/api/v1/fire-drills', [
            'branch_id' => $branchB->id,
            'scheduled_date' => Carbon::today()->toDateString(),
            'scheduled_time' => '10:00:00',
            'status' => 'scheduled',
        ]);
        $response->assertStatus(403);

        // Grocery Status creation should reject cross-facility branch
        $response = $this->postJson('/api/v1/grocery-status-updates', [
            'branch_id' => $branchB->id,
            'week_start_date' => Carbon::parse('2024-01-01')->toDateString(),
            'status' => 'pending',
        ]);
        $response->assertStatus(403);

        // Medication Delivery creation should reject cross-facility branch
        $response = $this->postJson('/api/v1/medication-deliveries', [
            'branch_id' => $branchB->id,
            'delivery_type' => 'batch',
            'pharmacy_name' => 'PharmaX',
            'quantity_received' => '10 boxes',
            'received_date' => Carbon::today()->toDateString(),
            'received_time' => '09:00',
        ]);
        $response->assertStatus(403);

        // Sanity check: branch within facility is allowed
        $response = $this->postJson('/api/v1/fire-drills', [
            'branch_id' => $branchA->id,
            'scheduled_date' => Carbon::today()->toDateString(),
            'scheduled_time' => '11:00:00',
            'status' => 'scheduled',
        ]);
        $response->assertStatus(201);
    }

    public function test_incident_listing_excludes_other_facilities(): void
    {
        $facilityA = Facility::create(['name' => 'Alpha', 'is_active' => true]);
        $facilityB = Facility::create(['name' => 'Beta', 'is_active' => true]);
        $branchA = Branch::create(['name' => 'Alpha Main', 'facility_id' => $facilityA->id]);
        $branchB = Branch::create(['name' => 'Beta Main', 'facility_id' => $facilityB->id]);

        $user = $this->actingAsFacilityUser($facilityA, $branchA);

        // Residents for each facility
        $residentA = Resident::withoutGlobalScopes()->create([
            'name' => 'Alice',
            'branch_id' => $branchA->id,
            'is_active' => true,
            'date_of_birth' => '1990-01-01',
            'gender' => 'female',
            'admission_date' => '2024-01-01',
        ]);
        $residentB = Resident::withoutGlobalScopes()->create([
            'name' => 'Bob',
            'branch_id' => $branchB->id,
            'is_active' => true,
            'date_of_birth' => '1992-02-02',
            'gender' => 'male',
            'admission_date' => '2024-01-02',
        ]);

        Incident::create([
            'resident_id' => $residentA->id,
            'branch_id' => $branchA->id,
            'incident_type' => 'Fall',
            'description' => 'Slip in hallway',
            'incident_date' => Carbon::today()->toDateString(),
            'severity' => 'low',
            'priority' => 'low',
            'reported_by' => $user->id,
        ]);

        Incident::withoutGlobalScopes()->create([
            'resident_id' => $residentB->id,
            'branch_id' => $branchB->id,
            'incident_type' => 'Fall',
            'description' => 'Slip in hallway B',
            'incident_date' => Carbon::today()->toDateString(),
            'severity' => 'low',
            'priority' => 'low',
            'reported_by' => $user->id,
        ]);

        $response = $this->getJson('/api/v1/incidents');
        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($branchA->id, $response->json('data')[0]['branch_id']);
    }
}

