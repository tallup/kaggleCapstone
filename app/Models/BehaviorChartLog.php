<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BehaviorChartLog extends Model
{
    protected $fillable = [
        'behavior_chart_id',
        'occurred_at',
        'behavior_description',
        'triggers',
        'caregiver_intervention',
        'reported_to_provider',
        'outcome',
    ];

    protected $casts = [
        'occurred_at' => 'datetime',
        'reported_to_provider' => 'boolean',
    ];

    public function chart(): BelongsTo
    {
        return $this->belongsTo(BehaviorChart::class, 'behavior_chart_id');
    }
}
