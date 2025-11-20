<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\Loggable;

class PharmacyInventory extends Model
{
    use SoftDeletes, Loggable;

    protected $table = 'pharmacy_inventory';

    protected $fillable = [
        'branch_id',
        'drug_id',
        'quantity',
        'minimum_stock_level',
        'maximum_stock_level',
        'unit_cost',
        'location',
        'last_received_date',
        'last_dispensed_date',
        'requires_refrigeration',
        'is_controlled_substance',
        'storage_notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'minimum_stock_level' => 'integer',
        'maximum_stock_level' => 'integer',
        'unit_cost' => 'decimal:2',
        'last_received_date' => 'date',
        'last_dispensed_date' => 'date',
        'requires_refrigeration' => 'boolean',
        'is_controlled_substance' => 'boolean',
    ];

    // Relationships
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function drug(): BelongsTo
    {
        return $this->belongsTo(Drug::class);
    }

    public function stockLots(): HasMany
    {
        return $this->hasMany(PharmacyStockLot::class, 'pharmacy_inventory_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PharmacyStockTransaction::class, 'pharmacy_inventory_id');
    }

    // Scopes
    public function scopeLowStock($query)
    {
        return $query->whereColumn('quantity', '<=', 'minimum_stock_level');
    }

    public function scopeOutOfStock($query)
    {
        return $query->where('quantity', '<=', 0);
    }

    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    // Accessors
    public function getStockStatusAttribute(): string
    {
        if ($this->quantity <= 0) {
            return 'out_of_stock';
        }
        if ($this->quantity <= $this->minimum_stock_level) {
            return 'low_stock';
        }
        if ($this->maximum_stock_level && $this->quantity >= $this->maximum_stock_level) {
            return 'overstock';
        }
        return 'in_stock';
    }

    public function getStockStatusColorAttribute(): string
    {
        return match ($this->stock_status) {
            'out_of_stock' => 'danger',
            'low_stock' => 'warning',
            'overstock' => 'info',
            default => 'success',
        };
    }
}


