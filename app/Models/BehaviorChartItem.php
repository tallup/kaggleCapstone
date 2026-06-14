<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BehaviorChartItem extends Model
{
    protected $fillable = [
        'behavior_chart_id',
        'behavior_definition_id',
        'value',
    ];

    protected $casts = [
        'value' => 'boolean',
    ];

    public function chart(): BelongsTo
    {
        return $this->belongsTo(BehaviorChart::class, 'behavior_chart_id');
    }

    public function definition(): BelongsTo
    {
        return $this->belongsTo(BehaviorDefinition::class, 'behavior_definition_id');
    }
}
