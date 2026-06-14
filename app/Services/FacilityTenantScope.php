<?php

namespace App\Services;

/**
 * Resolved IDs for a single facility (shared DB multi-tenant export/delete).
 */
final class FacilityTenantScope
{
    /**
     * @param  array<int>  $branchIds
     * @param  array<int>  $residentIds
     * @param  array<int>  $userIds  Users tied to this facility (facility_id or branch staff)
     */
    public function __construct(
        public int $facilityId,
        public array $branchIds,
        public array $residentIds,
        public array $userIds,
    ) {}

    public function hasBranches(): bool
    {
        return $this->branchIds !== [];
    }

    public function hasResidents(): bool
    {
        return $this->residentIds !== [];
    }

    public function hasUsers(): bool
    {
        return $this->userIds !== [];
    }
}
