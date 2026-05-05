<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Hash;
use App\Models\Notification;
use App\Notifications\PasswordResetLinkNotification;
use App\Traits\Loggable;
use App\Traits\FormatsPhoneNumbers;

class User extends Authenticatable implements FilamentUser
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, Loggable, FormatsPhoneNumbers;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'profile_image',
        'first_name',
        'middle_names',
        'last_name',
        'phone_number',
        'date_of_birth',
        'marital_status',
        'sex',
        'position',
        'credentials',
        'credential_details',
        'date_employed',
        'supervisor_name',
        'provider_name',
        'role',
        'facility_id',
        'assigned_branch_id',
        'is_active',
        'location_check_bypass',
        'hire_date',
        'notes',
        'password',
        'clock_pin',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = ['profile_image_url', 'is_caregiver', 'is_any_admin', 'is_facility_administrator', 'is_branch_admin'];


    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'date_of_birth' => 'date',
            'date_employed' => 'date',
            'hire_date' => 'date',
            'is_active' => 'boolean',
            'location_check_bypass' => 'boolean',
            'clock_pin' => 'hashed',
        ];
    }

    /**
     * Check if user can access Filament panel
     */
    public function canAccessPanel(Panel $panel): bool
    {
        // Super admins can always access
        if ($this->role === 'super_admin') {
            return $this->is_active;
        }

        // Other users need permission and must belong to a facility
        return $this->is_active 
            && $this->hasPermission('view_admin_panel')
            && $this->facility_id !== null;
    }

    /**
     * Get the current facility context for this user
     */
    public function getCurrentFacility(): ?Facility
    {
        if ($this->role === 'super_admin') {
            // Super admins can access any facility via context
            // This will be set by middleware
            return null;
        }

        return $this->facility;
    }

    /**
     * Get the full URL for the profile image
     */
    public function getProfileImageUrlAttribute()
    {
        // Use null coalescing with explicit parentheses to avoid PHP notices
        // when the key isn't selected in lightweight queries (e.g., select id,name).
        $raw = ($this->attributes['profile_image'] ?? null);
        if (!$raw) {
            return null;
        }

        $value = $raw;

        // If already a full URL, return as is
        if (filter_var($value, FILTER_VALIDATE_URL)) {
            return $value;
        }

        // Return the storage URL
        return Storage::disk('public')->url($value);
    }

    // Relationships
    public function notifications()
    {
        return $this->hasMany(Notification::class)->latest();
    }

    public function unreadNotifications()
    {
        return $this->hasMany(Notification::class)->where('is_read', false)->latest();
    }

    public function reminders()
    {
        return $this->hasMany(Reminder::class);
    }

    public function reminderEvents()
    {
        return $this->hasManyThrough(ReminderEvent::class, Reminder::class);
    }

    public function assignedBranch()
    {
        return $this->belongsTo(Branch::class, 'assigned_branch_id');
    }

    public function facility()
    {
        return $this->belongsTo(Facility::class);
    }

    public function assignments()
    {
        return $this->hasMany(Assignment::class, 'caregiver_id');
    }

    public function activeAssignments()
    {
        return $this->assignments()->active();
    }

    public function leaveRequests()
    {
        return $this->hasMany(LeaveRequest::class, 'staff_id');
    }

    public function approvedLeaveRequests()
    {
        return $this->hasMany(LeaveRequest::class, 'approved_by');
    }

    public function vitalSigns()
    {
        return $this->hasMany(VitalSign::class, 'taken_by');
    }

    public function assessments()
    {
        return $this->hasMany(Assessment::class, 'assessor_id');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class, 'created_by');
    }

    public function clockIns()
    {
        return $this->hasMany(StaffClockIn::class, 'staff_id');
    }

    public function activeClockIn()
    {
        return $this->hasOne(StaffClockIn::class, 'staff_id')->where('is_active', true);
    }

    public function residentContacts()
    {
        return $this->hasMany(ResidentContact::class);
    }

    public function isFamily(): bool
    {
        $role = $this->role ? strtolower(trim($this->role)) : '';
        if ($role === 'family' || $role === 'family_member') {
            return true;
        }
        return $this->hasRole('family') || $this->hasRole('family_member');
    }

    public function roles()
    {
        return $this->morphToMany(Role::class, 'model', 'model_has_roles');
    }

    public function hasRole(string $role): bool
    {
        return $this->roles()->where('name', $role)->exists();
    }

    public function assignRole(string $role): void
    {
        $roleModel = Role::where('name', $role)->first();
        if ($roleModel) {
            $this->roles()->syncWithoutDetaching([$roleModel->id]);
        }
    }

    public function removeRole(string $role): void
    {
        $roleModel = Role::where('name', $role)->first();
        if ($roleModel) {
            $this->roles()->detach($roleModel->id);
        }
    }

    /**
     * Roles for permission checks: Spatie pivot when present, otherwise legacy `users.role` mapped to `roles` table.
     *
     * @return \Illuminate\Support\Collection<int, Role>
     */
    public function rolesForPermissionResolution(): \Illuminate\Support\Collection
    {
        if ($this->relationLoaded('roles') && $this->roles->isNotEmpty()) {
            return $this->roles->loadMissing('permissions');
        }

        $roles = $this->roles()->with('permissions')->get();
        if ($roles->isNotEmpty()) {
            return $roles;
        }

        $raw = $this->role ? strtolower(trim((string) $this->role)) : '';
        if ($raw === '') {
            return collect();
        }

        $aliases = [
            'care_giver' => 'caregiver',
            'registered_nurse' => 'nurse',
            'licensed_nurse' => 'nurse',
            'rn' => 'nurse',
        ];
        $name = $aliases[$raw] ?? $raw;

        $role = Role::where('name', $name)->first()
            ?? Role::where('name', $raw)->first();

        if (! $role) {
            return collect();
        }

        return collect([$role->load('permissions')]);
    }

    public function hasPermission(string $permission): bool
    {
        // Both administrator and admin bypass permission checks
        // But they have different data access scopes (handled elsewhere)
        $adminRoles = ['super_admin', 'administrator', 'admin'];
        if (in_array($this->role, $adminRoles) || $this->roles()->whereIn('name', $adminRoles)->exists()) {
            return true;
        }

        $userRoles = $this->rolesForPermissionResolution();

        if ($userRoles->isEmpty()) {
            return false;
        }

        // Check facility-specific role permissions first (if user has a facility)
        if ($this->facility_id && $this->facility) {
            foreach ($userRoles as $role) {
                $facilityOverride = $this->facility->rolePermissions()
                    ->where('role_id', $role->id)
                    ->whereHas('permission', function ($query) use ($permission) {
                        $query->where('name', $permission);
                    })
                    ->first();
                
                if ($facilityOverride) {
                    // Facility-specific override exists, use it
                    if ($facilityOverride->is_allowed) {
                        // Permission is allowed, check module access
                        return $this->checkModuleAccessForPermission($permission);
                    } else {
                        // Permission is explicitly denied
                        return false;
                    }
                }
            }
        }

        // Fall back to global role permissions
        $hasGlobalRolePermission = $userRoles->contains(function ($role) use ($permission) {
            return $role->permissions()->where('name', $permission)->exists();
        });

        if (!$hasGlobalRolePermission) {
            return false;
        }

        // Check module access
        return $this->checkModuleAccessForPermission($permission);
    }

    /**
     * Check module access for a permission
     */
    private function checkModuleAccessForPermission(string $permission): bool
    {
        // Check if this permission requires module access check
        $module = \App\Helpers\ModulePermissionMapper::getModuleForPermission($permission);
        
        if ($module === null) {
            // Permission doesn't map to a module, allow if role has permission
            return true;
        }

        // Check if user's facility has access to this module
        return $this->hasModuleAccess($module);
    }

    /**
     * Check if user has access to a module
     */
    public function hasModuleAccess(string $module): bool
    {
        // Super admins bypass facility module restrictions
        if ($this->role === 'super_admin' || $this->hasRole('super_admin')) {
            return true;
        }

        // Facility administrators have full module access within their facility
        if ($this->isFacilityAdministrator()) {
            return true;
        }

        // Branch admins have module access within their facility (but data scoped to branch)
        if ($this->isBranchAdmin()) {
            // Check if user's facility has access to this module
            if (!$this->facility_id || !$this->facility) {
                return false;
            }
            return $this->facility->hasModuleAccess($module);
        }

        // If user doesn't have a facility, deny access
        if (!$this->facility_id || !$this->facility) {
            return false;
        }

        return $this->facility->hasModuleAccess($module);
    }

    public function hasAnyRole(array $roles): bool
    {
        return $this->roles()->whereIn('name', $roles)->exists();
    }

    /**
     * Platform super admin — must not receive facility-originated notification emails.
     */
    public function isSuperAdmin(): bool
    {
        if ($this->role === 'super_admin') {
            return true;
        }

        return $this->hasRole('super_admin');
    }

    /**
     * Check if user is a facility administrator (sees all branches in facility)
     */
    public function isFacilityAdministrator(): bool
    {
        return $this->role === 'administrator' 
            || $this->hasRole('administrator');
    }

    /**
     * Check if user is a branch admin (sees only their assigned branch)
     */
    public function isBranchAdmin(): bool
    {
        return $this->role === 'admin' 
            || $this->hasRole('admin');
    }

    /**
     * Check if user is any type of admin (facility or branch)
     */
    public function isAnyAdmin(): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return $this->isFacilityAdministrator()
            || $this->isBranchAdmin()
            || $this->role === 'facility_admin'
            || $this->role === 'manager';
    }

    public function getIsAnyAdminAttribute(): bool
    {
        return $this->isAnyAdmin();
    }

    public function getIsFacilityAdministratorAttribute(): bool
    {
        return $this->isFacilityAdministrator();
    }

    public function getIsBranchAdminAttribute(): bool
    {
        return $this->isBranchAdmin();
    }


    // Scopes
    public function scopeCaregivers($query)
    {
        return $query->where('role', 'caregiver');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByBranch($query, $branchId)
    {
        return $query->where('assigned_branch_id', $branchId);
    }

    // Boot method to automatically set name field
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($user) {
            if (empty($user->name)) {
                $user->name = trim(implode(' ', array_filter([
                    $user->first_name,
                    $user->middle_names,
                    $user->last_name
                ]))) ?: $user->email;
            }
        });
        
        static::updating(function ($user) {
            if ($user->isDirty(['first_name', 'middle_names', 'last_name'])) {
                $user->name = trim(implode(' ', array_filter([
                    $user->first_name,
                    $user->middle_names,
                    $user->last_name
                ]))) ?: $user->email;
            }
        });
    }

    // Accessors
    public function getFullNameAttribute()
    {
        $parts = array_filter([
            $this->first_name,
            $this->middle_names,
            $this->last_name
        ]);
        return trim(implode(' ', $parts));
    }

    public function getNameAttribute()
    {
        return $this->attributes['name'] ?? $this->full_name ?: $this->email;
    }

    public function getIsCaregiverAttribute(): bool
    {
        return $this->isCaregiver();
    }

    /**
     * Check if user is a caregiver
     * 
     * @return bool
     */
    public function isCaregiver(): bool
    {
        $roleValue = $this->role ? strtolower(trim($this->role)) : null;
        if ($roleValue) {
            $normalized = str_replace([' ', '_'], '', $roleValue);
            if ($normalized === 'caregiver') {
                return true;
            }
        }

        if ($this->position && strcasecmp(trim($this->position), 'caregiver') === 0) {
            return true;
        }

        if (method_exists($this, 'hasAnyRole')) {
            if ($this->hasAnyRole(['caregiver', 'care_giver', 'Care Giver'])) {
                return true;
            }
        }

        return false;
    }

    // Get pending leave requests count for notifications
    public function getPendingLeaveRequestsCountAttribute(): int
    {
        return $this->leaveRequests()->where('status', 'pending')->count();
    }

    // Static methods for dropdown options
    public static function getMaritalStatusOptions()
    {
        return [
            'single' => 'Single',
            'married' => 'Married',
            'divorced' => 'Divorced',
            'widowed' => 'Widowed',
            'separated' => 'Separated',
            'n/a' => 'N/A',
        ];
    }

    public static function getPositionOptions()
    {
        return [
            'caregiver' => 'Caregiver',
            'nurse' => 'Nurse',
            'supervisor' => 'Supervisor',
            'administrator' => 'Administrator',
            'manager' => 'Manager',
            'support_staff' => 'Support Staff',
        ];
    }

    public static function getRoleOptions()
    {
        return [
            'administrator' => 'Administrator (Facility-wide)',
            'admin' => 'Admin (Branch-level)',
            'care_giver' => 'Care Giver',
            'registered_nurse' => 'Registered Nurse',
            'licensed_nurse' => 'Licensed Nurse',
            'manager' => 'Manager',
            'support_staff' => 'Support Staff',
        ];
    }

    public static function getSexOptions()
    {
        return [
            'male' => 'Male',
            'female' => 'Female',
            'other' => 'Other',
        ];
    }

    protected function phoneNumber(): Attribute
    {
        return $this->phoneAttribute();
    }

    /**
     * Verify clock PIN for public clock-in
     */
    public function verifyClockPin(?string $pin): bool
    {
        if (!$this->clock_pin) {
            // If no PIN is set, allow clock-in without PIN
            return true;
        }

        if (!$pin) {
            return false;
        }

        return Hash::check($pin, $this->clock_pin);
    }

    /**
     * Send password reset notification with SPA reset URL.
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new PasswordResetLinkNotification($token));
    }

    /**
     * Check if user has an active clock-in
     */
    public function hasActiveClockIn(): bool
    {
        return $this->clockIns()->where('is_active', true)->exists();
    }
}
