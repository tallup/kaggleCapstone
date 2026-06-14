<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class FacilityScope implements Scope
{
    private static array $columnCache = [];

    private function tableHasColumn(Model $model, string $column): bool
    {
        $table = $model->getTable();
        $key = "{$table}.{$column}";

        if (!isset(static::$columnCache[$key])) {
            static::$columnCache[$key] = $model->getConnection()
                ->getSchemaBuilder()->hasColumn($table, $column);
        }

        return static::$columnCache[$key];
    }

    /**
     * Apply the scope to a given Eloquent query builder.
     *
     * Data visibility rules:
     *   super_admin        → no scope (sees everything)
     *   administrator      → scoped to their facility (all branches)
     *   admin (branch)     → scoped to their facility AND their assigned branch
     *   caregiver / nurse  → scoped to their facility (branch further filtered by assignment)
     */
    public function apply(Builder $builder, Model $model): void
    {
        // Never apply scope to User model to prevent infinite recursion during auth
        if ($model instanceof \App\Models\User) {
            return;
        }

        $user = Auth::user();

        // Super admins can see all data (no scope applied)
        if ($user && $user->role === 'super_admin') {
            return;
        }

        // Get facility from app container (set by middleware)
        try {
            $facility = app()->bound('facility') ? app('facility') : null;
        } catch (\Exception $e) {
            $facility = null;
        }

        $facilityId = $facility?->id ?? ($user?->facility_id ?: null);

        if (!$facilityId) {
            return;
        }

        // ── Facility-level scope ──────────────────────────────────────────────
        if ($this->tableHasColumn($model, 'facility_id')) {
            $builder->where('facility_id', $facilityId);
        } elseif ($this->tableHasColumn($model, 'branch_id')) {
            $builder->whereHas('branch', function ($query) use ($facilityId) {
                $query->where('facility_id', $facilityId);
            });
        } elseif ($this->tableHasColumn($model, 'assigned_branch_id')) {
            $builder->whereHas('assignedBranch', function ($query) use ($facilityId) {
                $query->where('facility_id', $facilityId);
            });
        }

        // ── Branch-level scope (admin = branch-level role only) ────────────────
        // 'administrator' sees all branches in the facility (no further filter).
        // 'admin' sees only their assigned branch.
        if ($user && $user->role === 'admin' && $user->assigned_branch_id) {
            $branchId = $user->assigned_branch_id;

            if ($this->tableHasColumn($model, 'branch_id')) {
                $builder->where('branch_id', $branchId);
            } elseif ($this->tableHasColumn($model, 'assigned_branch_id')) {
                $builder->where('assigned_branch_id', $branchId);
            } elseif ($this->tableHasColumn($model, 'facility_id')) {
                // Table is facility-scoped only; further narrow via a branch relationship
                // if the model exposes one (e.g. residents → branch_id).
                // We only apply the extra filter when a branch_id column actually exists.
                // Otherwise facility scope is sufficient (e.g. FacilityRolePermission).
            }
        }
    }
}

