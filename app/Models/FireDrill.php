<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\Loggable;
use App\Models\Scopes\FacilityScope;
use Carbon\Carbon;

class FireDrill extends Model
{
    use Loggable;

    protected static function booted()
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $fillable = [
        'branch_id',
        'scheduled_date',
        'scheduled_time',
        'status',
        'notes',
        'completed_at',
        'created_by',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'scheduled_time' => 'string',
        'completed_at' => 'datetime',
    ];

    // Relationships
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Scopes
    public function scopeUpcoming($query)
    {
        return $query->where('status', 'scheduled')
            ->where('scheduled_date', '>=', now()->toDateString())
            ->orderBy('scheduled_date')
            ->orderBy('scheduled_time');
    }

    public function scopeForDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('scheduled_date', [$startDate, $endDate]);
    }

    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function scopeOneDayBefore($query)
    {
        $tomorrow = now()->addDay()->toDateString();
        return $query->where('status', 'scheduled')
            ->whereDate('scheduled_date', $tomorrow);
    }

    public function scopeToday($query)
    {
        $today = now()->toDateString();
        return $query->where('status', 'scheduled')
            ->whereDate('scheduled_date', $today);
    }

    // Accessors
    public function getScheduledDateTimeAttribute()
    {
        return Carbon::parse($this->scheduled_date->format('Y-m-d') . ' ' . $this->scheduled_time->format('H:i:s'));
    }

    public function getIsUpcomingAttribute(): bool
    {
        return $this->status === 'scheduled' && 
               $this->scheduled_date >= now()->toDateString();
    }
}
