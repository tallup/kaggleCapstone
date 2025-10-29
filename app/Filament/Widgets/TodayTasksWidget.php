<?php

namespace App\Filament\Widgets;

use Filament\Widgets\Widget;
use App\Models\Appointment;
use App\Models\VitalSign;
use App\Models\Assessment;
use Carbon\Carbon;

class TodayTasksWidget extends Widget
{
    protected static string $view = 'filament.widgets.today-tasks-widget';
    protected static ?int $sort = 4;
    protected int | string | array $columnSpan = 'full';

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
        })->whereNotIn('status', ['approved', 'archived'])
        ->with('resident')
        ->get();

        // Get residents who need vitals today
        $residentsNeedingVitals = \App\Models\Resident::whereHas('assignments', function($q) use ($userId) {
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
}