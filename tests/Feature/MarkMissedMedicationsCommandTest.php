<?php

namespace Tests\Feature;

use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class MarkMissedMedicationsCommandTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createFacilityAndBranch();
    }

    public function test_force_rerun_does_not_duplicate_existing_missed_slot(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-16 12:00:00', config('app.timezone')));

        $resident = Resident::factory()->create([
            'branch_id' => $this->branch->id,
        ]);

        $creator = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'administrator',
            'is_active' => true,
        ]);

        $medication = Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'name' => 'Morning Tablet',
            'instructions' => 'daily',
            'time_1' => '08:00:00',
            'created_by' => $creator->id,
            'is_active' => true,
            'start_date' => '2026-01-01',
            'created_at' => Carbon::parse('2026-04-14 08:00:00', config('app.timezone')),
            'updated_at' => Carbon::parse('2026-04-14 08:00:00', config('app.timezone')),
        ]);

        $this->artisan('medications:mark-missed', ['--date' => '2026-04-15'])
            ->assertExitCode(0);

        $this->artisan('medications:mark-missed', [
            '--date' => '2026-04-15',
            '--force' => true,
        ])->assertExitCode(0);

        $this->assertSame(1, MedicationAdministration::query()
            ->where('medication_id', $medication->id)
            ->where('status', 'missed')
            ->whereBetween('administered_at', [
                Carbon::parse('2026-04-15 07:55:00', config('app.timezone')),
                Carbon::parse('2026-04-15 08:05:00', config('app.timezone')),
            ])
            ->count());

        Carbon::setTestNow();
    }

    public function test_instruction_only_morning_medication_is_marked_missed_after_window_closes(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-16 09:30:00', config('app.timezone')));

        $resident = Resident::factory()->create([
            'branch_id' => $this->branch->id,
        ]);

        $creator = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'administrator',
            'is_active' => true,
        ]);

        $medication = Medication::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'name' => 'Instruction Only Morning Tablet',
            'instructions' => 'a.m',
            'created_by' => $creator->id,
            'is_active' => true,
            'start_date' => '2026-01-01',
        ]);
        $medication->forceFill([
            'created_at' => Carbon::parse('2026-04-15 08:00:00', config('app.timezone')),
            'updated_at' => Carbon::parse('2026-04-15 08:00:00', config('app.timezone')),
        ])->save();

        $this->artisan('medications:mark-missed', ['--date' => '2026-04-16'])
            ->assertExitCode(0);

        $missedAdministrations = MedicationAdministration::query()
            ->where('medication_id', $medication->id)
            ->where('status', 'missed')
            ->get();

        $this->assertCount(1, $missedAdministrations);
        $this->assertTrue($missedAdministrations->first()->administered_at->eq(
            Carbon::parse('2026-04-16 08:00:00', config('app.timezone'))
        ));

        Carbon::setTestNow();
    }
}
