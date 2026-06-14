<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TLog;
use App\Models\Resident;
use App\Models\Branch;
use App\Models\Facility;
use App\Models\User;
use Carbon\Carbon;

class TLogSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('🌱 Starting progress note seeding...');

        // Get all facilities (without global scopes to ensure we get all during seeding)
        $facilities = Facility::withoutGlobalScopes()->where('is_active', true)->get();
        
        if ($facilities->isEmpty()) {
            $this->command->warn('No active facilities found. Please run FacilitySeeder first.');
            return;
        }

        // Get users for reporter and entered_by (without global scopes)
        $users = User::withoutGlobalScopes()->where('is_active', true)->get();
        if ($users->isEmpty()) {
            $this->command->warn('No active users found. Please run UserSeeder first.');
            return;
        }

        // Progress note types (matching frontend)
        $logTypes = ['health', 'notes', 'follow-up', 'behavior', 'contacts', 'general'];
        
        // Notification levels
        $notificationLevels = ['low', 'medium', 'high', 'urgent'];

        // Sample summaries and descriptions
        $summaries = [
            'health' => [
                'Vital signs check completed',
                'Medication administered as prescribed',
                'Blood pressure monitoring',
                'Temperature reading taken',
                'Weight measurement recorded',
                'Health assessment completed',
                'Doctor visit scheduled',
                'Lab results received',
            ],
            'notes' => [
                'Daily care notes',
                'Resident activity log',
                'Meal intake observation',
                'Sleep pattern noted',
                'Mood and behavior observation',
                'Family visit documented',
                'Staff handoff notes',
                'Care plan update',
            ],
            'follow-up' => [
                'Follow-up on previous incident',
                'Medication review needed',
                'Appointment follow-up required',
                'Family communication follow-up',
                'Doctor recommendation follow-up',
                'Care plan adjustment needed',
            ],
            'behavior' => [
                'Behavioral observation',
                'Agitation noted',
                'Positive behavior reinforcement',
                'Behavior intervention implemented',
                'Calming techniques used',
                'Behavior pattern documented',
            ],
            'contacts' => [
                'Family member contacted',
                'Healthcare provider communication',
                'Emergency contact notified',
                'Social worker consultation',
                'Therapist visit scheduled',
            ],
            'general' => [
                'General observation',
                'Daily activity log',
                'Resident status update',
                'Care documentation',
                'Routine check-in',
            ],
        ];

        $descriptions = [
            'Resident is doing well today. All care tasks completed as scheduled.',
            'No concerns noted. Resident participated in activities.',
            'Resident had a good day. Appetite was normal.',
            'Minor observation noted. Will continue to monitor.',
            'Resident engaged well with staff and other residents.',
            'All scheduled medications and care tasks completed successfully.',
            'Resident showed improvement in mood and engagement.',
            'Routine care provided. No issues to report.',
            'Resident attended scheduled activities. Positive interaction observed.',
            'Care plan followed. Resident comfortable and content.',
        ];

        $totalTLogs = 0;

        // Iterate through each facility
        foreach ($facilities as $facility) {
            $this->command->info("Processing facility: {$facility->name}");

            // Get branches for this facility (without global scopes)
            $branches = Branch::withoutGlobalScopes()
                ->where('facility_id', $facility->id)
                ->where('is_active', true)
                ->get();

            if ($branches->isEmpty()) {
                $this->command->warn("  No branches found for facility: {$facility->name}");
                continue;
            }

            // Iterate through each branch
            foreach ($branches as $branch) {
                $this->command->info("  Processing branch: {$branch->name}");

                // Get residents for this branch (without global scopes)
                $residents = Resident::withoutGlobalScopes()
                    ->where('branch_id', $branch->id)
                    ->where('is_active', true)
                    ->get();

                if ($residents->isEmpty()) {
                    $this->command->warn("    No active residents found for branch: {$branch->name}");
                    continue;
                }

                // Create progress notes for each resident in this branch
                foreach ($residents as $resident) {
                    // Create 2-5 progress notes per resident
                    $tLogCount = rand(2, 5);

                    for ($i = 0; $i < $tLogCount; $i++) {
                        // Select 1-3 types randomly
                        $selectedTypes = [];
                        $typeCount = rand(1, 3);
                        $availableTypes = $logTypes;
                        
                        for ($j = 0; $j < $typeCount && !empty($availableTypes); $j++) {
                            $randomKey = array_rand($availableTypes);
                            $selectedTypes[] = $availableTypes[$randomKey];
                            unset($availableTypes[$randomKey]);
                            $availableTypes = array_values($availableTypes);
                        }

                        // Get summary based on primary type
                        $primaryType = $selectedTypes[0];
                        $summaryOptions = $summaries[$primaryType] ?? $summaries['general'];
                        $summary = $summaryOptions[array_rand($summaryOptions)];

                        // Random description
                        $description = $descriptions[array_rand($descriptions)];

                        // Random notification level
                        $notificationLevel = $notificationLevels[array_rand($notificationLevels)];

                        // Random reporter (optional - 70% chance)
                        $reporter = rand(0, 9) < 7 ? $users->random() : null;

                        // Random entered_by user
                        $enteredBy = $users->random();

                        // Random reported_on date (within last 90 days)
                        $reportedOn = Carbon::now()->subDays(rand(0, 90))
                            ->setTime(rand(6, 22), rand(0, 59));

                        // Create progress note
                        TLog::create([
                            'resident_id' => $resident->id,
                            'branch_id' => $branch->id, // Auto-filled from resident, but explicitly set
                            'types' => $selectedTypes,
                            'notification_level' => $notificationLevel,
                            'summary' => $summary,
                            'description' => $description,
                            'reporter_id' => $reporter?->id,
                            'reported_on' => $reportedOn,
                            'entered_by_id' => $enteredBy->id,
                            'created_at' => $reportedOn,
                            'updated_at' => $reportedOn,
                        ]);

                        $totalTLogs++;
                    }
                }

                $this->command->info("    Created progress notes for branch: {$branch->name}");
            }
        }

        $this->command->info("✅ Progress note seeding completed! Created {$totalTLogs} progress notes across all facilities and branches.");
    }
}
