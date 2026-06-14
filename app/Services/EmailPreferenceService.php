<?php

namespace App\Services;

use App\Models\StaffEmailPreference;
use App\Models\User;
use App\Models\Facility;

class EmailPreferenceService
{
    /**
     * Check if a user should receive an email for a specific notification type
     * 
     * @param User $user The user to check
     * @param string $notificationType The type of notification (e.g., 'late_medication', 'late_vital_sign')
     * @param Facility|null $facility Optional facility context
     * @return bool
     */
    public function shouldSendEmail(User $user, string $notificationType, ?Facility $facility = null): bool
    {
        // If user has no email, don't send
        if (!$user->email) {
            return false;
        }

        // Super admins never receive facility notification emails (staff preferences / config recipients)
        if ($user->isSuperAdmin()) {
            return false;
        }

        // Get facility from user if not provided
        if (!$facility) {
            $facility = $user->facility;
        }

        // If no facility, use default preferences (enabled)
        if (!$facility) {
            return true;
        }

        // Get user-specific preferences first
        $preference = StaffEmailPreference::where('facility_id', $facility->id)
            ->where('user_id', $user->id)
            ->first();

        // If user has preferences, use them
        if ($preference) {
            return $preference->isNotificationEnabled($notificationType);
        }

        // Check for facility-level defaults (user_id is null)
        $facilityDefault = StaffEmailPreference::where('facility_id', $facility->id)
            ->whereNull('user_id')
            ->first();

        if ($facilityDefault) {
            return $facilityDefault->isNotificationEnabled($notificationType);
        }

        // No preferences found, use system defaults (enabled)
        $defaults = StaffEmailPreference::getDefaultPreferences();
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
        
        return $field ? ($defaults[$field] ?? true) : true;
    }

    /**
     * Filter users who should receive emails for a notification type
     * 
     * @param \Illuminate\Support\Collection|array $users Collection of users
     * @param string $notificationType The type of notification
     * @param Facility|null $facility Optional facility context
     * @return \Illuminate\Support\Collection
     */
    public function filterUsersForEmail($users, string $notificationType, ?Facility $facility = null)
    {
        return collect($users)->filter(function ($user) use ($notificationType, $facility) {
            return $this->shouldSendEmail($user, $notificationType, $facility);
        });
    }

    /**
     * Get or create preferences for a user
     * 
     * @param User $user
     * @param Facility|null $facility
     * @return StaffEmailPreference
     */
    public function getOrCreateUserPreferences(User $user, ?Facility $facility = null): StaffEmailPreference
    {
        if (!$facility) {
            $facility = $user->facility;
        }

        if (!$facility) {
            throw new \Exception('Cannot create preferences without a facility');
        }

        return StaffEmailPreference::firstOrCreate(
            [
                'facility_id' => $facility->id,
                'user_id' => $user->id,
            ],
            StaffEmailPreference::getDefaultPreferences()
        );
    }

    /**
     * Get or create facility-level default preferences
     * 
     * @param Facility $facility
     * @return StaffEmailPreference
     */
    public function getOrCreateFacilityDefaults(Facility $facility): StaffEmailPreference
    {
        return StaffEmailPreference::firstOrCreate(
            [
                'facility_id' => $facility->id,
                'user_id' => null,
            ],
            StaffEmailPreference::getDefaultPreferences()
        );
    }
}

