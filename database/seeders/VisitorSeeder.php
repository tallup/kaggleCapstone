<?php

namespace Database\Seeders;

use App\Models\Visitor;
use App\Models\Resident;
use App\Models\User;
use App\Models\Branch;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class VisitorSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('👥 Creating visitor records...');

        // Get residents (for visiting_resident_id)
        $residents = Resident::withoutGlobalScopes()->where('is_active', true)->get();

        if ($residents->isEmpty()) {
            $this->command->warn('No residents found. Please run ResidentSeeder first.');
            return;
        }

        // Get staff (for visiting_staff_id and checked_in_by)
        $staff = User::whereIn('role', ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'administrator'])
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

        $firstNames = [
            'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica',
            'William', 'Amanda', 'James', 'Ashley', 'Christopher', 'Michelle', 'Daniel', 'Stephanie',
            'Matthew', 'Jennifer', 'Anthony', 'Nicole', 'Mark', 'Melissa', 'Donald', 'Elizabeth',
            'Steven', 'Laura', 'Andrew', 'Lisa', 'Paul', 'Nancy', 'Joshua', 'Karen',
        ];

        $lastNames = [
            'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
            'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
            'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark',
            'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott',
        ];

        $visitPurposes = [
            'Family visit',
            'Friend visit',
            'Delivery',
            'Maintenance',
            'Medical consultation',
            'Social visit',
            'Meal service',
            'Entertainment',
            'Religious service',
            'Special event',
        ];

        $visitorsCreated = 0;

        // Create visitors for the past 60 days
        for ($daysAgo = 0; $daysAgo <= 60; $daysAgo++) {
            $date = Carbon::today()->subDays($daysAgo);
            
            // Create 1-5 visitors per day
            $visitorsPerDay = rand(1, 5);

            for ($i = 0; $i < $visitorsPerDay; $i++) {
                // 70% visiting residents, 20% visiting staff, 10% general visit
                $visitType = rand(1, 10);
                $visitingResidentId = null;
                $visitingStaffId = null;

                if ($visitType <= 7) {
                    // Visiting a resident
                    $visitingResidentId = $residents->random()->id;
                } elseif ($visitType <= 9) {
                    // Visiting staff
                    $visitingStaffId = $staff->random()->id;
                }

                $branch = $branches->random();
                $facilityId = $branch->facility_id;

                // Random check-in time between 8 AM and 8 PM
                $hour = rand(8, 19);
                $minute = rand(0, 59) < 30 ? 0 : 30;
                $checkInTime = Carbon::parse($date->format('Y-m-d') . " {$hour}:{$minute}");

                // Random duration: 30 minutes to 4 hours
                $durationMinutes = rand(30, 240);
                $expectedDuration = $durationMinutes;
                $checkOutTime = $checkInTime->copy()->addMinutes($durationMinutes + rand(-15, 30));

                // Determine if active (more likely for recent dates)
                $isActive = $daysAgo === 0 && rand(1, 3) === 1; // 33% chance for today

                // If active, don't set check-out time
                if ($isActive && $checkOutTime->isFuture()) {
                    $checkOutTime = null;
                }

                $firstName = $firstNames[array_rand($firstNames)];
                $lastName = $lastNames[array_rand($lastNames)];
                $email = strtolower($firstName . '.' . $lastName . '@example.com');
                $phone = '(' . rand(200, 999) . ') ' . rand(100, 999) . '-' . rand(1000, 9999);

                $checkedInBy = $staff->random();
                $checkedOutBy = $isActive ? null : $staff->random();

                Visitor::create([
                    'branch_id' => $branch->id,
                    'facility_id' => $facilityId,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $email,
                    'phone' => $phone,
                    'visit_purpose' => $visitPurposes[array_rand($visitPurposes)],
                    'visiting_resident_id' => $visitingResidentId,
                    'visiting_staff_id' => $visitingStaffId,
                    'check_in_at' => $checkInTime,
                    'check_out_at' => $checkOutTime,
                    'expected_duration_minutes' => $expectedDuration,
                    'is_active' => $isActive,
                    'checked_in_by' => $checkedInBy->id,
                    'checked_out_by' => $checkedOutBy?->id,
                    'notes' => rand(1, 5) === 1 ? 'Visitor checked in and out successfully' : null,
                ]);

                $visitorsCreated++;
            }
        }

        // Create some active visitors for today
        $todayActiveCount = Visitor::where('is_active', true)
            ->whereDate('check_in_at', today())
            ->count();

        if ($todayActiveCount < 2) {
            for ($i = 0; $i < 2; $i++) {
                $branch = $branches->random();
                $facilityId = $branch->facility_id;
                $visitingResidentId = $residents->random()->id;
                $checkedInBy = $staff->random();
                $checkInTime = Carbon::now()->subMinutes(rand(30, 240)); // Checked in 30 min to 4 hours ago
                $expectedDuration = rand(60, 180); // 1-3 hours

                $firstName = $firstNames[array_rand($firstNames)];
                $lastName = $lastNames[array_rand($lastNames)];
                $email = strtolower($firstName . '.' . $lastName . '@example.com');
                $phone = '(' . rand(200, 999) . ') ' . rand(100, 999) . '-' . rand(1000, 9999);

                Visitor::create([
                    'branch_id' => $branch->id,
                    'facility_id' => $facilityId,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $email,
                    'phone' => $phone,
                    'visit_purpose' => $visitPurposes[array_rand($visitPurposes)],
                    'visiting_resident_id' => $visitingResidentId,
                    'visiting_staff_id' => null,
                    'check_in_at' => $checkInTime,
                    'check_out_at' => null,
                    'expected_duration_minutes' => $expectedDuration,
                    'is_active' => true,
                    'checked_in_by' => $checkedInBy->id,
                    'checked_out_by' => null,
                    'notes' => null,
                ]);

                $visitorsCreated++;
            }
        }

        $this->command->info("✅ Created {$visitorsCreated} visitor records");
    }
}















