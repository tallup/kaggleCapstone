<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BehaviorChart extends Model
{
    protected $fillable = [
        'resident_id',
        'caregiver_id',
        'chart_date',
        'submitted_at',
        'status',
    ];

    protected $casts = [
        'chart_date' => 'date',
        'submitted_at' => 'datetime',
    ];

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function caregiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'caregiver_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(BehaviorChartItem::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(BehaviorChartLog::class);
    }
}
