<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Scopes\FacilityScope;

class FireDrillTemplate extends Model
{
    protected static function booted()
    {
        static::addGlobalScope(new FacilityScope);
    }

    protected $fillable = [
        'branch_id',
        'name',
        'description',
        'frequency',
        'day_of_month',
        'scheduled_time',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'scheduled_time' => 'string',
    ];

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
