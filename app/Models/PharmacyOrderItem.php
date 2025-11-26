<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PharmacyOrderItem extends Model
{
    protected $fillable = [
        'pharmacy_order_id',
        'drug_id',
        'quantity_ordered',
        'quantity_received',
        'unit_cost',
        'discount',
        'line_total',
        'notes',
    ];

    protected $casts = [
        'quantity_ordered' => 'integer',
        'quantity_received' => 'integer',
        'unit_cost' => 'decimal:2',
        'discount' => 'decimal:2',
        'line_total' => 'decimal:2',
    ];

    // Relationships
    public function pharmacyOrder(): BelongsTo
    {
        return $this->belongsTo(PharmacyOrder::class, 'pharmacy_order_id');
    }

    public function drug(): BelongsTo
    {
        return $this->belongsTo(Drug::class);
    }

    // Methods
    public function calculateLineTotal(): void
    {
        $subtotal = $this->quantity_ordered * $this->unit_cost;
        $discountAmount = $subtotal * ($this->discount / 100);
        $this->line_total = $subtotal - $discountAmount;
    }

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($item) {
            $item->calculateLineTotal();
        });
    }
}









