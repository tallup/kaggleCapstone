<?php

namespace App\Services;

use App\Constants\UserRoles;
use App\Models\Appointment;
use App\Models\Assessment;
use App\Models\LeaveRequest;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Resident;
use App\Models\User;
use App\Models\VitalSign;
use Carbon\Carbon;

class DashboardService
{
    /**
     * Get dashboard stats for a user
     */
    public function getStatsForUser(User $user): array
    {
        if (UserRoles::isCaregiverRole($user->role)) {
            return $this->getCaregiverStats($user);
        }

        // Pass user to admin stats for potential facility filtering
        return $this->getAdminStats($user);
    }

    /**
     * Get caregiver dashboard stats
     */
    public function getCaregiverStats(User $user): array
    {
        $userId = $user->id;
        $branchId = $user->assigned_branch_id;

        // If no branch assigned, return empty stats
        if (!$branchId) {
            return [
                'assigned_residents' => 0,
                'todays_appointments' => 0,
                'pending_assessments' => 0,
                'today_vitals' => 0,
                'pending_leave_requests' => 0,
                'week_appointments' => 0,
                'user_type' => 'caregiver',
                'weekly_activity' => [],
                'medication_reminders' => [],
                'upcoming_appointments_list' => [],
                'resident_list' => [],
                'resident_vitals_trend' => null,
            ];
        }

        // Get all residents in this caregiver's branch
        $assignedResidents = Resident::where('branch_id', $branchId)
            ->where('is_active', true)
            ->count();

        // Today's appointments for residents in this branch
        $todayAppointments = Appointment::whereHas('resident', function ($q) use ($branchId) {
            $q->where('branch_id', $branchId)->where('is_active', true);
        })->whereDate('appointment_date', today())->count();

        // Pending assessments for residents in this branch
        $pendingAssessments = Assessment::whereHas('resident', function ($q) use ($branchId) {
            $q->where('branch_id', $branchId)->where('is_active', true);
        })->whereNotIn('status', ['approved', 'archived'])->count();

        // Vitals recorded today for residents in this branch
        $todayVitals = VitalSign::whereHas('resident', function ($q) use ($branchId) {
            $q->where('branch_id', $branchId)->where('is_active', true);
        })->whereDate('measurement_date', today())->count();

        // Pending leave requests
        $pendingLeaveRequests = LeaveRequest::where('staff_id', $userId)
            ->where('status', 'pending')->count();

        // Upcoming appointments this week for residents in this branch
        $weekAppointments = Appointment::whereHas('resident', function ($q) use ($branchId) {
            $q->where('branch_id', $branchId)->where('is_active', true);
        })->whereBetween('appointment_date', [today(), today()->addDays(7)])->count();

        // Weekly activity data for charts
        $weeklyActivity = $this->getWeeklyActivity($branchId);

        // Medication reminders for next hour
        $medicationReminders = $this->getMedicationReminders($branchId);

        // Upcoming appointments with details
        $upcomingAppointmentsList = $this->getUpcomingAppointments($branchId);

        // Resident list
        $residentList = $this->getResidentList($branchId);

        // Resident vitals trend for first resident (default)
        $defaultResident = Resident::where('branch_id', $branchId)
            ->where('is_active', true)
            ->first();
        $residentVitalsTrend = $defaultResident ? $this->getResidentVitalsTrend($defaultResident->id) : null;

        return [
            'assigned_residents' => $assignedResidents,
            'todays_appointments' => $todayAppointments,
            'pending_assessments' => $pendingAssessments,
            'today_vitals' => $todayVitals,
            'pending_leave_requests' => $pendingLeaveRequests,
            'week_appointments' => $weekAppointments,
            'user_type' => 'caregiver',
            'weekly_activity' => $weeklyActivity,
            'medication_reminders' => $medicationReminders,
            'upcoming_appointments_list' => $upcomingAppointmentsList,
            'resident_list' => $residentList,
            'resident_vitals_trend' => $residentVitalsTrend,
        ];
    }

