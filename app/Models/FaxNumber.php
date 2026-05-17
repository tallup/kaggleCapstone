<?php

namespace App\Models;

use App\Models\Scopes\FacilityScope;
use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class FaxNumber extends Model
{
    use Loggable, SoftDeletes;

    protected static function booted(): void
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $fillable = [
        'facility_id',
        'provider',
        'provider_number_id',
        'e164_number',
        'friendly_name',
        'is_default',
        'is_active',
        'monthly_cost_cents',
        'provisioned_at',
        'released_at',
        'created_by',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'monthly_cost_cents' => 'integer',
        'provisioned_at' => 'datetime',
        'released_at' => 'datetime',
    ];

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function outboundFaxes(): HasMany
    {
        return $this->hasMany(Fax::class, 'from_number_id')->where('direction', 'outbound');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }
}
