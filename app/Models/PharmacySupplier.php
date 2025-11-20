<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\Loggable;

class PharmacySupplier extends Model
{
    use SoftDeletes, Loggable;

    protected $fillable = [
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'city',
        'state',
        'zip',
        'fax',
        'license_number',
        'notes',
        'is_active',
        'default_discount',
        'payment_terms_days',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'default_discount' => 'decimal:2',
        'payment_terms_days' => 'integer',
    ];

    // Relationships
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(PharmacyOrder::class, 'supplier_id');
    }

    public function stockLots(): HasMany
    {
        return $this->hasMany(PharmacyStockLot::class, 'supplier_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Accessors
    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address,
            $this->city,
            $this->state ? ($this->zip ? "{$this->state} {$this->zip}" : $this->state) : null,
        ]);

        return implode(', ', $parts) ?: '';
    }
}


