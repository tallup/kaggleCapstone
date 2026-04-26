<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Facility;
use App\Models\Resident;
use App\Models\ResidentStatusEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class ResidentStatusApiTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
        $this->createAndActAs('administrator');
    }

    public function test_temporary_status_update_sets_resident_fields_and_audit_event(): void
    {
        $resident = Resident::factory()->create([
            'branch_id' => $this->branch->id,
            'lifecycle_status' => 'active',
            'is_active' => true,
        ]);

        $response = $this->postJson("/api/v1/residents/{$resident->id}/status", [
            'status_type' => 'temporary',
            'status' => 'hospital',
            'effective_at' => '2026-04-26T09:30:00Z',
            'temporary_status_note' => 'Admitted for observation',
            'details' => [
                'destination' => 'City Hospital',
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.temporary_status', 'hospital')
            ->assertJsonPath('data.temporary_status_note', 'Admitted for observation');

        $resident->refresh();
        $this->assertSame('hospital', $resident->temporary_status);
        $this->assertSame('Admitted for observation', $resident->temporary_status_note);
        $this->assertNotNull($resident->temporary_status_started_at);

        $event = ResidentStatusEvent::withoutGlobalScopes()->latest('id')->first();
        $this->assertSame($resident->id, $event->resident_id);
        $this->assertSame($this->branch->id, $event->branch_id);
        $this->assertSame($this->facility->id, $event->facility_id);
        $this->assertSame('temporary', $event->status_type);
        $this->assertNull($event->from_status);
        $this->assertSame('hospital', $event->to_status);
        $this->assertSame('City Hospital', $event->details['destination']);
    }

    public function test_lifecycle_status_update_syncs_is_active_and_discharge_metadata(): void
    {
        $resident = Resident::factory()->create([
            'branch_id' => $this->branch->id,
            'lifecycle_status' => 'active',
            'status' => 'active',
            'is_active' => true,
        ]);

        $response = $this->postJson("/api/v1/residents/{$resident->id}/status", [
            'status_type' => 'lifecycle',
            'status' => 'discharged',
            'effective_at' => '2026-04-26T10:00:00Z',
            'discharge_date' => '2026-04-26',
            'discharge_reason' => 'Moved to family care',
            'discharge_notes' => 'Family picked up medications.',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.lifecycle_status', 'discharged')
            ->assertJsonPath('data.status', 'discharged')
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.discharge_reason', 'Moved to family care')
            ->assertJsonPath('data.discharge_notes', 'Family picked up medications.');

        $resident->refresh();
        $this->assertFalse($resident->is_active);
        $this->assertSame('discharged', $resident->status);
        $this->assertSame('discharged', $resident->lifecycle_status);
        $this->assertSame('2026-04-26', $resident->discharge_date->format('Y-m-d'));

        $this->assertDatabaseHas('resident_status_events', [
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'facility_id' => $this->facility->id,
            'status_type' => 'lifecycle',
            'from_status' => 'active',
            'to_status' => 'discharged',
        ]);
    }

    public function test_status_endpoint_respects_facility_isolation(): void
    {
        $otherFacility = Facility::factory()->create();
        $otherBranch = Branch::factory()->create([
            'facility_id' => $otherFacility->id,
        ]);
        $otherResident = Resident::withoutGlobalScopes()->create([
            'name' => 'Other Resident',
            'first_name' => 'Other',
            'last_name' => 'Resident',
            'branch_id' => $otherBranch->id,
            'date_of_birth' => '1950-01-01',
            'gender' => 'female',
            'admission_date' => '2024-01-01',
            'status' => 'active',
            'lifecycle_status' => 'active',
            'is_active' => true,
        ]);

        $response = $this->postJson("/api/v1/residents/{$otherResident->id}/status", [
            'status_type' => 'temporary',
            'status' => 'alert',
        ]);

        $response->assertForbidden();

        $this->assertDatabaseMissing('resident_status_events', [
            'resident_id' => $otherResident->id,
        ]);
    }

    public function test_legacy_status_filter_still_uses_is_active_and_new_filters_are_available(): void
    {
        Resident::factory()->create([
            'branch_id' => $this->branch->id,
            'first_name' => 'Active',
            'last_name' => 'Resident',
            'lifecycle_status' => 'active',
            'status' => 'active',
            'is_active' => true,
            'temporary_status' => 'alert',
        ]);
        Resident::factory()->create([
            'branch_id' => $this->branch->id,
            'first_name' => 'Discharged',
            'last_name' => 'Resident',
            'lifecycle_status' => 'discharged',
            'status' => 'discharged',
            'is_active' => false,
        ]);

        $this->getJson('/api/v1/residents?status=inactive')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.lifecycle_status', 'discharged');

        $this->getJson('/api/v1/residents?show_all=1&temporary_status=alert')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.temporary_status', 'alert');
    }
}