    /**
     * Get admin dashboard stats
     */
    public function getAdminStats(?User $user = null): array
    {
        // If user provided, filter by facility (FacilityScope should handle this, but ensure it works)
        // The FacilityScope should automatically filter, but let's ensure we get the right context
        $residentsQuery = Resident::where('is_active', true);
        $appointmentsQuery = Appointment::query();
        $vitalsQuery = VitalSign::query();
        $staffQuery = User::where('is_active', true)->where('role', '!=', 'super_admin');
        $assessmentsQuery = Assessment::whereNotIn('status', ['approved', 'archived']);

        // FacilityScope should handle filtering, but ensure it's applied
        // Models with FacilityScope will automatically filter by facility
        
        return [
            'total_residents' => $residentsQuery->count(),
            'active_residents' => $residentsQuery->count(),
            'today_appointments' => $appointmentsQuery->whereDate('appointment_date', today())->count(),
            'upcoming_appointments' => $appointmentsQuery->whereDate('appointment_date', '>=', today())
                ->whereNotIn('status', ['cancelled', 'completed'])
                ->count(),
            'today_vitals' => $vitalsQuery->whereDate('measurement_date', today())->count(),
            'total_staff' => $staffQuery->count(),
            'pending_assessments' => $assessmentsQuery->count(),
            'user_type' => 'admin',
            'upcoming_appointments_list' => $this->getAdminUpcomingAppointments(),
            'resident_list' => $this->getAdminResidentList(),
            'medication_reminders' => $this->getAdminMedicationReminders(),
        ];
    }

    /**
     * Get weekly activity for a branch
     */
    private function getWeeklyActivity(?int $branchId): array
    {
        $now = now();
        $weekStart = $now->copy()->startOfWeek();
        $days = [];

        for ($i = 0; $i < 7; $i++) {
            $day = $weekStart->copy()->addDays($i);
            $days[] = [
                'date' => $day->format('Y-m-d'),
                'day' => $day->format('D'),
                'assessments' => Assessment::whereHas('resident', function ($q) use ($branchId) {
                    if ($branchId) {
                        $q->where('branch_id', $branchId)->where('is_active', true);
                    } else {
                        $q->where('is_active', true);
                    }
                })->whereDate('assessment_date', $day->toDateString())->count(),
                'vitals' => VitalSign::whereHas('resident', function ($q) use ($branchId) {
                    if ($branchId) {
                        $q->where('branch_id', $branchId)->where('is_active', true);
                    } else {
                        $q->where('is_active', true);
                    }
                })->whereDate('measurement_date', $day->toDateString())->count(),
            ];
        }

        return $days;
    }

    /**
     * Get medication reminders for a branch
     */
    private function getMedicationReminders(?int $branchId, int $limit = 5): array
    {
        $now = now();
        $next24Hours = $now->copy()->addHours(24);

        $medications = Medication::with(['resident', 'drug'])
            ->whereHas('resident', function ($q) use ($branchId) {
                if ($branchId) {
                    $q->where('branch_id', $branchId)->where('is_active', true);
                } else {
                    $q->where('is_active', true);
                }
            })
            ->where('is_active', true)
            ->where(function ($q) use ($now) {
                $q->where(function ($subQ) use ($now) {
                    $subQ->whereNull('start_date')->orWhere('start_date', '<=', $now);
                })
                    ->where(function ($subQ) use ($now) {
                        $subQ->whereNull('end_date')->orWhere('end_date', '>=', $now);
                    });
            })
            ->get();

        $reminders = [];

        foreach ($medications as $medication) {
            // Get scheduled times for today
            $times = [];
            for ($i = 1; $i <= 4; $i++) {
                if ($medication->{"time_{$i}"}) {
                    $time = Carbon::parse($medication->{"time_{$i}"})->format('H:i');
                    $times[] = $time;
                }
            }

            foreach ($times as $time) {
                $timeToday = Carbon::today()->setTimeFromTimeString($time);

                // Check if time is in next 24 hours and not already administered
                if ($timeToday >= $now && $timeToday <= $next24Hours) {
                    $alreadyAdministered = MedicationAdministration::where('medication_id', $medication->id)
                        ->whereDate('administered_at', today())
                        ->whereTime('administered_at', $time)
                        ->where('status', 'completed')
                        ->exists();

                    if (!$alreadyAdministered) {
                        $residentName = 'Unknown';
                        if ($medication->resident) {
                            $name = trim(($medication->resident->first_name ?? '') . ' ' . ($medication->resident->last_name ?? ''));
                            $residentName = !empty($name) ? $name : ($medication->resident->name ?? 'Unknown');
                        }
                        $reminders[] = [
                            'medication_id' => $medication->id,
                            'resident_name' => $residentName,
                            'medication_name' => $medication->drug?->name ?? $medication->name,
                            'medication_dosage' => $medication->instructions ?? '',
                            'due_time' => Carbon::parse($time)->format('g:i A'),
                            'room' => $medication->resident->room_number ?? $medication->resident->room ?? 'N/A',
                        ];
                    }
                }
            }
        }

        // Sort by time
        usort($reminders, function ($a, $b) {
            return strcmp($a['due_time'], $b['due_time']);
        });

        return array_slice($reminders, 0, $limit);
    }

