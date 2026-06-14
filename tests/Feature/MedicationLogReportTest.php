<?php

namespace Tests\Feature;

use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use App\Models\User;
use App\Services\MedicationLogReportService;
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

    public function test_medication_log_pdf_rejects_when_both_sections_disabled(): void
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
            '/api/v1/residents/'.$resident->id.'/reports/medication-log?date_from=2026-04-01&date_to=2026-04-30&include_scheduled=0&include_prn=0'
        );

        $response->assertStatus(422);
    }

    public function test_medication_log_pdf_rejects_foreign_medication_ids(): void
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
            '/api/v1/residents/'.$resident->id.'/reports/medication-log?date_from=2026-04-01&date_to=2026-04-30&medication_ids[]=999999'
        );

        $response->assertStatus(422);
    }

    public function test_medication_log_pdf_accepts_portrait_orientation(): void
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

        $response = $this->get(
            '/api/v1/residents/'.$resident->id.'/reports/medication-log?date_from=2026-04-01&date_to=2026-04-30&orientation=portrait'
        );

        $response->assertOk();
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_medication_log_pdf_accepts_administration_outcomes_filter(): void
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

        $response = $this->get(
            '/api/v1/residents/'.$resident->id.'/reports/medication-log?date_from=2026-04-01&date_to=2026-04-30&administration_outcomes=taken'
        );

        $response->assertOk();
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_medication_log_pdf_validates_administration_outcomes(): void
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
            '/api/v1/residents/'.$resident->id.'/reports/medication-log?date_from=2026-04-01&date_to=2026-04-30&administration_outcomes=invalid'
        );

        $response->assertStatus(422);
    }

    public function test_medication_log_includes_scheduled_meds_when_only_instruction_frequency_set(): void
    {
        $user = $this->createAndActAs('administrator');

        $resident = Resident::withoutGlobalScopes()->create([
            'name' => 'Frank Anderson',
            'first_name' => 'Frank',
            'last_name' => 'Anderson',
            'branch_id' => $this->branch->id,
            'date_of_birth' => '1939-08-25',
            'gender' => 'male',
            'admission_date' => '2024-01-01',
            'is_active' => true,
            'status' => 'active',
        ]);

        Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'name' => 'ASPIRIN',
            'instructions' => 'a.m',
            'created_by' => $user->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'name' => 'ATORVASTATIN',
            'instructions' => 'h.s',
            'created_by' => $user->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        $response = $this->get(
            '/api/v1/residents/'.$resident->id.'/reports/medication-log?date_from=2026-04-01&date_to=2026-04-30'
        );

        $response->assertOk();
        $this->assertStringStartsWith('%PDF', $response->getContent());

        $from = Carbon::parse('2026-04-01', config('app.timezone'))->startOfDay();
        $to = Carbon::parse('2026-04-30', config('app.timezone'))->endOfDay();
        $data = app(MedicationLogReportService::class)->buildViewData($resident->fresh(), $from, $to, []);
        $this->assertCount(30, $data['days'], 'Full April range should include 30 day columns.');
        $this->assertCount(2, $data['dayChunks'], 'MAR PDF should split wide months into segments so columns are not clipped.');
        $this->assertCount(15, $data['dayChunks'][0]);
        $this->assertCount(15, $data['dayChunks'][1]);
        $this->assertCount(2, $data['scheduledSections']);
        $this->assertSame('ASPIRIN', $data['scheduledSections'][0]['title']);
        $this->assertSame('ATORVASTATIN', $data['scheduledSections'][1]['title']);
        $this->assertNotEmpty($data['scheduledSections'][0]['rows']);
    }

    public function test_medication_log_day_chunks_single_segment_for_short_ranges(): void
    {
        $user = $this->createAndActAs('administrator');

        $resident = Resident::withoutGlobalScopes()->create([
            'name' => 'Short Range',
            'first_name' => 'Short',
            'last_name' => 'Range',
            'branch_id' => $this->branch->id,
            'date_of_birth' => '1950-01-15',
            'gender' => 'female',
            'admission_date' => '2024-01-01',
            'is_active' => true,
            'status' => 'active',
        ]);

        $from = Carbon::parse('2026-04-01', config('app.timezone'))->startOfDay();
        $to = Carbon::parse('2026-04-07', config('app.timezone'))->endOfDay();
        $data = app(MedicationLogReportService::class)->buildViewData($resident->fresh(), $from, $to, []);

        $this->assertCount(7, $data['days']);
        $this->assertCount(1, $data['dayChunks']);
    }

    public function test_medication_log_accepts_boolean_flags_as_zero_and_one(): void
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

        Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'name' => 'PRN Med',
            'instructions' => 'PRN',
            'created_by' => $user->id,
            'is_active' => true,
            'start_date' => '2020-01-01',
        ]);

        $response = $this->get(
            '/api/v1/residents/'.$resident->id.'/reports/medication-log?date_from=2026-04-01&date_to=2026-04-30&include_scheduled=0&include_prn=1'
        );

        $response->assertOk();
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_mar_scheduled_slot_does_not_reuse_same_administration_for_later_slot(): void
    {
        $user = $this->createAndActAs('administrator');

        $resident = Resident::withoutGlobalScopes()->create([
            'name' => 'Slot Test',
            'first_name' => 'Slot',
            'last_name' => 'Test',
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
            'name' => 'BID Med',
            'instructions' => 'b.i.d',
            'time_1' => '08:00:00',
            'time_2' => '20:00:00',
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

        $from = Carbon::parse('2026-04-15', config('app.timezone'))->startOfDay();
        $to = Carbon::parse('2026-04-15', config('app.timezone'))->endOfDay();
        $data = app(MedicationLogReportService::class)->buildViewData($resident->fresh(), $from, $to, []);

        $rows = $data['scheduledSections'][0]['rows'];
        $this->assertCount(2, $rows);

        $morningCell = $rows[0]['cells']['2026-04-15'];
        $eveningCell = $rows[1]['cells']['2026-04-15'];

        $this->assertSame('taken', $morningCell['tone']);
        $this->assertNotSame('—', $morningCell['text']);
        $this->assertSame('—', $eveningCell['text']);
        $this->assertSame('not_taken', $eveningCell['tone']);
    }
}
