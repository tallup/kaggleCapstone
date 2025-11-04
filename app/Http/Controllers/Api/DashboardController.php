<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\Appointment;
use App\Models\VitalSign;
use App\Models\User;
use App\Models\Medication;
use App\Models\Assessment;
use App\Models\MedicationAdministration;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $user = auth()->user();
        
        // Check if user is a caregiver
        $isCaregiver = in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse']);
        
        if ($isCaregiver) {
            return $this->caregiverStats($user);
        }
        
        // Admin stats
        $stats = [
            'total_residents' => Resident::count(),
            'active_residents' => Resident::where('status', 'active')->count(),
            'today_appointments' => Appointment::whereDate('appointment_date', today())->count(),
            'upcoming_appointments' => Appointment::whereDate('appointment_date', '>=', today())
                ->where('status', 'scheduled')
                ->count(),
            'today_vitals' => VitalSign::whereDate('measurement_date', today())->count(),
            'total_staff' => User::where('is_active', true)->count(),
            'pending_assessments' => 0,
        ];

        return response()->json($stats);
    }
    
    public function residentVitalsTrend($residentId): JsonResponse
    {
        $user = auth()->user();
        
        // Verify caregiver has access to this resident
        if (in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse'])) {
            $hasAccess = Resident::where('id', $residentId)
                ->whereHas('assignments', function($q) use ($user) {
                    $q->where('caregiver_id', $user->id)->where('is_active', true);
                })
                ->exists();
            
            if (!$hasAccess) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }
        }
        
        $trend = $this->getResidentVitalsTrend($residentId);
        return response()->json($trend);
    }
    
    private function caregiverStats($user): JsonResponse
    {
        $userId = $user->id;
        
        // Get residents assigned to this caregiver
        $assignedResidents = Resident::whereHas('assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->count();
        
        // Today's appointments for assigned residents
        $todayAppointments = Appointment::whereHas('resident.assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->whereDate('appointment_date', today())->count();
        
        // Pending assessments for assigned residents
        $pendingAssessments = \App\Models\Assessment::whereHas('resident.assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->whereNotIn('status', ['approved', 'archived'])->count();
        
        // Vitals recorded today
        $todayVitals = VitalSign::whereHas('resident.assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->whereDate('measurement_date', today())->count();
        
        // Pending leave requests
        $pendingLeaveRequests = \App\Models\LeaveRequest::where('staff_id', $userId)
            ->where('status', 'pending')->count();
        
        // Upcoming appointments this week
        $weekAppointments = Appointment::whereHas('resident.assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->whereBetween('appointment_date', [today(), today()->addDays(7)])->count();
        
        // Weekly activity data for charts
        $weeklyActivity = $this->getWeeklyActivity($userId);
        
        // Medication reminders for next hour
        $medicationReminders = $this->getMedicationReminders($userId);
        
        // Upcoming appointments with details
        $upcomingAppointmentsList = $this->getUpcomingAppointments($userId);
        
        // Resident list
        $residentList = $this->getResidentList($userId);
        
        // Resident vitals trend for first resident (default)
        $defaultResident = Resident::whereHas('assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->first();
        $residentVitalsTrend = $defaultResident ? $this->getResidentVitalsTrend($defaultResident->id) : null;
        
        return response()->json([
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
        ]);
    }
    
    private function getWeeklyActivity($userId): array
    {
        $now = now();
        $weekStart = $now->copy()->startOfWeek();
        $days = [];
        
        for ($i = 0; $i < 7; $i++) {
            $day = $weekStart->copy()->addDays($i);
            $days[] = [
                'date' => $day->format('Y-m-d'),
                'day' => $day->format('D'),
                'assessments' => Assessment::whereHas('resident.assignments', function($q) use ($userId) {
                    $q->where('caregiver_id', $userId)->where('is_active', true);
                })->whereDate('assessment_date', $day->toDateString())->count(),
                'vitals' => VitalSign::whereHas('resident.assignments', function($q) use ($userId) {
                    $q->where('caregiver_id', $userId)->where('is_active', true);
                })->whereDate('measurement_date', $day->toDateString())->count(),
            ];
        }
        
        return $days;
    }
    
    private function getMedicationReminders($userId): array
    {
        $now = now();
        $next24Hours = $now->copy()->addHours(24);
        
        $medications = Medication::with(['resident', 'drug'])
            ->whereHas('resident.assignments', function($q) use ($userId) {
                $q->where('caregiver_id', $userId)->where('is_active', true);
            })
            ->where('is_active', true)
            ->where(function($q) use ($now) {
                $q->where(function($subQ) use ($now) {
                    $subQ->whereNull('start_date')->orWhere('start_date', '<=', $now);
                })
                ->where(function($subQ) use ($now) {
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
                        $reminders[] = [
                            'medication_id' => $medication->id,
                            'resident_name' => "{$medication->resident->first_name} {$medication->resident->last_name}",
                            'medication_name' => $medication->drug?->name ?? $medication->name,
                            'medication_dosage' => $medication->instructions ?? '',
                            'due_time' => Carbon::parse($time)->format('g:i A'),
                            'room' => $medication->resident->room_number ?? 'N/A',
                        ];
                    }
                }
            }
        }
        
        // Sort by time
        usort($reminders, function($a, $b) {
            return strcmp($a['due_time'], $b['due_time']);
        });
        
        return array_slice($reminders, 0, 5); // Limit to 5 reminders
    }
    
    private function getUpcomingAppointments($userId): array
    {
        return Appointment::with(['resident', 'appointmentType'])
            ->whereHas('resident.assignments', function($q) use ($userId) {
                $q->where('caregiver_id', $userId)->where('is_active', true);
            })
            ->whereDate('appointment_date', '>=', today())
            ->where('status', '!=', 'cancelled')
            ->orderBy('appointment_date')
            ->limit(5)
            ->get()
            ->map(function($appointment) {
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
    
    private function getResidentList($userId): array
    {
        return Resident::whereHas('assignments', function($q) use ($userId) {
                $q->where('caregiver_id', $userId)->where('is_active', true);
            })
            ->with('assignments')
            ->orderBy('first_name')
            ->limit(10)
            ->get()
            ->map(function($resident) {
                return [
                    'id' => $resident->id,
                    'name' => "{$resident->first_name} {$resident->last_name}",
                    'room' => $resident->room_number ?? 'N/A',
                ];
            })
            ->toArray();
    }
    
    private function getResidentVitalsTrend($residentId): array
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
}

