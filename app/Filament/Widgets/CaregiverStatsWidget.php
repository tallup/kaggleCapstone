<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;
use App\Models\Resident;
use App\Models\Appointment;
use App\Models\Assessment;
use App\Models\VitalSign;
use App\Models\LeaveRequest;

class CaregiverStatsWidget extends Widget
{
    protected static string $view = 'filament.widgets.caregiver-stats-widget';
    protected static ?int $sort = 1;
    protected int | string | array $columnSpan = 'full';

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
}