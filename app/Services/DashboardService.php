<?php

namespace App\Services;

use App\Constants\UserRoles;
use App\Models\Appointment;
use App\Models\Assessment;
use App\Models\CleaningTask;
use App\Models\CleaningTaskAssignment;
use App\Models\Expense;
use App\Models\FireDrill;
use App\Models\GroceryStatusUpdate;
use App\Models\Incident;
use App\Models\LeaveRequest;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\PharmacyInventory;
use App\Models\Resident;
use App\Models\SleepRecord;
use App\Models\User;
use App\Models\VitalSign;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class DashboardService
{
    /**
     * Get dashboard stats for a user
     */
    public function getStatsForUser(User $user): array
    {
        // Include facility_id in cache key for better cache invalidation
        $facilityId = $user->facility_id ?? ($user->assigned_branch_id ?
            (\App\Models\Branch::find($user->assigned_branch_id)?->facility_id ?? 'none') : 'none');

        // Cache stats for 5 minutes (clearCacheForUser() handles invalidation when data changes)
        $cacheKey = "dashboard.stats.{$user->id}.{$user->role}.{$facilityId}";

        try {
            return Cache::remember($cacheKey, 300, function () use ($user) {
                if (UserRoles::isCaregiverRole($user->role)) {
                    return $this->getCaregiverStats($user);
                }

                // Pass user to admin stats for potential facility filtering
                return $this->getAdminStats($user);
            });
        } catch (\Exception $e) {
            Log::error('DashboardService: Error fetching stats', [
                'user_id' => $user->id,
                'user_role' => $user->role,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Return empty stats on error rather than failing
            return $this->getEmptyStats($user, $e->getMessage());
        }
    }

    /**
     * Clear dashboard cache for a user
     * Clears all possible cache keys for this user (with different facility_ids)
     */
    public function clearCacheForUser(User $user): void
    {
        // Clear cache with current facility_id
        $facilityId = $user->facility_id ?? ($user->assigned_branch_id ?
            (\App\Models\Branch::find($user->assigned_branch_id)?->facility_id ?? 'none') : 'none');

        $cacheKey = "dashboard.stats.{$user->id}.{$user->role}.{$facilityId}";
        Cache::forget($cacheKey);

        // Also clear with old cache key format for backward compatibility
        $oldCacheKey = "dashboard.stats.{$user->id}.{$user->role}";
        Cache::forget($oldCacheKey);

        // Clear cache with 'none' facility_id (in case it changed)
        $noneCacheKey = "dashboard.stats.{$user->id}.{$user->role}.none";
        Cache::forget($noneCacheKey);

        // Try to clear cache with any facility_id this user might have had
        // Get all possible facility_ids from branches
        if ($user->assigned_branch_id) {
            $branch = \App\Models\Branch::find($user->assigned_branch_id);
            if ($branch && $branch->facility_id) {
                $branchCacheKey = "dashboard.stats.{$user->id}.{$user->role}.{$branch->facility_id}";
                Cache::forget($branchCacheKey);
            }
        }

        Log::info('DashboardService: Cleared cache for user', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'facility_id' => $facilityId,
        ]);
    }

    /**
     * Clear dashboard cache for all users tied to a facility (occupancy, counts, etc.).
     */
    public function clearCacheForFacility(?int $facilityId): void
    {
        if (! $facilityId) {
            return;
        }

        $branchIds = \App\Models\Branch::withoutGlobalScopes()
            ->where('facility_id', $facilityId)
            ->pluck('id');

        \App\Models\User::withoutGlobalScopes()
            ->where(function ($query) use ($facilityId, $branchIds) {
                $query->where('facility_id', $facilityId);
                if ($branchIds->isNotEmpty()) {
                    $query->orWhereIn('assigned_branch_id', $branchIds);
                }
            })
            ->select('id', 'role', 'facility_id', 'assigned_branch_id')
            ->chunkById(100, function ($users) {
                foreach ($users as $user) {
                    $this->clearCacheForUser($user);
                }
            });

        Log::info('DashboardService: Cleared cache for facility', [
            'facility_id' => $facilityId,
        ]);
    }

    /**
     * Get empty stats structure for error cases
     */
    private function getEmptyStats(User $user, ?string $errorMessage = null): array
    {
        if (UserRoles::isCaregiverRole($user->role)) {
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
                'debug_user_id' => $user->id,
                'debug_facility_id' => $user->facility_id,
                'debug_branch_id' => $user->assigned_branch_id,
                'debug_error' => $errorMessage,
            ];
        }

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
            'occupancy_rate' => 0,
            'compliance_score' => null,
            'medication_adherence_rate' => null,
            'average_incident_response_time' => null,
            'staff_utilization' => 0,
            'module_resource_counts' => [
                'assessments' => 0,
                'sleep' => 0,
                'housekeeping' => 0,
                'incidents' => 0,
                'grocery' => 0,
                'pharmacy' => 0,
                'billing' => 0,
                'fireDrills' => 0,
            ],
            'facility_id' => null,
            'facility_context_missing' => true,
            'debug_user_id' => $user->id,
            'debug_facility_id' => $user->facility_id,
            'debug_branch_id' => $user->assigned_branch_id,
            'debug_error' => $errorMessage,
        ];
    }

    /**
     * Get caregiver dashboard stats
     */
    public function getCaregiverStats(User $user): array
    {
        $userId = $user->id;
        $branchId = $user->assigned_branch_id;

        // If no branch assigned, return empty stats
        if (! $branchId) {
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
        $pendingLeaveRequests = LeaveRequest::withoutGlobalScopes()->where('staff_id', $userId)
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
     * Check if user is an administrator/admin role
     */
    private function isAdministratorRole(?string $role): bool
    {
        if (! $role) {
            return false;
        }

        $roleLower = strtolower(trim($role));

        return in_array($roleLower, ['administrator', 'admin', 'super_admin']);
    }

    /**
     * Get admin dashboard stats
     */
    public function getAdminStats(?User $user = null): array
    {
        $user = $user ?? auth()->user();

        // Use the same facility resolution logic as BaseApiController
        $facility = null;
        $isAdministrator = $this->isAdministratorRole($user->role ?? null);

        // Super admins can float between facilities; prefer explicit context
        if ($user && $user->role === 'super_admin') {
            try {
                $facility = app()->bound('facility') ? app('facility') : null;
            } catch (\Exception $e) {
                $facility = null;
            }
        } else {
            // For administrators, aggressively resolve facility from user's direct assignments
            // This ensures they always see their facility's data
            if ($isAdministrator) {
                // First try user's facility_id (most direct)
                if ($user && $user->facility_id) {
                    $facility = \App\Models\Facility::find($user->facility_id);
                }

                // If still not found, try deriving from assigned branch
                if (! $facility && $user && $user->assigned_branch_id) {
                    $branch = \App\Models\Branch::find($user->assigned_branch_id);
                    if ($branch && $branch->facility_id) {
                        $facility = \App\Models\Facility::find($branch->facility_id);
                    }
                }

                // Also try middleware context (may have been set)
                if (! $facility) {
                    try {
                        $facility = app()->bound('facility') ? app('facility') : null;
                    } catch (\Exception $e) {
                        $facility = null;
                    }
                }
            } else {
                // For non-administrators, try middleware context first
                try {
                    $facility = app()->bound('facility') ? app('facility') : null;
                } catch (\Exception $e) {
                    $facility = null;
                }

                // Fallback to user's facility_id
                if (! $facility && $user && $user->facility_id) {
                    $facility = \App\Models\Facility::find($user->facility_id);
                }

                // Derive facility from assigned branch if still unknown
                if (! $facility && $user && $user->assigned_branch_id) {
                    $branch = \App\Models\Branch::find($user->assigned_branch_id);
                    if ($branch && $branch->facility_id) {
                        $facility = \App\Models\Facility::find($branch->facility_id);
                    }
                }
            }
        }

        $facilityId = $facility ? $facility->id : null;
        $branchId = $user->assigned_branch_id ?? null;

        // Log facility resolution for debugging
        Log::info('DashboardService: Facility context resolution', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'user_facility_id' => $user->facility_id,
            'user_assigned_branch_id' => $branchId,
            'resolved_facility_id' => $facilityId,
            'app_facility_bound' => app()->bound('facility'),
            'facility_name' => $facility ? $facility->name : null,
        ]);

        // Bind facility into container so downstream code can use app('facility')
        if ($facility) {
            try {
                app()->instance('facility', $facility);
            } catch (\Exception $e) {
                Log::warning('DashboardService: failed to bind facility into container', [
                    'facility_id' => $facilityId,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // Build queries without global scopes and apply explicit facility filters
        $residentsQuery = Resident::withoutGlobalScopes()->where('is_active', true);
        $rangeStart = now()->subDays(30)->startOfDay();
        $appointmentsQuery = Appointment::withoutGlobalScopes();
        $vitalsQuery = VitalSign::withoutGlobalScopes();
        $staffQuery = User::withoutGlobalScopes()->where('is_active', true)->where('role', '!=', 'super_admin');
        $assessmentsQuery = Assessment::withoutGlobalScopes()->whereNotIn('status', ['approved', 'archived']);
        $activeMedicationsQuery = Medication::withoutGlobalScopes()->where('is_active', true);

        // If admin has assigned_branch_id but no facility_id, use branch-based filtering
        // This ensures admins see data even if facility_id isn't set on their user record
        if ($branchId && ! $facilityId && $isAdministrator) {
            // Get all branch IDs in the same facility as the assigned branch
            $assignedBranch = \App\Models\Branch::find($branchId);
            if ($assignedBranch && $assignedBranch->facility_id) {
                $facilityId = $assignedBranch->facility_id;
                $facility = \App\Models\Facility::find($facilityId);

                Log::info('DashboardService: Derived facility from assigned branch', [
                    'user_id' => $user->id,
                    'branch_id' => $branchId,
                    'derived_facility_id' => $facilityId,
                ]);
            }
        }

        // Get all branch IDs in the facility for more efficient and reliable querying
        // Always fetch branch IDs early using cached method to optimize queries
        $facilityBranchIds = null;
        if ($facilityId) {
            $facilityBranchIds = $this->getFacilityBranchIds($facilityId);
            Log::info('DashboardService: Facility branches', [
                'facility_id' => $facilityId,
                'branch_ids' => $facilityBranchIds,
                'branch_count' => count($facilityBranchIds),
            ]);
        } elseif ($branchId && $isAdministrator) {
            // If we have a branch but no facility_id, try to get facility from branch
            $assignedBranch = \App\Models\Branch::find($branchId);
            if ($assignedBranch && $assignedBranch->facility_id) {
                // Get all branches in the same facility using cached method
                $facilityBranchIds = $this->getFacilityBranchIds($assignedBranch->facility_id);
                Log::info('DashboardService: Facility branches from branch context', [
                    'branch_id' => $branchId,
                    'facility_id' => $assignedBranch->facility_id,
                    'branch_ids' => $facilityBranchIds,
                    'branch_count' => count($facilityBranchIds),
                ]);
            }
        }

        if ($facilityId) {
            // Always use branch-based filtering with whereIn (more efficient than whereHas)
            // This eliminates the need for nested whereHas queries which are slow
            if ($facilityBranchIds && ! empty($facilityBranchIds)) {
                // Filter by branch IDs directly (optimized path)
                $residentsQuery->whereIn('branch_id', $facilityBranchIds);

                $appointmentsQuery->whereIn('branch_id', $facilityBranchIds);

                // For vitals, assessments, medications - filter by resident's branch using whereIn
                // This is more efficient than nested whereHas queries
                $vitalsQuery->whereHas('resident', function ($q) use ($facilityBranchIds) {
                    $q->whereIn('branch_id', $facilityBranchIds)->where('is_active', true);
                });

                $assessmentsQuery->whereHas('resident', function ($q) use ($facilityBranchIds) {
                    $q->whereIn('branch_id', $facilityBranchIds)->where('is_active', true);
                });

                $activeMedicationsQuery->whereHas('resident', function ($q) use ($facilityBranchIds) {
                    $q->whereIn('branch_id', $facilityBranchIds)->where('is_active', true);
                });
            } else {
                // This fallback should rarely be needed, but kept for safety
                // With proper indexes on branches.facility_id, whereHas will still perform well
                Log::warning('DashboardService: No branch IDs found for facility, using whereHas fallback', [
                    'facility_id' => $facilityId,
                ]);

                $residentsQuery->whereHas('branch', function ($q) use ($facilityId) {
                    $q->where('facility_id', $facilityId);
                });

                $appointmentsQuery->whereHas('branch', function ($q) use ($facilityId) {
                    $q->where('facility_id', $facilityId);
                });

                $vitalsQuery->whereHas('resident', function ($q) use ($facilityId) {
                    $q->whereHas('branch', function ($b) use ($facilityId) {
                        $b->where('facility_id', $facilityId);
                    })->where('is_active', true);
                });

                $assessmentsQuery->whereHas('resident', function ($q) use ($facilityId) {
                    $q->whereHas('branch', function ($b) use ($facilityId) {
                        $b->where('facility_id', $facilityId);
                    })->where('is_active', true);
                });

                $activeMedicationsQuery->whereHas('resident', function ($q) use ($facilityId) {
                    $q->whereHas('branch', function ($b) use ($facilityId) {
                        $b->where('facility_id', $facilityId);
                    })->where('is_active', true);
                });
            }

            // Staff query - check if facility_id column exists before using it
            if (Schema::hasColumn('users', 'facility_id')) {
                $staffQuery->where('facility_id', $facilityId);
            } else {
                // Fallback: filter by users who have assigned_branch_id in facility branches
                if ($facilityBranchIds && ! empty($facilityBranchIds)) {
                    $staffQuery->whereIn('assigned_branch_id', $facilityBranchIds);
                }
            }
        }

        // If no facility found, try additional fallback methods for administrators (only if residents table has created_by)
        if (! $facilityId && $user && $user->role !== 'super_admin' && $isAdministrator && Schema::hasColumn('residents', 'created_by')) {
            // Try to find facility from any residents created by this user
            $residentWithFacility = Resident::withoutGlobalScopes()
                ->where('created_by', $user->id)
                ->whereNotNull('facility_id')
                ->first();

            if ($residentWithFacility && $residentWithFacility->facility_id) {
                $facilityId = $residentWithFacility->facility_id;
                $facility = \App\Models\Facility::find($facilityId);
                Log::info('DashboardService: Derived facility from created residents', [
                    'user_id' => $user->id,
                    'derived_facility_id' => $facilityId,
                ]);
            }

            // If still not found, try to find from branch where user created residents
            if (! $facilityId) {
                $residentWithBranch = Resident::withoutGlobalScopes()
                    ->where('created_by', $user->id)
                    ->whereNotNull('branch_id')
                    ->with('branch')
                    ->first();

                if ($residentWithBranch && $residentWithBranch->branch && $residentWithBranch->branch->facility_id) {
                    $facilityId = $residentWithBranch->branch->facility_id;
                    $facility = \App\Models\Facility::find($facilityId);
                    Log::info('DashboardService: Derived facility from resident branch', [
                        'user_id' => $user->id,
                        'derived_facility_id' => $facilityId,
                    ]);
                }
            }

            // If still no facility, log warning and query all data (no filters)
            if (! $facilityId) {
                Log::warning('DashboardService: No facility context found for administrator - querying all data', [
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                    'user_facility_id' => $user->facility_id,
                    'user_assigned_branch_id' => $user->assigned_branch_id,
                    'app_facility_bound' => app()->bound('facility'),
                    'host' => request()->getHost(),
                    'path' => request()->path(),
                ]);
                // For administrators without facility context, query all data (no filters)
                // This allows them to see data even if facility context isn't set
                // Queries are already built without filters when $facilityId is null
            } else {
                // Re-apply facility filters since we just found the facility
                // Use cached method to get branch IDs
                $facilityBranchIds = $this->getFacilityBranchIds($facilityId);

                if ($facilityBranchIds && ! empty($facilityBranchIds)) {
                    $residentsQuery->whereIn('branch_id', $facilityBranchIds);
                    $appointmentsQuery->whereIn('branch_id', $facilityBranchIds);
                    $vitalsQuery->whereHas('resident', function ($q) use ($facilityBranchIds) {
                        $q->whereIn('branch_id', $facilityBranchIds)->where('is_active', true);
                    });
                    $assessmentsQuery->whereHas('resident', function ($q) use ($facilityBranchIds) {
                        $q->whereIn('branch_id', $facilityBranchIds)->where('is_active', true);
                    });
                    $activeMedicationsQuery->whereHas('resident', function ($q) use ($facilityBranchIds) {
                        $q->whereIn('branch_id', $facilityBranchIds)->where('is_active', true);
                    });
                }
                // Staff query - check if facility_id column exists before using it
                if (Schema::hasColumn('users', 'facility_id')) {
                    $staffQuery->where('facility_id', $facilityId);
                } else {
                    // Fallback: filter by users who have assigned_branch_id in facility branches
                    if ($facilityBranchIds && ! empty($facilityBranchIds)) {
                        $staffQuery->whereIn('assigned_branch_id', $facilityBranchIds);
                    }
                }
            }
        }

        // Execute queries and log results for debugging
        try {
            $totalResidents = $residentsQuery->count();
            $todayAppointments = $appointmentsQuery->whereDate('appointment_date', today())->count();
            $upcomingAppointments = $appointmentsQuery->whereDate('appointment_date', '>=', today())
                ->whereNotIn('status', ['cancelled', 'completed'])
                ->count();
            $todayVitals = $vitalsQuery->whereDate('measurement_date', today())->count();
            $totalStaff = $staffQuery->count();
            $pendingAssessments = $assessmentsQuery->count();
            $activeMedications = $activeMedicationsQuery->count();

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

            // Log all results for debugging
            Log::info('DashboardService: Query results', [
                'facility_id' => $facilityId,
                'user_id' => $user->id,
                'user_role' => $user->role,
                'total_residents' => $totalResidents,
                'today_appointments' => $todayAppointments,
                'appointments_last_30' => $appointmentsLast30,
                'today_vitals' => $todayVitals,
                'vitals_last_30' => $vitalsLast30,
                'total_staff' => $totalStaff,
                'pending_assessments' => $pendingAssessments,
                'active_medications' => $activeMedications,
            ]);

            // Log warning if zero results with facility context
            if ($totalResidents === 0 && $facilityId) {
                Log::warning('DashboardService: Zero residents found for facility', [
                    'facility_id' => $facilityId,
                    'user_id' => $user->id,
                    'user_role' => $user->role,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('DashboardService: Error executing queries', [
                'facility_id' => $facilityId,
                'user_id' => $user->id,
                'user_role' => $user->role,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            // Set defaults on error
            $totalResidents = 0;
            $todayAppointments = 0;
            $upcomingAppointments = 0;
            $todayVitals = 0;
            $totalStaff = 0;
            $pendingAssessments = 0;
            $activeMedications = 0;
            $appointmentsLast30 = 0;
            $vitalsLast30 = 0;
            $assessmentsLast30 = 0;
        }

        // Final check: Ensure facilityBranchIds is set if we have facilityId but it wasn't set earlier
        if ($facilityId && (! $facilityBranchIds || empty($facilityBranchIds))) {
            $facilityBranchIds = \App\Models\Branch::where('facility_id', $facilityId)->pluck('id')->toArray();
            Log::info('DashboardService: Set facilityBranchIds from facilityId in final check', [
                'facility_id' => $facilityId,
                'branch_count' => count($facilityBranchIds),
            ]);
        }

        // Also check if we have branch with facility but facilityId wasn't resolved
        // This is a critical fallback - if user has branch assigned, we MUST derive facility
        if (! $facilityId && $branchId) {
            $assignedBranch = \App\Models\Branch::find($branchId);
            if ($assignedBranch) {
                if ($assignedBranch->facility_id) {
                    $facilityId = $assignedBranch->facility_id;
                    $facilityBranchIds = \App\Models\Branch::where('facility_id', $facilityId)->pluck('id')->toArray();
                    Log::info('DashboardService: Final check - Derived facility from branch', [
                        'branch_id' => $branchId,
                        'facility_id' => $facilityId,
                        'branch_count' => count($facilityBranchIds),
                    ]);
                } else {
                    Log::warning('DashboardService: User has branch assigned but branch has no facility_id', [
                        'user_id' => $user->id,
                        'branch_id' => $branchId,
                        'branch_name' => $assignedBranch->name,
                    ]);
                }
            } else {
                Log::warning('DashboardService: User has assigned_branch_id but branch not found', [
                    'user_id' => $user->id,
                    'branch_id' => $branchId,
                ]);
            }
        }

        // Calculate new metrics
        $newMetrics = $this->calculateNewMetrics($facilityId);

        // Determine if facility context is truly missing
        // Only show warning if:
        // 1. User is an administrator (not super_admin)
        // 2. No facilityId was resolved
        // 3. No branch-based filtering is available (no branchId or no facilityBranchIds)
        $hasValidContext = $facilityId || ($branchId && $facilityBranchIds && ! empty($facilityBranchIds));
        $shouldShowWarning = ! $hasValidContext &&
                             $user &&
                             $user->role !== 'super_admin' &&
                             $isAdministrator;

        // Log final context determination for debugging
        Log::info('DashboardService: Final context determination', [
            'user_id' => $user->id,
            'user_role' => $user->role,
            'user_facility_id' => $user->facility_id,
            'user_assigned_branch_id' => $branchId,
            'resolved_facility_id' => $facilityId,
            'facility_branch_ids_count' => $facilityBranchIds ? count($facilityBranchIds) : 0,
            'has_valid_context' => $hasValidContext,
            'should_show_warning' => $shouldShowWarning,
            'is_administrator' => $isAdministrator,
        ]);

        return [
            'total_residents' => $totalResidents,
            'active_residents' => $totalResidents,
            'today_appointments' => $todayAppointments,
            'upcoming_appointments' => $upcomingAppointments,
            'today_vitals' => $todayVitals,
            'last_30_appointments' => $appointmentsLast30,
            'last_30_vitals' => $vitalsLast30,
            'last_30_assessments' => $assessmentsLast30,
            'total_staff' => $totalStaff,
            'pending_assessments' => $pendingAssessments,
            'active_medications' => $activeMedications,
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
            // Debug info
            'facility_id' => $facilityId,
            'facility_context_missing' => $shouldShowWarning,
            // Add debug info about what was tried
            'facility_resolution_attempted' => $isAdministrator,
            'user_has_facility_id' => (bool) ($user->facility_id ?? false),
            'user_has_branch_id' => (bool) ($user->assigned_branch_id ?? false),
            'has_branch_based_filtering' => (bool) ($branchId && $facilityBranchIds && ! empty($facilityBranchIds)),
            'has_valid_context' => $hasValidContext,
            'debug_user_id' => $user->id,
            'debug_facility_id' => $user->facility_id,
            'debug_branch_id' => $user->assigned_branch_id,
            'module_resource_counts' => $this->aggregateModuleResourceCounts($user, $facilityId, $facilityBranchIds),
        ];
    }

    /**
     * Totals for dashboard module overview cards (single payload with /dashboard/stats — avoids 8 separate list API calls).
     *
     * @param  array<int>|null  $facilityBranchIds
     * @return array<string, int>
     */
    private function aggregateModuleResourceCounts(User $user, ?int $facilityId, ?array $facilityBranchIds): array
    {
        $empty = [
            'assessments' => 0,
            'sleep' => 0,
            'housekeeping' => 0,
            'incidents' => 0,
            'grocery' => 0,
            'pharmacy' => 0,
            'billing' => 0,
            'fireDrills' => 0,
        ];

        try {
            if ($user->role === 'super_admin' && ! $facilityId && empty($facilityBranchIds)) {
                return [
                    'assessments' => Assessment::withoutGlobalScopes()->count(),
                    'sleep' => SleepRecord::query()->count(),
                    'housekeeping' => CleaningTask::query()->count(),
                    'incidents' => Incident::withoutGlobalScopes()->count(),
                    'grocery' => GroceryStatusUpdate::withoutGlobalScopes()->count(),
                    'pharmacy' => PharmacyInventory::withoutGlobalScopes()->count(),
                    'billing' => Expense::withoutGlobalScopes()->count(),
                    'fireDrills' => FireDrill::withoutGlobalScopes()->count(),
                ];
            }

            if (empty($facilityBranchIds)) {
                return $empty;
            }

            $branchIds = array_values(array_filter(array_map('intval', $facilityBranchIds)));

            return [
                'assessments' => Assessment::withoutGlobalScopes()->whereIn('branch_id', $branchIds)->count(),
                'sleep' => SleepRecord::query()->whereIn('branch_id', $branchIds)->count(),
                'housekeeping' => CleaningTask::query()
                    ->whereHas('area', static function ($q) use ($branchIds): void {
                        $q->whereIn('branch_id', $branchIds);
                    })
                    ->count(),
                'incidents' => Incident::withoutGlobalScopes()->whereIn('branch_id', $branchIds)->count(),
                'grocery' => GroceryStatusUpdate::withoutGlobalScopes()->whereIn('branch_id', $branchIds)->count(),
                'pharmacy' => PharmacyInventory::withoutGlobalScopes()->whereIn('branch_id', $branchIds)->count(),
                'billing' => $facilityId
                    ? Expense::withoutGlobalScopes()->where('facility_id', $facilityId)->count()
                    : 0,
                'fireDrills' => FireDrill::withoutGlobalScopes()->whereIn('branch_id', $branchIds)->count(),
            ];
        } catch (\Throwable $e) {
            Log::warning('DashboardService: aggregateModuleResourceCounts failed', [
                'user_id' => $user->id,
                'message' => $e->getMessage(),
            ]);

            return $empty;
        }
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

                    if (! $alreadyAdministered) {
                        $residentName = 'Unknown';
                        if ($medication->resident) {
                            $name = trim(($medication->resident->first_name ?? '').' '.($medication->resident->last_name ?? ''));
                            $residentName = ! empty($name) ? $name : ($medication->resident->name ?? 'Unknown');
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
                    $name = trim(($appointment->resident->first_name ?? '').' '.($appointment->resident->last_name ?? ''));
                    $residentName = ! empty($name) ? $name : ($appointment->resident->name ?? 'Unknown');
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
                $name = trim(($resident->first_name ?? '').' '.($resident->last_name ?? ''));
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
            'compliance_score' => null,
            'medication_adherence_rate' => null,
            'average_incident_response_time' => null,
            'staff_utilization' => 0,
        ];

        if (! $facilityId) {
            return $metrics;
        }

        // 1. Occupancy Rate: active residents / sum of branch resident capacities
        $totalResidents = Resident::withoutGlobalScopes()
            ->where('is_active', true)
            ->whereHas('branch', function ($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            })
            ->count();

        $totalCapacity = (int) \App\Models\Branch::withoutGlobalScopes()
            ->where('facility_id', $facilityId)
            ->where('is_active', true)
            ->sum('resident_capacity');

        if ($totalCapacity > 0) {
            $metrics['occupancy_rate'] = min(100, round(($totalResidents / $totalCapacity) * 100, 1));
        }

        // 2. Compliance Score: completed / (assessments in last 30 days OR still incomplete/overdue)
        $rangeStart = now()->subDays(30)->startOfDay();
        $rangeEnd = now()->endOfDay();
        $assessmentBaseQuery = Assessment::withoutGlobalScopes()
            ->whereHas('resident', function ($q) use ($facilityId) {
                $q->whereHas('branch', function ($b) use ($facilityId) {
                    $b->where('facility_id', $facilityId);
                })->where('is_active', true);
            })
            ->where(function ($q) use ($rangeStart, $rangeEnd) {
                $q->whereBetween('assessment_date', [$rangeStart->toDateString(), $rangeEnd->toDateString()])
                    ->orWhere(function ($fallback) use ($rangeStart, $rangeEnd) {
                        $fallback->whereNull('assessment_date')
                            ->whereBetween('created_at', [$rangeStart, $rangeEnd]);
                    })
                    ->orWhereNotIn('status', ['approved', 'completed', 'archived']);
            });

        $totalAssessments = (clone $assessmentBaseQuery)->count();
        $completedAssessments = (clone $assessmentBaseQuery)
            ->whereIn('status', ['approved', 'completed'])
            ->count();

        if ($totalAssessments > 0) {
            $metrics['compliance_score'] = round(($completedAssessments / $totalAssessments) * 100, 1);
        }

        // 3. Medication Adherence: completed doses / scheduled slots (last 7 days, real time slots)
        $weekStart = now()->subDays(6)->startOfDay();
        $adherence = $this->calculateFacilityMedicationAdherence($facilityId, $weekStart, now());
        if ($adherence !== null) {
            $metrics['medication_adherence_rate'] = $adherence;
        }

        // 4. Average Incident Response Time: resolved/closed incidents in last 30 days
        $resolvedIncidents = Incident::withoutGlobalScopes()
            ->whereHas('branch', function ($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            })
            ->whereBetween('created_at', [$rangeStart, now()])
            ->where(function ($q) {
                $q->whereNotNull('resolved_at')
                    ->orWhereIn('status', [Incident::STATUS_RESOLVED, Incident::STATUS_CLOSED]);
            })
            ->get();

        if ($resolvedIncidents->count() > 0) {
            $totalResponseTime = $resolvedIncidents->sum(function ($incident) {
                $resolvedAt = $incident->resolved_at ?? $incident->updated_at ?? $incident->created_at;

                return abs($incident->created_at->diffInHours($resolvedAt));
            });
            $metrics['average_incident_response_time'] = round($totalResponseTime / $resolvedIncidents->count(), 1);
        }

        // 5. Staff Utilization: active staff count for the facility
        $totalStaff = User::withoutGlobalScopes()
            ->where('facility_id', $facilityId)
            ->where('is_active', true)
            ->where('role', '!=', 'super_admin')
            ->count();

        // For now, utilization is just the count (can be enhanced with capacity later)
        $metrics['staff_utilization'] = $totalStaff;

        return $metrics;
    }

    /**
     * Scheduled-slot adherence for a facility over a date range (excludes PRN medications).
     */
    private function calculateFacilityMedicationAdherence(int $facilityId, Carbon $rangeStart, Carbon $rangeEnd): ?float
    {
        $totalScheduled = 0;
        $totalCompleted = 0;
        $current = $rangeStart->copy()->startOfDay();
        $end = $rangeEnd->copy()->endOfDay();

        while ($current <= $end) {
            $dateStr = $current->toDateString();

            $activeMeds = Medication::withoutGlobalScopes()
                ->where('is_active', true)
                ->where('start_date', '<=', $dateStr)
                ->where(function ($q) use ($dateStr) {
                    $q->whereNull('end_date')
                        ->orWhere('end_date', '>=', $dateStr);
                })
                ->whereHas('resident', function ($q) use ($facilityId) {
                    $q->where('is_active', true)
                        ->whereHas('branch', function ($b) use ($facilityId) {
                            $b->where('facility_id', $facilityId);
                        });
                })
                ->get(['id', 'instructions', 'time_1', 'time_2', 'time_3', 'time_4']);

            foreach ($activeMeds as $medication) {
                $instructions = strtolower((string) $medication->instructions);
                if (str_contains($instructions, 'prn') || str_contains($instructions, 'as needed')) {
                    continue;
                }

                for ($slot = 1; $slot <= 4; $slot++) {
                    if ($medication->{"time_{$slot}"}) {
                        $totalScheduled++;
                    }
                }
            }

            $totalCompleted += MedicationAdministration::withoutGlobalScopes()
                ->where('status', 'completed')
                ->whereBetween('administered_at', [$current->copy()->startOfDay(), $current->copy()->endOfDay()])
                ->whereHas('resident', function ($q) use ($facilityId) {
                    $q->where('is_active', true)
                        ->whereHas('branch', function ($b) use ($facilityId) {
                            $b->where('facility_id', $facilityId);
                        });
                })
                ->count();

            $current->addDay();
        }

        if ($totalScheduled === 0) {
            return null;
        }

        return min(100, round(($totalCompleted / $totalScheduled) * 100, 1));
    }

    /**
     * Get upcoming events from all modules
     */
    public function getUpcomingEvents(User $user, int $limit = 20): array
    {
        $events = [];
        $facility = $this->getCurrentFacility($user);
        $facilityId = $facility ? $facility->id : null;
        $isCaregiver = UserRoles::isCaregiverRole($user->role);
        $branchId = $isCaregiver ? $user->assigned_branch_id : null;

        // 1. Upcoming Appointments (guard table existence)
        if (Schema::hasTable('appointments')) {
            $appointmentsQuery = Appointment::withoutGlobalScopes()
                ->with(['resident', 'branch', 'appointmentType'])
                ->whereDate('appointment_date', '>=', today())
                ->whereNotIn('status', ['cancelled', 'completed']);

            if ($facilityId) {
                $appointmentsQuery->whereHas('branch', function ($q) use ($facilityId) {
                    $q->where('facility_id', $facilityId);
                });
            }
            if ($branchId) {
                $appointmentsQuery->where('branch_id', $branchId);
            }

            $appointmentsQuery->orderBy('appointment_date', 'asc')
                ->orderBy('appointment_time', 'asc')
                ->limit($limit)
                ->get()
                ->each(function ($appointment) use (&$events) {
                    $dateTime = \Carbon\Carbon::parse($appointment->appointment_date->format('Y-m-d').' '.($appointment->appointment_time ?? '00:00:00'));
                    $events[] = [
                        'id' => 'appointment_'.$appointment->id,
                        'type' => 'appointment',
                        'title' => $appointment->title ?? ($appointment->appointmentType?->name ?? 'Appointment'),
                        'description' => $appointment->resident ? $appointment->resident->first_name.' '.$appointment->resident->last_name : 'No resident',
                        'date' => $appointment->appointment_date->toDateString(),
                        'time' => $appointment->appointment_time,
                        'datetime' => $dateTime->toIso8601String(),
                        'location' => $appointment->location,
                        'branch' => $appointment->branch?->name,
                        'link' => '/appointments',
                        'icon' => 'calendar',
                        'color' => 'blue',
                    ];
                });
        }

        // 2. Upcoming Fire Drills
        if ((! $isCaregiver || $facilityId) && Schema::hasTable('fire_drills')) {
            $fireDrillsQuery = FireDrill::withoutGlobalScopes()
                ->with(['branch'])
                ->where('status', 'scheduled')
                ->whereDate('scheduled_date', '>=', today());

            if ($facilityId) {
                $fireDrillsQuery->whereHas('branch', function ($q) use ($facilityId) {
                    $q->where('facility_id', $facilityId);
                });
            }
            if ($branchId) {
                $fireDrillsQuery->where('branch_id', $branchId);
            }

            $fireDrillsQuery->orderBy('scheduled_date', 'asc')
                ->orderBy('scheduled_time', 'asc')
                ->limit($limit)
                ->get()
                ->each(function ($drill) use (&$events) {
                    $dateTime = \Carbon\Carbon::parse($drill->scheduled_date->format('Y-m-d').' '.($drill->scheduled_time ?? '10:00:00'));
                    $events[] = [
                        'id' => 'firedrill_'.$drill->id,
                        'type' => 'fire_drill',
                        'title' => 'Fire Drill: '.($drill->branch?->name ?? 'Unknown Branch'),
                        'description' => $drill->notes ?? 'Scheduled fire drill',
                        'date' => $drill->scheduled_date->toDateString(),
                        'time' => $drill->scheduled_time,
                        'datetime' => $dateTime->toIso8601String(),
                        'branch' => $drill->branch?->name,
                        'link' => '/fire-drills',
                        'icon' => 'flame',
                        'color' => 'orange',
                    ];
                });
        }

        // 3. Pending Assessments (due soon or overdue)
        if (Schema::hasTable('assessments')) {
            $assessmentsQuery = Assessment::withoutGlobalScopes()
                ->with(['resident', 'resident.branch'])
                ->whereNotIn('status', ['approved', 'archived', 'completed']);

            if ($facilityId) {
                $assessmentsQuery->whereHas('resident', function ($q) use ($facilityId) {
                    $q->whereHas('branch', function ($b) use ($facilityId) {
                        $b->where('facility_id', $facilityId);
                    })->where('is_active', true);
                });
            }
            if ($branchId) {
                $assessmentsQuery->whereHas('resident', function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId)->where('is_active', true);
                });
            }

            $assessmentsQuery->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get()
                ->each(function ($assessment) use (&$events) {
                    $events[] = [
                        'id' => 'assessment_'.$assessment->id,
                        'type' => 'assessment',
                        'title' => 'Assessment: '.($assessment->resident ? $assessment->resident->first_name.' '.$assessment->resident->last_name : 'Unknown'),
                        'description' => 'Status: '.ucfirst($assessment->status),
                        'date' => $assessment->assessment_date?->toDateString() ?? $assessment->created_at->toDateString(),
                        'time' => null,
                        'datetime' => ($assessment->assessment_date ?? $assessment->created_at)->toIso8601String(),
                        'branch' => $assessment->resident?->branch?->name,
                        'link' => '/assessments/'.$assessment->id,
                        'icon' => 'clipboard',
                        'color' => 'purple',
                    ];
                });
        }

        // 4. Due Medication Administrations (next 7 days)
        if (Schema::hasTable('medications')) {
            $medicationsQuery = Medication::withoutGlobalScopes()
                ->with(['resident', 'resident.branch', 'drug'])
                ->where('is_active', true)
                ->whereHas('resident', function ($q) use ($facilityId, $branchId) {
                    $q->where('is_active', true);
                    if ($facilityId) {
                        $q->whereHas('branch', function ($b) use ($facilityId) {
                            $b->where('facility_id', $facilityId);
                        });
                    }
                    if ($branchId) {
                        $q->where('branch_id', $branchId);
                    }
                });

            $medicationsQuery->limit($limit)
                ->get()
                ->each(function ($medication) use (&$events) {
                    // Estimate next due date (simplified - assumes daily)
                    $nextDue = now()->addDay();
                    $medicationName = $medication->drug?->name ?? $medication->name ?? 'Unknown Medication';
                    $timeStr = $medication->time_1 ?? '09:00:00';
                    $events[] = [
                        'id' => 'medication_'.$medication->id,
                        'type' => 'medication',
                        'title' => 'Medication: '.$medicationName,
                        'description' => $medication->resident ? $medication->resident->first_name.' '.$medication->resident->last_name : 'No resident',
                        'date' => $nextDue->toDateString(),
                        'time' => $timeStr,
                        'datetime' => $nextDue->setTimeFromTimeString($timeStr)->toIso8601String(),
                        'branch' => $medication->resident?->branch?->name,
                        'link' => '/medications',
                        'icon' => 'pill',
                        'color' => 'green',
                    ];
                });
        }

        // 5. Pending Grocery Status Updates (current and next week)
        if ((! $isCaregiver || $facilityId) && Schema::hasTable('grocery_status_updates')) {
            $currentWeekStart = now()->startOfWeek();
            $nextWeekStart = $currentWeekStart->copy()->addWeek();

            $groceryQuery = GroceryStatusUpdate::withoutGlobalScopes()
                ->with(['branch'])
                ->whereIn('status', ['pending', 'in_progress'])
                ->whereIn('week_start_date', [$currentWeekStart->toDateString(), $nextWeekStart->toDateString()]);

            if ($facilityId) {
                $groceryQuery->whereHas('branch', function ($q) use ($facilityId) {
                    $q->where('facility_id', $facilityId);
                });
            }
            if ($branchId) {
                $groceryQuery->where('branch_id', $branchId);
            }

            $groceryQuery->orderBy('week_start_date', 'asc')
                ->limit($limit)
                ->get()
                ->each(function ($grocery) use (&$events) {
                    $events[] = [
                        'id' => 'grocery_'.$grocery->id,
                        'type' => 'grocery',
                        'title' => 'Grocery Status: '.($grocery->branch?->name ?? 'Unknown Branch'),
                        'description' => 'Week of '.$grocery->week_start_date->format('M d').' - Status: '.ucfirst($grocery->status),
                        'date' => $grocery->week_start_date->toDateString(),
                        'time' => null,
                        'datetime' => $grocery->week_start_date->toIso8601String(),
                        'branch' => $grocery->branch?->name,
                        'link' => '/grocery-status',
                        'icon' => 'shopping-cart',
                        'color' => 'yellow',
                    ];
                });
        }

        // 6. Scheduled Cleaning Task Assignments
        if ((! $isCaregiver || $facilityId) && Schema::hasTable('cleaning_task_assignments')) {
            $cleaningQuery = CleaningTaskAssignment::withoutGlobalScopes()
                ->with(['task.area.branch', 'user'])
                ->where('status', 'assigned')
                ->whereDate('scheduled_date', '>=', today())
                ->whereDate('scheduled_date', '<=', now()->addDays(7));

            if ($facilityId) {
                $cleaningQuery->whereHas('task.area.branch', function ($q) use ($facilityId) {
                    $q->where('facility_id', $facilityId);
                });
            }
            if ($branchId) {
                // Filter by branch if task area has branch_id
                $cleaningQuery->whereHas('task.area', function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId);
                });
            }

            $cleaningQuery->orderBy('scheduled_date', 'asc')
                ->limit($limit)
                ->get()
                ->each(function ($assignment) use (&$events) {
                    $events[] = [
                        'id' => 'cleaning_'.$assignment->id,
                        'type' => 'cleaning',
                        'title' => 'Cleaning: '.($assignment->task?->title ?? 'Task'),
                        'description' => $assignment->task?->area?->name ?? 'Housekeeping',
                        'date' => $assignment->scheduled_date->toDateString(),
                        'time' => null,
                        'datetime' => $assignment->scheduled_date->toIso8601String(),
                        'branch' => $assignment->task?->area?->branch?->name,
                        'link' => '/housekeeping',
                        'icon' => 'sparkles',
                        'color' => 'indigo',
                    ];
                });
        }

        // Sort all events by datetime
        usort($events, function ($a, $b) {
            return strtotime($a['datetime']) - strtotime($b['datetime']);
        });

        // Return limited results
        return array_slice($events, 0, $limit);
    }

    /**
     * Get current facility for user (helper method)
     */
    private function getCurrentFacility(?User $user = null): ?\App\Models\Facility
    {
        $user = $user ?? auth()->user();
        if (! $user) {
            return null;
        }

        // Super admins can float between facilities; prefer explicit context
        if ($user->role === 'super_admin') {
            try {
                return app()->bound('facility') ? app('facility') : null;
            } catch (\Exception $e) {
                return null;
            }
        }

        // Try facility from current request context (set by middleware)
        try {
            $facility = app()->bound('facility') ? app('facility') : null;
        } catch (\Exception $e) {
            $facility = null;
        }

        // Fallback to user's facility_id
        if (! $facility && $user->facility_id) {
            $facility = \App\Models\Facility::find($user->facility_id);
        }

        // Derive facility from assigned branch if still unknown
        if (! $facility && $user->assigned_branch_id) {
            $branch = \App\Models\Branch::find($user->assigned_branch_id);
            if ($branch && $branch->facility_id) {
                $facility = \App\Models\Facility::find($branch->facility_id);
            }
        }

        return $facility;
    }

    /**
     * Get today's schedule (appointments, vitals, medications) for a user
     */
    public function getTodaysSchedule(User $user, int $limit = 10): array
    {
        $schedule = [];
        $facility = $this->getCurrentFacility($user);
        $facilityId = $facility ? $facility->id : null;
        $isCaregiver = UserRoles::isCaregiverRole($user->role);
        $branchId = $isCaregiver ? $user->assigned_branch_id : null;

        // Get all branch IDs in the facility for more efficient and reliable querying
        $facilityBranchIds = null;
        if ($facilityId) {
            $facilityBranchIds = \App\Models\Branch::where('facility_id', $facilityId)->pluck('id')->toArray();
        } elseif ($branchId) {
            $assignedBranch = \App\Models\Branch::find($branchId);
            if ($assignedBranch && $assignedBranch->facility_id) {
                $facilityBranchIds = \App\Models\Branch::where('facility_id', $assignedBranch->facility_id)->pluck('id')->toArray();
            }
        }

        // 1. Appointments for today
        if (Schema::hasTable('appointments')) {
            $appointmentsQuery = Appointment::withoutGlobalScopes()
                ->with(['resident', 'appointmentType', 'branch'])
                ->whereDate('appointment_date', today())
                ->whereNotIn('status', ['cancelled', 'completed']);

            if ($facilityBranchIds && ! empty($facilityBranchIds)) {
                $appointmentsQuery->whereIn('branch_id', $facilityBranchIds);
            } elseif ($facilityId) {
                $appointmentsQuery->whereHas('branch', function ($q) use ($facilityId) {
                    $q->where('facility_id', $facilityId);
                });
            } elseif ($branchId) {
                $appointmentsQuery->where('branch_id', $branchId);
            }

            $appointmentsQuery->orderBy('appointment_time', 'asc')
                ->limit($limit)
                ->get()
                ->each(function ($appointment) use (&$schedule) {
                    $residentName = 'Unknown';
                    if ($appointment->resident) {
                        $name = trim(($appointment->resident->first_name ?? '').' '.($appointment->resident->last_name ?? ''));
                        $residentName = ! empty($name) ? $name : ($appointment->resident->name ?? 'Unknown');
                    }
                    $time = $appointment->appointment_time ? Carbon::parse($appointment->appointment_time)->format('g:i A') : 'TBD';
                    $time24h = $appointment->appointment_time ? Carbon::parse($appointment->appointment_time)->format('H:i') : '00:00';
                    $schedule[] = [
                        'id' => 'appointment_'.$appointment->id,
                        'type' => 'appointment',
                        'title' => $appointment->title ?? ($appointment->appointmentType?->name ?? 'Appointment'),
                        'resident_name' => $residentName,
                        'time' => $time,
                        'time_24h' => $time24h,
                        'time_short' => $appointment->appointment_time ? Carbon::parse($appointment->appointment_time)->format('g:i A') : 'TBD',
                        'location' => $appointment->location ?? ($appointment->branch?->name ?? 'N/A'),
                        'category' => $appointment->appointmentType?->name ?? 'Appointment',
                        'category_color' => 'blue',
                        'link' => '/appointments',
                        'appointment_id' => $appointment->id,
                    ];
                });
        }

        // 2. Vitals due today (for residents in context) - DISABLED
        // Removed automatic vital recording reminders from schedule since some facilities
        // don't record vitals every day. Vitals can still be recorded manually via the Vitals module.
        // if (Schema::hasTable('vital_signs')) {
        //     $vitalsQuery = Resident::withoutGlobalScopes()
        //         ->where('is_active', true)
        //         ->whereDoesntHave('vitalSigns', function ($q) {
        //             $q->whereDate('measurement_date', today());
        //         });

        //     if ($facilityBranchIds && !empty($facilityBranchIds)) {
        //         $vitalsQuery->whereIn('branch_id', $facilityBranchIds);
        //     } elseif ($facilityId) {
        //         $vitalsQuery->whereHas('branch', function ($q) use ($facilityId) {
        //             $q->where('facility_id', $facilityId);
        //         });
        //     } elseif ($branchId) {
        //         $vitalsQuery->where('branch_id', $branchId);
        //     }

        //     $vitalsQuery->limit(5)
        //         ->get()
        //         ->each(function ($resident) use (&$schedule) {
        //             $name = trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? ''));
        //             $residentName = !empty($name) ? $name : ($resident->name ?? 'Unknown');
        //             // Use a default morning time (9:00 AM) for vitals so they appear in timeline
        //             $schedule[] = [
        //                 'id' => 'vitals_resident_' . $resident->id,
        //                 'type' => 'vitals',
        //                 'title' => 'Record Vitals',
        //                 'resident_name' => $residentName,
        //                 'time' => '9:00 AM',
        //                 'time_24h' => '09:00',
        //                 'time_short' => '9:00 AM',
        //                 'location' => $resident->room_number ?? $resident->room ?? 'N/A',
        //                 'category' => 'Vitals',
        //                 'category_color' => 'green',
        //                 'link' => '/vitals?resident=' . $resident->id,
        //             ];
        //         });
        // }

        // 3. Medications due today (for residents in context) - only show upcoming/not yet administered
        if (Schema::hasTable('medications')) {
            $now = Carbon::now();
            $medicationsQuery = Medication::withoutGlobalScopes()
                ->with(['resident', 'drug'])
                ->where('is_active', true)
                ->where(function ($q) {
                    $q->whereNull('start_date')->orWhere('start_date', '<=', today());
                })
                ->where(function ($q) {
                    $q->whereNull('end_date')->orWhere('end_date', '>=', today());
                });

            if ($facilityBranchIds && ! empty($facilityBranchIds)) {
                $medicationsQuery->whereHas('resident', function ($q) use ($facilityBranchIds) {
                    $q->whereIn('branch_id', $facilityBranchIds)->where('is_active', true);
                });
            } elseif ($facilityId) {
                $medicationsQuery->whereHas('resident', function ($q) use ($facilityId) {
                    $q->whereHas('branch', function ($b) use ($facilityId) {
                        $b->where('facility_id', $facilityId);
                    });
                });
            } elseif ($branchId) {
                $medicationsQuery->whereHas('resident', function ($q) use ($branchId) {
                    $q->where('branch_id', $branchId);
                });
            }

            $medicationsQuery->limit(20) // Get more to filter
                ->get()
                ->each(function ($medication) use (&$schedule) {
                    $upcomingTimes = [];
                    $allTimes = [];

                    // Get all scheduled times for this medication
                    for ($i = 1; $i <= 4; $i++) {
                        if ($medication->{"time_{$i}"}) {
                            $timeStr = $medication->{"time_{$i}"};
                            $timeToday = Carbon::today()->setTimeFromTimeString($timeStr);
                            $allTimes[] = [
                                'time' => Carbon::parse($timeStr)->format('g:i A'),
                                'time24h' => Carbon::parse($timeStr)->format('H:i'),
                                'timeObj' => $timeToday,
                            ];

                            // Check if medication has been administered at this time today
                            $alreadyAdministered = false;
                            if (Schema::hasTable('medication_administrations')) {
                                $alreadyAdministered = MedicationAdministration::where('medication_id', $medication->id)
                                    ->whereDate('administered_at', today())
                                    ->whereTime('administered_at', $timeStr)
                                    ->where('status', 'completed')
                                    ->exists();
                            }

                            // Include if not yet administered (regardless of whether time has passed)
                            // This shows medications that still need to be given today
                            if (! $alreadyAdministered) {
                                $upcomingTimes[] = [
                                    'time' => Carbon::parse($timeStr)->format('g:i A'),
                                    'time24h' => Carbon::parse($timeStr)->format('H:i'),
                                    'timeObj' => $timeToday,
                                ];
                            }
                        }
                    }

                    // Only add if there are upcoming times (not yet administered)
                    if (count($upcomingTimes) > 0) {
                        $residentName = 'Unknown';
                        if ($medication->resident) {
                            $name = trim(($medication->resident->first_name ?? '').' '.($medication->resident->last_name ?? ''));
                            $residentName = ! empty($name) ? $name : ($medication->resident->name ?? 'Unknown');
                        }

                        // Use the earliest upcoming time for display
                        usort($upcomingTimes, function ($a, $b) {
                            return $a['timeObj']->gt($b['timeObj']) ? 1 : -1;
                        });

                        $displayTime = count($upcomingTimes) > 1 ? 'Multiple times' : $upcomingTimes[0]['time'];
                        $displayTime24h = count($upcomingTimes) > 1 ? '00:00' : $upcomingTimes[0]['time24h'];

                        $schedule[] = [
                            'id' => 'medication_'.$medication->id,
                            'type' => 'medication',
                            'title' => $medication->drug?->name ?? $medication->name ?? 'Medication',
                            'resident_name' => $residentName,
                            'time' => $displayTime,
                            'time_24h' => $displayTime24h,
                            'time_short' => $displayTime,
                            'location' => $medication->resident->room_number ?? $medication->resident->room ?? 'N/A',
                            'category' => 'Medication',
                            'category_color' => 'blue',
                            'link' => '/medications',
                        ];
                    }
                });
        }

        // Sort all events by time
        usort($schedule, function ($a, $b) {
            $timeA = $a['time_24h'] ?? '00:00';
            $timeB = $b['time_24h'] ?? '00:00';
            if ($timeA === '00:00' && $a['time'] !== 'TBD' && $a['time'] !== 'Anytime') {
                $timeA = '23:59'; // Put non-specific times at end
            }
            if ($timeB === '00:00' && $b['time'] !== 'TBD' && $b['time'] !== 'Anytime') {
                $timeB = '23:59';
            }

            return strcmp($timeA, $timeB);
        });

        // Return limited results
        return array_slice($schedule, 0, $limit);
    }

    /**
     * Get facility branch IDs with caching for performance
     */
    private function getFacilityBranchIds(int $facilityId): array
    {
        $cacheKey = "facility.{$facilityId}.branches";

        return Cache::remember($cacheKey, 3600, function () use ($facilityId) {
            return \App\Models\Branch::where('facility_id', $facilityId)
                ->pluck('id')
                ->toArray();
        });
    }
}
