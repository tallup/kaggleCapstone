<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Facility;
use App\Models\Resident;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BranchResidentTransferAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_caregiver_cannot_transfer_residents_even_within_own_branch_facility(): void
    {
        [$facility, $sourceBranch, $targetBranch] = $this->createFacilityWithBranches();
        $resident = Resident::factory()->create(['branch_id' => $sourceBranch->id]);
        $caregiver = $this->createUserForBranch('caregiver', $facility, $sourceBranch);

        Sanctum::actingAs($caregiver, ['*']);
        app()->instance('facility', $facility);

        $response = $this->postJson("/api/v1/branches/{$sourceBranch->id}/transfer-residents", [
            'resident_ids' => [$resident->id],
            'target_branch_id' => $targetBranch->id,
        ]);

        $response->assertForbidden();
        $this->assertSame($sourceBranch->id, Resident::withoutGlobalScopes()->findOrFail($resident->id)->branch_id);
    }

    public function test_branch_admin_cannot_transfer_residents_from_another_branch(): void
    {
        [$facility, $assignedBranch, $sourceBranch] = $this->createFacilityWithBranches();
        $resident = Resident::factory()->create(['branch_id' => $sourceBranch->id]);
        $branchAdmin = $this->createUserForBranch('admin', $facility, $assignedBranch);

        Sanctum::actingAs($branchAdmin, ['*']);
        app()->instance('facility', $facility);

        $response = $this->postJson("/api/v1/branches/{$sourceBranch->id}/transfer-residents", [
            'resident_ids' => [$resident->id],
            'target_branch_id' => $assignedBranch->id,
        ]);

        $response->assertForbidden();
        $this->assertSame($sourceBranch->id, Resident::withoutGlobalScopes()->findOrFail($resident->id)->branch_id);
    }

    public function test_facility_administrator_can_transfer_residents_within_same_facility(): void
    {
        [$facility, $sourceBranch, $targetBranch] = $this->createFacilityWithBranches();
        $resident = Resident::factory()->create(['branch_id' => $sourceBranch->id]);
        $administrator = $this->createUserForBranch('administrator', $facility, $sourceBranch);

        Sanctum::actingAs($administrator, ['*']);
        app()->instance('facility', $facility);

        $response = $this->postJson("/api/v1/branches/{$sourceBranch->id}/transfer-residents", [
            'resident_ids' => [$resident->id],
            'target_branch_id' => $targetBranch->id,
        ]);

        $response->assertOk()
            ->assertJsonPath('data.transferred_count', 1);
        $this->assertSame($targetBranch->id, Resident::withoutGlobalScopes()->findOrFail($resident->id)->branch_id);
    }

    /**
     * @return array{Facility, Branch, Branch}
     */
    private function createFacilityWithBranches(): array
    {
        $facility = Facility::factory()->create();
        $firstBranch = Branch::factory()->create(['facility_id' => $facility->id]);
        $secondBranch = Branch::factory()->create(['facility_id' => $facility->id]);

        return [$facility, $firstBranch, $secondBranch];
    }

    private function createUserForBranch(string $role, Facility $facility, Branch $branch): User
    {
        return User::factory()->create([
            'facility_id' => $facility->id,
            'assigned_branch_id' => $branch->id,
            'role' => $role,
            'is_active' => true,
        ]);
    }
}
