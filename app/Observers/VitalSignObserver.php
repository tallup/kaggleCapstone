<?php

namespace App\Observers;

use App\Models\VitalSign;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use App\Events\VitalSignCreated;
use Carbon\Carbon;

class VitalSignObserver
{
    /**
     * Handle the VitalSign "created" event.
     */
    public function created(VitalSign $vitalSign): void
    {
        // Load relationships
        $vitalSign->load(['resident.assignments.caregiver', 'takenBy']);

        // Get assigned caregivers for this resident
        $caregivers = $vitalSign->resident?->assignments
            ->where('is_active', true)
            ->pluck('caregiver')
            ->filter();
        
        // If no caregivers, notify all admins/managers
        if ($caregivers->isEmpty()) {
            $caregivers = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                ->where('is_active', true)
                ->get();
        }

        // Also notify the person who took the vitals (if different)
        $takenBy = $vitalSign->takenBy;
        if ($takenBy && !$caregivers->contains(function ($caregiver) use ($takenBy) {
            return $caregiver->id === $takenBy->id;
        })) {
            $caregivers->push($takenBy);
        }

        // Check if vitals are critical - if so, notify admins immediately
        $isCritical = $vitalSign->status === 'critical';
        
        // Also check individual ranges if status is not already critical
        if (!$isCritical) {
            try {
                $bpStatus = method_exists($vitalSign, 'checkBloodPressureRange') ? $vitalSign->checkBloodPressureRange() : 'unknown';
                $tempStatus = method_exists($vitalSign, 'checkTemperatureRange') ? $vitalSign->checkTemperatureRange() : 'unknown';
                $pulseStatus = method_exists($vitalSign, 'checkPulseRange') ? $vitalSign->checkPulseRange() : 'unknown';
                $o2Status = method_exists($vitalSign, 'checkOxygenSaturationRange') ? $vitalSign->checkOxygenSaturationRange() : 'unknown';
                
                $isCritical = in_array('critical', [$bpStatus, $tempStatus, $pulseStatus, $o2Status]);
            } catch (\Exception $e) {
                // If range checking fails, use status field
                $isCritical = $vitalSign->status === 'critical';
            }
        }

        foreach ($caregivers as $caregiver) {
            $residentName = trim(($vitalSign->resident->first_name ?? '') . ' ' . ($vitalSign->resident->last_name ?? ''));
            $takenByName = $takenBy ? trim(($takenBy->first_name ?? '') . ' ' . ($takenBy->last_name ?? '')) : 'Staff';
            $measurementDate = $vitalSign->measurement_date ? Carbon::parse($vitalSign->measurement_date)->format('M d, Y') : 'TBD';
            
            // Build vital signs summary
            $vitalsSummary = [];
            if ($vitalSign->systolic && $vitalSign->diastolic) {
                $vitalsSummary[] = "BP: {$vitalSign->systolic}/{$vitalSign->diastolic}";
            }
            if ($vitalSign->temperature) {
                $vitalsSummary[] = "Temp: {$vitalSign->temperature}°F";
            }
            if ($vitalSign->pulse) {
                $vitalsSummary[] = "Pulse: {$vitalSign->pulse} BPM";
            }
            if ($vitalSign->oxygen_saturation) {
                $vitalsSummary[] = "O2: {$vitalSign->oxygen_saturation}%";
            }
            $vitalsStr = !empty($vitalsSummary) ? ' (' . implode(', ', $vitalsSummary) . ')' : '';
            
            $title = $isCritical ? 'Critical Vital Signs Recorded' : 'Vital Signs Recorded';
            $iconColor = $isCritical ? 'text-red-600' : 'text-[#25603E]';
            
            Notification::create([
                'user_id' => $caregiver->id,
                'type' => $isCritical ? 'vital_critical' : 'vital_recorded',
                'title' => $title,
                'message' => "Vital signs for {$residentName} were recorded by {$takenByName} on {$measurementDate}{$vitalsStr}",
                'icon' => 'activity',
                'icon_color' => $iconColor,
                'action_url' => '/vitals',
                'metadata' => [
                    'vital_sign_id' => $vitalSign->id,
                    'resident_id' => $vitalSign->resident_id,
                    'status' => $vitalSign->status,
                    'is_critical' => $isCritical,
                ],
            ]);
        }
        
        // If critical, also notify all admins immediately
        if ($isCritical) {
            $admins = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                ->where('is_active', true)
                ->whereNotIn('id', $caregivers->pluck('id')->toArray())
                ->get();
            
            foreach ($admins as $admin) {
                $residentName = trim(($vitalSign->resident->first_name ?? '') . ' ' . ($vitalSign->resident->last_name ?? ''));
                
                Notification::create([
                    'user_id' => $admin->id,
                    'type' => 'vital_critical',
                    'title' => 'Critical Vital Signs Alert',
                    'message' => "CRITICAL: Vital signs recorded for {$residentName} require immediate attention",
                    'icon' => 'alert-circle',
                    'icon_color' => 'text-red-600',
                    'action_url' => '/vitals',
                    'metadata' => [
                        'vital_sign_id' => $vitalSign->id,
                        'resident_id' => $vitalSign->resident_id,
                        'status' => 'critical',
                ],
            ]);
        }

        // Send email notifications
        $notificationService = app(NotificationService::class);
        $notificationService->sendVitalSignEmail($vitalSign, $caregivers, $isCritical);
        
        // If critical, also send to admins
        if ($isCritical && $admins->isNotEmpty()) {
            $notificationService->sendVitalSignEmail($vitalSign, $admins, true);
        }

        // Broadcast real-time event
        event(new VitalSignCreated($vitalSign));
    }
}
}

