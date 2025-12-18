<?php

namespace App\Services;

use App\Mail\LateMedicationNotification;
use App\Mail\LateVitalSignNotification;
use App\Models\Medication;
use App\Models\Resident;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    protected MailConfigurationService $mailConfigService;
    protected EmailPreferenceService $emailPreferenceService;

    public function __construct(
        MailConfigurationService $mailConfigService,
        EmailPreferenceService $emailPreferenceService
    ) {
        $this->mailConfigService = $mailConfigService;
        $this->emailPreferenceService = $emailPreferenceService;
    }

    /**
     * Send email notification for late medication
     */
    public function sendLateMedicationEmail(Medication $medication, Resident $resident, $caregivers): void
    {
        $medicationName = $medication->drug?->name ?? $medication->name;
        $residentName = trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? ''));
        
        // Get facility from resident's branch
        $facility = $this->mailConfigService->getFacilityFromResident($resident);
        
        // Configure mail for facility if available
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        // Filter caregivers based on email preferences
        $caregiversToNotify = $this->emailPreferenceService->filterUsersForEmail(
            $caregivers,
            'late_medication',
            $facility
        );
        
        foreach ($caregiversToNotify as $caregiver) {
            if ($caregiver->email) {
                try {
                    Mail::to($caregiver->email)->send(
                        new LateMedicationNotification($medication, $resident, 'Scheduled Time')
                    );
                    
                    // Log email sent
                    Log::info('Late medication email sent', [
                        'to' => $caregiver->email,
                        'medication' => $medicationName,
                        'resident' => $residentName,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send late medication email', [
                        'to' => $caregiver->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for late vital signs
     */
    public function sendLateVitalSignEmail(Resident $resident, $caregivers, int $hoursOverdue): void
    {
        $residentName = trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? ''));
        
        // Get facility from resident's branch
        $facility = $this->mailConfigService->getFacilityFromResident($resident);
        
        // Configure mail for facility if available
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        // Filter caregivers based on email preferences
        $caregiversToNotify = $this->emailPreferenceService->filterUsersForEmail(
            $caregivers,
            'late_vital_sign',
            $facility
        );
        
        foreach ($caregiversToNotify as $caregiver) {
            if ($caregiver->email) {
                try {
                    Mail::to($caregiver->email)->send(
                        new LateVitalSignNotification($resident, $hoursOverdue)
                    );
                    
                    // Log email sent
                    Log::info('Late vital sign email sent', [
                        'to' => $caregiver->email,
                        'resident' => $residentName,
                        'hours_overdue' => $hoursOverdue,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send late vital sign email', [
                        'to' => $caregiver->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Get recipient emails from users
     */
    public function getRecipientEmails($users): array
    {
        return $users->pluck('email')->filter()->toArray();
    }
}

