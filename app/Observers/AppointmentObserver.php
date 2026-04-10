<?php

namespace App\Observers;

use App\Models\Appointment;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;

class AppointmentObserver
{
    /**
     * Notify relevant users when an appointment is completed.
     */
    public function updated(Appointment $appointment): void
    {
        if (!$appointment->wasChanged('status')) {
            return;
        }

        // Only act on transition to completed
        if ($appointment->status !== 'completed') {
            return;
        }

        $appointment->load(['resident.assignments.caregiver', 'appointmentType']);

        $recipients = $appointment->resident?->assignments
            ->where('is_active', true)
            ->pluck('caregiver')
            ->filter();

        if ($recipients->isEmpty()) {
            $recipients = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                ->where('is_active', true)
                ->get();
        }

        $residentName = trim(($appointment->resident->first_name ?? '') . ' ' . ($appointment->resident->last_name ?? ''));
        $appointmentType = $appointment->appointmentType?->name ?? 'General';
        $date = $appointment->appointment_date
            ? Carbon::parse($appointment->appointment_date)->format('M d, Y')
            : 'Date TBD';

        // Get facility_id from resident's branch
        $facilityId = $appointment->resident?->branch?->facility_id;

        foreach ($recipients as $user) {
            Notification::create([
                'user_id' => $user->id,
                'facility_id' => $appointment->resident?->branch?->facility_id ?? null,
                'branch_id' => $appointment->branch_id ?? $appointment->resident?->branch_id ?? null,
                'type' => 'appointment_completed',
                'title' => 'Appointment Completed',
                'message' => "{$residentName}'s {$appointmentType} appointment on {$date} was marked completed.",
                'icon' => 'calendar-check',
                'icon_color' => 'text-[var(--theme-primary)]',
                'action_url' => '/appointments',
                'metadata' => [
                    'appointment_id' => $appointment->id,
                    'resident_id' => $appointment->resident_id,
                    'status' => $appointment->status,
                    'facility_id' => $facilityId,
                ],
            ]);
        }

        // Send email notifications
        $notificationService = app(NotificationService::class);
        $notificationService->sendAppointmentEmail($appointment, $recipients, 'completed');
    }

    /**
     * Handle the Appointment "created" event.
     */
    public function created(Appointment $appointment): void
    {
        // Only create notification for scheduled/confirmed appointments
        if (!in_array($appointment->status, ['scheduled', 'confirmed'])) {
            return;
        }

        // Load relationships
        $appointment->load(['resident.assignments.caregiver', 'appointmentType']);

        // Get assigned caregivers for this resident
        $caregivers = $appointment->resident?->assignments
            ->where('is_active', true)
            ->pluck('caregiver')
            ->filter();
        
        // If no caregivers, notify all admins/managers
        if ($caregivers->isEmpty()) {
            $caregivers = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                ->where('is_active', true)
                ->get();
        }

        foreach ($caregivers as $caregiver) {
            // Calculate days until appointment
            $appointmentDate = Carbon::parse($appointment->appointment_date)->startOfDay();
            $now = now()->startOfDay();
            $daysUntil = $now->diffInDays($appointmentDate, false); // false = signed difference (positive if future, negative if past)
            
            // Only create notification for future appointments or today
            if ($daysUntil < 0) {
                // Appointment is in the past, skip notification
                continue;
            }
            
            // Create title based on days until
            $title = $daysUntil == 0 ? 'Appointment Today' : 
                    ($daysUntil == 1 ? 'Appointment Tomorrow' : 
                    "Appointment in {$daysUntil} days");
            
            $appointmentType = $appointment->appointmentType?->name ?? 'General';
            $time = 'TBD';
            if ($appointment->appointment_time) {
                try {
                    // Parse time string (HH:mm:ss or HH:mm format)
                    $timeParts = explode(':', $appointment->appointment_time);
                    if (count($timeParts) >= 2) {
                        $hours = (int)$timeParts[0];
                        $minutes = (int)$timeParts[1];
                        $time = Carbon::createFromTime($hours, $minutes)->format('g:i A');
                    }
                } catch (\Exception $e) {
                    $time = 'TBD';
                }
            }
            
            $residentName = trim(($appointment->resident->first_name ?? '') . ' ' . ($appointment->resident->last_name ?? ''));
            
            // Get facility_id from resident's branch
            $facilityId = $appointment->resident?->branch?->facility_id;
            
            Notification::create([
                'user_id' => $caregiver->id,
                'facility_id' => $appointment->resident?->branch?->facility_id ?? null,
                'branch_id' => $appointment->branch_id ?? $appointment->resident?->branch_id ?? null,
                'type' => 'appointment_upcoming',
                'title' => $title,
                'message' => "{$residentName} has a {$appointmentType} appointment on " . 
                           Carbon::parse($appointment->appointment_date)->format('M d, Y') . 
                           " at {$time}",
                'icon' => 'calendar',
                'icon_color' => 'text-green-600',
                'action_url' => '/appointments',
                'metadata' => [
                    'appointment_id' => $appointment->id,
                    'resident_id' => $appointment->resident_id,
                    'days_until' => $daysUntil,
                    'facility_id' => $facilityId,
                ],
            ]);
        }

        // Send email notifications
        $notificationService = app(NotificationService::class);
        $notificationService->sendAppointmentEmail($appointment, $caregivers, 'created');
    }
}

