<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BehaviorDefinition extends Model
{
    protected $fillable = [
        'behavior_category_id',
        'name',
        'is_active',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(BehaviorCategory::class, 'behavior_category_id');
    }
}
