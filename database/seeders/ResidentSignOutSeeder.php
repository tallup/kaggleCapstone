<?php

namespace Database\Seeders;

use App\Models\ResidentSignOut;
use App\Models\Resident;
use App\Models\User;
use App\Models\Branch;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class ResidentSignOutSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🚪 Creating resident sign-out records...');

        // Get all active residents
        $residents = Resident::withoutGlobalScopes()->where('is_active', true)->get();

        if ($residents->isEmpty()) {
            $this->command->warn('No residents found. Please run ResidentSeeder first.');
            return;
        }

        // Get staff members for created_by
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

        $destinations = [
            'Doctor Appointment',
            'Family Visit',
            'Shopping Trip',
            'Dental Appointment',
            'Physical Therapy',
            'Religious Service',
            'Social Event',
            'Hospital Visit',
            'Specialist Appointment',
            'Family Lunch',
        ];

        $purposes = [
            'Medical appointment',
            'Family visit',
            'Personal errand',
            'Recreational activity',
            'Religious observance',
            'Therapy session',
            'Social engagement',
            'Emergency visit',
        ];

        $signOutsCreated = 0;

        // Create sign-outs for the past 60 days
        foreach ($residents->random(min(10, $residents->count())) as $resident) {
            // Each resident goes out 1-3 times per week
            $numSignOuts = rand(30, 90); // Approximate 1-3 times per week over 30 days

            for ($i = 0; $i < min($numSignOuts, 50); $i++) {
                $daysAgo = rand(0, 60);
                $date = Carbon::today()->subDays($daysAgo);

                // Random time between 8 AM and 6 PM
                $hour = rand(8, 17);
                $minute = rand(0, 59) < 30 ? 0 : 30;
                $signOutTime = Carbon::parse($date->format('Y-m-d') . " {$hour}:{$minute}");

                // Random duration: 1-8 hours
                $durationHours = rand(1, 8);
                $expectedReturnTime = $signOutTime->copy()->addHours($durationHours);
                $signInTime = $expectedReturnTime->copy()->addMinutes(rand(-30, 60)); // Actual return might be slightly different

                // Determine if active (more likely for recent dates)
                $isActive = $daysAgo === 0 && rand(1, 4) === 1; // 25% chance for today

                // If active, don't set sign-in time
                if ($isActive && $signInTime->isFuture()) {
                    $signInTime = null;
                }

                // If past expected return and active, mark as overdue
                $isOverdue = $isActive && $expectedReturnTime->isPast();

                $branch = $branches->random();
                $facilityId = $branch->facility_id;
                $createdBy = $staff->random();
                $signedInBy = $isActive ? null : $staff->random();

                $destination = $destinations[array_rand($destinations)];
                $purpose = $purposes[array_rand($purposes)];

                // 30% chance of being accompanied
                $accompaniedBy = rand(1, 10) <= 3 ? 'Family Member' : null;

                // 20% chance emergency contact was notified
                $emergencyNotified = rand(1, 10) <= 2;

                ResidentSignOut::create([
                    'resident_id' => $resident->id,
                    'branch_id' => $branch->id,
                    'facility_id' => $facilityId,
                    'sign_out_at' => $signOutTime,
                    'sign_in_at' => $signInTime,
                    'destination' => $destination,
                    'purpose' => $purpose,
                    'accompanied_by' => $accompaniedBy,
                    'expected_return_at' => $expectedReturnTime,
                    'emergency_contact_notified' => $emergencyNotified,
                    'is_active' => $isActive,
                    'created_by' => $createdBy->id,
                    'signed_in_by' => $signedInBy?->id,
                    'notes' => rand(1, 5) === 1 ? 'Resident returned safely' : null,
                ]);

                $signOutsCreated++;
            }
        }

        // Create some active sign-outs for today
        $todayActiveCount = ResidentSignOut::where('is_active', true)
            ->whereDate('sign_out_at', today())
            ->count();

        if ($todayActiveCount < 2) {
            $activeResidents = $residents->random(min(2, $residents->count()));
            foreach ($activeResidents as $resident) {
                // Check if already signed out today
                $existingActive = ResidentSignOut::where('resident_id', $resident->id)
                    ->where('is_active', true)
                    ->whereDate('sign_out_at', today())
                    ->exists();

                if (!$existingActive) {
                    $branch = $branches->random();
                    $facilityId = $branch->facility_id;
                    $createdBy = $staff->random();
                    $signOutTime = Carbon::now()->subHours(rand(1, 4)); // Signed out 1-4 hours ago
                    $expectedReturnTime = Carbon::now()->addHours(rand(1, 4)); // Expected back in 1-4 hours

                    ResidentSignOut::create([
                        'resident_id' => $resident->id,
                        'branch_id' => $branch->id,
                        'facility_id' => $facilityId,
                        'sign_out_at' => $signOutTime,
                        'sign_in_at' => null,
                        'destination' => $destinations[array_rand($destinations)],
                        'purpose' => $purposes[array_rand($purposes)],
                        'accompanied_by' => rand(1, 2) === 1 ? 'Family Member' : null,
                        'expected_return_at' => $expectedReturnTime,
                        'emergency_contact_notified' => false,
                        'is_active' => true,
                        'created_by' => $createdBy->id,
                        'signed_in_by' => null,
                        'notes' => null,
                    ]);

                    $signOutsCreated++;
                }
            }
        }

        $this->command->info("✅ Created {$signOutsCreated} resident sign-out records");
    }
}



















