<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReminderEvent extends Model
{
    protected $fillable = [
        'reminder_id',
        'scheduled_for',
        'status',
        'channel',
        'snoozed_until',
        'delivered_at',
        'acknowledged_at',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'scheduled_for' => 'datetime',
        'snoozed_until' => 'datetime',
        'delivered_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function reminder(): BelongsTo
    {
        return $this->belongsTo(Reminder::class);
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('scheduled_for', '>=', now())->orderBy('scheduled_for');
    }

    public function scopeDue(Builder $query): Builder
    {
        return $query
            ->where('scheduled_for', '<=', now())
            ->where(function (Builder $builder) {
                $builder
                    ->whereNull('snoozed_until')
                    ->orWhere('snoozed_until', '<=', now());
            });
    }
}

