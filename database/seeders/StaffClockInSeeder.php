<?php

namespace Database\Seeders;

use App\Models\StaffClockIn;
use App\Models\User;
use App\Models\Branch;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class StaffClockInSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🕐 Creating staff clock-in records...');

        // Get all staff members (caregivers, nurses, etc.) - exclude super admins
        $staff = User::whereIn('role', ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse', 'administrator'])
            ->where('role', '!=', 'super_admin')
            ->get();

        if ($staff->isEmpty()) {
            $this->command->warn('No staff members found. Please run CaregiverSeeder first.');
            return;
        }

        // Get branches
        $branches = Branch::withoutGlobalScopes()->get();
        if ($branches->isEmpty()) {
            $this->command->warn('No branches found. Please run BranchSeeder first.');
            return;
        }

        $clockInsCreated = 0;

        // Create clock-ins for the past 30 days
        foreach ($staff as $staffMember) {
            $branch = $branches->random();
            $facilityId = $branch->facility_id;

            // Get branch coordinates if available
            $branchLat = $branch->latitude ?? 47.6062; // Default Seattle coordinates
            $branchLon = $branch->longitude ?? -122.3321;

            // Create clock-ins for each day in the past 30 days (excluding weekends randomly)
            for ($daysAgo = 0; $daysAgo <= 30; $daysAgo++) {
                $date = Carbon::today()->subDays($daysAgo);

                // Skip weekends randomly (50% chance)
                if ($date->isWeekend() && rand(1, 2) === 1) {
                    continue;
                }

                // Random shift start times: 6 AM, 7 AM, 8 AM, 2 PM, 10 PM
                $shiftStarts = ['06:00', '07:00', '08:00', '14:00', '22:00'];
                $shiftStart = $shiftStarts[array_rand($shiftStarts)];
                $clockInTime = Carbon::parse($date->format('Y-m-d') . ' ' . $shiftStart);

                // Random shift duration: 6-12 hours
                $shiftHours = rand(6, 12);
                $clockOutTime = $clockInTime->copy()->addHours($shiftHours);

                // Determine if this is still active (recent clock-ins might be active)
                $isActive = $daysAgo === 0 && rand(1, 3) === 1; // 33% chance for today

                // Skip creating clock-out if active
                if ($isActive && $clockOutTime->isFuture()) {
                    continue; // Don't create active clock-ins in the past
                }

                // Add small random variation to location (within 50 meters)
                $latVariation = (rand(-50, 50) / 10000); // ~50 meters
                $lonVariation = (rand(-50, 50) / 10000);

                $clockInLat = $branchLat + $latVariation;
                $clockInLon = $branchLon + $lonVariation;
                $clockOutLat = $branchLat + (rand(-50, 50) / 10000);
                $clockOutLon = $branchLon + (rand(-50, 50) / 10000);

                // Random clock method (80% authenticated, 20% public)
                $clockMethod = rand(1, 10) <= 8 ? 'authenticated' : 'public';

                $totalHours = $isActive ? null : round($clockInTime->diffInMinutes($clockOutTime) / 60, 2);

                StaffClockIn::create([
                    'staff_id' => $staffMember->id,
                    'branch_id' => $branch->id,
                    'facility_id' => $facilityId,
                    'clock_in_at' => $clockInTime,
                    'clock_out_at' => $isActive ? null : $clockOutTime,
                    'clock_in_latitude' => $clockInLat,
                    'clock_in_longitude' => $clockInLon,
                    'clock_out_latitude' => $isActive ? null : $clockOutLat,
                    'clock_out_longitude' => $isActive ? null : $clockOutLon,
                    'total_hours' => $totalHours,
                    'is_active' => $isActive,
                    'clock_method' => $clockMethod,
                    'employee_identifier' => $clockMethod === 'public' ? $staffMember->email : null,
                    'notes' => rand(1, 5) === 1 ? 'Regular shift' : null,
                ]);

                $clockInsCreated++;
            }
        }

        // Create some active clock-ins for today (if not already created above)
        $todayActiveCount = StaffClockIn::where('is_active', true)
            ->whereDate('clock_in_at', today())
            ->count();

        if ($todayActiveCount < 3) {
            $activeStaff = $staff->random(min(3, $staff->count()));
            foreach ($activeStaff as $staffMember) {
                // Check if already clocked in today
                $existingActive = StaffClockIn::where('staff_id', $staffMember->id)
                    ->where('is_active', true)
                    ->whereDate('clock_in_at', today())
                    ->exists();

                if (!$existingActive) {
                    $branch = $branches->random();
                    $facilityId = $branch->facility_id;
                    $branchLat = $branch->latitude ?? 47.6062;
                    $branchLon = $branch->longitude ?? -122.3321;

                    $clockInTime = Carbon::now()->subHours(rand(1, 6)); // Clocked in 1-6 hours ago
                    $latVariation = (rand(-50, 50) / 10000);
                    $lonVariation = (rand(-50, 50) / 10000);

                    StaffClockIn::create([
                        'staff_id' => $staffMember->id,
                        'branch_id' => $branch->id,
                        'facility_id' => $facilityId,
                        'clock_in_at' => $clockInTime,
                        'clock_out_at' => null,
                        'clock_in_latitude' => $branchLat + $latVariation,
                        'clock_in_longitude' => $branchLon + $lonVariation,
                        'clock_out_latitude' => null,
                        'clock_out_longitude' => null,
                        'total_hours' => null,
                        'is_active' => true,
                        'clock_method' => 'authenticated',
                        'notes' => null,
                    ]);

                    $clockInsCreated++;
                }
            }
        }

        $this->command->info("✅ Created {$clockInsCreated} staff clock-in records");
    }
}




















