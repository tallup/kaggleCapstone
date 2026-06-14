<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $fillable = [
        'user_id',
        'facility_id',
        'branch_id',
        'type',
        'title',
        'message',
        'icon',
        'icon_color',
        'is_read',
        'action_url',
        'metadata',
        'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'metadata' => 'array',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeUnread($query)
    {
        return $query->where('is_read', false);
    }

    public function scopeRead($query)
    {
        return $query->where('is_read', true);
    }

    public function scopeRecent($query, $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    public function scopeForFacility($query, $facilityId)
    {
        return $query->where('facility_id', $facilityId);
    }

    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Create a notification with facility/branch auto-filled from a resident.
     * Respects user notification preferences — returns null if user disabled this type.
     */
    public static function createForResident(array $data, $resident): ?self
    {
        if (isset($data['user_id'], $data['type'])) {
            if (!NotificationPreference::isEnabled($data['user_id'], self::categoryForType($data['type']), 'in_app')) {
                return null;
            }
        }

        return static::create(array_merge($data, [
            'facility_id' => $resident->branch?->facility_id ?? $resident->facility_id ?? null,
            'branch_id' => $resident->branch_id ?? null,
        ]));
    }

    /**
     * Create a notification with facility_id from a user.
     * Respects user notification preferences — returns null if user disabled this type.
     */
    public static function createForUser(array $data, $sourceUser = null): ?self
    {
        if (isset($data['user_id'], $data['type'])) {
            if (!NotificationPreference::isEnabled($data['user_id'], self::categoryForType($data['type']), 'in_app')) {
                return null;
            }
        }

        $facilityId = $sourceUser?->facility_id ?? null;
        $branchId = $sourceUser?->assigned_branch_id ?? null;

        return static::create(array_merge($data, [
            'facility_id' => $facilityId,
            'branch_id' => $branchId,
        ]));
    }

    /**
     * Map a notification type to its preference category key.
     */
    private static function categoryForType(string $type): string
    {
        foreach (NotificationPreference::configurableTypes() as $key => $category) {
            if (in_array($type, $category['types'])) {
                return $key;
            }
        }
        return $type; // fallback: use type directly
    }

    // Helper methods
    public function markAsRead(): void
    {
        $this->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
    }
}
