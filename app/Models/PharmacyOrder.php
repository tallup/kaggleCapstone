<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\Loggable;
use App\Models\Scopes\FacilityScope;

class PharmacyOrder extends Model
{
    use SoftDeletes, Loggable;

    protected static function booted()
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $fillable = [
        'order_number',
        'branch_id',
        'supplier_id',
        'ordered_by',
        'status',
        'order_date',
        'expected_delivery_date',
        'received_date',
        'subtotal',
        'discount',
        'tax',
        'shipping',
        'total',
        'notes',
        'internal_notes',
        'received_by',
    ];

    protected $casts = [
        'order_date' => 'date',
        'expected_delivery_date' => 'date',
        'received_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'shipping' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    // Relationships
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(PharmacySupplier::class, 'supplier_id');
    }

    public function orderedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'ordered_by');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PharmacyOrderItem::class, 'pharmacy_order_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PharmacyStockTransaction::class, 'pharmacy_order_id');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeReceived($query)
    {
        return $query->where('status', 'received');
    }

    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    // Methods
    public function calculateTotal(): void
    {
        $this->subtotal = $this->items->sum(function ($item) {
            return $item->quantity_ordered * $item->unit_cost * (1 - ($item->discount / 100));
        });

        $this->total = $this->subtotal + $this->tax + $this->shipping - $this->discount;
    }

    public function markAsReceived($receivedBy): void
    {
        $this->status = 'received';
        $this->received_date = now();
        $this->received_by = $receivedBy;
        $this->save();
    }

    public function isFullyReceived(): bool
    {
        return $this->items->every(function ($item) {
            return $item->quantity_received >= $item->quantity_ordered;
        });
    }

    // Boot method to auto-generate order number
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($order) {
            if (empty($order->order_number)) {
                $order->order_number = static::generateOrderNumber();
            }
        });
    }

    protected static function generateOrderNumber(): string
    {
        $prefix = 'PO';
        $year = now()->format('Y');
        
        // Use withoutGlobalScope to get all orders for number generation
        // This ensures order numbers are unique across all facilities
        $lastOrder = static::withoutGlobalScope(\App\Models\Scopes\FacilityScope::class)
            ->where('order_number', 'like', "{$prefix}-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();

        if ($lastOrder) {
            $lastNumber = (int) substr($lastOrder->order_number, -6);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return sprintf('%s-%s-%06d', $prefix, $year, $newNumber);
    }
}
























