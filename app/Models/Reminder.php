<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Reminder extends Model
{
    protected $fillable = [
        'user_id',
        'facility_id',
        'branch_id',
        'title',
        'category',
        'description',
        'channel',
        'schedule_type',
        'due_at',
        'recurrence_pattern',
        'status',
        'action_url',
        'metadata',
        'last_scheduled_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'recurrence_pattern' => 'array',
        'due_at' => 'datetime',
        'last_scheduled_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(ReminderEvent::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    public function scopeOwnedBy(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }
}

