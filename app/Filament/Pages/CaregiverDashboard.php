<?php

namespace App\Filament\Pages;

use Filament\Pages\Page;
use App\Models\Resident;
use App\Models\Appointment;
use App\Models\Assessment;
use App\Models\VitalSign;
use App\Models\LeaveRequest;
use App\Models\Assignment;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class CaregiverDashboard extends Page
{
    protected static ?string $navigationIcon = 'heroicon-o-home';
    protected static string $view = 'filament.pages.caregiver-dashboard';
    protected static ?string $title = 'Caregiver Dashboard';
    protected static ?string $navigationLabel = 'Dashboard';
    protected static ?int $navigationSort = -1000;
    protected static ?string $navigationGroup = 'Dashboard';

    public static function canAccess(): bool
    {
        $user = Auth::user();
        return Auth::check() && (
            $user->role === 'caregiver' || 
            $user->role === 'care_giver' || 
            $user->role === 'nurse' || 
            $user->role === 'registered_nurse' || 
            $user->role === 'licensed_nurse' ||
            $user->hasRole('caregiver')
        );
    }

    public static function shouldRegisterNavigation(): bool
    {
        return false; // Hidden from navigation, accessed via Dashboard redirect
    }

    public function getStats(): array
    {
        $userId = auth()->id();
        
        // Get residents assigned to this caregiver
        $assignedResidents = Resident::whereHas('assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->count();
        
        // Today's appointments for assigned residents
        $todayAppointments = Appointment::whereHas('resident.assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->whereDate('appointment_date', today())->count();
        
        // Pending assessments for assigned residents
        $pendingAssessments = Assessment::whereHas('resident.assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->whereNotIn('status', ['approved', 'archived'])->count();
        
        // Vitals recorded today
        $todayVitals = VitalSign::whereHas('resident.assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->whereDate('measurement_date', today())->count();
        
        // Pending leave requests
        $pendingLeaveRequests = LeaveRequest::where('staff_id', $userId)
            ->where('status', 'pending')->count();
        
        // Upcoming appointments this week
        $weekAppointments = Appointment::whereHas('resident.assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->whereBetween('appointment_date', [today(), today()->addDays(7)])->count();

        return [
            'assigned_residents' => $assignedResidents,
            'todays_appointments' => $todayAppointments,
            'pending_assessments' => $pendingAssessments,
            'vitals_recorded_today' => $todayVitals,
            'pending_leave_requests' => $pendingLeaveRequests,
            'this_weeks_appointments' => $weekAppointments,
        ];
    }

    public function getChartData(): array
    {
        $userId = auth()->id();
        $today = Carbon::today();
        $weekStart = $today->copy()->startOfWeek();
        $weekEnd = $today->copy()->endOfWeek();
        
        // Get assigned residents
        $assignedResidents = Resident::whereHas('assignments', function($query) use ($userId) {
            $query->where('caregiver_id', $userId)->where('is_active', true);
        })->get();
        
        $residentIds = $assignedResidents->pluck('id');
        
        // Vital signs data for the week
        $vitalSigns = VitalSign::whereIn('resident_id', $residentIds)
            ->whereBetween('measurement_date', [$weekStart, $weekEnd])
            ->orderBy('measurement_date')
            ->get();
        
        // Group by day
        $vitalSignsByDay = $vitalSigns->groupBy(function($item) {
            return $item->measurement_date->format('Y-m-d');
        });
        
        // Create chart data
        $chartData = [];
        $labels = [];
        
        for ($i = 0; $i < 7; $i++) {
            $date = $weekStart->copy()->addDays($i);
            $dateStr = $date->format('Y-m-d');
            $labels[] = $date->format('M j');
            
            $dayVitals = $vitalSignsByDay->get($dateStr, collect());
            $chartData[] = $dayVitals->count();
        }
        
        // Assessment completion data
        $assessments = Assessment::whereIn('resident_id', $residentIds)
            ->whereBetween('created_at', [$weekStart, $weekEnd])
            ->get();
        
        $assessmentData = [];
        for ($i = 0; $i < 7; $i++) {
            $date = $weekStart->copy()->addDays($i);
            $dateStr = $date->format('Y-m-d');
            
            $dayAssessments = $assessments->filter(function($item) use ($dateStr) {
                return $item->created_at->format('Y-m-d') === $dateStr;
            });
            
            $assessmentData[] = $dayAssessments->count();
        }
        
        return [
            'labels' => $labels,
            'datasets' => [
                [
                    'label' => 'Vital Signs',
                    'data' => $chartData,
                    'borderColor' => '#3B82F6', // blue-500
                    'backgroundColor' => 'rgba(59, 130, 246, 0.1)',
                    'tension' => 0.3,
                    'fill' => false,
                ],
                [
                    'label' => 'Assessments',
                    'data' => $assessmentData,
                    'borderColor' => '#10B981', // emerald-500
                    'backgroundColor' => 'rgba(16, 185, 129, 0.1)',
                    'tension' => 0.3,
                    'fill' => false,
                ],
            ],
        ];
    }

    public function getResidentCareData(): array
    {
        $userId = auth()->id();
        
        // Get assigned residents
        $assignedResidents = Resident::whereHas('assignments', function($query) use ($userId) {
            $query->where('caregiver_id', $userId)->where('is_active', true);
        })->get();
        
        $healthStatus = [
            'excellent' => 0,
            'good' => 0,
            'fair' => 0,
            'poor' => 0,
        ];

        foreach ($assignedResidents as $resident) {
            $latestVitals = $resident->vitalSigns()->latest('measurement_date')->first();
            
            if ($latestVitals) {
                if ($latestVitals->systolic <= 120 && $latestVitals->diastolic <= 80 && 
                    $latestVitals->pulse >= 60 && $latestVitals->pulse <= 100) {
                    $healthStatus['excellent']++;
                } elseif ($latestVitals->systolic <= 140 && $latestVitals->diastolic <= 90) {
                    $healthStatus['good']++;
                } elseif ($latestVitals->systolic <= 160 && $latestVitals->diastolic <= 100) {
                    $healthStatus['fair']++;
                } else {
                    $healthStatus['poor']++;
                }
            }
        }

        return [
            'labels' => ['Excellent', 'Good', 'Fair', 'Poor'],
            'data' => array_values($healthStatus),
            'colors' => ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'],
        ];
    }

    public function getTasks(): array
    {
        $userId = auth()->id();
        $today = Carbon::today();
        
        // Get appointments for today
        $appointments = Appointment::whereHas('resident.assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->whereDate('appointment_date', $today)
        ->with('resident')
        ->orderBy('appointment_time')
        ->get();

        // Get pending assessments
        $assessments = Assessment::whereHas('resident.assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->where('completion_percentage', '<', 100)
        ->with('resident')
        ->get();

        // Get residents who need vitals today
        $residentsNeedingVitals = Resident::whereHas('assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->whereDoesntHave('vitalSigns', function($q) use ($today) {
            $q->whereDate('measurement_date', $today);
        })->get();

        return [
            'appointments' => $appointments->map(function($appointment) {
                return [
                    'id' => $appointment->id,
                    'type' => 'Appointment',
                    'description' => $appointment->appointment_type ?? 'General appointment with ' . $appointment->resident->name,
                    'time' => $appointment->appointment_time ? $appointment->appointment_time->format('H:i A') : 'Anytime',
                    'status' => $appointment->status ?? 'Scheduled',
                    'resident_name' => $appointment->resident->name,
                ];
            })->toArray(),
            'assessments' => $assessments->map(function($assessment) {
                return [
                    'id' => $assessment->id,
                    'type' => 'Assessment',
                    'description' => 'Complete assessment for ' . $assessment->resident->name,
                    'time' => 'Anytime',
                    'status' => 'Pending',
                    'resident_name' => $assessment->resident->name,
                ];
            })->toArray(),
            'vitals_needed' => $residentsNeedingVitals->map(function($resident) {
                return [
                    'id' => $resident->id,
                    'type' => 'Vitals',
                    'description' => 'Record vitals for ' . $resident->name,
                    'time' => 'Today',
                    'status' => 'Pending',
                    'resident_name' => $resident->name,
                ];
            })->toArray(),
        ];
    }

    public function getResidents(): array
    {
        $userId = auth()->id();
        
        $residents = Resident::whereHas('assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->with(['branch', 'vitalSigns' => function($query) {
            $query->latest('measurement_date')->limit(1);
        }])->get();

        return $residents->map(function($resident) {
            $latestVitals = $resident->vitalSigns->first();
            return [
                'id' => $resident->id,
                'name' => $resident->name,
                'room' => $resident->room,
                'branch' => $resident->branch->name,
                'last_vitals' => $latestVitals ? $latestVitals->measurement_date->format('M d, Y H:i') : 'N/A',
                'health_status' => $this->getHealthStatus($latestVitals),
            ];
        })->toArray();
    }

    private function getHealthStatus($vitals): string
    {
        if (!$vitals) return 'unknown';
        
        if ($vitals->systolic > 140 || 
            $vitals->diastolic > 90 ||
            $vitals->pulse > 100) {
            return 'attention';
        } elseif ($vitals->systolic < 90 || 
                 $vitals->diastolic < 60 ||
                 $vitals->pulse < 50) {
            return 'caution';
        }
        
        return 'good';
    }
}