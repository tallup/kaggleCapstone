<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Resident;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class FacilityTenantScopeResolver
{
    /**
     * Resolve branch, resident, and user IDs for facility-scoped backup/delete.
     */
    public function resolve(int $facilityId): FacilityTenantScope
    {
        $branchIds = Branch::withoutGlobalScopes()
            ->where('facility_id', $facilityId)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        $residentIds = [];
        if ($branchIds !== []) {
            $residentIds = Resident::withoutGlobalScopes()
                ->whereIn('branch_id', $branchIds)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->values()
                ->all();
        }

        $userIds = User::withoutGlobalScopes()
            ->where(function ($q) use ($facilityId, $branchIds) {
                $q->where('facility_id', $facilityId);
                if ($branchIds !== []) {
                    $q->orWhereIn('assigned_branch_id', $branchIds);
                }
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();

        return new FacilityTenantScope($facilityId, $branchIds, $residentIds, $userIds);
    }

    /**
     * Whether a table exists (optional tables in manifest).
     */
    public static function tableExists(string $table): bool
    {
        return DB::getSchemaBuilder()->hasTable($table);
    }
}
