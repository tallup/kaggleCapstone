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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class DashboardService
{
    /**
     * Get dashboard stats for a user
     */
    public function getStatsForUser(User $user): array
    {
        // Cache stats for 2 minutes to reduce database load
        $cacheKey = "dashboard.stats.{$user->id}.{$user->role}";
        
        return Cache::remember($cacheKey, 120, function () use ($user) {
        if (UserRoles::isCaregiverRole($user->role)) {
            return $this->getCaregiverStats($user);
        }

        // Pass user to admin stats for potential facility filtering
        return $this->getAdminStats($user);
        });
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

        // Optimize: Use joins instead of whereHas for better performance
        $residentIds = Resident::where('branch_id', $branchId)
            ->where('is_active', true)
            ->pluck('id');

        if ($residentIds->isEmpty()) {
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
        $assignedResidents = $residentIds->count();

        // Today's appointments for residents in this branch (optimized with whereIn)
        $todayAppointments = Appointment::whereIn('resident_id', $residentIds)
            ->whereDate('appointment_date', today())
            ->count();

        // Pending assessments for residents in this branch (optimized)
        $pendingAssessments = Assessment::whereIn('resident_id', $residentIds)
            ->whereNotIn('status', ['approved', 'archived'])
            ->count();

        // Vitals recorded today for residents in this branch (optimized)
        $todayVitals = VitalSign::whereIn('resident_id', $residentIds)
            ->whereDate('measurement_date', today())
            ->count();

        // Pending leave requests
        $pendingLeaveRequests = LeaveRequest::where('staff_id', $userId)
            ->where('status', 'pending')
            ->count();

        // Upcoming appointments this week for residents in this branch (optimized)
        $weekAppointments = Appointment::whereIn('resident_id', $residentIds)
            ->whereBetween('appointment_date', [today(), today()->addDays(7)])
            ->count();

        // Weekly activity data for charts (cached)
        $weeklyActivity = Cache::remember("weekly.activity.{$branchId}", 300, function () use ($branchId) {
            return $this->getWeeklyActivity($branchId);
        });

        // Medication reminders for next hour (cached for 1 minute)
        $medicationReminders = Cache::remember("medication.reminders.{$branchId}", 60, function () use ($branchId) {
            return $this->getMedicationReminders($branchId);
        });

        // Upcoming appointments with details (cached)
        $upcomingAppointmentsList = Cache::remember("upcoming.appointments.{$branchId}", 300, function () use ($branchId) {
            return $this->getUpcomingAppointments($branchId);
        });

        // Resident list (cached)
        $residentList = Cache::remember("resident.list.{$branchId}", 600, function () use ($branchId) {
            return $this->getResidentList($branchId);
        });

        // Resident vitals trend for first resident (default) - cached
        $defaultResident = Resident::where('branch_id', $branchId)
            ->where('is_active', true)
            ->first();
        $residentVitalsTrend = $defaultResident ? Cache::remember("resident.vitals.trend.{$defaultResident->id}", 300, function () use ($defaultResident) {
            return $this->getResidentVitalsTrend($defaultResident->id);
        }) : null;

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
        $user = $user ?? auth()->user();
        
        // Use the same facility resolution logic as BaseApiController
        $facility = null;
        
        // Super admins can float between facilities; prefer explicit context
        if ($user && $user->role === 'super_admin') {
            try {
                $facility = app()->bound('facility') ? app('facility') : null;
            } catch (\Exception $e) {
                $facility = null;
            }
        } else {
            // Try facility from current request context (set by middleware)
            try {
                $facility = app()->bound('facility') ? app('facility') : null;
            } catch (\Exception $e) {
                $facility = null;
            }

            // Fallback to user's facility_id
            if (!$facility && $user && $user->facility_id) {
                $facility = \App\Models\Facility::find($user->facility_id);
            }

            // Derive facility from assigned branch if still unknown
            if (!$facility && $user && $user->assigned_branch_id) {
                $branch = \App\Models\Branch::find($user->assigned_branch_id);
                if ($branch && $branch->facility_id) {
                    $facility = \App\Models\Facility::find($branch->facility_id);
                }
            }
        }
        
        $facilityId = $facility ? $facility->id : null;
        
        // Build queries without global scopes and apply explicit facility filters
        $residentsQuery = Resident::withoutGlobalScopes()->where('is_active', true);
        $rangeStart = now()->subDays(30)->startOfDay();
        $appointmentsQuery = Appointment::withoutGlobalScopes();
        $vitalsQuery = VitalSign::withoutGlobalScopes();
        $staffQuery = User::withoutGlobalScopes()->where('is_active', true)->where('role', '!=', 'super_admin');
        $assessmentsQuery = Assessment::withoutGlobalScopes()->whereNotIn('status', ['approved', 'archived']);
        $activeMedicationsQuery = Medication::withoutGlobalScopes()->where('is_active', true);

        if ($facilityId) {
            $residentsQuery->where(function ($q) use ($facilityId) {
                $q->where('facility_id', $facilityId)
                    ->orWhereHas('branch', function ($b) use ($facilityId) {
                        $b->where('facility_id', $facilityId);
                    });
            });

            $appointmentsQuery->whereHas('branch', function ($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            });

            $vitalsQuery->whereHas('resident', function ($q) use ($facilityId) {
                $q->where(function ($r) use ($facilityId) {
                    $r->where('facility_id', $facilityId)
                        ->orWhereHas('branch', function ($b) use ($facilityId) {
                            $b->where('facility_id', $facilityId);
                        });
                })->where('is_active', true);
            });

            $assessmentsQuery->whereHas('resident', function ($q) use ($facilityId) {
                $q->where(function ($r) use ($facilityId) {
                    $r->where('facility_id', $facilityId)
                        ->orWhereHas('branch', function ($b) use ($facilityId) {
                            $b->where('facility_id', $facilityId);
                        });
                })->where('is_active', true);
            });

            $staffQuery->where('facility_id', $facilityId);

            $activeMedicationsQuery->whereHas('resident', function ($q) use ($facilityId) {
                $q->where(function ($r) use ($facilityId) {
                    $r->where('facility_id', $facilityId)
                        ->orWhereHas('branch', function ($b) use ($facilityId) {
                            $b->where('facility_id', $facilityId);
                        });
                })->where('is_active', true);
            });
        }

        // If no facility found, log warning but try to get data anyway (for super admins or debugging)
        if (!$facilityId && $user && $user->role !== 'super_admin') {
            Log::warning('DashboardService: No facility context found for administrator', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'user_facility_id' => $user->facility_id,
                'user_assigned_branch_id' => $user->assigned_branch_id,
            ]);
        }
        
        // For super admins without facility context, show all data
        // For regular admins without facility context, show zeros with warning
        if (!$facilityId && $user && $user->role !== 'super_admin') {
            return [
                'total_residents' => 0,
                'active_residents' => 0,
                'today_appointments' => 0,
                'upcoming_appointments' => 0,
                'today_vitals' => 0,
                'last_30_appointments' => 0,
                'last_30_vitals' => 0,
                'last_30_assessments' => 0,
                'total_staff' => 0,
                'pending_assessments' => 0,
                'active_medications' => 0,
                'user_type' => 'admin',
                'upcoming_appointments_list' => [],
                'resident_list' => [],
                'medication_reminders' => [],
                'facility_context_missing' => true,
            ];
        }

        $totalResidents = $residentsQuery->count();

        // Last 30 days filters
        $appointmentsLast30 = (clone $appointmentsQuery)
            ->whereBetween('appointment_date', [$rangeStart, now()])
            ->where('status', '!=', 'cancelled')
            ->count();

        $vitalsLast30 = (clone $vitalsQuery)
            ->whereBetween('measurement_date', [$rangeStart->toDateString(), now()->toDateString()])
            ->count();

        $assessmentsLast30 = (clone $assessmentsQuery)
            ->whereBetween('created_at', [$rangeStart, now()])
            ->count();

        // Calculate new metrics
        $newMetrics = $this->calculateNewMetrics($facilityId);

        return [
            'total_residents' => $totalResidents,
            'active_residents' => $totalResidents,
            'today_appointments' => $appointmentsQuery->whereDate('appointment_date', today())->count(),
            'upcoming_appointments' => $appointmentsQuery->whereDate('appointment_date', '>=', today())
                ->whereNotIn('status', ['cancelled', 'completed'])
                ->count(),
            'today_vitals' => $vitalsQuery->whereDate('measurement_date', today())->count(),
            'last_30_appointments' => $appointmentsLast30,
            'last_30_vitals' => $vitalsLast30,
            'last_30_assessments' => $assessmentsLast30,
            'total_staff' => $staffQuery->count(),
            'pending_assessments' => $assessmentsQuery->count(),
            'active_medications' => $activeMedicationsQuery->count(),
            'user_type' => 'admin',
            'upcoming_appointments_list' => $this->getAdminUpcomingAppointments(),
            'resident_list' => $this->getAdminResidentList(),
            'medication_reminders' => $this->getAdminMedicationReminders(),
            // New metrics
            'occupancy_rate' => $newMetrics['occupancy_rate'],
            'compliance_score' => $newMetrics['compliance_score'],
            'medication_adherence_rate' => $newMetrics['medication_adherence_rate'],
            'average_incident_response_time' => $newMetrics['average_incident_response_time'],
            'staff_utilization' => $newMetrics['staff_utilization'],
        ];
    }

    /**
     * Get weekly activity for a branch
     */
    private function getWeeklyActivity(?int $branchId): array
    {
        $now = now();
        $weekStart = $now->copy()->startOfWeek();
        $weekEnd = $weekStart->copy()->addDays(6);
        
        // Optimize: Get all assessments and vitals for the week in 2 queries instead of 14
        $assessmentsQuery = Assessment::whereBetween('assessment_date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->whereHas('resident', function ($q) use ($branchId) {
                    if ($branchId) {
                        $q->where('branch_id', $branchId)->where('is_active', true);
                    } else {
                        $q->where('is_active', true);
                    }
            });
        
        $vitalsQuery = VitalSign::whereBetween('measurement_date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->whereHas('resident', function ($q) use ($branchId) {
                    if ($branchId) {
                        $q->where('branch_id', $branchId)->where('is_active', true);
                    } else {
                        $q->where('is_active', true);
                    }
            });
        
        // Get all data at once
        $assessments = $assessmentsQuery->get()->groupBy(function ($item) {
            return $item->assessment_date->format('Y-m-d');
        });
        
        $vitals = $vitalsQuery->get()->groupBy(function ($item) {
            return $item->measurement_date->format('Y-m-d');
        });
        
        $days = [];
        for ($i = 0; $i < 7; $i++) {
            $day = $weekStart->copy()->addDays($i);
            $dateStr = $day->format('Y-m-d');
            $days[] = [
                'date' => $dateStr,
                'day' => $day->format('D'),
                'assessments' => $assessments->get($dateStr)?->count() ?? 0,
                'vitals' => $vitals->get($dateStr)?->count() ?? 0,
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

    /**
     * Get daily activities for calendar view
     */
    public function getDailyActivities(User $user, int $days = 30): array
    {
        // Cache for 5 minutes to reduce load
        $cacheKey = "daily.activities.{$user->id}.{$days}";
        
        return Cache::remember($cacheKey, 300, function () use ($user, $days) {
        $startDate = Carbon::now()->subDays($days);
        $endDate = Carbon::now();
        
        $branchId = null;
        if (UserRoles::isCaregiverRole($user->role)) {
            $branchId = $user->assigned_branch_id;
        }
        
            // Optimize: Get all data in 3 queries instead of 90+ queries (30 days × 3 queries)
            $residentQuery = function ($q) use ($branchId) {
                if ($branchId) {
                    $q->where('branch_id', $branchId)->where('is_active', true);
                } else {
                    $q->where('is_active', true);
                }
            };
            
            // Get all appointments for the date range
            $appointments = Appointment::whereHas('resident', $residentQuery)
                ->whereBetween('appointment_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->get()
                ->groupBy(function ($item) {
                    return $item->appointment_date->format('Y-m-d');
                });
            
            // Get all medications active in the date range
            $medications = Medication::whereHas('resident', $residentQuery)
            ->where('is_active', true)
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->where(function ($subQ) use ($startDate) {
                        $subQ->whereNull('start_date')->orWhere('start_date', '<=', $startDate);
                    })
                    ->where(function ($subQ) use ($endDate) {
                        $subQ->whereNull('end_date')->orWhere('end_date', '>=', $endDate);
                    });
                })
                ->get();
            
            // Count medications per day (simplified - medications span multiple days)
            $medicationsByDay = [];
            foreach ($medications as $medication) {
                $medStart = $medication->start_date ? Carbon::parse($medication->start_date) : $startDate;
                $medEnd = $medication->end_date ? Carbon::parse($medication->end_date) : $endDate;
                $current = max($medStart, $startDate);
                $end = min($medEnd, $endDate);
                
                while ($current <= $end) {
                    $dateStr = $current->format('Y-m-d');
                    $medicationsByDay[$dateStr] = ($medicationsByDay[$dateStr] ?? 0) + 1;
                    $current->addDay();
                }
            }
            
            // Get all vitals for the date range
            $vitals = VitalSign::whereHas('resident', $residentQuery)
                ->whereBetween('measurement_date', [$startDate->toDateString(), $endDate->toDateString()])
                ->get()
                ->groupBy(function ($item) {
                    return $item->measurement_date->format('Y-m-d');
                });
            
            $activities = [];
            $currentDate = $startDate->copy();
            
            while ($currentDate <= $endDate) {
                $dateStr = $currentDate->format('Y-m-d');
                
                $appointmentsCount = $appointments->get($dateStr)?->count() ?? 0;
                $medicationsDue = $medicationsByDay[$dateStr] ?? 0;
                $vitalsRecorded = $vitals->get($dateStr)?->count() ?? 0;
            
            if ($appointmentsCount > 0 || $medicationsDue > 0 || $vitalsRecorded > 0) {
                $activities[] = [
                    'date' => $dateStr,
                    'appointments_count' => $appointmentsCount,
                    'medications_due' => $medicationsDue,
                    'vitals_recorded' => $vitalsRecorded,
                ];
            }
            
            $currentDate->addDay();
        }
        
        return $activities;
        });
    }

    /**
     * Calculate new metrics: occupancy, compliance, adherence, response time, staff utilization
     */
    private function calculateNewMetrics(?int $facilityId): array
    {
        $metrics = [
            'occupancy_rate' => 0,
            'compliance_score' => 0,
            'medication_adherence_rate' => 0,
            'average_incident_response_time' => 0,
            'staff_utilization' => 0,
        ];

        if (!$facilityId) {
            return $metrics;
        }

        // 1. Occupancy Rate: Calculate average residents per branch
        $branches = \App\Models\Branch::withoutGlobalScopes()
            ->where('facility_id', $facilityId)
            ->where('is_active', true)
            ->get();
        
        $totalResidents = Resident::withoutGlobalScopes()
            ->where('is_active', true)
            ->where(function ($q) use ($facilityId) {
                $q->where('facility_id', $facilityId)
                    ->orWhereHas('branch', function ($b) use ($facilityId) {
                        $b->where('facility_id', $facilityId);
                    });
            })
            ->count();
        
        $activeBranches = $branches->count();
        if ($activeBranches > 0) {
            // Calculate average residents per branch (as a simple occupancy metric)
            $avgResidentsPerBranch = $totalResidents / $activeBranches;
            // Normalize to percentage (assuming ~10-15 residents per branch is typical)
            $metrics['occupancy_rate'] = min(100, round(($avgResidentsPerBranch / 12) * 100, 1));
        }

        // 2. Compliance Score: Completed assessments / Total assessments (last 30 days)
        $rangeStart = now()->subDays(30)->startOfDay();
        $totalAssessments = Assessment::withoutGlobalScopes()
            ->whereHas('resident', function ($q) use ($facilityId) {
                $q->where(function ($r) use ($facilityId) {
                    $r->where('facility_id', $facilityId)
                        ->orWhereHas('branch', function ($b) use ($facilityId) {
                            $b->where('facility_id', $facilityId);
                        });
                })->where('is_active', true);
            })
            ->whereBetween('created_at', [$rangeStart, now()])
            ->count();
        
        $completedAssessments = Assessment::withoutGlobalScopes()
            ->whereHas('resident', function ($q) use ($facilityId) {
                $q->where(function ($r) use ($facilityId) {
                    $r->where('facility_id', $facilityId)
                        ->orWhereHas('branch', function ($b) use ($facilityId) {
                            $b->where('facility_id', $facilityId);
                        });
                })->where('is_active', true);
            })
            ->whereBetween('created_at', [$rangeStart, now()])
            ->whereIn('status', ['approved', 'completed'])
            ->count();
        
        if ($totalAssessments > 0) {
            $metrics['compliance_score'] = round(($completedAssessments / $totalAssessments) * 100, 1);
        }

        // 3. Medication Adherence Rate: Completed administrations / Total due (last 7 days)
        $weekStart = now()->subDays(7)->startOfDay();
        $totalMedicationsDue = Medication::withoutGlobalScopes()
            ->where('is_active', true)
            ->whereHas('resident', function ($q) use ($facilityId) {
                $q->where(function ($r) use ($facilityId) {
                    $r->where('facility_id', $facilityId)
                        ->orWhereHas('branch', function ($b) use ($facilityId) {
                            $b->where('facility_id', $facilityId);
                        });
                })->where('is_active', true);
            })
            ->count();
        
        $completedAdministrations = \App\Models\MedicationAdministration::withoutGlobalScopes()
            ->whereBetween('administered_at', [$weekStart, now()])
            ->where('status', 'completed')
            ->whereHas('resident', function ($q) use ($facilityId) {
                $q->where(function ($r) use ($facilityId) {
                    $r->where('facility_id', $facilityId)
                        ->orWhereHas('branch', function ($b) use ($facilityId) {
                            $b->where('facility_id', $facilityId);
                        });
                })->where('is_active', true);
            })
            ->count();
        
        // Estimate total due based on active medications and frequency
        // For simplicity, assume each medication needs administration daily
        $estimatedTotalDue = $totalMedicationsDue * 7; // 7 days
        if ($estimatedTotalDue > 0) {
            $metrics['medication_adherence_rate'] = round(($completedAdministrations / $estimatedTotalDue) * 100, 1);
        }

        // 4. Average Incident Response Time: Average time from creation to resolution (last 30 days)
        $resolvedIncidents = \App\Models\Incident::withoutGlobalScopes()
            ->whereHas('branch', function ($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            })
            ->whereBetween('created_at', [$rangeStart, now()])
            ->whereNotNull('resolved_at')
            ->get();
        
        if ($resolvedIncidents->count() > 0) {
            $totalResponseTime = $resolvedIncidents->sum(function ($incident) {
                return $incident->created_at->diffInHours($incident->resolved_at);
            });
            $metrics['average_incident_response_time'] = round($totalResponseTime / $resolvedIncidents->count(), 1);
        }

        // 5. Staff Utilization: Active staff / Total staff (as percentage)
        $totalStaff = User::withoutGlobalScopes()
            ->where('facility_id', $facilityId)
            ->where('is_active', true)
            ->where('role', '!=', 'super_admin')
            ->count();
        
        // For now, utilization is just the count (can be enhanced with capacity later)
        $metrics['staff_utilization'] = $totalStaff;

        return $metrics;
    }
}


