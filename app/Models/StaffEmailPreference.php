<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Loggable;

class StaffEmailPreference extends Model
{
    use HasFactory, Loggable;

    protected $fillable = [
        'facility_id',
        'user_id',
        'late_medication_enabled',
        'late_vital_sign_enabled',
        'appointment_reminder_enabled',
        'incident_alert_enabled',
        'resident_sign_out_enabled',
        'medication_administration_enabled',
        'missed_medication_window_enabled',
        'critical_vital_sign_enabled',
        'daily_summary_enabled',
        'task_assignment_enabled',
        'email_enabled',
        'frequency',
        'digest_time',
    ];

    protected $casts = [
        'late_medication_enabled' => 'boolean',
        'late_vital_sign_enabled' => 'boolean',
        'appointment_reminder_enabled' => 'boolean',
        'incident_alert_enabled' => 'boolean',
        'resident_sign_out_enabled' => 'boolean',
        'medication_administration_enabled' => 'boolean',
        'missed_medication_window_enabled' => 'boolean',
        'critical_vital_sign_enabled' => 'boolean',
        'daily_summary_enabled' => 'boolean',
        'task_assignment_enabled' => 'boolean',
        'email_enabled' => 'boolean',
        'digest_time' => 'datetime',
    ];

    // Relationships
    public function facility()
    {
        return $this->belongsTo(Facility::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Scopes
    public function scopeForFacility($query, $facilityId)
    {
        return $query->where('facility_id', $facilityId);
    }

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeGlobal($query, $facilityId)
    {
        return $query->where('facility_id', $facilityId)
            ->whereNull('user_id');
    }

    /**
     * Check if a specific notification type is enabled for this preference
     */
    public function isNotificationEnabled(string $notificationType): bool
    {
        // If email is globally disabled, return false
        if (!$this->email_enabled) {
            return false;
        }

        // Map notification types to preference fields
        $typeMap = [
            'late_medication' => 'late_medication_enabled',
            'late_vital_sign' => 'late_vital_sign_enabled',
            'appointment_reminder' => 'appointment_reminder_enabled',
            'incident_alert' => 'incident_alert_enabled',
            'resident_sign_out' => 'resident_sign_out_enabled',
            'medication_administration' => 'medication_administration_enabled',
            'missed_medication_window' => 'missed_medication_window_enabled',
            'critical_vital_sign' => 'critical_vital_sign_enabled',
            'daily_summary' => 'daily_summary_enabled',
            'task_assignment' => 'task_assignment_enabled',
        ];

        $field = $typeMap[$notificationType] ?? null;
        
        if (!$field) {
            // Unknown notification type, default to enabled
            return true;
        }

        return (bool) $this->$field;
    }

    /**
     * Get default preferences
     */
    public static function getDefaultPreferences(): array
    {
        return [
            'late_medication_enabled' => true,
            'late_vital_sign_enabled' => true,
            'appointment_reminder_enabled' => true,
            'incident_alert_enabled' => true,
            'resident_sign_out_enabled' => true,
            'medication_administration_enabled' => true,
            'missed_medication_window_enabled' => true,
            'critical_vital_sign_enabled' => true,
            'daily_summary_enabled' => false,
            'task_assignment_enabled' => true,
            'email_enabled' => true,
            'frequency' => 'immediate',
            'digest_time' => null,
        ];
    }
}
