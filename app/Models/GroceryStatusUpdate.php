<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\Loggable;
use App\Models\Scopes\FacilityScope;
use Carbon\Carbon;

class GroceryStatusUpdate extends Model
{
    use Loggable;

    protected static function booted()
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $fillable = [
        'branch_id',
        'updated_by',
        'week_start_date',
        'status',
        'items_needed',
        'items_received',
        'notes',
        'completed_at',
    ];

    protected $casts = [
        'week_start_date' => 'date',
        'completed_at' => 'datetime',
    ];

    // Relationships
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // Accessors
    public function getWeekEndDateAttribute()
    {
        return $this->week_start_date ? Carbon::parse($this->week_start_date)->addDays(6) : null;
    }

    // Scopes
    public function scopeForWeek($query, $branchId, $weekStart)
    {
        return $query->where('branch_id', $branchId)
            ->where('week_start_date', $weekStart);
    }

    public function scopeLatestForWeek($query, $branchId, $weekStart)
    {
        return $query->where('branch_id', $branchId)
            ->where('week_start_date', $weekStart)
            ->orderBy('created_at', 'desc')
            ->limit(1);
    }
}
