<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResidentContact extends Model
{
    protected $table = 'resident_contacts';

    protected $fillable = [
        'resident_id',
        'name',
        'email',
        'phone',
        'relation',
        'invite_token',
        'invite_expires_at',
        'user_id',
    ];

    protected $casts = [
        'invite_expires_at' => 'datetime',
    ];

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isInviteValid(): bool
    {
        if (!$this->invite_token || !$this->invite_expires_at) {
            return false;
        }
        return $this->invite_expires_at->isFuture();
    }

    public function scopeLinkedUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }
}
