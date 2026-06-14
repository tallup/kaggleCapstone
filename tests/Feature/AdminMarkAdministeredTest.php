<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Drug;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\PharmacyInventory;
use App\Models\PharmacyStockTransaction;
use App\Models\Resident;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

/**
 * Covers the administrator-only "mark a missed dose as administered" endpoint.
 *
 * The endpoint preserves administered_at on the originally scheduled time so the printed MAR
 * report continues to look like a normal administration, and credits a caregiver who actually
 * worked that day where possible (the admin only appears in administered_by when nobody else
 * touched the resident that day).
 */
class AdminMarkAdministeredTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
    }

    /**
     * Build a medication + a system-created "missed" record for a fixed past slot.
     * Returns [resident, medication, missedAdministration, scheduledTime].
     *
     * @return array{0: Resident, 1: Medication, 2: MedicationAdministration, 3: Carbon}
     */
    private function makeMissedAdministration(
        ?Branch $branch = null,
        string $time = '08:00:00',
        string $date = '2026-04-15',
        ?int $drugId = null
    ): array {
        $branch = $branch ?? $this->branch;

        $resident = $this->createResident($branch);

        $systemUser = User::firstOrCreate(
            ['email' => 'system@evergreen.care'],
            [
                'name' => 'System',
                'password' => bcrypt('system'),
                'role' => 'admin',
                'is_active' => false,
            ]
        );

        $medication = Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $branch->id,
            'drug_id' => $drugId,
            'name' => 'Aspirin Tablet',
            'instructions' => 'b.i.d',
            'time_1' => $time,
            'time_2' => '20:00:00',
            'created_by' => $systemUser->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        $scheduledTime = Carbon::parse("$date $time", config('app.timezone'));

        $missed = MedicationAdministration::create([
            'medication_id' => $medication->id,
            'resident_id' => $resident->id,
            'branch_id' => $branch->id,
            'administered_by' => $systemUser->id,
            'status' => 'missed',
            'administered_at' => $scheduledTime,
            'notes' => 'Automatically marked as missed',
        ]);

        return [$resident, $medication, $missed, $scheduledTime];
    }

    private function caregiverFor(Branch $branch, string $firstName = 'Jane', string $lastName = 'Doe', string $role = 'caregiver'): User
    {
        return User::factory()->create([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'facility_id' => $branch->facility_id,
            'assigned_branch_id' => $branch->id,
            'role' => $role,
            'is_active' => true,
        ]);
    }

    public function test_administrator_can_flip_missed_to_completed(): void
    {
        $admin = $this->createAndActAs('administrator');

        [, , $missed, $scheduledTime] = $this->makeMissedAdministration();
        $originalAdministeredAt = $missed->administered_at->copy();

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertOk();
        $response->assertJsonPath('status', 'completed');
        $response->assertJsonPath('notes', 'Administered');

        $fresh = MedicationAdministration::find($missed->id);
        $this->assertSame('completed', $fresh->status);
        $this->assertSame('Administered', $fresh->notes);
        $this->assertSame('Administered', $fresh->dosage_given);
        // administered_at must be unchanged (the dose is still attributed to the scheduled slot)
        $this->assertTrue(
            $originalAdministeredAt->equalTo(Carbon::parse($fresh->administered_at)),
            'administered_at must stay on the originally scheduled time after a late flip'
        );
    }

    public function test_super_admin_can_flip_missed_to_completed(): void
    {
        $superAdmin = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'super_admin',
            'is_active' => true,
        ]);
        Sanctum::actingAs($superAdmin, ['*']);
        app()->instance('facility', $this->facility);

        [, , $missed] = $this->makeMissedAdministration();

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertOk();
        $response->assertJsonPath('status', 'completed');
        $response->assertJsonPath('notes', 'Administered');
    }

    public function test_caregiver_cannot_use_endpoint(): void
    {
        $this->createAndActAs('caregiver');

        [, , $missed] = $this->makeMissedAdministration();

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertStatus(403);
        $this->assertSame('missed', MedicationAdministration::find($missed->id)->status);
    }

    public function test_registered_nurse_cannot_use_endpoint(): void
    {
        $this->createAndActAs('registered_nurse');

        [, , $missed] = $this->makeMissedAdministration();

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertStatus(403);
    }

    public function test_branch_admin_cannot_use_endpoint(): void
    {
        // 'admin' role is branch-level, not facility-wide; per product decision only 'administrator' is allowed.
        $this->createAndActAs('admin');

        [, , $missed] = $this->makeMissedAdministration();

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertStatus(403);
    }

    public function test_cannot_flip_a_record_that_is_already_completed(): void
    {
        $this->createAndActAs('administrator');

        [, , $missed] = $this->makeMissedAdministration();
        $missed->update(['status' => 'completed']);

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Only missed medications can be marked as administered.']);
    }

    public function test_cannot_flip_a_record_whose_window_has_not_closed_yet(): void
    {
        $this->createAndActAs('administrator');

        // Anchor "now" so the slot's window is still open relative to it.
        $now = Carbon::parse('2026-04-15 08:30:00', config('app.timezone'));
        Carbon::setTestNow($now);

        // Slot scheduled for 08:30 — window ends at 09:30, which is in the future relative to now (08:30).
        // We point now back to 08:00 so the slot at 08:30 has a window of 07:30–09:30 (still open).
        Carbon::setTestNow(Carbon::parse('2026-04-15 08:00:00', config('app.timezone')));

        [, , $missed] = $this->makeMissedAdministration(time: '08:30:00');

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'This medication slot is still within its administration window.',
        ]);

        Carbon::setTestNow(null);
    }

    public function test_cannot_flip_a_record_before_medication_start_date(): void
    {
        $this->createAndActAs('administrator');

        [, $medication, $missed] = $this->makeMissedAdministration(date: '2026-04-15');
        // Push start_date after the missed slot's date
        $medication->update(['start_date' => '2027-01-01']);

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'Medication was not active on the scheduled date (before start date).',
        ]);
    }

    public function test_cannot_flip_a_record_after_medication_end_date(): void
    {
        $this->createAndActAs('administrator');

        [, $medication, $missed] = $this->makeMissedAdministration(date: '2026-04-15');
        $medication->update(['end_date' => '2026-04-01']);

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertStatus(422);
        $response->assertJsonFragment([
            'message' => 'Medication was not active on the scheduled date (after end date).',
        ]);
    }

    public function test_attribution_uses_last_caregiver_before_missed_slot(): void
    {
        $admin = $this->createAndActAs('administrator');

        [$resident, $medication, $missed] = $this->makeMissedAdministration(
            time: '18:00:00',
            date: '2026-04-15'
        );

        $jane = $this->caregiverFor($this->branch, 'Jane', 'Doe', 'caregiver');
        $mike = $this->caregiverFor($this->branch, 'Mike', 'Owens', 'caregiver');

        // Jane did 8 AM, Mike did noon, 6 PM is the missed slot.
        MedicationAdministration::create([
            'medication_id' => $medication->id,
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'administered_by' => $jane->id,
            'status' => 'completed',
            'administered_at' => Carbon::parse('2026-04-15 08:00:00', config('app.timezone')),
        ]);
        MedicationAdministration::create([
            'medication_id' => $medication->id,
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'administered_by' => $mike->id,
            'status' => 'completed',
            'administered_at' => Carbon::parse('2026-04-15 12:00:00', config('app.timezone')),
        ]);

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertOk();
        $response->assertJsonPath('administered_by.id', $mike->id);
        $this->assertSame($mike->id, (int) MedicationAdministration::find($missed->id)->administered_by);
    }

    public function test_attribution_falls_back_to_first_caregiver_after_when_no_one_administered_before(): void
    {
        $admin = $this->createAndActAs('administrator');

        [$resident, $medication, $missed] = $this->makeMissedAdministration(
            time: '08:00:00',
            date: '2026-04-15'
        );

        $mike = $this->caregiverFor($this->branch, 'Mike', 'Owens', 'caregiver');

        // Only caregiver dose this day is at noon — AFTER the missed 8 AM slot.
        MedicationAdministration::create([
            'medication_id' => $medication->id,
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'administered_by' => $mike->id,
            'status' => 'completed',
            'administered_at' => Carbon::parse('2026-04-15 12:00:00', config('app.timezone')),
        ]);

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertOk();
        $response->assertJsonPath('administered_by.id', $mike->id);
    }

    public function test_attribution_falls_back_to_admin_when_no_caregiver_touched_resident_that_day(): void
    {
        $admin = $this->createAndActAs('administrator');

        [, , $missed] = $this->makeMissedAdministration();

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertOk();
        $response->assertJsonPath('administered_by.id', $admin->id);
    }

    public function test_attribution_ignores_other_residents_caregivers(): void
    {
        $admin = $this->createAndActAs('administrator');

        // The resident whose dose we're flipping
        [, , $missed] = $this->makeMissedAdministration();

        // A different resident with a caregiver dose the same day — must NOT influence attribution.
        $otherResident = $this->createResident($this->branch);
        $otherMed = Medication::create([
            'resident_id' => $otherResident->id,
            'branch_id' => $this->branch->id,
            'name' => 'Other Med',
            'instructions' => 'b.i.d',
            'time_1' => '08:00:00',
            'created_by' => $admin->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);
        $jane = $this->caregiverFor($this->branch, 'Jane', 'Doe', 'caregiver');
        MedicationAdministration::create([
            'medication_id' => $otherMed->id,
            'resident_id' => $otherResident->id,
            'branch_id' => $this->branch->id,
            'administered_by' => $jane->id,
            'status' => 'completed',
            'administered_at' => Carbon::parse('2026-04-15 08:00:00', config('app.timezone')),
        ]);

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertOk();
        $response->assertJsonPath('administered_by.id', $admin->id);
    }

    public function test_pharmacy_inventory_decrements_after_flip(): void
    {
        $this->createAndActAs('administrator');

        $drug = Drug::create([
            'name' => 'Test Aspirin',
            'strength' => '81mg',
            'dosage_form' => 'tablet',
            'is_active' => true,
        ]);

        $inventory = PharmacyInventory::create([
            'branch_id' => $this->branch->id,
            'drug_id' => $drug->id,
            'quantity' => 25,
            'unit_cost' => 1.50,
        ]);

        [, , $missed] = $this->makeMissedAdministration(drugId: $drug->id);

        $response = $this->patchJson("/api/v1/medication-administrations/{$missed->id}/mark-administered");

        $response->assertOk();

        $inventory->refresh();
        $this->assertSame(24, (int) $inventory->quantity, 'Inventory should drop by 1 after a late flip to completed');

        $stockTx = PharmacyStockTransaction::where('reference_number', 'MA-'.$missed->id)->first();
        $this->assertNotNull($stockTx, 'A pharmacy stock transaction must be written for the late flip');
        $this->assertSame('dispensed', $stockTx->transaction_type);
        $this->assertSame(-1, (int) $stockTx->quantity_change);
    }

    public function test_returns_404_for_unknown_administration_id(): void
    {
        $this->createAndActAs('administrator');

        $response = $this->patchJson('/api/v1/medication-administrations/9999999/mark-administered');

        $response->assertStatus(404);
    }
}
