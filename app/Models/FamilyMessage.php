<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyMessage extends Model
{
    protected $table = 'family_messages';

    protected $fillable = [
        'resident_id',
        'sender_type',
        'sender_id',
        'recipient_type',
        'recipient_id',
        'body',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public const SENDER_STAFF = 'staff';
    public const SENDER_FAMILY = 'family';

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function scopeForResident($query, $residentId)
    {
        return $query->where('resident_id', $residentId);
    }
}
