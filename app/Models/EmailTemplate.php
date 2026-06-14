<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Loggable;

class EmailTemplate extends Model
{
    use HasFactory, Loggable;

    protected $fillable = [
        'facility_id',
        'notification_type',
        'module',
        'subject_template',
        'html_template',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
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

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForModule($query, $module)
    {
        return $query->where('module', $module);
    }

    /**
     * Get or create a template for a facility and notification type
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
                'subject_template' => '',
                'html_template' => '',
                'is_active' => true,
            ]
        );
    }
}

