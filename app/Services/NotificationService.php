<?php

namespace App\Services;

use App\Mail\AppointmentNotification;
use App\Mail\AssessmentNotification;
use App\Mail\EmployeeDocumentNotification;
use App\Mail\ExpenseCategoryNotification;
use App\Mail\ExpenseNotification;
use App\Mail\FireDrillNotification;
use App\Mail\GroceryStatusNotification;
use App\Mail\IncidentNotification;
use App\Mail\LateMedicationNotification;
use App\Mail\LeaveRequestNotification;
use App\Mail\MedicationAdministrationNotification;
use App\Mail\MedicationDeliveryNotification;
use App\Mail\MedicationNotification;
use App\Mail\MissedMedicationWindowAdminNotification;
use App\Mail\PharmacyOrderNotification;
use App\Mail\PharmacySupplierNotification;
use App\Mail\ResidentSignOutNotification;
use App\Mail\SleepRecordNotification;
use App\Mail\StaffClockInNotification;
use App\Mail\VisitorNotification;
use App\Mail\VitalSignNotification;
use App\Models\Appointment;
use App\Models\Assessment;
use App\Models\EmployeeDocument;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\FireDrill;
use App\Models\GroceryStatusUpdate;
use App\Models\Incident;
use App\Models\LeaveRequest;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\MedicationDelivery;
use App\Models\PharmacyOrder;
use App\Models\PharmacySupplier;
use App\Models\Resident;
use App\Models\ResidentSignOut;
use App\Models\SleepRecord;
use App\Models\StaffClockIn;
use App\Models\User;
use App\Models\Visitor;
use Carbon\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    protected MailConfigurationService $mailConfigService;
    protected EmailPreferenceService $emailPreferenceService;
    protected EmailRecipientService $recipientService;

    public function __construct(
        MailConfigurationService $mailConfigService,
        EmailPreferenceService $emailPreferenceService,
        EmailRecipientService $recipientService
    ) {
        $this->mailConfigService = $mailConfigService;
        $this->emailPreferenceService = $emailPreferenceService;
        $this->recipientService = $recipientService;
    }

    /**
     * Skip sending notification when facility is missing, soft-deleted, or inactive (e.g. "Active Facility" unchecked).
     */
    protected function shouldSkipNotificationForFacility($facility): bool
    {
        if (!$facility) {
            return true;
        }
        if (method_exists($facility, 'trashed') && $facility->trashed()) {
            return true;
        }
        return isset($facility->is_active) && $facility->is_active === false;
    }

    /**
     * Facility-originated mail must not go to platform super admins.
     */
    protected function filterFacilityMailRecipients($users): \Illuminate\Support\Collection
    {
        return collect($users)->filter(function (User $user) {
            return $user->email && ! $user->isSuperAdmin();
        });
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
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Late medication email skipped - facility missing or deleted', [
                'medication_id' => $medication->id,
                'resident_id' => $resident->id,
            ]);
            return;
        }
        
        // Configure mail for facility if available
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
            
            // Check if notification is enabled via config
            if (!$this->recipientService->isNotificationEnabled($facility, 'late_medication')) {
                Log::info('Late medication email skipped - notification disabled in config', [
                    'facility_id' => $facility->id,
                ]);
                return;
            }
            
            // Get recipients from config
            $configRecipients = $this->recipientService->getRecipients($facility, 'late_medication');
            
            // If config has recipients, use them; otherwise fall back to existing logic
            if ($configRecipients->isNotEmpty()) {
                $caregiversToNotify = $this->filterFacilityMailRecipients($configRecipients);
            } else {
                // Fallback to existing email preference logic
                $caregiversToNotify = $this->emailPreferenceService->filterUsersForEmail(
                    $caregivers,
                    'late_medication',
                    $facility
                );
            }
        } else {
            // No facility, use existing logic
            $caregiversToNotify = $this->emailPreferenceService->filterUsersForEmail(
                $caregivers,
                'late_medication',
                null
            );
        }
        
        foreach ($caregiversToNotify as $caregiver) {
            if ($caregiver->email) {
                try {
                    Mail::to($caregiver->email)->send(
                        new LateMedicationNotification($medication, $resident, 'Scheduled Time', $facility)
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
     * Late vital sign emails are disabled. In-app notifications are still created by GenerateNotifications.
     */
    public function sendLateVitalSignEmail(Resident $resident, $caregivers, int $hoursOverdue): void
    {
        // Intentionally no mail — product requirement.
    }

    /**
     * Get recipient emails from users
     */
    public function getRecipientEmails($users): array
    {
        return $users->pluck('email')->filter()->toArray();
    }

    /**
     * Send email notification for appointment events
     */
    public function sendAppointmentEmail(Appointment $appointment, $recipients, string $eventType): void
    {
        $facility = $this->mailConfigService->getFacilityFromResident($appointment->resident);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Appointment email skipped - facility missing or deleted', ['appointment_id' => $appointment->id]);
            return;
        }
        
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
            
            // Check if notification is enabled via config
            if (!$this->recipientService->isNotificationEnabled($facility, 'appointment_reminder')) {
                return;
            }
            
            // Get recipients from config
            $configRecipients = $this->recipientService->getRecipients($facility, 'appointment_reminder');
            
            // If config has recipients, use them; otherwise fall back to existing logic
            if ($configRecipients->isNotEmpty()) {
                $recipientsToNotify = $this->filterFacilityMailRecipients($configRecipients);
            } else {
                $recipientsToNotify = $this->emailPreferenceService->filterUsersForEmail(
                    $recipients,
                    'appointment_reminder',
                    $facility
                );
            }
        } else {
            $recipientsToNotify = $this->emailPreferenceService->filterUsersForEmail(
                $recipients,
                'appointment_reminder',
                null
            );
        }
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new AppointmentNotification($appointment, $eventType, $facility)
                    );
                    
                    Log::info('Appointment email sent', [
                        'to' => $recipient->email,
                        'appointment_id' => $appointment->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send appointment email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for incident events
     */
    public function sendIncidentEmail(Incident $incident, $recipients, string $eventType): void
    {
        $facility = $this->mailConfigService->getFacilityFromResident($incident->resident);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Incident email skipped - facility missing or deleted', ['incident_id' => $incident->id]);
            return;
        }
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        $recipientsToNotify = $this->emailPreferenceService->filterUsersForEmail(
            $recipients,
            'incident_alert',
            $facility
        );
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new IncidentNotification($incident, $eventType)
                    );
                    
                    Log::info('Incident email sent', [
                        'to' => $recipient->email,
                        'incident_id' => $incident->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send incident email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for leave request events
     */
    public function sendLeaveRequestEmail(LeaveRequest $leaveRequest, $recipients, string $eventType): void
    {
        $facility = $this->mailConfigService->getFacilityFromUser($leaveRequest->staff);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Leave request email skipped - facility missing or deleted', ['leave_request_id' => $leaveRequest->id]);
            return;
        }
        $this->mailConfigService->configureForFacility($facility);
        
        // Use a generic notification type since leave requests aren't in preferences yet
        // Default to enabled
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new LeaveRequestNotification($leaveRequest, $eventType)
                    );
                    
                    Log::info('Leave request email sent', [
                        'to' => $recipient->email,
                        'leave_request_id' => $leaveRequest->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send leave request email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for pharmacy order events
     */
    public function sendPharmacyOrderEmail(PharmacyOrder $order, $recipients, string $eventType): void
    {
        $facility = $order->branch?->facility;
        
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        // Pharmacy notifications - default to enabled for all
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new PharmacyOrderNotification($order, $eventType)
                    );
                    
                    Log::info('Pharmacy order email sent', [
                        'to' => $recipient->email,
                        'order_id' => $order->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send pharmacy order email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for pharmacy supplier events
     */
    public function sendPharmacySupplierEmail(PharmacySupplier $supplier, $recipients, string $eventType): void
    {
        // Get facility from first order or user
        $facility = null;
        if ($supplier->orders->isNotEmpty()) {
            $facility = $supplier->orders->first()->branch?->facility;
        }
        
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new PharmacySupplierNotification($supplier, $eventType)
                    );
                    
                    Log::info('Pharmacy supplier email sent', [
                        'to' => $recipient->email,
                        'supplier_id' => $supplier->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send pharmacy supplier email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for expense events
     */
    public function sendExpenseEmail(Expense $expense, $recipients, string $eventType): void
    {
        $facility = $expense->facility;
        
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new ExpenseNotification($expense, $eventType)
                    );
                    
                    Log::info('Expense email sent', [
                        'to' => $recipient->email,
                        'expense_id' => $expense->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send expense email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Active facility users with admin or administrator role (for medication administration emails).
     */
    public function recipientsForMedicationAdministrationFacilityEmails(Resident $resident): \Illuminate\Support\Collection
    {
        $resident->loadMissing('branch.facility');
        $facility = $resident->branch?->facility;
        if (!$facility) {
            return collect();
        }

        return User::query()
            ->where('facility_id', $facility->id)
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereIn('role', ['admin', 'administrator'])
                    ->orWhereHas('roles', function ($r) {
                        $r->whereIn('name', ['admin', 'administrator']);
                    });
            })
            ->get()
            ->unique('id')
            ->values();
    }

    /**
     * Send email notification for medication administration
     */
    public function sendMedicationAdministrationEmail(MedicationAdministration $administration, $recipients): void
    {
        $facility = $this->mailConfigService->getFacilityFromResident($administration->resident);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Medication administration email skipped - facility missing or deleted', ['administration_id' => $administration->id]);
            return;
        }
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        $recipientsToNotify = $this->emailPreferenceService->filterUsersForEmail(
            $recipients,
            'medication_administration',
            $facility
        );
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new MedicationAdministrationNotification($administration)
                    );
                    
                    Log::info('Medication administration email sent', [
                        'to' => $recipient->email,
                        'administration_id' => $administration->id,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send medication administration email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for vital signs
     */
    public function sendVitalSignEmail($vitalSign, $recipients, bool $isCritical = false): void
    {
        $facility = $this->mailConfigService->getFacilityFromResident($vitalSign->resident);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Vital sign email skipped - facility missing or deleted', ['vital_sign_id' => $vitalSign->id]);
            return;
        }
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        $notificationType = $isCritical ? 'critical_vital_sign' : 'medication_administration'; // Use existing type for now
        $recipientsToNotify = $this->emailPreferenceService->filterUsersForEmail(
            $recipients,
            $notificationType,
            $facility
        );
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new VitalSignNotification($vitalSign, $isCritical)
                    );
                    
                    Log::info('Vital sign email sent', [
                        'to' => $recipient->email,
                        'vital_sign_id' => $vitalSign->id,
                        'is_critical' => $isCritical,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send vital sign email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for sleep record
     */
    public function sendSleepRecordEmail(SleepRecord $sleepRecord, $recipients): void
    {
        $facility = $this->mailConfigService->getFacilityFromResident($sleepRecord->resident);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Sleep record email skipped - facility missing or deleted', ['sleep_record_id' => $sleepRecord->id]);
            return;
        }
        $this->mailConfigService->configureForFacility($facility);
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new SleepRecordNotification($sleepRecord)
                    );
                    
                    Log::info('Sleep record email sent', [
                        'to' => $recipient->email,
                        'sleep_record_id' => $sleepRecord->id,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send sleep record email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for assessment
     */
    public function sendAssessmentEmail(Assessment $assessment, $recipients, string $eventType): void
    {
        $facility = $this->mailConfigService->getFacilityFromResident($assessment->resident);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Assessment email skipped - facility missing or deleted', ['assessment_id' => $assessment->id]);
            return;
        }
        $this->mailConfigService->configureForFacility($facility);
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new AssessmentNotification($assessment, $eventType)
                    );
                    
                    Log::info('Assessment email sent', [
                        'to' => $recipient->email,
                        'assessment_id' => $assessment->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send assessment email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for fire drill
     */
    public function sendFireDrillEmail(FireDrill $fireDrill, $recipients): void
    {
        $facility = $fireDrill->branch?->facility;
        
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new FireDrillNotification($fireDrill)
                    );
                    
                    Log::info('Fire drill email sent', [
                        'to' => $recipient->email,
                        'fire_drill_id' => $fireDrill->id,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send fire drill email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for grocery status update
     */
    public function sendGroceryStatusEmail(GroceryStatusUpdate $groceryStatus, $recipients): void
    {
        $facility = $groceryStatus->branch?->facility;
        
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new GroceryStatusNotification($groceryStatus)
                    );
                    
                    Log::info('Grocery status email sent', [
                        'to' => $recipient->email,
                        'grocery_status_id' => $groceryStatus->id,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send grocery status email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for medication delivery
     */
    public function sendMedicationDeliveryEmail(MedicationDelivery $delivery, $recipients): void
    {
        $facility = $this->mailConfigService->getFacilityFromResident($delivery->resident);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Medication delivery email skipped - facility missing or deleted', [
                'delivery_id' => $delivery->id,
            ]);
            return;
        }

        $this->mailConfigService->configureForFacility($facility);
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new MedicationDeliveryNotification($delivery)
                    );
                    
                    Log::info('Medication delivery email sent', [
                        'to' => $recipient->email,
                        'delivery_id' => $delivery->id,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send medication delivery email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for resident sign-out
     */
    public function sendResidentSignOutEmail(ResidentSignOut $signOut, $recipients, string $eventType): void
    {
        $facility = $this->mailConfigService->getFacilityFromResident($signOut->resident);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Resident sign-out email skipped - facility missing or deleted', ['sign_out_id' => $signOut->id]);
            return;
        }
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        $recipientsToNotify = $this->emailPreferenceService->filterUsersForEmail(
            $recipients,
            'resident_sign_out',
            $facility
        );
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new ResidentSignOutNotification($signOut, $eventType)
                    );
                    
                    Log::info('Resident sign-out email sent', [
                        'to' => $recipient->email,
                        'sign_out_id' => $signOut->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send resident sign-out email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for staff clock-in/out
     */
    public function sendStaffClockInEmail(StaffClockIn $clockIn, $recipients, string $eventType): void
    {
        $facility = $clockIn->branch?->facility;
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Staff clock-in email skipped - facility missing or deleted', ['clock_in_id' => $clockIn->id]);
            return;
        }
        $this->mailConfigService->configureForFacility($facility);
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new StaffClockInNotification($clockIn, $eventType)
                    );
                    
                    Log::info('Staff clock-in email sent', [
                        'to' => $recipient->email,
                        'clock_in_id' => $clockIn->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send staff clock-in email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for visitor
     */
    public function sendVisitorEmail(Visitor $visitor, $recipients, string $eventType): void
    {
        $facility = $this->mailConfigService->getFacilityFromResident($visitor->resident);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Visitor email skipped - facility missing or deleted', ['visitor_id' => $visitor->id]);
            return;
        }
        $this->mailConfigService->configureForFacility($facility);
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new VisitorNotification($visitor, $eventType)
                    );
                    
                    Log::info('Visitor email sent', [
                        'to' => $recipient->email,
                        'visitor_id' => $visitor->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send visitor email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for employee document
     */
    public function sendEmployeeDocumentEmail(EmployeeDocument $document, $recipients, string $eventType): void
    {
        $facility = $this->mailConfigService->getFacilityFromUser($document->staff);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Employee document email skipped - facility missing or deleted', ['document_id' => $document->id]);
            return;
        }
        $this->mailConfigService->configureForFacility($facility);
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new EmployeeDocumentNotification($document, $eventType)
                    );
                    
                    Log::info('Employee document email sent', [
                        'to' => $recipient->email,
                        'document_id' => $document->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send employee document email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Notify facility/branch admins when the administration window has closed and the dose was not given.
     * (Triggered when a missed administration record is created by medications:mark-missed.)
     */
    public function sendMissedMedicationWindowAdminEmail(Medication $medication, Carbon $scheduledTime): void
    {
        $facility = $this->mailConfigService->getFacilityFromResident($medication->resident);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Missed medication window admin email skipped - facility missing or deleted', [
                'medication_id' => $medication->id,
            ]);
            return;
        }

        if (!$medication->branch_id) {
            Log::info('Missed medication window admin email skipped - medication has no branch', [
                'medication_id' => $medication->id,
            ]);
            return;
        }

        $this->mailConfigService->configureForFacility($facility);

        $facilityAdmins = User::where('facility_id', $facility->id)
            ->whereIn('role', ['administrator', 'admin'])
            ->where('is_active', true)
            ->get();

        $branchAdmins = User::where('assigned_branch_id', $medication->branch_id)
            ->whereIn('role', ['administrator', 'admin'])
            ->where('is_active', true)
            ->get();

        $admins = $facilityAdmins->merge($branchAdmins)->unique('id');

        $recipientsToNotify = $this->emailPreferenceService->filterUsersForEmail(
            $admins,
            'missed_medication_window',
            $facility
        );

        $windowMinutes = 60;
        $windowEnd = $scheduledTime->copy()->addMinutes($windowMinutes);
        $windowEndFormatted = $windowEnd->format('g:i A');

        foreach ($recipientsToNotify as $recipient) {
            if (!$recipient->email) {
                continue;
            }
            try {
                Mail::to($recipient->email)->send(
                    new MissedMedicationWindowAdminNotification($medication, $scheduledTime, $windowEndFormatted)
                );
                Log::info('Missed medication window admin email sent', [
                    'to' => $recipient->email,
                    'medication_id' => $medication->id,
                    'facility_id' => $facility->id,
                ]);
            } catch (\Exception $e) {
                Log::error('Failed to send missed medication window admin email', [
                    'to' => $recipient->email,
                    'medication_id' => $medication->id,
                    'error' => $e->getMessage(),
                    'facility_id' => $facility->id,
                ]);
            }
        }
    }

    /**
     * Send email notification for medication
     */
    public function sendMedicationEmail(Medication $medication, $recipients): void
    {
        $facility = $this->mailConfigService->getFacilityFromResident($medication->resident);
        if ($this->shouldSkipNotificationForFacility($facility)) {
            Log::info('Medication email skipped - facility missing or deleted', [
                'medication_id' => $medication->id,
                'resident_id' => $medication->resident_id,
            ]);
            return;
        }

        $this->mailConfigService->configureForFacility($facility);
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new MedicationNotification($medication)
                    );
                    
                    Log::info('Medication email sent', [
                        'to' => $recipient->email,
                        'medication_id' => $medication->id,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send medication email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }

    /**
     * Send email notification for expense category
     */
    public function sendExpenseCategoryEmail(ExpenseCategory $category, $recipients, string $eventType): void
    {
        $facility = $category->facility;
        
        if ($facility) {
            $this->mailConfigService->configureForFacility($facility);
        }
        
        $recipientsToNotify = $this->filterFacilityMailRecipients($recipients);
        
        foreach ($recipientsToNotify as $recipient) {
            if ($recipient->email) {
                try {
                    Mail::to($recipient->email)->send(
                        new ExpenseCategoryNotification($category, $eventType)
                    );
                    
                    Log::info('Expense category email sent', [
                        'to' => $recipient->email,
                        'category_id' => $category->id,
                        'event_type' => $eventType,
                        'facility_id' => $facility?->id,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Failed to send expense category email', [
                        'to' => $recipient->email,
                        'error' => $e->getMessage(),
                        'facility_id' => $facility?->id,
                    ]);
                }
            }
        }
    }
}

