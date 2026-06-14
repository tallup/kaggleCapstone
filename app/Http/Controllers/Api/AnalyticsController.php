<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VitalSign;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\Appointment;
use App\Models\Assessment;
use App\Models\SleepRecord;
use App\Models\CleaningTask;
use App\Models\CleaningTaskLog;
use App\Models\GroceryStatusUpdate;
use App\Models\FireDrill;
use App\Models\Incident;
use App\Models\PharmacyInventory;
use App\Models\Expense;
use App\Models\BillingInvoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AnalyticsController extends BaseApiController
{
    public function dashboard(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            $dateFrom = $request->get('date_from', Carbon::now()->subDays(30)->toDateString());
            $dateTo = $request->get('date_to', Carbon::now()->toDateString());
            $branchId = $request->get('branch_id');
            $residentId = $request->get('resident_id');

            // Build base query filters
            $facilityId = $user && $user->facility_id ? $user->facility_id : null;
            $isSuperAdmin = $user && $user->role === 'super_admin';

            $summary = [
                'vitals' => $this->getVitalsSummary($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin),
                'medications' => $this->getMedicationsSummary($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin),
                'appointments' => $this->getAppointmentsSummary($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin),
                'assessments' => $this->getAssessmentsSummary($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin),
                'sleep' => $this->getSleepSummary($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin),
                'housekeeping' => $this->getHousekeepingSummary($dateFrom, $dateTo, $branchId, $user, $facilityId, $isSuperAdmin),
                'grocery_status' => $this->getGroceryStatusSummary($dateFrom, $dateTo, $branchId, $user, $facilityId, $isSuperAdmin),
                'fire_drills' => $this->getFireDrillsSummary($dateFrom, $dateTo, $branchId, $user, $facilityId, $isSuperAdmin),
                'incidents' => $this->getIncidentsSummary($dateFrom, $dateTo, $branchId, $user, $facilityId, $isSuperAdmin),
                'pharmacy' => $this->getPharmacySummary($branchId, $user, $facilityId, $isSuperAdmin),
                'billing' => $this->getBillingSummary($dateFrom, $dateTo, $branchId, $user, $facilityId, $isSuperAdmin),
            ];

            // Get trends data (last 30 days)
            $trends = $this->getActivityTrends($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin);

            // Get module comparisons
            $comparisons = $this->getModuleComparisons($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin);

            return response()->json([
                'summary' => $summary,
                'trends' => $trends,
                'comparisons' => $comparisons,
            ]);
        } catch (\Exception $e) {
            Log::error('Analytics dashboard error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'message' => 'Failed to load analytics data',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred',
            ], 500);
        }
    }

    private function getVitalsSummary($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin)
    {
        $query = VitalSign::query();

        // Apply facility filtering
        if (!$isSuperAdmin && $facilityId) {
            // Use optimized whereIn pattern instead of nested whereHas for better performance
            $branchIds = $this->getFacilityBranchIds($facilityId);
            if (!empty($branchIds)) {
                $query->whereHas('resident', function($q) use ($branchIds) {
                    $q->whereIn('branch_id', $branchIds)->where('is_active', true);
            });
            } else {
                // No branches for facility, return empty summary
                return [
                    'total' => 0,
                    'today' => 0,
                    'week' => 0,
                    'month' => 0,
                ];
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

        $baseQuery = clone $query;
        $today = Carbon::today();
        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();
        $monthStart = Carbon::now()->startOfMonth();

        return [
            'total' => $baseQuery->count(),
            'today' => (clone $query)->whereDate('measurement_date', $today)->count(),
            'week' => (clone $query)->whereBetween('measurement_date', [$weekStart, $weekEnd])->count(),
            'month' => (clone $query)->whereMonth('measurement_date', Carbon::now()->month)->count(),
        ];
    }

    private function getMedicationsSummary($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin)
    {
        $query = Medication::where('is_active', true);

        // Apply facility filtering
        if (!$isSuperAdmin && $facilityId) {
            // Use optimized whereIn pattern instead of nested whereHas for better performance
            $branchIds = $this->getFacilityBranchIds($facilityId);
            if (!empty($branchIds)) {
                $query->whereHas('resident', function($q) use ($branchIds) {
                    $q->whereIn('branch_id', $branchIds)->where('is_active', true);
            });
            } else {
                // No branches for facility, return empty summary
                return [
                    'total' => 0,
                    'today' => 0,
                    'week' => 0,
                    'month' => 0,
                ];
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

        $activeCount = $query->count();

        // Get medications due today
        $today = Carbon::today();
        $dueTodayQuery = clone $query;
        $dueTodayQuery->where(function($q) use ($today) {
            $q->whereNull('start_date')->orWhere('start_date', '<=', $today);
        })->where(function($q) use ($today) {
            $q->whereNull('end_date')->orWhere('end_date', '>=', $today);
        });
        $dueToday = $dueTodayQuery->count();

        // Calculate compliance rate (last 30 days)
        $complianceQuery = MedicationAdministration::query();
        if (!$isSuperAdmin && $facilityId) {
            // Use optimized whereIn pattern instead of nested whereHas for better performance
            $branchIds = $this->getFacilityBranchIds($facilityId);
            if (!empty($branchIds)) {
                $complianceQuery->whereHas('resident', function($q) use ($branchIds) {
                    $q->whereIn('branch_id', $branchIds)->where('is_active', true);
            });
            } else {
                // No branches for facility, return zero compliance
                return [
                    'active' => $activeCount,
                    'due_today' => $dueToday,
                    'compliance_rate' => 0,
                ];
            }
        }
        if ($branchId) {
            $complianceQuery->whereHas('resident', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        if ($residentId) {
            $complianceQuery->where('resident_id', $residentId);
        }

        $totalScheduled = (clone $complianceQuery)->where('administered_at', '>=', Carbon::now()->subDays(30))->count();
        $completed = (clone $complianceQuery)->where('status', 'completed')
            ->where('administered_at', '>=', Carbon::now()->subDays(30))->count();
        $complianceRate = $totalScheduled > 0 ? round(($completed / $totalScheduled) * 100, 1) : 0;

        return [
            'active' => $activeCount,
            'due_today' => $dueToday,
            'compliance_rate' => $complianceRate,
        ];
    }

    private function getAppointmentsSummary($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin)
    {
        $query = Appointment::query();

        // Apply facility filtering
        if (!$isSuperAdmin && $facilityId) {
            // Use optimized whereIn pattern instead of whereHas for better performance
            $branchIds = $this->getFacilityBranchIds($facilityId);
            if (!empty($branchIds)) {
                $query->whereIn('branch_id', $branchIds);
            } else {
                // No branches for facility, return empty summary
                return [
                    'total' => 0,
                    'upcoming' => 0,
                    'completed_month' => 0,
                ];
            }
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        if ($residentId) {
            $query->where('resident_id', $residentId);
        }

        $baseQuery = clone $query;
        $today = Carbon::today();
        $monthStart = Carbon::now()->startOfMonth();

        return [
            'total' => $baseQuery->count(),
            'upcoming' => (clone $query)->where('appointment_date', '>=', $today)->whereNotIn('status', ['cancelled', 'completed'])->count(),
            'completed_month' => (clone $query)->where('status', 'completed')->whereMonth('appointment_date', Carbon::now()->month)->count(),
        ];
    }

    private function getAssessmentsSummary($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin)
    {
        $query = Assessment::query();

        // Apply facility filtering
        if (!$isSuperAdmin && $facilityId) {
            // Use optimized whereIn pattern instead of nested whereHas for better performance
            $branchIds = $this->getFacilityBranchIds($facilityId);
            if (!empty($branchIds)) {
                $query->whereHas('resident', function($q) use ($branchIds) {
                    $q->whereIn('branch_id', $branchIds)->where('is_active', true);
            });
            } else {
                // No branches for facility, return empty summary
                return [
                    'total' => 0,
                    'today' => 0,
                    'week' => 0,
                    'month' => 0,
                ];
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

        $baseQuery = clone $query;
        $monthStart = Carbon::now()->startOfMonth();

        return [
            'total' => $baseQuery->count(),
            'pending' => (clone $query)->whereNotIn('status', ['approved', 'archived'])->count(),
            'completed_month' => (clone $query)->whereIn('status', ['approved', 'completed'])->whereMonth('created_at', Carbon::now()->month)->count(),
        ];
    }

    private function getSleepSummary($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin)
    {
        $query = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo]);

        // Apply facility filtering
        if (!$isSuperAdmin && $facilityId) {
            // Use optimized whereIn pattern instead of nested whereHas for better performance
            $branchIds = $this->getFacilityBranchIds($facilityId);
            if (!empty($branchIds)) {
                $query->whereHas('resident', function($q) use ($branchIds) {
                    $q->whereIn('branch_id', $branchIds)->where('is_active', true);
            });
            } else {
                // No branches for facility, return empty summary
                return [
                    'total' => 0,
                    'today' => 0,
                    'week' => 0,
                    'month' => 0,
                ];
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

        $baseQuery = clone $query;
        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();

        return [
            'total' => $baseQuery->count(),
            'avg_hours' => round($baseQuery->avg('total_sleep_hours') ?? 0, 1),
            'week' => (clone $query)->whereBetween('sleep_date', [$weekStart, $weekEnd])->count(),
        ];
    }

    private function getHousekeepingSummary($dateFrom, $dateTo, $branchId, $user, $facilityId, $isSuperAdmin)
    {
        // Get tasks (not logs, as tasks are the base entities)
        $taskQuery = CleaningTask::where('is_active', true);

        // Apply facility filtering through area->branch
        if (!$isSuperAdmin && $facilityId) {
            $taskQuery->whereHas('area', function($q) use ($facilityId) {
                $q->whereHas('branch', function($b) use ($facilityId) {
                    $b->where('facility_id', $facilityId);
                });
            });
        }

        if ($branchId) {
            $taskQuery->whereHas('area', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }

        $totalTasks = $taskQuery->count();

        // Get logs for today to calculate completed/pending
        $logQuery = CleaningTaskLog::whereDate('scheduled_date', Carbon::today());
        
        // Build task ID filter
        $taskFilterQuery = CleaningTask::query();
        if (!$isSuperAdmin && $facilityId) {
            $taskFilterQuery->whereHas('area', function($q) use ($facilityId) {
                $q->whereHas('branch', function($b) use ($facilityId) {
                    $b->where('facility_id', $facilityId);
                });
            });
        }
        if ($branchId) {
            $taskFilterQuery->whereHas('area', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        
        $taskIds = $taskFilterQuery->pluck('id');
        if ($taskIds->isNotEmpty()) {
            $logQuery->whereIn('cleaning_task_id', $taskIds);
        } else {
            // No tasks match, return zeros
            return [
                'total' => $totalTasks,
                'completed' => 0,
                'pending' => 0,
            ];
        }

        $completed = (clone $logQuery)->where('status', 'completed')->count();
        $pending = (clone $logQuery)->where('status', 'pending')->count();

        return [
            'total' => $totalTasks,
            'completed' => $completed,
            'pending' => $pending,
        ];
    }

    private function getGroceryStatusSummary($dateFrom, $dateTo, $branchId, $user, $facilityId, $isSuperAdmin)
    {
        $query = GroceryStatusUpdate::query();

        // Apply facility filtering
        if (!$isSuperAdmin && $facilityId) {
            $query->whereHas('branch', function($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            });
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $baseQuery = clone $query;

        return [
            'total' => $baseQuery->count(),
            'pending' => (clone $query)->where('status', 'pending')->count(),
            'completed' => (clone $query)->where('status', 'completed')->count(),
        ];
    }

    private function getFireDrillsSummary($dateFrom, $dateTo, $branchId, $user, $facilityId, $isSuperAdmin)
    {
        $query = FireDrill::query();

        // Apply facility filtering
        if (!$isSuperAdmin && $facilityId) {
            $query->whereHas('branch', function($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            });
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $baseQuery = clone $query;
        $today = Carbon::today();

        return [
            'total' => $baseQuery->count(),
            'upcoming' => (clone $query)->where('status', 'scheduled')->where('scheduled_date', '>=', $today)->count(),
            'completed' => (clone $query)->where('status', 'completed')->count(),
        ];
    }

    private function getIncidentsSummary($dateFrom, $dateTo, $branchId, $user, $facilityId, $isSuperAdmin)
    {
        $query = Incident::query();

        // Apply facility filtering
        if (!$isSuperAdmin && $facilityId) {
            $query->whereHas('branch', function($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            });
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $baseQuery = clone $query;
        $monthStart = Carbon::now()->startOfMonth();

        return [
            'total' => $baseQuery->count(),
            'month' => (clone $query)->whereMonth('created_at', Carbon::now()->month)->count(),
            'open' => (clone $query)->whereIn('status', ['open', 'in_progress'])->count(),
        ];
    }

    private function getPharmacySummary($branchId, $user, $facilityId, $isSuperAdmin)
    {
        $query = PharmacyInventory::query();

        // Apply facility filtering
        if (!$isSuperAdmin && $facilityId) {
            $query->whereHas('branch', function($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            });
        }

        if ($branchId) {
            $query->where('branch_id', $branchId);
        }

        $baseQuery = clone $query;

        return [
            'total' => $baseQuery->count(),
            'low_stock' => (clone $query)->whereColumn('quantity', '<=', 'minimum_stock_level')->count(),
            'out_of_stock' => (clone $query)->where('quantity', '<=', 0)->count(),
        ];
    }

    private function getBillingSummary($dateFrom, $dateTo, $branchId, $user, $facilityId, $isSuperAdmin)
    {
        // Expenses
        $expenseQuery = Expense::whereBetween('expense_date', [$dateFrom, $dateTo]);
        if (!$isSuperAdmin && $facilityId) {
            $expenseQuery->whereHas('branch', function($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            });
        }
        if ($branchId) {
            $expenseQuery->where('branch_id', $branchId);
        }

        $totalExpenses = $expenseQuery->sum('amount');
        $monthExpenses = (clone $expenseQuery)->whereMonth('expense_date', Carbon::now()->month)->sum('amount');

        // Invoices
        $invoiceQuery = BillingInvoice::whereBetween('invoice_date', [$dateFrom, $dateTo]);
        if (!$isSuperAdmin && $facilityId) {
            $invoiceQuery->whereHas('branch', function($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            });
        }
        if ($branchId) {
            $invoiceQuery->where('branch_id', $branchId);
        }

        $pendingInvoices = (clone $invoiceQuery)->whereIn('status', ['draft', 'sent'])->sum('total_amount');

        return [
            'total_expenses' => round($totalExpenses, 2),
            'month_expenses' => round($monthExpenses, 2),
            'pending_invoices' => round($pendingInvoices, 2),
        ];
    }

    private function getActivityTrends($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin)
    {
        $startDate = Carbon::parse($dateFrom);
        $endDate = Carbon::parse($dateTo);
        $daysDiff = $startDate->diffInDays($endDate);
        $daysToShow = min($daysDiff, 30); // Limit to 30 days max

        $activity = [];
        for ($i = $daysToShow; $i >= 0; $i--) {
            $date = $endDate->copy()->subDays($i);
            $dateStr = $date->toDateString();

            // Vitals
            $vitalsQuery = VitalSign::whereDate('measurement_date', $date);
            if (!$isSuperAdmin && $facilityId) {
                $vitalsQuery->whereHas('resident', function($q) use ($facilityId) {
                    $q->whereHas('branch', function($b) use ($facilityId) {
                        $b->where('facility_id', $facilityId);
                    })->where('is_active', true);
                });
            }
            if ($branchId) {
                $vitalsQuery->whereHas('resident', function($q) use ($branchId) {
                    $q->where('branch_id', $branchId);
                });
            }
            if ($residentId) {
                $vitalsQuery->where('resident_id', $residentId);
            }

            // Appointments
            $appointmentsQuery = Appointment::whereDate('appointment_date', $date);
            if (!$isSuperAdmin && $facilityId) {
                $appointmentsQuery->whereHas('branch', function($q) use ($facilityId) {
                    $q->where('facility_id', $facilityId);
                });
            }
            if ($branchId) {
                $appointmentsQuery->where('branch_id', $branchId);
            }
            if ($residentId) {
                $appointmentsQuery->where('resident_id', $residentId);
            }

            // Assessments
            $assessmentsQuery = Assessment::whereDate('assessment_date', $date);
            if (!$isSuperAdmin && $facilityId) {
                $assessmentsQuery->whereHas('resident', function($q) use ($facilityId) {
                    $q->whereHas('branch', function($b) use ($facilityId) {
                        $b->where('facility_id', $facilityId);
                    })->where('is_active', true);
                });
            }
            if ($branchId) {
                $assessmentsQuery->whereHas('resident', function($q) use ($branchId) {
                    $q->where('branch_id', $branchId);
                });
            }
            if ($residentId) {
                $assessmentsQuery->where('resident_id', $residentId);
            }

            $activity[] = [
                'date' => $date->format('M j'),
                'vitals' => $vitalsQuery->count(),
                'appointments' => $appointmentsQuery->count(),
                'assessments' => $assessmentsQuery->count(),
            ];
        }

        return ['activity' => $activity];
    }

    private function getModuleComparisons($dateFrom, $dateTo, $branchId, $residentId, $user, $facilityId, $isSuperAdmin)
    {
        $modules = [];

        // Vitals
        $vitalsQuery = VitalSign::query();
        if (!$isSuperAdmin && $facilityId) {
            $vitalsQuery->whereHas('resident', function($q) use ($facilityId) {
                $q->whereHas('branch', function($b) use ($facilityId) {
                    $b->where('facility_id', $facilityId);
                })->where('is_active', true);
            });
        }
        if ($branchId) {
            $vitalsQuery->whereHas('resident', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        if ($residentId) {
            $vitalsQuery->where('resident_id', $residentId);
        }
        $modules[] = ['module' => 'Vitals', 'count' => $vitalsQuery->count()];

        // Appointments
        $appointmentsQuery = Appointment::query();
        if (!$isSuperAdmin && $facilityId) {
            $appointmentsQuery->whereHas('branch', function($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            });
        }
        if ($branchId) {
            $appointmentsQuery->where('branch_id', $branchId);
        }
        if ($residentId) {
            $appointmentsQuery->where('resident_id', $residentId);
        }
        $modules[] = ['module' => 'Appointments', 'count' => $appointmentsQuery->count()];

        // Assessments
        $assessmentsQuery = Assessment::query();
        if (!$isSuperAdmin && $facilityId) {
            $assessmentsQuery->whereHas('resident', function($q) use ($facilityId) {
                $q->whereHas('branch', function($b) use ($facilityId) {
                    $b->where('facility_id', $facilityId);
                })->where('is_active', true);
            });
        }
        if ($branchId) {
            $assessmentsQuery->whereHas('resident', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        if ($residentId) {
            $assessmentsQuery->where('resident_id', $residentId);
        }
        $modules[] = ['module' => 'Assessments', 'count' => $assessmentsQuery->count()];

        // Sleep
        $sleepQuery = SleepRecord::whereBetween('sleep_date', [$dateFrom, $dateTo]);
        if (!$isSuperAdmin && $facilityId) {
            $sleepQuery->whereHas('resident', function($q) use ($facilityId) {
                $q->whereHas('branch', function($b) use ($facilityId) {
                    $b->where('facility_id', $facilityId);
                })->where('is_active', true);
            });
        }
        if ($branchId) {
            $sleepQuery->whereHas('resident', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        if ($residentId) {
            $sleepQuery->where('resident_id', $residentId);
        }
        $modules[] = ['module' => 'Sleep', 'count' => $sleepQuery->count()];

        // Medications
        $medicationsQuery = Medication::where('is_active', true);
        if (!$isSuperAdmin && $facilityId) {
            $medicationsQuery->whereHas('resident', function($q) use ($facilityId) {
                $q->whereHas('branch', function($b) use ($facilityId) {
                    $b->where('facility_id', $facilityId);
                })->where('is_active', true);
            });
        }
        if ($branchId) {
            $medicationsQuery->whereHas('resident', function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            });
        }
        if ($residentId) {
            $medicationsQuery->where('resident_id', $residentId);
        }
        $modules[] = ['module' => 'Medications', 'count' => $medicationsQuery->count()];

        return ['modules' => $modules];
    }
}

