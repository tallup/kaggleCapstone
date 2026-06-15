<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Resident;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class DashboardOccupancyTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
    }

    private function fetchOccupancyRate(): float
    {
        $admin = $this->createAndActAs('administrator');

        $response = $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/dashboard/stats');

        $response->assertOk();

        return (float) $response->json('data.occupancy_rate');
    }

    public function test_occupancy_is_zero_when_no_branch_capacities_configured(): void
    {
        $this->createResident();

        $this->assertSame(0.0, $this->fetchOccupancyRate());
    }

    public function test_occupancy_uses_sum_of_branch_capacities(): void
    {
        $branchA = Branch::withoutGlobalScopes()->create([
            'name' => 'Branch A',
            'facility_id' => $this->facility->id,
            'is_active' => true,
            'resident_capacity' => 6,
        ]);

        $branchB = Branch::withoutGlobalScopes()->create([
            'name' => 'Branch B',
            'facility_id' => $this->facility->id,
            'is_active' => true,
            'resident_capacity' => 4,
        ]);

        $this->branch->update(['resident_capacity' => null]);

        Resident::withoutGlobalScopes()->create([
            'name' => 'Resident One',
            'first_name' => 'Resident',
            'last_name' => 'One',
            'branch_id' => $branchA->id,
            'date_of_birth' => '1950-01-01',
            'gender' => 'female',
            'admission_date' => '2024-01-01',
            'is_active' => true,
            'status' => 'active',
        ]);

        Resident::withoutGlobalScopes()->create([
            'name' => 'Resident Two',
            'first_name' => 'Resident',
            'last_name' => 'Two',
            'branch_id' => $branchB->id,
            'date_of_birth' => '1951-02-02',
            'gender' => 'male',
            'admission_date' => '2024-01-01',
            'is_active' => true,
            'status' => 'active',
        ]);

        for ($i = 3; $i <= 5; $i++) {
            Resident::withoutGlobalScopes()->create([
                'name' => "Resident {$i}",
                'first_name' => 'Resident',
                'last_name' => (string) $i,
                'branch_id' => $branchA->id,
                'date_of_birth' => '1952-03-03',
                'gender' => 'female',
                'admission_date' => '2024-01-01',
                'is_active' => true,
                'status' => 'active',
            ]);
        }

        $this->assertSame(50.0, $this->fetchOccupancyRate());
    }

    public function test_occupancy_is_capped_at_one_hundred_percent(): void
    {
        $this->branch->update(['resident_capacity' => 10]);

        for ($i = 1; $i <= 11; $i++) {
            Resident::withoutGlobalScopes()->create([
                'name' => "Resident {$i}",
                'first_name' => 'Resident',
                'last_name' => (string) $i,
                'branch_id' => $this->branch->id,
                'date_of_birth' => '1950-01-01',
                'gender' => 'female',
                'admission_date' => '2024-01-01',
                'is_active' => true,
                'status' => 'active',
            ]);
        }

        $this->assertSame(100.0, $this->fetchOccupancyRate());
    }

    public function test_occupancy_updates_after_branch_capacity_change_clears_cache(): void
    {
        $this->createResident();

        $this->assertSame(0.0, $this->fetchOccupancyRate());

        $this->branch->update(['resident_capacity' => 10]);

        $this->assertSame(10.0, $this->fetchOccupancyRate());
    }
}
