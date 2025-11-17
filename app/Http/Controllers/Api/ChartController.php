<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\VitalSign;
use App\Models\Assessment;
use App\Models\Appointment;
use App\Models\SleepRecord;
use App\Models\User;
use App\Models\LeaveRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ChartController extends Controller
{
    // Resident Charts
    public function residentStats(): JsonResponse
    {
        $stats = [
            'total_residents' => Resident::count(),
            'active_residents' => Resident::where('is_active', true)->count(),
            'by_branch' => Resident::selectRaw('branches.name as branch_name, COUNT(*) as count')
                ->join('branches', 'residents.branch_id', '=', 'branches.id')
                ->groupBy('branches.id', 'branches.name')
                ->get(),
            'by_status' => Resident::selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get(),
        ];

        return response()->json($stats);
    }

    // Vitals Charts
    public function vitalsStats(Request $request): JsonResponse
    {
        $branchId = $request->get('branch_id');
        $residentId = $request->get('resident_id');
        
        $query = VitalSign::query();
        
        if ($branchId) {
            $query->whereHas('resident', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        
        if ($residentId) {
            $query->where('resident_id', $residentId);
        }
        
        $stats = [
            'total_vitals' => $query->count(),
            'today_vitals' => $query->whereDate('measurement_date', today())->count(),
            'week_vitals' => $query->whereBetween('measurement_date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])->count(),
            'month_vitals' => $query->whereMonth('measurement_date', Carbon::now()->month)->count(),
            'trends' => $this->getVitalsTrends($branchId, $residentId),
            'blood_pressure' => $this->getBloodPressureData($branchId, $residentId),
            'temperature' => $this->getTemperatureData($branchId, $residentId),
        ];

        return response()->json($stats);
    }

    private function getVitalsTrends($branchId = null, $residentId = null): array
    {
        $last7Days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $query = VitalSign::whereDate('measurement_date', $date);
            
            if ($branchId) {
                $query->whereHas('resident', function($q) use ($branchId) {
                    $q->where('branch_id', $branchId);
                });
            }
            
            if ($residentId) {
                $query->where('resident_id', $residentId);
            }
            
            $count = $query->count();
            $last7Days[] = [
                'date' => $date->format('M j'),
                'count' => $count
            ];
        }
        return $last7Days;
    }

    private function getBloodPressureData($branchId = null, $residentId = null): array
    {
        $query = VitalSign::whereNotNull('systolic')
            ->whereNotNull('diastolic');
        
        if ($branchId) {
            $query->whereHas('resident', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        
        if ($residentId) {
            $query->where('resident_id', $residentId);
        }
        
        $vitals = $query->latest('measurement_date')
            ->limit(50)
            ->get();
        
        return [
            'labels' => $vitals->map(fn($v) => $v->measurement_date->format('M j'))->toArray(),
            'systolic' => $vitals->pluck('systolic')->toArray(),
            'diastolic' => $vitals->pluck('diastolic')->toArray(),
        ];
    }

    private function getTemperatureData($branchId = null, $residentId = null): array
    {
        $query = VitalSign::whereNotNull('temperature');
        
        if ($branchId) {
            $query->whereHas('resident', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        
        if ($residentId) {
            $query->where('resident_id', $residentId);
        }
        
        $vitals = $query->latest('measurement_date')
            ->limit(50)
            ->get();
        
        return [
            'labels' => $vitals->map(fn($v) => $v->measurement_date->format('M j'))->toArray(),
            'temperature' => $vitals->pluck('temperature')->toArray(),
        ];
    }

    // Assessment Charts
    public function assessmentStats(Request $request): JsonResponse
    {
        $branchId = $request->get('branch_id');
        $residentId = $request->get('resident_id');
        
        $query = Assessment::query();
        
        if ($branchId) {
            $query->whereHas('resident', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        
        if ($residentId) {
            $query->where('resident_id', $residentId);
        }
        
        $stats = [
            'total_assessments' => $query->count(),
            'completed_assessments' => $query->where('status', 'approved')->count(),
            'pending_assessments' => (clone $query)->whereNotIn('status', ['approved', 'archived'])->count(),
            'this_month' => (clone $query)->whereMonth('created_at', Carbon::now()->month)->count(),
            'by_type' => (clone $query)->selectRaw('assessment_type, COUNT(*) as count')
                ->groupBy('assessment_type')
                ->get(),
            'completion_trends' => $this->getAssessmentTrends($branchId, $residentId),
        ];

        return response()->json($stats);
    }

    private function getAssessmentTrends($branchId = null, $residentId = null): array
    {
        $last7Days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $query = Assessment::whereDate('assessment_date', $date);
            
            if ($branchId) {
                $query->whereHas('resident', function($q) use ($branchId) {
                    $q->where('branch_id', $branchId);
                });
            }
            
            if ($residentId) {
                $query->where('resident_id', $residentId);
            }
            
            $count = $query->count();
            $last7Days[] = [
                'date' => $date->format('M j'),
                'count' => $count
            ];
        }
        return $last7Days;
    }

    // Appointments Charts
    public function appointmentStats(Request $request): JsonResponse
    {
        $branchId = $request->get('branch_id');
        $residentId = $request->get('resident_id');
        
        $query = Appointment::query();
        
        if ($branchId) {
            $query->whereHas('resident', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        
        if ($residentId) {
            $query->where('resident_id', $residentId);
        }
        
        $stats = [
            'total_appointments' => $query->count(),
            'upcoming' => (clone $query)->where('appointment_date', '>=', Carbon::today())->count(),
            'completed' => (clone $query)->where('status', 'completed')->count(),
            'pending' => (clone $query)->where('status', 'scheduled')->count(),
            'by_status' => (clone $query)->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get(),
            'trends' => $this->getAppointmentTrends($branchId, $residentId),
        ];

        return response()->json($stats);
    }

    private function getAppointmentTrends($branchId = null, $residentId = null): array
    {
        $last7Days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $query = Appointment::whereDate('appointment_date', $date);
            
            if ($branchId) {
                $query->whereHas('resident', function($q) use ($branchId) {
                    $q->where('branch_id', $branchId);
                });
            }
            
            if ($residentId) {
                $query->where('resident_id', $residentId);
            }
            
            $count = $query->count();
            $last7Days[] = [
                'date' => $date->format('M j'),
                'count' => $count
            ];
        }
        return $last7Days;
    }

    // Sleep Charts
    public function sleepStats(Request $request): JsonResponse
    {
        $dateFrom = $request->input('date_from') 
            ? Carbon::parse($request->input('date_from'))->startOfDay()
            : Carbon::now()->subDays(30)->startOfDay();
        
        $dateTo = $request->input('date_to')
            ? Carbon::parse($request->input('date_to'))->endOfDay()
            : Carbon::now()->endOfDay();

        $query = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo]);
        
        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->input('resident_id'));
        }

        $stats = [
            'total_records' => $query->count(),
            'avg_sleep_hours' => round($query->avg('total_sleep_hours') ?? 0, 1),
            'avg_quality' => round($query->whereNotNull('sleep_quality')->avg('sleep_quality') ?? 0, 1),
            'min_sleep_hours' => round($query->min('total_sleep_hours') ?? 0, 1),
            'max_sleep_hours' => round($query->max('total_sleep_hours') ?? 0, 1),
            'total_sleep_hours' => round($query->sum('total_sleep_hours') ?? 0, 1),
            'sleep_duration_trends' => $this->getSleepDurationTrends($dateFrom, $dateTo, $request->input('resident_id')),
            'quality_distribution' => $this->getSleepQualityDistribution($dateFrom, $dateTo, $request->input('resident_id')),
            'quality_over_time' => $this->getQualityOverTime($dateFrom, $dateTo, $request->input('resident_id')),
            'weekly_average' => $this->getWeeklyAverage($dateFrom, $dateTo, $request->input('resident_id')),
        ];

        return response()->json($stats);
    }

    private function getSleepDurationTrends($dateFrom, $dateTo, $residentId = null): array
    {
        $query = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo]);
        if ($residentId) {
            $query->where('resident_id', $residentId);
        }

        $daysDiff = $dateFrom->diffInDays($dateTo);
        $interval = $daysDiff <= 7 ? 'day' : ($daysDiff <= 30 ? 'day' : 'week');

        if ($interval === 'day') {
            $trends = [];
            $current = $dateFrom->copy();
            while ($current <= $dateTo) {
                $avg = (clone $query)->whereDate('sleep_date', $current)->avg('total_sleep_hours');
                $trends[] = [
                    'date' => $current->format('M j'),
                    'avg_hours' => round($avg ?? 0, 2)
                ];
                $current->addDay();
            }
            return $trends;
        } else {
            return $query->selectRaw('DATE(sleep_date) as date, AVG(total_sleep_hours) as avg_hours')
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->map(fn($r) => [
                    'date' => Carbon::parse($r->date)->format('M j'),
                    'avg_hours' => round($r->avg_hours ?? 0, 2)
                ])
                ->toArray();
        }
    }

    private function getSleepQualityDistribution($dateFrom, $dateTo, $residentId = null): array
    {
        $query = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo])
            ->whereNotNull('sleep_quality');
        
        if ($residentId) {
            $query->where('resident_id', $residentId);
        }

        return $query->selectRaw('sleep_quality, COUNT(*) as count')
            ->groupBy('sleep_quality')
            ->orderBy('sleep_quality')
            ->get()
            ->map(fn($r) => ['quality' => $r->sleep_quality, 'count' => $r->count])
            ->toArray();
    }

    private function getQualityOverTime($dateFrom, $dateTo, $residentId = null): array
    {
        $query = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo])
            ->whereNotNull('sleep_quality');
        
        if ($residentId) {
            $query->where('resident_id', $residentId);
        }

        $daysDiff = $dateFrom->diffInDays($dateTo);
        $interval = $daysDiff <= 7 ? 'day' : ($daysDiff <= 30 ? 'day' : 'week');

        if ($interval === 'day') {
            $trends = [];
            $current = $dateFrom->copy();
            while ($current <= $dateTo) {
                $avg = (clone $query)->whereDate('sleep_date', $current)->avg('sleep_quality');
                $trends[] = [
                    'date' => $current->format('M j'),
                    'avg_quality' => round($avg ?? 0, 1)
                ];
                $current->addDay();
            }
            return $trends;
        } else {
            return $query->selectRaw('DATE(sleep_date) as date, AVG(sleep_quality) as avg_quality')
                ->groupBy('date')
                ->orderBy('date')
                ->get()
                ->map(fn($r) => [
                    'date' => Carbon::parse($r->date)->format('M j'),
                    'avg_quality' => round($r->avg_quality ?? 0, 1)
                ])
                ->toArray();
        }
    }

    private function getWeeklyAverage($dateFrom, $dateTo, $residentId = null): array
    {
        $query = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo]);
        
        if ($residentId) {
            $query->where('resident_id', $residentId);
        }

        // Use Carbon's dayOfWeek which returns 0-6 (Sunday = 0)
        $records = $query->get();
        $weeklyData = [];
        $days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for ($i = 0; $i < 7; $i++) {
            $dayRecords = $records->filter(function($record) use ($i) {
                return Carbon::parse($record->sleep_date)->dayOfWeek === $i;
            });
            
            $avgHours = $dayRecords->count() > 0 
                ? round($dayRecords->avg('total_sleep_hours') ?? 0, 1)
                : 0;
            
            $weeklyData[] = [
                'day' => $days[$i],
                'avg_hours' => $avgHours
            ];
        }
        
        return $weeklyData;
    }

    // Staff Charts
    public function staffStats(): JsonResponse
    {
        $stats = [
            'total_staff' => User::where('is_active', true)->count(),
            'total_caregivers' => User::whereHas('roles', function($q) {
                $q->where('name', 'caregiver');
            })->where('is_active', true)->count(),
            'active_assignments' => \App\Models\Assignment::where('is_active', true)->count(),
            'pending_leave' => LeaveRequest::where('status', 'pending')->count(),
            'leave_by_status' => LeaveRequest::selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->get(),
        ];

        return response()->json($stats);
    }
}

