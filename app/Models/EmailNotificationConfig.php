<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Loggable;

class EmailNotificationConfig extends Model
{
    use HasFactory, Loggable;

    protected $fillable = [
        'facility_id',
        'notification_type',
        'module',
        'enabled',
        'recipient_roles',
        'recipient_user_ids',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'recipient_roles' => 'array',
        'recipient_user_ids' => 'array',
    ];

    // Relationships
    public function facility()
    {
        return $this->belongsTo(Facility::class);
    }


    // Scopes
    public function scopeForFacility($query, $facilityId)
    {
        return $query->where('facility_id', $facilityId);
    }

    public function scopeForNotificationType($query, $notificationType)
    {
        return $query->where('notification_type', $notificationType);
    }

    public function scopeEnabled($query)
    {
        return $query->where('enabled', true);
    }

    public function scopeForModule($query, $module)
    {
        return $query->where('module', $module);
    }

    /**
     * Get or create a config for a facility and notification type
     */
    public static function getOrCreate($facilityId, $notificationType, $module = null): self
    {
        return static::firstOrCreate(
            [
                'facility_id' => $facilityId,
                'notification_type' => $notificationType,
            ],
            [
                'module' => $module,
                'enabled' => true,
                'recipient_roles' => [],
                'recipient_user_ids' => [],
            ]
        );
    }
}