    /**
     * Get upcoming appointments for a branch
     */
    private function getUpcomingAppointments(?int $branchId, int $limit = 5): array
    {
        return Appointment::with(['resident', 'appointmentType'])
            ->whereHas('resident', function ($q) use ($branchId) {
                if ($branchId) {
                    $q->where('branch_id', $branchId)->where('is_active', true);
                } else {
                    $q->where('is_active', true);
                }
            })
            ->whereDate('appointment_date', '>=', today())
            ->where('status', '!=', 'cancelled')
            ->orderBy('appointment_date')
            ->limit($limit)
            ->get()
            ->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'resident_name' => "{$appointment->resident->first_name} {$appointment->resident->last_name}",
                    'time' => $appointment->appointment_time
                        ? Carbon::parse($appointment->appointment_time)->format('g:i A')
                        : 'TBD',
                    'description' => $appointment->appointmentType?->name ?? $appointment->description,
                    'status' => $appointment->status,
                    'date' => $appointment->appointment_date->format('M d, Y'),
                ];
            })
            ->toArray();
    }

    /**
     * Get resident list for a branch
     */
    private function getResidentList(?int $branchId, int $limit = 10): array
    {
        $query = Resident::where('is_active', true);
        
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
        return $query->orderBy('first_name')
            ->limit($limit)
            ->get()
            ->map(function ($resident) {
                return [
                    'id' => $resident->id,
                    'name' => "{$resident->first_name} {$resident->last_name}",
                    'room' => $resident->room_number ?? 'N/A',
                ];
            })
            ->toArray();
    }

    /**
     * Get resident vitals trend
     */
    public function getResidentVitalsTrend(int $residentId): array
    {
        $now = now();
        $weekStart = $now->copy()->startOfWeek();
        $days = [];

        for ($i = 0; $i < 7; $i++) {
            $day = $weekStart->copy()->addDays($i);

            // Get vitals for this day
            $vital = VitalSign::where('resident_id', $residentId)
                ->whereDate('measurement_date', $day->toDateString())
                ->first();

            $days[] = [
                'date' => $day->format('Y-m-d'),
                'day' => $day->format('D'),
                'diastolic_bp' => $vital?->diastolic ?? null,
                'systolic_bp' => $vital?->systolic ?? null,
                'heart_rate' => $vital?->pulse ?? null,
            ];
        }

        return $days;
    }

    /**
     * Get admin upcoming appointments
     */
    private function getAdminUpcomingAppointments(): array
    {
        return Appointment::with(['resident', 'appointmentType', 'branch'])
            ->whereDate('appointment_date', '>=', today())
            ->whereNotIn('status', ['cancelled', 'completed'])
            ->orderBy('appointment_date')
            ->orderBy('appointment_time')
            ->limit(10)
            ->get()
            ->map(function ($appointment) {
                $residentName = 'Unknown';
                if ($appointment->resident) {
                    $name = trim(($appointment->resident->first_name ?? '') . ' ' . ($appointment->resident->last_name ?? ''));
                    $residentName = !empty($name) ? $name : ($appointment->resident->name ?? 'Unknown');
                }
                return [
                    'id' => $appointment->id,
                    'resident_name' => $residentName,
                    'time' => $appointment->appointment_time
                        ? Carbon::parse($appointment->appointment_time)->format('g:i A')
                        : 'TBD',
                    'description' => $appointment->appointmentType?->name ?? $appointment->description ?? 'Appointment',
                    'status' => $appointment->status ?? 'scheduled',
                    'date' => $appointment->appointment_date ? $appointment->appointment_date->format('M d, Y') : 'TBD',
                ];
            })
            ->toArray();
    }

    /**
     * Get admin resident list
     */
    private function getAdminResidentList(): array
    {
        return Resident::where('is_active', true)
            ->orderByRaw('COALESCE(first_name, name)')
            ->limit(10)
            ->get()
            ->map(function ($resident) {
                $name = trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? ''));
                if (empty($name)) {
                    $name = $resident->name ?? 'Unknown';
                }
                return [
                    'id' => $resident->id,
                    'name' => $name,
                    'room' => $resident->room_number ?? $resident->room ?? 'N/A',
                ];
            })
            ->toArray();
    }

    /**
     * Get admin medication reminders
     */
    private function getAdminMedicationReminders(): array
    {
        return $this->getMedicationReminders(null, 10);
    }
}


