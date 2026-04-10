<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\NotificationService;
use App\Models\Notification;
use App\Models\Appointment;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\FireDrill;
use App\Models\Resident;
use App\Models\User;
use Carbon\Carbon;

class GenerateNotifications extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'notifications:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate notifications for upcoming appointments and medication administrations';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Generating notifications...');

        try {
            // Generate appointment notifications
            $appointmentsCreated = $this->generateAppointmentNotifications();
            $this->info("Created {$appointmentsCreated} appointment notifications");

            // Generate medication notifications
            $medicationsCreated = $this->generateMedicationNotifications();
            $this->info("Created {$medicationsCreated} medication notifications");

            // Generate fire drill notifications
            $fireDrillsCreated = $this->generateFireDrillNotifications();
            $this->info("Created {$fireDrillsCreated} fire drill notifications");

            // Check for late medications and vital signs (requires container-resolved NotificationService)
            $this->checkLateMedications();
            $this->checkLateVitalSigns();

            $this->info('Notification generation complete!');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('notifications:generate failed', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);
            $this->error($e->getMessage());

            return Command::FAILURE;
        }

        return Command::SUCCESS;
    }

    /**
     * Generate notifications for upcoming appointments
     */
    private function generateAppointmentNotifications(): int
    {
        $count = 0;
        $now = now();

        // Get appointments in the next 7 days
        $appointments = Appointment::with(['resident.assignments.caregiver'])
            ->whereIn('status', ['scheduled', 'confirmed'])
            ->whereBetween('appointment_date', [$now->toDateString(), $now->copy()->addDays(7)->toDateString()])
            ->get();

        foreach ($appointments as $appointment) {
            if (! $appointment->resident) {
                continue;
            }

            // Get assigned caregivers for this resident
            $caregivers = $appointment->resident->assignments
                ->where('is_active', true)
                ->pluck('caregiver')
                ->filter();
            
            // If no caregivers, notify all admins/managers
            if ($caregivers->isEmpty()) {
                $caregivers = User::whereIn('role', ['administrator', 'admin', 'manager'])
                    ->where('is_active', true)
                    ->get();
            }

            foreach ($caregivers as $caregiver) {
                // Check if notification already exists
                $exists = Notification::where('user_id', $caregiver->id)
                    ->where('type', 'appointment_upcoming')
                    ->whereJsonContains('metadata->appointment_id', $appointment->id)
                    ->where('created_at', '>=', $now->copy()->subDay())
                    ->exists();

                if (!$exists) {
                    $daysUntil = Carbon::parse($appointment->appointment_date)->diffInDays($now);
                    $title = $daysUntil == 0 ? 'Appointment Today' : ($daysUntil == 1 ? 'Appointment Tomorrow' : "Appointment in {$daysUntil} days");
                    
                    $appointmentType = $appointment->appointmentType?->name ?? 'General';
                    $time = $appointment->appointment_time ? Carbon::parse($appointment->appointment_time)->format('g:i A') : 'TBD';
                    
                    $residentName = trim(($appointment->resident->first_name ?? '') . ' ' . ($appointment->resident->last_name ?? ''));
                    
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
                        ],
                    ]);
                    $count++;
                }
            }
        }

        return $count;
    }

    /**
     * Generate notifications for upcoming medication administrations
     */
    private function generateMedicationNotifications(): int
    {
        $count = 0;
        $now = now();

        // Get active medications
        $medications = Medication::with(['resident.assignments.caregiver', 'drug'])
            ->where('is_active', true)
            ->where(function($query) use ($now) {
                $query->where(function($q) use ($now) {
                    $q->whereNull('start_date')
                      ->orWhere('start_date', '<=', $now);
                })
                ->where(function($q) use ($now) {
                    $q->whereNull('end_date')
                      ->orWhere('end_date', '>=', $now);
                });
            })
            ->get();

        foreach ($medications as $medication) {
            if (! $medication->resident) {
                continue;
            }

            // Get assigned caregivers for this resident
            $caregivers = $medication->resident->assignments
                ->where('is_active', true)
                ->pluck('caregiver')
                ->filter();
            
            // If no caregivers, notify all admins/managers
            if ($caregivers->isEmpty()) {
                $caregivers = User::whereIn('role', ['administrator', 'admin', 'manager'])
                    ->where('is_active', true)
                    ->get();
            }

            foreach ($caregivers as $caregiver) {
                // Get all scheduled administration times for today
                $adminTimes = $this->getScheduledAdminTimes($medication);

                foreach ($adminTimes as $adminTime) {
                    // Check if already administered today
                    $alreadyAdministered = MedicationAdministration::where('medication_id', $medication->id)
                        ->whereDate('administered_at', $now->toDateString())
                        ->where('status', 'completed')
                        ->exists();

                    if (!$alreadyAdministered) {
                        // Check if notification already exists for this time today
                        $exists = Notification::where('user_id', $caregiver->id)
                            ->where('type', 'medication_due')
                            ->whereJsonContains('metadata->medication_id', $medication->id)
                            ->whereDate('created_at', $now->toDateString())
                            ->whereJsonContains('metadata->scheduled_time', $adminTime)
                            ->exists();

                        if (!$exists) {
                            $drugName = $medication->drug?->name ?? $medication->name;
                            
                            $residentName = trim(($medication->resident->first_name ?? '') . ' ' . ($medication->resident->last_name ?? ''));
                            
                            Notification::create([
                                'user_id' => $caregiver->id,
                                'facility_id' => $medication->resident?->branch?->facility_id ?? null,
                                'branch_id' => $medication->branch_id ?? $medication->resident?->branch_id ?? null,
                                'type' => 'medication_due',
                                'title' => 'Medication Due',
                                'message' => "Give {$drugName} to {$residentName} at {$adminTime}",
                                'icon' => 'pill',
                                'icon_color' => 'text-red-600',
                                'action_url' => '/medications',
                                'metadata' => [
                                    'medication_id' => $medication->id,
                                    'resident_id' => $medication->resident_id,
                                    'scheduled_time' => $adminTime,
                                ],
                            ]);
                            $count++;
                        }
                    }
                }
            }
        }

        return $count;
    }

    /**
     * Get scheduled administration times for a medication
     */
    private function getScheduledAdminTimes($medication): array
    {
        $times = [];
        
        // First check if medication has explicit time fields (time_1, time_2, etc.)
        if ($medication->time_1) {
            $times[] = Carbon::parse($medication->time_1)->format('g:i A');
        }
        if ($medication->time_2) {
            $times[] = Carbon::parse($medication->time_2)->format('g:i A');
        }
        if ($medication->time_3) {
            $times[] = Carbon::parse($medication->time_3)->format('g:i A');
        }
        if ($medication->time_4) {
            $times[] = Carbon::parse($medication->time_4)->format('g:i A');
        }

        // If no explicit times, parse the instruction
        if (empty($times)) {
            $instruction = $medication->instructions ?? '';
            
            // Common patterns
            if (stripos($instruction, 'three times') !== false || stripos($instruction, 'three times daily') !== false) {
                // 8 AM, 2 PM, 8 PM
                $times = ['8:00 AM', '2:00 PM', '8:00 PM'];
            } elseif (stripos($instruction, 'two times') !== false || stripos($instruction, 'twice daily') !== false) {
                // 9 AM, 9 PM
                $times = ['9:00 AM', '9:00 PM'];
            } elseif (stripos($instruction, 'once daily') !== false || stripos($instruction, 'once a day') !== false) {
                // 9 AM
                $times = ['9:00 AM'];
            } elseif (stripos($instruction, 'four times') !== false || stripos($instruction, 'every 6 hours') !== false) {
                // 6 AM, 12 PM, 6 PM, 12 AM
                $times = ['6:00 AM', '12:00 PM', '6:00 PM', '12:00 AM'];
            } elseif (stripos($instruction, 'every 8 hours') !== false || stripos($instruction, 'three times daily') !== false) {
                // 8 AM, 4 PM, 12 AM
                $times = ['8:00 AM', '4:00 PM', '12:00 AM'];
            } else {
                // Default: once in the morning
                $times = ['9:00 AM'];
            }
        }

        return $times;
    }

    /**
     * Generate notifications for fire drills (1 day before and on the day)
     */
    private function generateFireDrillNotifications(): int
    {
        $count = 0;
        $now = now();

        // Get fire drills scheduled for tomorrow (1 day before)
        $drillsOneDayBefore = FireDrill::with(['branch'])
            ->oneDayBefore()
            ->get();

        // Get fire drills scheduled for today
        $drillsToday = FireDrill::with(['branch'])
            ->today()
            ->get();

        // Combine and process
        $allDrills = $drillsOneDayBefore->merge($drillsToday);

        foreach ($allDrills as $drill) {
            // Get all staff in the branch and admins
            $users = User::where(function($query) use ($drill) {
                $query->where('assigned_branch_id', $drill->branch_id)
                    ->orWhereIn('role', ['administrator', 'admin', 'manager', 'super_admin']);
            })
            ->where('is_active', true)
            ->get();

            $drillDate = Carbon::parse($drill->scheduled_date)->format('M d, Y');
            $drillTime = $drill->scheduled_time ? Carbon::parse($drill->scheduled_time)->format('g:i A') : 'TBD';
            $isToday = $drill->scheduled_date->isToday();
            $title = $isToday ? 'Fire Drill Today' : 'Fire Drill Tomorrow';
            $type = $isToday ? 'fire_drill_today' : 'fire_drill_reminder';

            foreach ($users as $user) {
                // Check if notification already exists (avoid duplicates)
                $exists = \App\Models\Notification::where('user_id', $user->id)
                    ->where('type', $type)
                    ->whereJsonContains('metadata->fire_drill_id', $drill->id)
                    ->whereDate('created_at', $now->toDateString())
                    ->exists();

                if (!$exists) {
                    $branchLabel = $drill->branch?->name ?? 'Unknown branch';
                    \App\Models\Notification::create([
                        'user_id' => $user->id,
                        'facility_id' => $drill->branch?->facility_id ?? null,
                        'branch_id' => $drill->branch_id ?? null,
                        'type' => $type,
                        'title' => $title,
                        'message' => "Fire drill scheduled for {$branchLabel} on {$drillDate} at {$drillTime}",
                        'icon' => 'alert-triangle',
                        'icon_color' => 'text-orange-600',
                        'action_url' => '/fire-drills',
                        'metadata' => [
                            'fire_drill_id' => $drill->id,
                            'branch_id' => $drill->branch_id,
                            'scheduled_date' => $drill->scheduled_date->toDateString(),
                        ],
                    ]);
                    $count++;
                }
            }
        }

        return $count;
    }

    /**
     * Check for late medications and send email notifications
     */
    private function checkLateMedications(): void
    {
        $service = app(NotificationService::class);
        $now = now();

        // Get active medications with scheduled times
        $medications = Medication::with(['resident.assignments.caregiver', 'drug'])
            ->where('is_active', true)
            ->where(function($query) use ($now) {
                $query->whereNull('start_date')
                      ->orWhere('start_date', '<=', $now);
            })
            ->where(function($query) use ($now) {
                $query->whereNull('end_date')
                      ->orWhere('end_date', '>=', $now);
            })
            ->get();

        foreach ($medications as $medication) {
            if (! $medication->resident) {
                continue;
            }

            $adminTimes = $this->getScheduledAdminTimes($medication);
            
            foreach ($adminTimes as $adminTime) {
                try {
                    // Parse scheduled time
                    $scheduledTime = Carbon::parse($adminTime);
                    $currentTime = Carbon::now();
                    
                    // Check if medication is 30+ minutes late
                    if ($scheduledTime->isPast() && $currentTime->diffInMinutes($scheduledTime) >= 30) {
                        // Check if not administered yet today
                        $alreadyAdministered = MedicationAdministration::where('medication_id', $medication->id)
                            ->whereDate('administered_at', $now->toDateString())
                            ->where('status', 'completed')
                            ->where(function($q) use ($adminTime) {
                                // Check if administered within 30 minutes of scheduled time
                                $scheduledTime = Carbon::parse($adminTime);
                                $q->whereTime('administered_at', '>=', $scheduledTime->copy()->subMinutes(30)->toTimeString())
                                  ->whereTime('administered_at', '<=', $scheduledTime->copy()->addMinutes(30)->toTimeString());
                            })
                            ->exists();

                        if (!$alreadyAdministered) {
                            // Check if we already sent notification today for this medication/time
                            $notificationSent = \App\Models\Notification::where('type', 'late_medication_email')
                                ->whereJsonContains('metadata->medication_id', $medication->id)
                                ->whereJsonContains('metadata->scheduled_time', $adminTime)
                                ->whereDate('created_at', $now->toDateString())
                                ->exists();

                            if (!$notificationSent) {
                                // Get assigned caregivers
                                $caregivers = $medication->resident?->assignments
                                    ->where('is_active', true)
                                    ->pluck('caregiver')
                                    ->filter();
                                
                                if ($caregivers->isEmpty()) {
                                    $caregivers = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                                        ->where('is_active', true)
                                        ->get();
                                }

                                // Send email notification
                                $service->sendLateMedicationEmail($medication, $medication->resident, $caregivers);

                                // Create notification record
                                foreach ($caregivers as $caregiver) {
                                    \App\Models\Notification::create([
                                        'user_id' => $caregiver->id,
                                        'facility_id' => $medication->resident?->branch?->facility_id ?? null,
                                        'branch_id' => $medication->branch_id ?? $medication->resident?->branch_id ?? null,
                                        'type' => 'late_medication_email',
                                        'title' => 'Late Medication Alert',
                                        'message' => ($medication->drug?->name ?? $medication->name) . " for " . 
                                                   trim(($medication->resident->first_name ?? '') . ' ' . ($medication->resident->last_name ?? '')) . 
                                                   " was scheduled for {$adminTime} but has not been administered",
                                        'icon' => 'alert-circle',
                                        'icon_color' => 'text-red-600',
                                        'action_url' => '/medications',
                                        'metadata' => [
                                            'medication_id' => $medication->id,
                                            'resident_id' => $medication->resident_id,
                                            'scheduled_time' => $adminTime,
                                        ],
                                    ]);
                                }
                            }
                        }
                    }
                } catch (\Exception $e) {
                    // Skip invalid time formats
                    continue;
                }
            }
        }
    }

    /**
     * Check for late vital signs and create in-app notifications (no email).
     */
    private function checkLateVitalSigns(): void
    {
        $now = now();

        // Get all active residents
        $residents = Resident::with(['assignments.caregiver', 'vitalSigns'])
            ->where('is_active', true)
            ->get();

        foreach ($residents as $resident) {
            // Get last vital sign
            $lastVitalSign = $resident->vitalSigns()
                ->orderBy('measurement_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->first();

            // Check if last vital sign is 24+ hours old
            if (!$lastVitalSign || $now->diffInHours($lastVitalSign->measurement_date) >= 24) {
                $hoursOverdue = $lastVitalSign 
                    ? $now->diffInHours($lastVitalSign->measurement_date) 
                    : 999; // No vital signs ever recorded

                // Check if we already sent notification today for this resident
                $notificationSent = \App\Models\Notification::where('type', 'late_vital_sign_email')
                    ->whereJsonContains('metadata->resident_id', $resident->id)
                    ->whereDate('created_at', $now->toDateString())
                    ->exists();

                if (!$notificationSent) {
                    // Get assigned caregivers
                    $caregivers = $resident->assignments
                        ->where('is_active', true)
                        ->pluck('caregiver')
                        ->filter();
                    
                    if ($caregivers->isEmpty()) {
                        $caregivers = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                            ->where('is_active', true)
                            ->get();
                    }

                    // Create in-app notification record
                    foreach ($caregivers as $caregiver) {
                        \App\Models\Notification::create([
                            'user_id' => $caregiver->id,
                            'facility_id' => $resident->branch?->facility_id ?? null,
                            'branch_id' => $resident->branch_id ?? null,
                            'type' => 'late_vital_sign_email',
                            'title' => 'Late Vital Sign Alert',
                            'message' => "Vital signs for " . 
                                       trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? '')) . 
                                       " are overdue by {$hoursOverdue} hours",
                            'icon' => 'activity',
                            'icon_color' => 'text-red-600',
                            'action_url' => '/vitals',
                            'metadata' => [
                                'resident_id' => $resident->id,
                                'hours_overdue' => $hoursOverdue,
                            ],
                        ]);
                    }
                }
            }
        }
    }
}
