<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationPreference extends Model
{
    protected $fillable = [
        'user_id',
        'notification_type',
        'in_app_enabled',
        'email_enabled',
        'push_enabled',
    ];

    protected $casts = [
        'in_app_enabled' => 'boolean',
        'email_enabled' => 'boolean',
        'push_enabled' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if a notification type is enabled for a user on a given channel.
     * Returns true by default (if no preference record exists).
     */
    public static function isEnabled(int $userId, string $type, string $channel = 'in_app'): bool
    {
        $pref = static::where('user_id', $userId)
            ->where('notification_type', $type)
            ->first();

        if (!$pref) return true; // default: enabled

        return match ($channel) {
            'in_app' => $pref->in_app_enabled,
            'email' => $pref->email_enabled,
            'push' => $pref->push_enabled,
            default => true,
        };
    }

    /**
     * All notification types that users can configure.
     */
    public static function configurableTypes(): array
    {
        return [
            'medications' => [
                'label' => 'Medications',
                'description' => 'Medication reminders, administration, and missed dose alerts',
                'types' => ['medication_due', 'medication_created', 'medication_administered', 'late_medication_email'],
            ],
            'vitals' => [
                'label' => 'Vital Signs',
                'description' => 'Vital sign recordings and critical alerts',
                'types' => ['vital_due', 'vital_recorded', 'vital_critical', 'late_vital_sign_email'],
            ],
            'incidents' => [
                'label' => 'Incidents',
                'description' => 'Incident reports, assignments, and escalations',
                'types' => ['incident_reported', 'incident_assigned', 'incident_resolved', 'incident_closed', 'incident_escalated'],
            ],
            'appointments' => [
                'label' => 'Appointments',
                'description' => 'Upcoming and completed appointment notifications',
                'types' => ['appointment_upcoming', 'appointment_completed', 'appointment_reminder'],
            ],
            'assessments' => [
                'label' => 'Assessments',
                'description' => 'Assessment creation and completion alerts',
                'types' => ['assessment_due', 'assessment_created', 'assessment_completed'],
            ],
            'leave' => [
                'label' => 'Leave Requests',
                'description' => 'Leave request submissions and approvals',
                'types' => ['leave_request', 'leave_approved', 'leave_rejected'],
            ],
            'housekeeping' => [
                'label' => 'Housekeeping',
                'description' => 'Housekeeping task completions and updates',
                'types' => ['housekeeping_task_completed', 'housekeeping_task_skipped'],
            ],
            'check_in' => [
                'label' => 'Check-In/Out',
                'description' => 'Staff clock-ins, resident sign-outs, visitor check-ins',
                'types' => ['staff_clock_in', 'staff_clock_out', 'resident_sign_out', 'resident_sign_in', 'visitor_check_in', 'visitor_check_out'],
            ],
        ];
    }
}
