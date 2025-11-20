<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\Loggable;

class PharmacyStockTransaction extends Model
{
    use Loggable;

    protected $fillable = [
        'pharmacy_inventory_id',
        'branch_id',
        'drug_id',
        'stock_lot_id',
        'transaction_type',
        'quantity_change',
        'quantity_before',
        'quantity_after',
        'unit_cost',
        'performed_by',
        'pharmacy_order_id',
        'medication_delivery_id',
        'reference_number',
        'notes',
        'transaction_date',
    ];

    protected $casts = [
        'quantity_change' => 'integer',
        'quantity_before' => 'integer',
        'quantity_after' => 'integer',
        'unit_cost' => 'decimal:2',
        'transaction_date' => 'datetime',
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

    public function stockLot(): BelongsTo
    {
        return $this->belongsTo(PharmacyStockLot::class, 'stock_lot_id');
    }

    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public function pharmacyOrder(): BelongsTo
    {
        return $this->belongsTo(PharmacyOrder::class, 'pharmacy_order_id');
    }

    public function medicationDelivery(): BelongsTo
    {
        return $this->belongsTo(MedicationDelivery::class, 'medication_delivery_id');
    }

    // Scopes
    public function scopeByType($query, $type)
    {
        return $query->where('transaction_type', $type);
    }

    public function scopeReceived($query)
    {
        return $query->where('transaction_type', 'received');
    }

    public function scopeDispensed($query)
    {
        return $query->where('transaction_type', 'dispensed');
    }

    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    // Accessors
    public function getTransactionTypeLabelAttribute(): string
    {
        return match ($this->transaction_type) {
            'received' => 'Received',
            'dispensed' => 'Dispensed',
            'adjusted' => 'Adjusted',
            'expired' => 'Expired',
            'damaged' => 'Damaged',
            'returned' => 'Returned',
            default => ucfirst($this->transaction_type),
        };
    }
}


