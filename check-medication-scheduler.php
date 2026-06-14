<?php
/**
 * Diagnostic script to check medication scheduler status
 * Run this from command line: php check-medication-scheduler.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Medication;
use App\Models\MedicationAdministration;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

echo "=== Medication Scheduler Diagnostic ===\n\n";

// 1. Check timezone
$timezone = config('app.timezone', 'UTC');
echo "1. Application Timezone: {$timezone}\n";
echo "   Server Time: " . Carbon::now($timezone)->format('Y-m-d H:i:s T') . "\n\n";

// 2. Check active medications
$activeMedications = Medication::where('is_active', true)
    ->where(function ($q) {
        $today = Carbon::today()->format('Y-m-d');
        $q->whereNull('start_date')->orWhere('start_date', '<=', $today);
    })
    ->where(function ($q) {
        $today = Carbon::today()->format('Y-m-d');
        $q->whereNull('end_date')->orWhere('end_date', '>=', $today);
    })
    ->count();

echo "2. Active Medications (today): {$activeMedications}\n\n";

// 3. Check medications with scheduled times
$medicationsWithTimes = Medication::where('is_active', true)
    ->where(function ($q) {
        $today = Carbon::today()->format('Y-m-d');
        $q->whereNull('start_date')->orWhere('start_date', '<=', $today);
    })
    ->where(function ($q) {
        $today = Carbon::today()->format('Y-m-d');
        $q->whereNull('end_date')->orWhere('end_date', '>=', $today);
    })
    ->where(function ($q) {
        $q->whereNotNull('time_1')
            ->orWhereNotNull('time_2')
            ->orWhereNotNull('time_3')
            ->orWhereNotNull('time_4');
    })
    ->count();

echo "3. Active Medications with Scheduled Times: {$medicationsWithTimes}\n\n";

// 4. Check recent missed medications
$recentMissed = MedicationAdministration::where('status', 'missed')
    ->where('administered_at', '>=', Carbon::now()->subDays(7))
    ->count();

echo "4. Missed Medications (last 7 days): {$recentMissed}\n\n";

// 5. Check today's scheduled times that should be marked as missed
$today = Carbon::today();
$now = Carbon::now($timezone);
$windowMinutes = 60;

$medications = Medication::where('is_active', true)
    ->where(function ($q) use ($today) {
        $q->whereNull('start_date')->orWhere('start_date', '<=', $today->format('Y-m-d'));
    })
    ->where(function ($q) use ($today) {
        $q->whereNull('end_date')->orWhere('end_date', '>=', $today->format('Y-m-d'));
    })
    ->get();

$shouldBeMissed = 0;
$alreadyMarked = 0;
$hasAdministration = 0;

foreach ($medications as $medication) {
    for ($i = 1; $i <= 4; $i++) {
        $timeField = "time_{$i}";
        $scheduledTimeStr = $medication->$timeField;
        
        if (!$scheduledTimeStr) {
            continue;
        }
        
        try {
            $timeParts = explode(':', $scheduledTimeStr);
            if (count($timeParts) !== 2) {
                continue;
            }
            
            $scheduledTime = $today->copy();
            $scheduledTime->setTime((int)$timeParts[0], (int)$timeParts[1], 0);
            
            $windowEnd = $scheduledTime->copy()->addMinutes($windowMinutes);
            
            // Only check windows that have closed
            if ($windowEnd->isPast()) {
                // Check if there's an administration
                $hasAdmin = MedicationAdministration::where('medication_id', $medication->id)
                    ->whereBetween('administered_at', [
                        $scheduledTime->copy()->subMinutes($windowMinutes),
                        $windowEnd
                    ])
                    ->whereIn('status', ['completed', 'refused', 'hospital_admission', 'pharmacy_administration_confirm'])
                    ->exists();
                
                if ($hasAdmin) {
                    $hasAdministration++;
                } else {
                    // Check if already marked as missed
                    $hasMissed = MedicationAdministration::where('medication_id', $medication->id)
                        ->whereBetween('administered_at', [
                            $scheduledTime->copy()->subMinutes(5),
                            $scheduledTime->copy()->addMinutes(5)
                        ])
                        ->where('status', 'missed')
                        ->exists();
                    
                    if ($hasMissed) {
                        $alreadyMarked++;
                    } else {
                        $shouldBeMissed++;
                        echo "   - Medication ID {$medication->id} ({$medication->name}) at {$scheduledTime->format('H:i')} should be marked as missed\n";
                    }
                }
            }
        } catch (\Exception $e) {
            continue;
        }
    }
}

echo "\n5. Today's Status:\n";
echo "   - Windows closed that should be marked as missed: {$shouldBeMissed}\n";
echo "   - Already marked as missed: {$alreadyMarked}\n";
echo "   - Have administrations (not missed): {$hasAdministration}\n\n";

// 6. Check scheduler cron job
echo "6. Scheduler Status:\n";
echo "   Run: php artisan schedule:list\n";
echo "   Check cron: crontab -l | grep schedule:run\n";
echo "   Test manually: php artisan medications:mark-missed\n\n";

echo "=== End Diagnostic ===\n";


