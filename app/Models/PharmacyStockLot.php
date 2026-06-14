<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\Loggable;
use Carbon\Carbon;

class PharmacyStockLot extends Model
{
    use SoftDeletes, Loggable;

    protected $fillable = [
        'pharmacy_inventory_id',
        'branch_id',
        'drug_id',
        'lot_number',
        'manufacture_date',
        'expiration_date',
        'quantity',
        'remaining_quantity',
        'unit_cost',
        'received_date',
        'received_by',
        'supplier_id',
        'notes',
    ];

    protected $casts = [
        'manufacture_date' => 'date',
        'expiration_date' => 'date',
        'quantity' => 'integer',
        'remaining_quantity' => 'integer',
        'unit_cost' => 'decimal:2',
        'received_date' => 'date',
    ];

    // Relationships
    public function pharmacyInventory(): BelongsTo
    {
        return $this->belongsTo(PharmacyInventory::class, 'pharmacy_inventory_id');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function drug(): BelongsTo
    {
        return $this->belongsTo(Drug::class);
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(PharmacySupplier::class, 'supplier_id')->withTrashed();
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PharmacyStockTransaction::class, 'stock_lot_id');
    }

    // Scopes
    public function scopeExpiringSoon($query, $days = 30)
    {
        $date = Carbon::now()->addDays($days);
        return $query->where('expiration_date', '<=', $date)
            ->where('expiration_date', '>', Carbon::now())
            ->where('remaining_quantity', '>', 0);
    }

    public function scopeExpired($query)
    {
        return $query->where('expiration_date', '<', Carbon::now())
            ->where('remaining_quantity', '>', 0);
    }

    public function scopeAvailable($query)
    {
        return $query->where('remaining_quantity', '>', 0);
    }

    // Accessors
    public function getIsExpiredAttribute(): bool
    {
        return $this->expiration_date < Carbon::now();
    }

    public function getDaysUntilExpirationAttribute(): ?int
    {
        if ($this->expiration_date) {
            return Carbon::now()->diffInDays($this->expiration_date, false);
        }
        return null;
    }

    public function getExpirationStatusAttribute(): string
    {
        if ($this->is_expired) {
            return 'expired';
        }
        $days = $this->days_until_expiration;
        if ($days <= 30) {
            return 'expiring_soon';
        }
        return 'good';
    }
}




































