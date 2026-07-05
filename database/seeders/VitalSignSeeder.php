<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\VitalSign;
use App\Models\Resident;
use App\Models\User;
use Carbon\Carbon;

class VitalSignSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('❤️ Seeding vital signs for all residents from September to today...');
        
        // Get the first user as the creator (or use admin user)
        $user = User::first();
        if (!$user) {
            $this->command->error('No users found. Please run UserSeeder first.');
            return;
        }

        // Get all active residents
        $residents = Resident::where('is_active', true)->get();

        if ($residents->isEmpty()) {
            $this->command->warn('No residents found. Please run ResidentSeeder first.');
            return;
        }

        // Set date range: trailing 4 months up to today. (Previously anchored
        // to a hardcoded "September 1st of current year", which produced a
        // start date *after* today whenever the seeder ran before September,
        // making the loop below a no-op and leaving every resident with 0
        // vital signs.)
        $startDate = Carbon::now()->subMonths(4);
        $endDate = Carbon::now();
        
        $this->command->line("   Date range: {$startDate->format('M d, Y')} to {$endDate->format('M d, Y')}");
        $this->command->line("   Total residents: {$residents->count()}");
        $this->command->line('');

        $totalCreated = 0;
        $totalSkipped = 0;

        foreach ($residents as $resident) {
            $this->command->line("   Processing resident: {$resident->name}...");
            $residentCreated = 0;
            $currentDate = $startDate->copy();

            // Set a base value for each resident to create realistic variations
            // Each resident will have slightly different "normal" ranges
            $baseSystolic = rand(110, 130);
            $baseDiastolic = rand(70, 85);
            $basePulse = rand(65, 85);
            $baseTemperature = round(rand(970, 990) / 10, 1); // 97.0 to 99.0
            $baseOxygen = rand(95, 99);

            while ($currentDate->lte($endDate)) {
                // Skip weekends occasionally (5% chance) - not all vital signs are taken on weekends
                if ($currentDate->isWeekend() && rand(1, 20) === 1) {
                    $currentDate->addDay();
                    continue;
                }

                // Check if record already exists
                $exists = VitalSign::where('resident_id', $resident->id)
                    ->where('measurement_date', $currentDate->toDateString())
                    ->exists();

                if ($exists) {
                    $currentDate->addDay();
                    $totalSkipped++;
                    continue;
                }

                // Create realistic variations around base values
                // Add some daily variation (±5-10%)
                $variation = 0.05 + (rand(0, 10) / 100); // 5% to 15%
                
                $systolic = (int) round($baseSystolic * (1 + (rand(-10, 10) / 100)));
                $diastolic = (int) round($baseDiastolic * (1 + (rand(-10, 10) / 100)));
                $pulse = (int) round($basePulse * (1 + (rand(-10, 10) / 100)));
                $temperature = round($baseTemperature + (rand(-30, 50) / 10), 1); // ±3.0 to 5.0 degrees
                $oxygenSaturation = (int) round($baseOxygen + rand(-2, 3));

                // Occasional outliers (5% chance of abnormal reading)
                if (rand(1, 20) === 1) {
                    // Simulate occasional high/low readings
                    if (rand(1, 2) === 1) {
                        // High reading
                        $systolic += rand(10, 25);
                        $diastolic += rand(5, 15);
                        $pulse += rand(10, 20);
                        $temperature += rand(10, 30) / 10;
                    } else {
                        // Low reading
                        $systolic -= rand(10, 20);
                        $diastolic -= rand(5, 10);
                        $pulse -= rand(10, 15);
                        $temperature -= rand(10, 20) / 10;
                    }
                }

                // Ensure values stay within reasonable bounds
                $systolic = max(80, min(180, $systolic));
                $diastolic = max(50, min(110, $diastolic));
                $pulse = max(45, min(120, $pulse));
                $temperature = max(96.0, min(101.0, $temperature));
                $oxygenSaturation = max(90, min(100, $oxygenSaturation));

                // Determine status based on values
                $status = 'approved';
                $notes = 'Routine vital signs measurement';
                
                if ($systolic >= 140 || $diastolic >= 90 || $temperature >= 100.4 || $oxygenSaturation < 92) {
                    $status = 'critical';
                    $notes = 'Critical readings - requires medical attention';
                } elseif ($systolic >= 130 || $diastolic >= 85 || $temperature >= 99.5 || $oxygenSaturation < 95) {
                    $status = 'pending_review';
                    $notes = 'Elevated readings - needs monitoring';
                }

                // Optional: occasionally add pain level (30% chance)
                $painLevel = null;
                if (rand(1, 10) <= 3) {
                    $painLevel = rand(0, 5);
                }

                VitalSign::create([
                    'resident_id' => $resident->id,
                    'branch_id' => $resident->branch_id,
                    'measurement_date' => $currentDate->toDateString(),
                    'systolic' => $systolic,
                    'diastolic' => $diastolic,
                    'temperature' => $temperature,
                    'pulse' => $pulse,
                    'oxygen_saturation' => $oxygenSaturation,
                    'pain_level' => $painLevel,
                    'status' => $status,
                    'notes' => $notes,
                    'taken_by' => $user->id,
                ]);

                $residentCreated++;
                $totalCreated++;
                $currentDate->addDay();
            }

            $this->command->line("      ✓ Created {$residentCreated} vital signs records");
        }

        $this->command->line('');
        $this->command->info("✅ Vital signs seeding completed!");
        $this->command->info("   Total records created: {$totalCreated}");
        if ($totalSkipped > 0) {
            $this->command->line("   Records skipped (already exist): {$totalSkipped}");
        }
        $this->command->info("   Total vital signs in database: " . VitalSign::count());
    }
}
