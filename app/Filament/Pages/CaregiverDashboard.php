<?php

namespace App\Filament\Pages;

use Filament\Pages\Dashboard as BaseDashboard;
use App\Models\Resident;
use App\Models\Appointment;
use App\Models\Assessment;
use App\Models\VitalSign;
use App\Models\LeaveRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use App\Filament\Widgets\HeroSectionWidget;
use App\Filament\Widgets\CaregiverOverviewStatsWidget;
use App\Filament\Widgets\CaregiverWeeklyActivityChartWidget;
use App\Filament\Widgets\MyResidentsWidget;
use App\Filament\Widgets\TodayTasksWidget;
use App\Filament\Widgets\RecentMedicationActivityWidget;

class CaregiverDashboard extends BaseDashboard
{
    protected static ?string $navigationIcon = 'heroicon-o-home';
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

    public function getWidgets(): array
    {
        return [
            HeroSectionWidget::class,
            CaregiverOverviewStatsWidget::class,
            TodayTasksWidget::class,
            MyResidentsWidget::class,
            RecentMedicationActivityWidget::class,
            CaregiverWeeklyActivityChartWidget::class,
        ];
    }

    public function getStats(): array
    {
        $userId = auth()->id();

        // Fetch assigned resident IDs once, reuse for all counts
        $residentIds = Resident::whereHas('assignments', function($q) use ($userId) {
            $q->where('caregiver_id', $userId)->where('is_active', true);
        })->pluck('id');

        $assignedResidents = $residentIds->count();

        $todayAppointments = $assignedResidents > 0
            ? Appointment::whereIn('resident_id', $residentIds)
                ->whereDate('appointment_date', today())->count()
            : 0;

        $pendingAssessments = $assignedResidents > 0
            ? Assessment::whereIn('resident_id', $residentIds)
                ->whereNotIn('status', ['approved', 'archived'])->count()
            : 0;

        $todayVitals = $assignedResidents > 0
            ? VitalSign::whereIn('resident_id', $residentIds)
                ->whereDate('measurement_date', today())->count()
            : 0;

        $pendingLeaveRequests = LeaveRequest::where('staff_id', $userId)
            ->where('status', 'pending')->count();

        $weekAppointments = $assignedResidents > 0
            ? Appointment::whereIn('resident_id', $residentIds)
                ->whereBetween('appointment_date', [today(), today()->addDays(7)])->count()
            : 0;

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
            $date = $item->measurement_date instanceof Carbon
                ? $item->measurement_date
                : Carbon::parse($item->measurement_date);
            return $date->format('Y-m-d');
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
                $createdAt = $item->created_at instanceof Carbon
                    ? $item->created_at
                    : Carbon::parse($item->created_at);
                return $createdAt->format('Y-m-d') === $dateStr;
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

    public function getDueMedicationsToday(): array
    {
        $userId = auth()->id();
        $today = Carbon::today();

        // Medications for residents assigned to this caregiver that are active today
        $medications = \App\Models\Medication::with(['resident', 'drug'])
            ->whereHas('resident.assignments', function ($q) use ($userId) {
                $q->where('caregiver_id', $userId)->where('is_active', true);
            })
            ->where('is_active', true)
            ->where(function ($q) use ($today) {
                $q->whereDate('start_date', '<=', $today)
                  ->where(function ($qq) use ($today) {
                      $qq->whereNull('end_date')->orWhereDate('end_date', '>=', $today);
                  });
            })
            ->limit(20)
            ->get();

        return $medications->map(function ($m) {
            return [
                'id' => $m->id,
                'resident' => $m->resident?->name ?? 'Unknown',
                'name' => $m->name,
                'drug' => $m->drug?->name,
                'times' => collect([$m->time_1, $m->time_2, $m->time_3, $m->time_4])
                    ->filter()
                    ->map(fn ($t) => \Carbon\Carbon::parse(is_string($t) ? $t : $t->format('H:i:s'))->format('g:i A'))
                    ->implode(', '),
            ];
        })->toArray();
    }

    public function getMissedDosesToday(): array
    {
        $userId = auth()->id();
        $today = Carbon::today();

        $missed = \App\Models\MedicationAdministration::with(['resident', 'medication'])
            ->whereDate('administered_at', $today)
            ->where('status', 'missed')
            ->whereHas('resident.assignments', function ($q) use ($userId) {
                $q->where('caregiver_id', $userId)->where('is_active', true);
            })
            ->latest('administered_at')
            ->limit(10)
            ->get();

        return $missed->map(function ($a) {
            return [
                'resident' => $a->resident?->name ?? 'Unknown',
                'medication' => $a->medication?->name ?? 'Medication',
                'time' => optional($a->administered_at)->format('g:i A') ?? '',
            ];
        })->toArray();
    }

    public function getUpcomingAppointmentsList(): array
    {
        $userId = auth()->id();
        $now = Carbon::now();
        $limit = 10;

        $base = Appointment::with('resident')
            ->whereHas('resident.assignments', function($q) use ($userId) {
                $q->where('caregiver_id', $userId)->where('is_active', true);
            })
            ->when(Schema::hasColumn('appointments', 'appointment_date'), function ($q) use ($now) {
                $q->whereDate('appointment_date', '>=', $now->toDateString())
                  ->orderBy('appointment_date');
            }, function ($q) {
                // Fallback if production DB uses a different column name
                if (Schema::hasColumn('appointments', 'date')) {
                    $q->whereDate('date', '>=', now()->toDateString())
                      ->orderBy('date');
                }
            })
            ->when(!Schema::hasColumn('appointments', 'appointment_date') && !Schema::hasColumn('appointments', 'date'), function ($q) {
                // Ultimate fallback ordering
                $q->latest('created_at');
            });

        // Fetch and sort safely in PHP to avoid ordering by missing columns
        $apps = $base->get()
            ->sortBy(function ($a) {
                $date = $a->appointment_date ?? $a->date ?? $a->created_at;
                $time = $a->appointment_time ?? null; // may not exist
                $dateObj = $date instanceof Carbon ? $date : ($date ? Carbon::parse($date) : Carbon::now());
                $timeStr = is_string($time) ? $time : null;
                $timeMinutes = $timeStr ? (int) Carbon::parse($timeStr)->format('Hi') : 0;
                return $dateObj->format('Ymd') . sprintf('%04d', $timeMinutes);
            })
            ->take($limit);

        return $apps->map(function ($a) {
            return [
                'resident' => $a->resident?->name ?? 'Unknown',
                'date' => optional($a->appointment_date)->format('M j') ?? '',
                'time' => isset($a->appointment_time) && $a->appointment_time
                    ? (is_string($a->appointment_time) ? Carbon::parse($a->appointment_time)->format('g:i A') : optional($a->appointment_time)->format('g:i A'))
                    : 'Anytime',
                'status' => $a->status ?? 'Scheduled',
            ];
        })->toArray();
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
            $measurementDate = $latestVitals?->measurement_date;
            if ($measurementDate && !($measurementDate instanceof Carbon)) {
                $measurementDate = Carbon::parse($measurementDate);
            }
            return [
                'id' => $resident->id,
                'name' => $resident->name,
                'room' => $resident->room,
                'branch' => $resident->branch->name ?? 'N/A',
                'last_vitals' => $measurementDate ? $measurementDate->format('M d, Y H:i') : 'N/A',
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