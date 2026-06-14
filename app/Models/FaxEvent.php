<?php

namespace App\Models;

use App\Models\Scopes\FacilityScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaxEvent extends Model
{
    protected static function booted(): void
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $fillable = [
        'fax_id',
        'facility_id',
        'event_type',
        'event_payload',
        'provider_event_id',
        'received_at',
    ];

    protected $casts = [
        'event_payload' => 'array',
        'received_at' => 'datetime',
    ];

    public function fax(): BelongsTo
    {
        return $this->belongsTo(Fax::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }
}
