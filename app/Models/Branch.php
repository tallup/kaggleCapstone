<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\Loggable;
use App\Traits\FormatsPhoneNumbers;
use App\Models\Scopes\FacilityScope;
use Illuminate\Support\Facades\Cache;

class Branch extends Model
{
    use HasFactory, SoftDeletes, Loggable;
    use FormatsPhoneNumbers;

    protected static function booted()
    {
        static::addGlobalScope(new FacilityScope);

        // Clear facility branch cache when branch is created, updated, or deleted
        static::saved(function ($branch) {
            if ($branch->facility_id) {
                Cache::forget("facility.{$branch->facility_id}.branches");
            }
        });

        static::deleted(function ($branch) {
            if ($branch->facility_id) {
                Cache::forget("facility.{$branch->facility_id}.branches");
            }
        });
    }

    protected $fillable = [
        'name',
        'address',
        'facility_id',
        'phone',
        'email',
        'is_active',
        'latitude',
        'longitude',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    // Relationships
    public function facility()
    {
        return $this->belongsTo(Facility::class);
    }

    public function caregivers()
    {
        return $this->hasMany(User::class, 'assigned_branch_id');
    }

    public function residents()
    {
        return $this->hasMany(Resident::class);
    }

    public function assignments()
    {
        return $this->hasMany(Assignment::class);
    }

    public function tLogs()
    {
        return $this->hasMany(TLog::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Accessors
    public function getCaregiverCountAttribute()
    {
        return $this->caregivers()->count();
    }

    public function getResidentCountAttribute()
    {
        return $this->residents()->count();
    }

    protected function phone(): Attribute
    {
        return $this->phoneAttribute();
    }

    /**
     * Check if branch has valid coordinates
     * 
     * @return bool
     */
    public function hasCoordinates(): bool
    {
        return $this->latitude !== null 
            && $this->longitude !== null
            && $this->latitude >= -90 && $this->latitude <= 90
            && $this->longitude >= -180 && $this->longitude <= 180;
    }
}