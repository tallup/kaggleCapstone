<?php

namespace App\Http\Controllers\Api;

use App\Models\StaffEmailPreference;
use App\Services\EmailPreferenceService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class StaffEmailPreferenceController extends BaseApiController
{
    protected EmailPreferenceService $emailPreferenceService;

    public function __construct(EmailPreferenceService $emailPreferenceService)
    {
        $this->emailPreferenceService = $emailPreferenceService;
    }

    /**
     * Get email preferences for the current user or a specific user
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $facility = $user->facility;
        
        if (!$facility) {
            return $this->error('User must be associated with a facility', 400);
        }

        $userId = $request->get('user_id', $user->id);
        
        // Only allow users to view their own preferences unless they're admins
        if ($userId !== $user->id && !in_array($user->role, ['administrator', 'admin', 'manager', 'super_admin'])) {
            return $this->error('Unauthorized to view other users\' preferences', 403);
        }

        // Get user-specific preferences
        $preferences = StaffEmailPreference::where('facility_id', $facility->id)
            ->where('user_id', $userId)
            ->first();

        // If no user preferences, return defaults
        if (!$preferences) {
            $preferences = new StaffEmailPreference();
            $preferences->fill(StaffEmailPreference::getDefaultPreferences());
            $preferences->facility_id = $facility->id;
            $preferences->user_id = $userId;
        }

        return $this->success($preferences->load('facility', 'user'));
    }

    /**
     * Get facility-level default preferences
     */
    public function facilityDefaults(Request $request): JsonResponse
    {
        $user = auth()->user();
        $facility = $user->facility;
        
        if (!$facility) {
            return $this->error('User must be associated with a facility', 400);
        }

        // Only admins can view facility defaults
        if (!in_array($user->role, ['administrator', 'admin', 'manager', 'super_admin'])) {
            return $this->error('Unauthorized', 403);
        }

        $preferences = StaffEmailPreference::where('facility_id', $facility->id)
            ->whereNull('user_id')
            ->first();

        if (!$preferences) {
            $preferences = new StaffEmailPreference();
            $preferences->fill(StaffEmailPreference::getDefaultPreferences());
            $preferences->facility_id = $facility->id;
            $preferences->user_id = null;
        }

        return $this->success($preferences);
    }

    /**
     * Update or create email preferences for the current user
     */
    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        $facility = $user->facility;
        
        if (!$facility) {
            return $this->error('User must be associated with a facility', 400);
        }

        $validated = $request->validate([
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
            'frequency' => 'sometimes|in:immediate,daily_digest,weekly_digest',
            'digest_time' => 'nullable|date_format:H:i',
        ]);

        // Users can only update their own preferences unless they're admins
        $targetUserId = $request->get('user_id', $user->id);
        
        if ($targetUserId !== $user->id && !in_array($user->role, ['administrator', 'admin', 'manager', 'super_admin'])) {
            return $this->error('Unauthorized to update other users\' preferences', 403);
        }

        $preferences = StaffEmailPreference::updateOrCreate(
            [
                'facility_id' => $facility->id,
                'user_id' => $targetUserId,
            ],
            $validated
        );

        return $this->success($preferences->load('facility', 'user'), 'Email preferences saved successfully', 201);
    }

    /**
     * Update facility-level default preferences
     */
    public function updateFacilityDefaults(Request $request): JsonResponse
    {
        $user = auth()->user();
        $facility = $user->facility;
        
        if (!$facility) {
            return $this->error('User must be associated with a facility', 400);
        }

        // Only admins can update facility defaults
        if (!in_array($user->role, ['administrator', 'admin', 'manager', 'super_admin'])) {
            return $this->error('Unauthorized', 403);
        }

        $validated = $request->validate([
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
            'frequency' => 'sometimes|in:immediate,daily_digest,weekly_digest',
            'digest_time' => 'nullable|date_format:H:i',
        ]);

        $preferences = StaffEmailPreference::updateOrCreate(
            [
                'facility_id' => $facility->id,
                'user_id' => null,
            ],
            $validated
        );

        return $this->success($preferences, 'Facility default preferences updated successfully');
    }

    /**
     * Update specific preference
     */
    public function update(Request $request, $id): JsonResponse
    {
        $preferences = StaffEmailPreference::findOrFail($id);
        $user = auth()->user();

        // Ensure user can only update their facility's preferences
        if ($preferences->facility_id !== $user->facility_id) {
            return $this->error('Unauthorized', 403);
        }

        // Users can only update their own preferences unless they're admins
        if ($preferences->user_id !== $user->id && !in_array($user->role, ['administrator', 'admin', 'manager', 'super_admin'])) {
            return $this->error('Unauthorized', 403);
        }

        $validated = $request->validate([
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
            'frequency' => 'sometimes|in:immediate,daily_digest,weekly_digest',
            'digest_time' => 'nullable|date_format:H:i',
        ]);

        $preferences->update($validated);

        return $this->success($preferences->load('facility', 'user'), 'Email preferences updated successfully');
    }
}
