<?php

namespace App\Models;

use App\Models\Scopes\FacilityScope;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class FaxContact extends Model
{
    use Loggable, SoftDeletes;

    public const TYPES = [
        'pharmacy' => 'Pharmacy',
        'physician' => 'Physician',
        'agency' => 'Agency',
        'family' => 'Family',
        'other' => 'Other',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $fillable = [
        'facility_id',
        'name',
        'organization',
        'fax_e164',
        'phone',
        'email',
        'address',
        'contact_type',
        'notes',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function faxes(): HasMany
    {
        return $this->hasMany(Fax::class, 'contact_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
