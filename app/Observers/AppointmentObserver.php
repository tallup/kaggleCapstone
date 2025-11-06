<?php

namespace App\Observers;

use App\Models\Appointment;
use App\Models\Notification;
use App\Models\User;
use Carbon\Carbon;

class AppointmentObserver
{
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
            
            Notification::create([
                'user_id' => $caregiver->id,
                'type' => 'appointment_upcoming',
                'title' => $title,
                'message' => "{$residentName} has a {$appointmentType} appointment on " . 
                           Carbon::parse($appointment->appointment_date)->format('M d, Y') . 
                           " at {$time}",
                'icon' => 'calendar',
                'icon_color' => 'text-green-600',
                'action_url' => '/app/appointments',
                'metadata' => [
                    'appointment_id' => $appointment->id,
                    'resident_id' => $appointment->resident_id,
                    'days_until' => $daysUntil,
                ],
            ]);
        }
    }
}

