<?php

namespace App\Services;

use App\Constants\Modules;
use App\Models\Appointment;
use App\Models\Assessment;
use App\Models\Assignment;
use App\Models\Behavior;
use App\Models\BehaviorChart;
use App\Models\BehaviorChartItem;
use App\Models\BehaviorChartLog;
use App\Models\BillingInvoice;
use App\Models\CleaningTaskLog;
use App\Models\Expense;
use App\Models\ExpenseApproval;
use App\Models\FamilyMessage;
use App\Models\FireDrill;
use App\Models\GroceryStatusUpdate;
use App\Models\Incident;
use App\Models\IncidentAttachment;
use App\Models\InvoiceItem;
use App\Models\LeaveRequest;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use App\Models\MedicationDelivery;
use App\Models\Notification;
use App\Models\PharmacyOrder;
use App\Models\PharmacyOrderItem;
use App\Models\PharmacyStockTransaction;
use App\Models\Reminder;
use App\Models\ReminderEvent;
use App\Models\Resident;
use App\Models\ResidentContact;
use App\Models\ResidentDocument;
use App\Models\ResidentSignOut;
use App\Models\Shift;
use App\Models\StaffClockIn;
use App\Models\SleepHourlyData;
use App\Models\SleepPattern;
use App\Models\SleepRecord;
use App\Models\TLog;
use App\Models\TLogAttachment;
use App\Models\User;
use App\Models\VitalSign;
use App\Models\Visitor;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ModuleTestDataPurgeService
{
    /**
     * @param  array<int>  $residentIds  Validated resident IDs (same facility/branch as user)
     * @param  array<string>  $modules  Keys from Modules::all()
     * @return array<string, int>  Deleted row counts per module key (plus auxiliary keys like t_logs, reminders)
     */
    public function purge(
        User $user,
        array $residentIds,
        ?Carbon $dateFrom,
        ?Carbon $dateTo,
        array $modules
    ): array {
        $residentIds = array_values(array_unique(array_map('intval', $residentIds)));
        $branchIds = Resident::whereIn('id', $residentIds)->pluck('branch_id')->unique()->filter()->values()->all();

        $counts = [];
        $valid = array_keys(Modules::all());

        foreach ($modules as $module) {
            if (! in_array($module, $valid, true)) {
                continue;
            }
            $counts[$module] = match ($module) {
                Modules::MEDICATIONS => $this->purgeMedications($residentIds, $dateFrom, $dateTo),
                Modules::VITALS => $this->purgeVitals($residentIds, $dateFrom, $dateTo),
                Modules::APPOINTMENTS => $this->purgeAppointments($residentIds, $dateFrom, $dateTo),
                Modules::ASSESSMENTS => $this->purgeAssessments($residentIds, $dateFrom, $dateTo),
                Modules::SLEEP => $this->purgeSleep($residentIds, $dateFrom, $dateTo),
                Modules::HOUSEKEEPING => $this->purgeHousekeeping($branchIds, $dateFrom, $dateTo),
                Modules::REPORTS => $this->purgeTLogs($residentIds, $dateFrom, $dateTo),
                Modules::RESIDENTS => $this->purgeResidentsAuxiliary($residentIds, $branchIds, $dateFrom, $dateTo),
                Modules::BEHAVIORS => $this->purgeBehaviors($residentIds, $dateFrom, $dateTo),
                Modules::INCIDENTS => $this->purgeIncidents($residentIds, $dateFrom, $dateTo),
                Modules::LEAVE_REQUESTS => $this->purgeLeaveRequests($branchIds, $dateFrom, $dateTo),
                Modules::EMPLOYEE_DOCUMENTS => 0,
                Modules::GROCERY_STATUS => $this->purgeGrocery($branchIds, $dateFrom, $dateTo),
                Modules::FIRE_DRILLS => $this->purgeFireDrills($branchIds, $dateFrom, $dateTo),
                Modules::BILLING_EXPENSES => $this->purgeBilling($residentIds, $dateFrom, $dateTo),
                Modules::STAFF_SCHEDULING => $this->purgeStaffScheduling($branchIds, $dateFrom, $dateTo),
                Modules::PHARMACY => $this->purgePharmacy($branchIds, $dateFrom, $dateTo),
                default => 0,
            };
        }

        Log::info('Module test data purge completed', [
            'user_id' => $user->id,
            'resident_ids' => $residentIds,
            'modules' => $modules,
            'counts' => $counts,
        ]);

        return $counts;
    }

    private function purgeTLogs(array $residentIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        $q = TLog::withoutGlobalScopes()->whereIn('resident_id', $residentIds);
        $this->applyDateRange($q, 'reported_on', $dateFrom, $dateTo);

        $ids = (clone $q)->pluck('id');
        foreach (TLogAttachment::whereIn('t_log_id', $ids)->cursor() as $att) {
            if (! empty($att->file_path)) {
                Storage::disk('public')->delete($att->file_path);
            }
        }
        TLogAttachment::whereIn('t_log_id', $ids)->delete();

        return $q->delete();
    }

    private function purgeInAppNotifications(array $residentIds): int
    {
        $total = 0;
        foreach ($residentIds as $rid) {
            $total += Notification::query()
                ->where('metadata->resident_id', $rid)
                ->delete();
        }

        return $total;
    }

    private function purgeReminders(array $branchIds, array $residentIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        if ($branchIds === [] && $residentIds === []) {
            return 0;
        }

        $reminderQuery = Reminder::query()->where(function ($q) use ($branchIds, $residentIds) {
            $first = true;
            if ($branchIds !== []) {
                $q->whereIn('branch_id', $branchIds);
                $first = false;
            }
            foreach ($residentIds as $rid) {
                if ($first) {
                    $q->where('metadata->resident_id', $rid);
                    $first = false;
                } else {
                    $q->orWhere('metadata->resident_id', $rid);
                }
            }
        });
        $this->applyDateRange($reminderQuery, 'due_at', $dateFrom, $dateTo);

        $reminderIds = (clone $reminderQuery)->pluck('id');
        ReminderEvent::whereIn('reminder_id', $reminderIds)->delete();

        return $reminderQuery->delete();
    }

    private function purgeMedications(array $residentIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        $total = 0;

        $admQ = MedicationAdministration::query()->whereIn('resident_id', $residentIds);
        $this->applyDateRange($admQ, 'administered_at', $dateFrom, $dateTo);
        foreach ((clone $admQ)->cursor() as $row) {
            if ($row->document_path) {
                Storage::disk('public')->delete($row->document_path);
            }
        }
        $total += $admQ->delete();

        $delQ = MedicationDelivery::withoutGlobalScopes()->whereIn('resident_id', $residentIds);
        $this->applyDateRange($delQ, 'received_date', $dateFrom, $dateTo);
        $deliveryIds = (clone $delQ)->pluck('id');
        PharmacyStockTransaction::whereIn('medication_delivery_id', $deliveryIds)->delete();
        $total += $delQ->delete();

        $medQ = Medication::withoutGlobalScopes()->withTrashed()->whereIn('resident_id', $residentIds);
        if ($dateFrom || $dateTo) {
            $medQ->where(function ($q) use ($dateFrom, $dateTo) {
                if ($dateFrom) {
                    $q->where('updated_at', '>=', $dateFrom);
                }
                if ($dateTo) {
                    $q->where('updated_at', '<=', $dateTo);
                }
            });
        }
        $total += $medQ->forceDelete();

        return $total;
    }

    private function purgeVitals(array $residentIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        $q = VitalSign::withTrashed()->whereIn('resident_id', $residentIds);
        $this->applyDateRange($q, 'measurement_date', $dateFrom, $dateTo);

        return $q->forceDelete();
    }

    private function purgeAppointments(array $residentIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        $q = Appointment::whereIn('resident_id', $residentIds);
        $this->applyDateRange($q, 'appointment_date', $dateFrom, $dateTo);

        return $q->delete();
    }

    private function purgeAssessments(array $residentIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        $q = Assessment::whereIn('resident_id', $residentIds);
        $this->applyDateRange($q, 'assessment_date', $dateFrom, $dateTo);

        $count = 0;
        $q->chunk(25, function ($assessments) use (&$count) {
            foreach ($assessments as $assessment) {
                $assessment->loadMissing('sections.questions');
                foreach ($assessment->sections as $section) {
                    $section->questions()->delete();
                    $section->delete();
                }
                $assessment->delete();
                $count++;
            }
        });

        return $count;
    }

    private function purgeSleep(array $residentIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        $total = 0;

        $sr = SleepRecord::whereIn('resident_id', $residentIds);
        $this->applyDateRange($sr, 'created_at', $dateFrom, $dateTo);
        $total += $sr->delete();

        $spQ = SleepPattern::whereIn('resident_id', $residentIds);
        $this->applyDateRange($spQ, 'date', $dateFrom, $dateTo);
        $ids = (clone $spQ)->pluck('id');
        SleepHourlyData::whereIn('sleep_pattern_id', $ids)->delete();
        $total += $spQ->delete();

        return $total;
    }

    private function purgeHousekeeping(array $branchIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        if ($branchIds === []) {
            return 0;
        }
        $q = CleaningTaskLog::whereIn('branch_id', $branchIds);
        $this->applyDateRange($q, 'scheduled_date', $dateFrom, $dateTo);

        return $q->delete();
    }

    private function purgeResidentsAuxiliary(array $residentIds, array $branchIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        $total = 0;

        $docs = ResidentDocument::whereIn('resident_id', $residentIds);
        $this->applyDateRange($docs, 'created_at', $dateFrom, $dateTo);
        foreach ((clone $docs)->cursor() as $doc) {
            if ($doc->file_path) {
                Storage::disk('public')->delete($doc->file_path);
            }
        }
        $total += $docs->delete();

        $so = ResidentSignOut::whereIn('resident_id', $residentIds);
        $this->applyDateRange($so, 'created_at', $dateFrom, $dateTo);
        $total += $so->delete();

        $vis = Visitor::withTrashed()->whereIn('visiting_resident_id', $residentIds);
        $this->applyDateRange($vis, 'check_in_at', $dateFrom, $dateTo);
        $total += $vis->forceDelete();

        ResidentContact::whereIn('resident_id', $residentIds)->delete();
        FamilyMessage::whereIn('resident_id', $residentIds)->delete();

        $asg = Assignment::withTrashed()->whereIn('resident_id', $residentIds);
        $this->applyDateRange($asg, 'assigned_at', $dateFrom, $dateTo);
        $total += $asg->forceDelete();

        $total += $this->purgeInAppNotifications($residentIds);
        $total += $this->purgeReminders($branchIds, $residentIds, $dateFrom, $dateTo);

        return $total;
    }

    private function purgeBehaviors(array $residentIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        $total = 0;

        $charts = BehaviorChart::whereIn('resident_id', $residentIds);
        $this->applyDateRange($charts, 'chart_date', $dateFrom, $dateTo);
        foreach ((clone $charts)->pluck('id') as $cid) {
            BehaviorChartItem::where('behavior_chart_id', $cid)->delete();
            BehaviorChartLog::where('behavior_chart_id', $cid)->delete();
        }
        $total += $charts->delete();

        $beh = Behavior::whereIn('resident_id', $residentIds);
        $this->applyDateRange($beh, 'occurred_at', $dateFrom, $dateTo);
        $total += $beh->delete();

        return $total;
    }

    private function purgeIncidents(array $residentIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        $q = Incident::whereIn('resident_id', $residentIds);
        $this->applyDateRange($q, 'incident_date', $dateFrom, $dateTo);
        $ids = (clone $q)->pluck('id');
        foreach (IncidentAttachment::whereIn('incident_id', $ids)->cursor() as $att) {
            if ($att->file_path) {
                Storage::disk('public')->delete($att->file_path);
            }
        }
        IncidentAttachment::whereIn('incident_id', $ids)->delete();

        return $q->delete();
    }

    private function purgeLeaveRequests(array $branchIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        if ($branchIds === []) {
            return 0;
        }
        $q = LeaveRequest::whereIn('branch_id', $branchIds);
        $this->applyDateRange($q, 'start_date', $dateFrom, $dateTo);

        return $q->delete();
    }

    private function purgeGrocery(array $branchIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        if ($branchIds === []) {
            return 0;
        }
        $q = GroceryStatusUpdate::withoutGlobalScopes()->whereIn('branch_id', $branchIds);
        $this->applyDateRange($q, 'week_start_date', $dateFrom, $dateTo);

        return $q->delete();
    }

    private function purgeFireDrills(array $branchIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        if ($branchIds === []) {
            return 0;
        }
        $q = FireDrill::withoutGlobalScopes()->whereIn('branch_id', $branchIds);
        $this->applyDateRange($q, 'scheduled_date', $dateFrom, $dateTo);

        return $q->delete();
    }

    private function purgeBilling(array $residentIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        $total = 0;

        $invQ = BillingInvoice::withoutGlobalScopes()->whereIn('resident_id', $residentIds);
        $this->applyDateRange($invQ, 'invoice_date', $dateFrom, $dateTo);
        foreach ((clone $invQ)->cursor() as $inv) {
            InvoiceItem::where('billing_invoice_id', $inv->id)->delete();
        }
        $total += $invQ->forceDelete();

        $exQ = Expense::withoutGlobalScopes()->withTrashed()
            ->whereIn('resident_id', $residentIds);
        $this->applyDateRange($exQ, 'expense_date', $dateFrom, $dateTo);
        foreach ((clone $exQ)->pluck('id') as $eid) {
            ExpenseApproval::where('expense_id', $eid)->delete();
        }
        $total += $exQ->forceDelete();

        return $total;
    }

    private function purgeStaffScheduling(array $branchIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        if ($branchIds === []) {
            return 0;
        }
        $shiftQ = Shift::withoutGlobalScopes()->whereIn('branch_id', $branchIds);
        $this->applyDateRange($shiftQ, 'start_at', $dateFrom, $dateTo);
        $total = $shiftQ->delete();

        // Actual clock-in/out records (separate from scheduled shifts)
        $clockQ = StaffClockIn::withoutGlobalScopes()->withTrashed()->whereIn('branch_id', $branchIds);
        $this->applyDateRange($clockQ, 'clock_in_at', $dateFrom, $dateTo);
        $total += $clockQ->forceDelete();

        return $total;
    }

    private function purgePharmacy(array $branchIds, ?Carbon $dateFrom, ?Carbon $dateTo): int
    {
        if ($branchIds === []) {
            return 0;
        }

        $orderQ = PharmacyOrder::withoutGlobalScopes()->whereIn('branch_id', $branchIds);
        $this->applyDateRange($orderQ, 'order_date', $dateFrom, $dateTo);
        $orderIds = (clone $orderQ)->pluck('id');

        PharmacyStockTransaction::whereIn('pharmacy_order_id', $orderIds)->delete();
        PharmacyOrderItem::whereIn('pharmacy_order_id', $orderIds)->delete();

        return $orderQ->forceDelete();
    }

    private function applyDateRange($query, string $column, ?Carbon $from, ?Carbon $to): void
    {
        if ($from) {
            $query->where($column, '>=', $from);
        }
        if ($to) {
            $query->where($column, '<=', $to);
        }
    }
}
