<?php

namespace App\Services;

use App\Models\Medication;
use App\Models\MedicationAdministration;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class MedicationService
{
    /**
     * Get administration status for a collection of medications for a specific day.
     * 
     * @param Collection $medications
     * @param string|Carbon|null $date
     * @return Collection
     */
    public function getMedicationsWithStatus(Collection $medications, $date = null): Collection
    {
        $timezone = config('app.timezone', 'UTC');
        $now = Carbon::now($timezone);
        $targetDate = $date ? Carbon::parse($date)->toDateString() : $now->toDateString();
        $targetDateStr = $targetDate;

        // Load administrations if not already loaded (eager loading is preferred before calling this)
        // Optimization: better if caller does with(['administrations' => function($q) { ... }])
        
        return $medications->map(function ($med) use ($now, $targetDateStr, $timezone) {
            $nextDoseTime = null;
            $completedCount = 0;
            $totalSlots = 0;
            $isPrn = stripos($med->instructions, 'PRN') !== false || stripos($med->instructions, 'as needed') !== false;

            for ($i = 1; $i <= 4; $i++) {
                $timeStr = $med->{"time_$i"};
                if ($timeStr) {
                    $totalSlots++;
                    try {
                        // TIME columns may be "08:00" or "08:00:00" — parse handles both (createFromFormat H:i fails on seconds).
                        $scheduledTime = Carbon::parse(trim($targetDateStr . ' ' . $timeStr), $timezone);
                        
                        // Check if administered within ±60 mins window
                        // Important: check only those with matching status
                        $hasAdmin = $med->administrations->contains(function ($admin) use ($scheduledTime, $timezone) {
                            $adminAt = Carbon::parse($admin->administered_at)->setTimezone($timezone);
                            return abs($adminAt->diffInMinutes($scheduledTime)) <= 60 &&
                                   in_array($admin->status, ['completed', 'refused', 'hospital_admission', 'pharmacy_administration_confirm']);
                        });

                        if ($hasAdmin) {
                            $completedCount++;
                        } else {
                            if (!$nextDoseTime || $scheduledTime->lt($nextDoseTime)) {
                                $nextDoseTime = $scheduledTime;
                            }
                        }
                    } catch (\Exception $e) {
                        // Skip invalid time
                    }
                }
            }

            $med->is_fully_administered_today = ($totalSlots > 0 && $completedCount >= $totalSlots);
            $med->next_dose_at = $nextDoseTime ? $nextDoseTime->toIso8601String() : null;
            $med->is_overdue = $nextDoseTime && $nextDoseTime->lt($now->copy()->subMinutes(60));
            
            // Priority minutes for sorting
            if ($isPrn) {
                $med->minutes_until_next = 999998; // After all scheduled doses
            } elseif ($nextDoseTime) {
                $med->minutes_until_next = $now->diffInMinutes($nextDoseTime, false);
            } else {
                $med->minutes_until_next = 999999; // Completed or no times
            }
            
            return $med;
        });
    }

    /**
     * Sort medications by administration priority.
     * 
     * @param Collection $medications
     * @return Collection
     */
    public function sortMedicationsByPriority(Collection $medications): Collection
    {
        return $medications->sort(function ($a, $b) {
            // 1. Completion status (pending first)
            if ($a->is_fully_administered_today !== $b->is_fully_administered_today) {
                return $a->is_fully_administered_today ? 1 : -1;
            }

            // Both have same completion status (both pending or both completed)
            if (!$a->is_fully_administered_today) {
                // Determine if PRN
                $aIsPrn = stripos($a->instructions, 'PRN') !== false || stripos($a->instructions, 'as needed') !== false;
                $bIsPrn = stripos($b->instructions, 'PRN') !== false || stripos($b->instructions, 'as needed') !== false;

                // 2. Scheduled before PRN
                if ($aIsPrn !== $bIsPrn) {
                    return $aIsPrn ? 1 : -1;
                }

                // 3. Sort by priority minutes (overdue first, then soonest)
                if ($a->minutes_until_next !== $b->minutes_until_next) {
                    return $a->minutes_until_next - $b->minutes_until_next;
                }
            }

            // Default: sort by name
            return strcmp($a->name, $b->name);
        })->values();
    }
}
