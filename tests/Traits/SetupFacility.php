<?php

namespace Tests\Traits;

use App\Models\Branch;
use App\Models\Facility;
use App\Models\Resident;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

trait SetupFacility
{
    protected Facility $facility;
    protected Branch $branch;

    protected function createFacilityAndBranch(?string $facilityName = null): array
    {
        $this->facility = Facility::factory()->create(
            $facilityName ? ['name' => $facilityName] : []
        );

        $this->branch = Branch::factory()->create([
            'facility_id' => $this->facility->id,
        ]);

        return [$this->facility, $this->branch];
    }

    protected function createAndActAs(string $role = 'administrator', ?Facility $facility = null, ?Branch $branch = null): User
    {
        $facility = $facility ?? $this->facility;
        $branch = $branch ?? $this->branch;

        $user = User::factory()->create([
            'facility_id' => $facility->id,
            'assigned_branch_id' => $branch->id,
            'role' => $role,
            'is_active' => true,
        ]);

        Sanctum::actingAs($user, ['*']);

        app()->instance('facility', $facility);

        return $user;
    }

    protected function createResident(?Branch $branch = null): Resident
    {
        $branch = $branch ?? $this->branch;

        return Resident::withoutGlobalScopes()->create([
            'name' => fake()->name(),
            'first_name' => fake()->firstName(),
            'last_name' => fake()->lastName(),
            'branch_id' => $branch->id,
            'date_of_birth' => '1950-01-15',
            'gender' => 'female',
            'admission_date' => '2024-01-01',
            'is_active' => true,
            'status' => 'active',
        ]);
    }
}
