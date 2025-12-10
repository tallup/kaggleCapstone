<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\Loggable;
use App\Models\Scopes\FacilityScope;

class MedicationDelivery extends Model
{
    use Loggable;

    protected static function booted()
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $fillable = [
        'resident_id',
        'branch_id',
        'medication_id',
        'received_by',
        'received_date',
        'received_time',
        'pharmacy_name',
        'quantity_received',
        'delivery_type',
        'notes',
        'status',
    ];

    protected $casts = [
        'received_date' => 'date',
        'received_time' => 'string',
    ];

    // Relationships
    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function medication(): BelongsTo
    {
        return $this->belongsTo(Medication::class);
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    // Scopes
    public function scopeIndividualDeliveries($query)
    {
        return $query->where('delivery_type', 'individual');
    }

    public function scopeBatchDeliveries($query)
    {
        return $query->where('delivery_type', 'batch');
    }
}
