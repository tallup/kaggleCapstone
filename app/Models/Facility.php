<?php

namespace App\Models;

use App\Traits\FormatsPhoneNumbers;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Cashier\Billable;

class Facility extends Model
{
    use Billable, HasFactory, Loggable, SoftDeletes;
    use FormatsPhoneNumbers;

    protected $fillable = [
        'name',
        'location',
        'description',
        'address',
        'phone',
        'email',
        'brochure_url',
        'brochure_color',
        'logo',
        'primary_color',
        'secondary_color',
        'accent_color',
        'subdomain',
        'provider_code',
        'registration_status',
        'registered_by_user_id',
        'is_active',
        'latitude',
        'longitude',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    protected $appends = ['logo_url', 'branding'];

    // Relationships
    public function branches()
    {
        return $this->hasMany(Branch::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'registered_by_user_id');
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function registrations()
    {
        return $this->hasMany(FacilityRegistration::class, 'facility_name', 'name');
    }

    public function modules()
    {
        return $this->hasMany(FacilityModule::class);
    }

    public function rolePermissions()
    {
        return $this->hasMany(FacilityRolePermission::class);
    }

    /**
     * Check if facility has access to a module
     */
    public function hasModuleAccess(string $module): bool
    {
        $moduleRecord = $this->modules()->where('module', $module)->first();

        // If no record exists, default to enabled (backward compatibility)
        if (! $moduleRecord) {
            return true;
        }

        return $moduleRecord->is_enabled;
    }

    /**
     * Enable a module for this facility
     */
    public function enableModule(string $module): void
    {
        $this->modules()->updateOrCreate(
            ['module' => $module],
            ['is_enabled' => true]
        );
    }

    /**
     * Disable a module for this facility
     */
    public function disableModule(string $module): void
    {
        $this->modules()->updateOrCreate(
            ['module' => $module],
            ['is_enabled' => false]
        );
    }

    /**
     * Sync modules for this facility
     */
    public function syncModules(array $modules): void
    {
        foreach ($modules as $module => $enabled) {
            if ($enabled) {
                $this->enableModule($module);
            } else {
                $this->disableModule($module);
            }
        }
    }

    /**
     * Get effective role permissions for this facility (facility-specific + global)
     */
    public function getEffectiveRolePermissions(int $roleId): array
    {
        $role = Role::findOrFail($roleId);

        // Get global role permissions
        $globalPermissions = $role->permissions()->pluck('permissions.id', 'permissions.name')->toArray();

        // Get facility-specific overrides
        $facilityOverrides = $this->rolePermissions()
            ->where('role_id', $roleId)
            ->with('permission')
            ->get()
            ->keyBy(function ($item) {
                return $item->permission->name;
            });

        // Merge: facility overrides take precedence
        $effectivePermissions = $globalPermissions;
        foreach ($facilityOverrides as $permissionName => $override) {
            if ($override->is_allowed) {
                $effectivePermissions[$permissionName] = $override->permission_id;
            } else {
                // Remove permission if explicitly denied
                unset($effectivePermissions[$permissionName]);
            }
        }

        return $effectivePermissions;
    }

    /**
     * Set a role permission for this facility
     */
    public function setRolePermission(int $roleId, int $permissionId, bool $isAllowed = true): void
    {
        $this->rolePermissions()->updateOrCreate(
            [
                'role_id' => $roleId,
                'permission_id' => $permissionId,
            ],
            [
                'is_allowed' => $isAllowed,
            ]
        );
    }

    /**
     * Sync role permissions for this facility
     */
    public function syncRolePermissions(int $roleId, array $permissionNames): void
    {
        // Get global role permissions
        $role = Role::findOrFail($roleId);
        $globalPermissionNames = $role->permissions()->pluck('permissions.name')->toArray();

        // Get all permissions by name
        $allPermissions = Permission::whereIn('name', array_merge($permissionNames, $globalPermissionNames))->get()->keyBy('name');

        // Remove all existing overrides for this role
        $this->rolePermissions()->where('role_id', $roleId)->delete();

        // Create overrides for permissions that differ from global
        foreach ($allPermissions as $permissionName => $permission) {
            $isInGlobal = in_array($permissionName, $globalPermissionNames);
            $isInRequested = in_array($permissionName, $permissionNames);

            // Only create override if it differs from global
            if ($isInRequested && ! $isInGlobal) {
                // Permission is granted but not in global
                $this->rolePermissions()->create([
                    'role_id' => $roleId,
                    'permission_id' => $permission->id,
                    'is_allowed' => true,
                ]);
            } elseif (! $isInRequested && $isInGlobal) {
                // Permission is denied but exists in global
                $this->rolePermissions()->create([
                    'role_id' => $roleId,
                    'permission_id' => $permission->id,
                    'is_allowed' => false,
                ]);
            }
        }
    }

    /**
     * Check if facility has a role permission override
     */
    public function hasRolePermissionOverride(int $roleId, int $permissionId): bool
    {
        return $this->rolePermissions()
            ->where('role_id', $roleId)
            ->where('permission_id', $permissionId)
            ->exists();
    }

    /**
     * Get role permissions for this facility
     */
    public function getRolePermissions(int $roleId): array
    {
        return $this->rolePermissions()
            ->where('role_id', $roleId)
            ->with('permission')
            ->get()
            ->map(function ($item) {
                return [
                    'permission_id' => $item->permission_id,
                    'permission_name' => $item->permission->name,
                    'is_allowed' => $item->is_allowed,
                ];
            })
            ->toArray();
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Accessors
    public function getBranchCountAttribute()
    {
        return $this->branches()->count();
    }

    protected function phone(): Attribute
    {
        return $this->phoneAttribute();
    }

    // Accessors
    public function getLogoUrlAttribute()
    {
        if (! $this->logo) {
            return null;
        }

        // If already a full URL, return as is
        if (filter_var($this->logo, FILTER_VALIDATE_URL)) {
            return $this->logo;
        }

        // Return the storage URL (uses APP_URL from filesystem config)
        return \Illuminate\Support\Facades\Storage::disk('public')->url($this->logo);
    }

    public function getBrandingAttribute()
    {
        return [
            'logo' => $this->logo_url ?? asset('images/logonew.png'),
            'primary_color' => $this->primary_color ?? '#1E3A5F',
            'secondary_color' => $this->secondary_color ?? '#86EFAC',
            'accent_color' => $this->accent_color ?? '#FFFFFF',
            'name' => $this->name,
        ];
    }

    /**
     * Check if facility has valid coordinates
     */
    public function hasCoordinates(): bool
    {
        return $this->latitude !== null
            && $this->longitude !== null
            && $this->latitude >= -90 && $this->latitude <= 90
            && $this->longitude >= -180 && $this->longitude <= 180;
    }

    /**
     * @return array<string, string>
     */
    public function stripeMetadata(): ?array
    {
        return [
            'facility_id' => (string) $this->getKey(),
            'app' => (string) config('app.name'),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function stripeAddress(): array
    {
        if (empty($this->address)) {
            return [];
        }

        return [
            'line1' => mb_substr((string) $this->address, 0, 500),
            'country' => 'US',
        ];
    }
}
