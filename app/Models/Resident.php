<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\Loggable;
use App\Traits\FormatsPhoneNumbers;
use App\Models\Scopes\FacilityScope;

class Resident extends Model
{
    use HasFactory, Loggable;
    use FormatsPhoneNumbers;

    protected static function booted()
    {
        static::addGlobalScope(new FacilityScope);
    }
    protected $fillable = [
        'name',
        'first_name',
        'middle_names',
        'last_name',
        'date_of_birth',
        'gender',
        'phone',
        'room',
        'room_number',
        'cart',
        'branch_id',
        'emergency_contact_name',
        'emergency_contact_phone',
        'medical_conditions',
        'allergies',
        'medications',
        'diagnosis',
        'physician_name',
        'medicare_number',
        'primary_care_doctor',
        'pep_or_doctor',
        'dietary_restrictions',
        'code_status',
        'primary_language',
        'pharmacy_name',
        'general_medication_instructions',
        'mobility_notes',
        'behavioral_notes',
        'care_plan',
        'special_instructions',
        'notes',
        'admission_date',
        'discharge_date',
        'status',
        'is_active',
        'profile_image',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
        'admission_date' => 'date',
        'discharge_date' => 'date',
        'medical_conditions' => 'array',
        'allergies' => 'array',
        'medications' => 'array',
    ];

    protected $appends = ['profile_image_url'];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class);
    }

    public function vitalSigns(): HasMany
    {
        return $this->hasMany(VitalSign::class);
    }

    public function assessments(): HasMany
    {
        return $this->hasMany(Assessment::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function getProfileImageUrlAttribute(): ?string
    {
        if (!$this->profile_image) {
            return null;
        }

        if (filter_var($this->profile_image, FILTER_VALIDATE_URL)) {
            return $this->profile_image;
        }

        return \Storage::disk('public')->url($this->profile_image);
    }

    public function sleepPatterns(): HasMany
    {
        return $this->hasMany(SleepPattern::class);
    }

    public function sleepRecords(): HasMany
    {
        return $this->hasMany(SleepRecord::class);
    }

    public function medicationAdministrations(): HasMany
    {
        return $this->hasMany(MedicationAdministration::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ResidentDocument::class);
    }

    public function tLogs(): HasMany
    {
        return $this->hasMany(TLog::class);
    }

    public function residentContacts(): HasMany
    {
        return $this->hasMany(ResidentContact::class);
    }

    /**
     * Medication orders (medications table). Named medicationOrders to avoid clashing with the
     * legacy `residents.medications` text column, which would otherwise shadow this relationship.
     */
    public function medicationOrders(): HasMany
    {
        return $this->hasMany(Medication::class);
    }

    protected function phone(): Attribute
    {
        return $this->phoneAttribute();
    }

    protected function emergencyContactPhone(): Attribute
    {
        return $this->phoneAttribute();
    }
}