<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BehaviorCategory extends Model
{
    protected $fillable = [
        'name',
        'description',
        'is_active',
    ];

    public function definitions(): HasMany
    {
        return $this->hasMany(BehaviorDefinition::class, 'behavior_category_id');
    }
}
