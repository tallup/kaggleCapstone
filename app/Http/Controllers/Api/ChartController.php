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
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class ChartController extends BaseApiController
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
        $user = $request->user();
        
        $query = VitalSign::query();
        
        // Apply facility filtering for non-super admins
        if ($user && $user->role !== 'super_admin') {
            if ($user->facility_id) {
                $query->whereHas('resident', function($q) use ($user) {
                    $q->whereHas('branch', function($b) use ($user) {
                        $b->where('facility_id', $user->facility_id);
                    })->where('is_active', true);
                });
            } else {
                // User has no facility assigned, return empty results
                return response()->json([
                    'total_vitals' => 0,
                    'today_vitals' => 0,
                    'week_vitals' => 0,
                    'month_vitals' => 0,
                    'trends' => [],
                    'blood_pressure' => ['labels' => [], 'systolic' => [], 'diastolic' => []],
                    'temperature' => ['labels' => [], 'temperature' => []],
                ]);
            }
        }
        
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
            'today_vitals' => (clone $query)->whereDate('measurement_date', today())->count(),
            'week_vitals' => (clone $query)->whereBetween('measurement_date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()])->count(),
            'month_vitals' => (clone $query)->whereMonth('measurement_date', Carbon::now()->month)->count(),
            'trends' => $this->getVitalsTrends($branchId, $residentId, $user),
            'blood_pressure' => $this->getBloodPressureData($branchId, $residentId, $user),
            'temperature' => $this->getTemperatureData($branchId, $residentId, $user),
        ];

        return response()->json($stats);
    }

    private function getVitalsTrends($branchId = null, $residentId = null, $user = null): array
    {
        $last7Days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $query = VitalSign::whereDate('measurement_date', $date);
            
            // Apply facility filtering for non-super admins
            if ($user && $user->role !== 'super_admin' && $user->facility_id) {
                $query->whereHas('resident', function($q) use ($user) {
                    $q->whereHas('branch', function($b) use ($user) {
                        $b->where('facility_id', $user->facility_id);
                    })->where('is_active', true);
                });
            }
            
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

    private function getBloodPressureData($branchId = null, $residentId = null, $user = null): array
    {
        $query = VitalSign::whereNotNull('systolic')
            ->whereNotNull('diastolic');
        
        // Apply facility filtering for non-super admins
        if ($user && $user->role !== 'super_admin' && $user->facility_id) {
            $query->whereHas('resident', function($q) use ($user) {
                $q->whereHas('branch', function($b) use ($user) {
                    $b->where('facility_id', $user->facility_id);
                })->where('is_active', true);
            });
        }
        
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

    private function getTemperatureData($branchId = null, $residentId = null, $user = null): array
    {
        $query = VitalSign::whereNotNull('temperature');
        
        // Apply facility filtering for non-super admins
        if ($user && $user->role !== 'super_admin' && $user->facility_id) {
            $query->whereHas('resident', function($q) use ($user) {
                $q->whereHas('branch', function($b) use ($user) {
                    $b->where('facility_id', $user->facility_id);
                })->where('is_active', true);
            });
        }
        
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
        $user = $request->user();
        
        $query = Assessment::query();
        
        // Apply facility filtering for non-super admins
        if ($user && $user->role !== 'super_admin') {
            if ($user->facility_id) {
                $query->whereHas('resident', function($q) use ($user) {
                    $q->whereHas('branch', function($b) use ($user) {
                        $b->where('facility_id', $user->facility_id);
                    })->where('is_active', true);
                });
            } else {
                // User has no facility assigned, return empty results
                return response()->json([
                    'total_assessments' => 0,
                    'completed_assessments' => 0,
                    'pending_assessments' => 0,
                    'this_month' => 0,
                    'by_type' => [],
                    'completion_trends' => [],
                ]);
            }
        }
        
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
            'completed_assessments' => (clone $query)->where('status', 'approved')->count(),
            'pending_assessments' => (clone $query)->whereNotIn('status', ['approved', 'archived'])->count(),
            'this_month' => (clone $query)->whereMonth('created_at', Carbon::now()->month)->count(),
            'by_type' => (clone $query)->selectRaw('assessment_type, COUNT(*) as count')
                ->groupBy('assessment_type')
                ->get(),
            'completion_trends' => $this->getAssessmentTrends($branchId, $residentId, $user),
        ];

        return response()->json($stats);
    }

    private function getAssessmentTrends($branchId = null, $residentId = null, $user = null): array
    {
        $last7Days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $query = Assessment::whereDate('assessment_date', $date);
            
            // Apply facility filtering for non-super admins
            if ($user && $user->role !== 'super_admin' && $user->facility_id) {
                $query->whereHas('resident', function($q) use ($user) {
                    $q->whereHas('branch', function($b) use ($user) {
                        $b->where('facility_id', $user->facility_id);
                    })->where('is_active', true);
                });
            }
            
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
        $user = $request->user();
        
        $query = Appointment::query();
        
        // Apply facility filtering for non-super admins
        if ($user && $user->role !== 'super_admin') {
            if ($user->facility_id) {
                $query->whereHas('branch', function($q) use ($user) {
                    $q->where('facility_id', $user->facility_id);
                });
            } else {
                // User has no facility assigned, return empty results
                return response()->json([
                    'total_appointments' => 0,
                    'upcoming' => 0,
                    'completed' => 0,
                    'pending' => 0,
                    'by_status' => [],
                    'trends' => [],
                ]);
            }
        }
        
        if ($branchId) {
            $query->where('branch_id', $branchId);
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
            'trends' => $this->getAppointmentTrends($branchId, $residentId, $user),
        ];

        return response()->json($stats);
    }

    private function getAppointmentTrends($branchId = null, $residentId = null, $user = null): array
    {
        $last7Days = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $query = Appointment::whereDate('appointment_date', $date);
            
            // Apply facility filtering for non-super admins
            if ($user && $user->role !== 'super_admin' && $user->facility_id) {
                $query->whereHas('branch', function($q) use ($user) {
                    $q->where('facility_id', $user->facility_id);
                });
            }
            
            if ($branchId) {
                $query->where('branch_id', $branchId);
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
        $user = $request->user();
        $dateFrom = $request->input('date_from') 
            ? Carbon::parse($request->input('date_from'))->startOfDay()
            : Carbon::now()->subDays(30)->startOfDay();
        
        $dateTo = $request->input('date_to')
            ? Carbon::parse($request->input('date_to'))->endOfDay()
            : Carbon::now()->endOfDay();

        $query = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo]);
        
        // Apply facility filtering for non-super admins
        $this->applyFacilityFilter($query, $user);
        
        // Apply branch filtering
        $this->applyBranchFilter($query, $request, $user);
        
        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->input('resident_id'));
        }

        // Get branch_id for helper methods
        $branchId = null;
        if ($this->isCaregiver($user) && $user->assigned_branch_id) {
            $branchId = $user->assigned_branch_id;
        } elseif ($request->has('branch_id')) {
            $branchId = $request->input('branch_id');
        }

        $stats = [
            'total_records' => $query->count(),
            'avg_sleep_hours' => round($query->avg('total_sleep_hours') ?? 0, 1),
            'avg_quality' => round($query->whereNotNull('sleep_quality')->avg('sleep_quality') ?? 0, 1),
            'min_sleep_hours' => round($query->min('total_sleep_hours') ?? 0, 1),
            'max_sleep_hours' => round($query->max('total_sleep_hours') ?? 0, 1),
            'total_sleep_hours' => round($query->sum('total_sleep_hours') ?? 0, 1),
            'sleep_duration_trends' => $this->getSleepDurationTrends($dateFrom, $dateTo, $request->input('resident_id'), $user, $branchId),
            'quality_distribution' => $this->getSleepQualityDistribution($dateFrom, $dateTo, $request->input('resident_id'), $user, $branchId),
            'quality_over_time' => $this->getQualityOverTime($dateFrom, $dateTo, $request->input('resident_id'), $user, $branchId),
            'weekly_average' => $this->getWeeklyAverage($dateFrom, $dateTo, $request->input('resident_id'), $user, $branchId),
        ];

        return response()->json($stats);
    }

    private function getSleepDurationTrends($dateFrom, $dateTo, $residentId = null, $user = null, $branchId = null): array
    {
        $query = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo]);
        
        // Apply facility filtering
        $this->applyFacilityFilter($query, $user);
        
        // Apply branch filtering
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
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

    private function getSleepQualityDistribution($dateFrom, $dateTo, $residentId = null, $user = null, $branchId = null): array
    {
        $query = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo])
            ->whereNotNull('sleep_quality');
        
        // Apply facility filtering
        $this->applyFacilityFilter($query, $user);
        
        // Apply branch filtering
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
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

    private function getQualityOverTime($dateFrom, $dateTo, $residentId = null, $user = null, $branchId = null): array
    {
        $query = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo])
            ->whereNotNull('sleep_quality');
        
        // Apply facility filtering
        $this->applyFacilityFilter($query, $user);
        
        // Apply branch filtering
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
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

    private function getWeeklyAverage($dateFrom, $dateTo, $residentId = null, $user = null, $branchId = null): array
    {
        $query = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo]);
        
        // Apply facility filtering
        $this->applyFacilityFilter($query, $user);
        
        // Apply branch filtering
        if ($branchId) {
            $query->where('branch_id', $branchId);
        }
        
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
    public function staffStats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Build staff queries with facility filtering
        $staffQuery = User::where('is_active', true);
        $caregiverQuery = User::whereHas('roles', function($q) {
            $q->where('name', 'caregiver');
        })->where('is_active', true);
        
        // Apply facility filtering for non-super admins
        if ($user && $user->role !== 'super_admin') {
            if ($user->facility_id) {
                $facilityBranchIds = \App\Models\Branch::where('facility_id', $user->facility_id)->pluck('id')->toArray();
                
                // Check if facility_id column exists
                if (Schema::hasColumn('users', 'facility_id')) {
                    // Include users with direct facility_id match OR users with assigned_branch_id in facility branches
                    $staffQuery->where(function($q) use ($user, $facilityBranchIds) {
                        $q->where('facility_id', $user->facility_id);
                        if (!empty($facilityBranchIds)) {
                            $q->orWhereIn('assigned_branch_id', $facilityBranchIds);
                        }
                    });
                    $caregiverQuery->where(function($q) use ($user, $facilityBranchIds) {
                        $q->where('facility_id', $user->facility_id);
                        if (!empty($facilityBranchIds)) {
                            $q->orWhereIn('assigned_branch_id', $facilityBranchIds);
                        }
                    });
                } else {
                    // Fallback: filter by assigned_branch_id if facility_id column doesn't exist
                    if (!empty($facilityBranchIds)) {
                        $staffQuery->whereIn('assigned_branch_id', $facilityBranchIds);
                        $caregiverQuery->whereIn('assigned_branch_id', $facilityBranchIds);
                    } else {
                        // No branches for this facility, return zero counts
                        return response()->json([
                            'total_staff' => 0,
                            'total_caregivers' => 0,
                            'active_assignments' => 0,
                            'pending_leave' => 0,
                            'leave_by_status' => [],
                        ]);
                    }
                }
            } else {
                // User has no facility assigned, return zero counts
                return response()->json([
                    'total_staff' => 0,
                    'total_caregivers' => 0,
                    'active_assignments' => 0,
                    'pending_leave' => 0,
                    'leave_by_status' => [],
                ]);
            }
        }
        
        // Build assignment query with facility filtering
        $assignmentQuery = \App\Models\Assignment::where('is_active', true);
        if ($user && $user->role !== 'super_admin' && $user->facility_id) {
            $facilityBranchIds = \App\Models\Branch::where('facility_id', $user->facility_id)->pluck('id')->toArray();
            if (!empty($facilityBranchIds)) {
                $assignmentQuery->whereHas('resident', function($q) use ($facilityBranchIds) {
                    $q->whereIn('branch_id', $facilityBranchIds);
                });
            } else {
                $assignmentQuery->whereRaw('1 = 0'); // No results
            }
        }
        
        // Build leave request query with facility filtering
        $leaveQuery = LeaveRequest::where('status', 'pending');
        if ($user && $user->role !== 'super_admin' && $user->facility_id) {
            $facilityBranchIds = \App\Models\Branch::where('facility_id', $user->facility_id)->pluck('id')->toArray();
            if (!empty($facilityBranchIds)) {
                $leaveQuery->whereHas('user', function($q) use ($user, $facilityBranchIds) {
                    if (Schema::hasColumn('users', 'facility_id')) {
                        $q->where(function($subQ) use ($user, $facilityBranchIds) {
                            $subQ->where('facility_id', $user->facility_id);
                            $subQ->orWhereIn('assigned_branch_id', $facilityBranchIds);
                        });
                    } else {
                        $q->whereIn('assigned_branch_id', $facilityBranchIds);
                    }
                });
            } else {
                $leaveQuery->whereRaw('1 = 0'); // No results
            }
        }
        
        $leaveByStatusQuery = LeaveRequest::selectRaw('status, COUNT(*) as count');
        if ($user && $user->role !== 'super_admin' && $user->facility_id) {
            $facilityBranchIds = \App\Models\Branch::where('facility_id', $user->facility_id)->pluck('id')->toArray();
            if (!empty($facilityBranchIds)) {
                $leaveByStatusQuery->whereHas('user', function($q) use ($user, $facilityBranchIds) {
                    if (Schema::hasColumn('users', 'facility_id')) {
                        $q->where(function($subQ) use ($user, $facilityBranchIds) {
                            $subQ->where('facility_id', $user->facility_id);
                            $subQ->orWhereIn('assigned_branch_id', $facilityBranchIds);
                        });
                    } else {
                        $q->whereIn('assigned_branch_id', $facilityBranchIds);
                    }
                });
            } else {
                $leaveByStatusQuery->whereRaw('1 = 0'); // No results
            }
        }
        
        $stats = [
            'total_staff' => $staffQuery->count(),
            'total_caregivers' => $caregiverQuery->count(),
            'active_assignments' => $assignmentQuery->count(),
            'pending_leave' => $leaveQuery->count(),
            'leave_by_status' => $leaveByStatusQuery->groupBy('status')->get(),
        ];

        return response()->json($stats);
    }
}

