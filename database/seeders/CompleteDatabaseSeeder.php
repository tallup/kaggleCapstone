<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Complete Database Seeder
 * 
 * This master seeder ensures ALL tables in the database are populated with data.
 * It calls all individual seeders in the correct order to maintain referential integrity.
 */
class CompleteDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds in the correct order.
     */
    public function run(): void
    {
        $this->command->info('🌱 Starting complete database seeding for all tables...');
        $this->command->line('');

        // PHASE 1: Core system setup (no dependencies)
        $this->command->info('📋 Phase 1: Setting up core system...');
        $this->call([
            UnifiedProductionSeeder::class,  // Roles, permissions, facilities, branches, admin user, vital ranges
            SuperAdminSeeder::class,        // Super admin user
        ]);
        $this->command->info('✅ Phase 1 completed');
        $this->command->line('');

        // PHASE 2: Reference data (depends on facilities/branches)
        $this->command->info('📋 Phase 2: Creating reference data...');
        $this->call([
            DrugSeeder::class,                    // Pharmaceuticals/drugs catalog
            HealthcareProviderSeeder::class,      // Healthcare providers directory
            AppointmentTypeSeeder::class,         // Appointment types
            BehaviorCategorySeeder::class,        // Behavior categories
        ]);
        $this->command->info('✅ Phase 2 completed');
        $this->command->line('');

        // PHASE 3: User and staff data (depends on branches, roles)
        $this->command->info('📋 Phase 3: Creating users and staff...');
        $this->call([
            CaregiverSeeder::class,               // Additional caregivers and staff
            EmployeeDocumentSeeder::class,        // Employee documents
        ]);
        $this->command->info('✅ Phase 3 completed');
        $this->command->line('');

        // PHASE 4: Residents (depends on facilities, branches)
        $this->command->info('📋 Phase 4: Creating residents...');
        $this->call([
            ResidentSeeder::class,                // Resident profiles
        ]);
        $this->command->info('✅ Phase 4 completed');
        $this->command->line('');

        // PHASE 5: Medications and prescriptions (depends on residents, drugs)
        $this->command->info('📋 Phase 5: Creating medications...');
        $this->call([
            MedicationSeeder::class,              // Resident medications/prescriptions
            MedicationAdministrationSeeder::class, // Medication administration records (MAR)
        ]);
        $this->command->info('✅ Phase 5 completed');
        $this->command->line('');

        // PHASE 6: Health records (depends on residents, users)
        $this->command->info('📋 Phase 6: Creating health records...');
        $this->call([
            VitalSignSeeder::class,               // Vital signs measurements
            AppointmentSeeder::class,             // Appointments
        ]);
        $this->command->info('✅ Phase 6 completed');
        $this->command->line('');

        // PHASE 7: Assessments (depends on residents, users)
        // Note: AssessmentSeeder creates Assessment and AssessmentSection records
        $this->command->info('📋 Phase 7: Creating assessments...');
        $this->call([
            AssessmentSeeder::class,              // Assessments and sections
            AssessmentQuestionSeeder::class,      // Assessment questions (depends on sections)
        ]);
        $this->command->info('✅ Phase 7 completed');
        $this->command->line('');

        // PHASE 8: Assignments and schedules (depends on users, residents)
        $this->command->info('📋 Phase 8: Creating assignments...');
        $this->call([
            AssignmentSeeder::class,              // Caregiver-resident assignments
        ]);
        $this->command->info('✅ Phase 8 completed');
        $this->command->line('');

        // PHASE 9: Sleep monitoring (depends on residents)
        $this->command->info('📋 Phase 9: Creating sleep records...');
        $this->call([
            SleepPatternSeeder::class,            // Monthly sleep patterns
            SleepRecordSeeder::class,             // Individual sleep sessions
            SleepHourlyDataSeeder::class,         // Hourly sleep breakdown (depends on records)
        ]);
        $this->command->info('✅ Phase 9 completed');
        $this->command->line('');

        // PHASE 10: Behaviors and incidents (depends on residents, users)
        $this->command->info('📋 Phase 10: Creating behaviors and incidents...');
        $this->call([
            BehaviorSeeder::class,                // Behavior records
            IncidentSeeder::class,                // Incident reports
            TLogSeeder::class,                    // Progress note entries
        ]);
        $this->command->info('✅ Phase 10 completed');
        $this->command->line('');

        // PHASE 11: Leave requests (depends on users)
        $this->command->info('📋 Phase 11: Creating leave requests...');
        $this->call([
            LeaveRequestSeeder::class,            // Staff leave requests
        ]);
        $this->command->info('✅ Phase 11 completed');
        $this->command->line('');

        // PHASE 12: Check-in/Check-out system (depends on users, residents, branches)
        $this->command->info('📋 Phase 12: Creating check-in/check-out records...');
        $this->call([
            StaffClockInSeeder::class,            // Staff clock-in/out records
            ResidentSignOutSeeder::class,         // Resident sign-out/in records
            VisitorSeeder::class,                 // Visitor check-in/out records
        ]);
        $this->command->info('✅ Phase 12 completed');
        $this->command->line('');

        // Show final summary
        $this->showFinalSummary();

        $this->command->line('');
        $this->command->info('🎉 Overcomplete database seeding finished! All tables have been populated.');
        $this->command->line('');
    }

    /**
     * Display a summary of all seeded data.
     */
    private function showFinalSummary(): void
    {
        $this->command->info('📊 Final Database Summary:');
        $this->command->line('');

        // Count records from each model
        $models = [
            '👤 Users' => \App\Models\User::class,
            '🏥 Facilities' => \App\Models\Facility::class,
            '🏢 Branches' => \App\Models\Branch::class,
            '👴 Residents' => \App\Models\Resident::class,
            '💊 Drugs' => \App\Models\Drug::class,
            '💉 Medications' => \App\Models\Medication::class,
            '📊 Vital Signs' => \App\Models\VitalSign::class,
            '📅 Appointments' => \App\Models\Appointment::class,
            '👨‍⚕️ Healthcare Providers' => \App\Models\HealthcareProvider::class,
            '📋 Assessments' => \App\Models\Assessment::class,
            '📑 Assessment Sections' => \App\Models\AssessmentSection::class,
            '❓ Assessment Questions' => \App\Models\AssessmentQuestion::class,
            '🔗 Assignments' => \App\Models\Assignment::class,
            '💊 Medication Administrations' => \App\Models\MedicationAdministration::class,
            '😴 Sleep Patterns' => \App\Models\SleepPattern::class,
            '😴 Sleep Records' => \App\Models\SleepRecord::class,
            '📊 Vital Ranges' => \App\Models\VitalRange::class,
            '🏖️ Leave Requests' => \App\Models\LeaveRequest::class,
            '📁 Employee Documents' => \App\Models\EmployeeDocument::class,
            '🚨 Incidents' => \App\Models\Incident::class,
            '📝 Progress notes' => \App\Models\TLog::class,
            '🎭 Behaviors' => \App\Models\Behavior::class,
            '📂 Behavior Categories' => \App\Models\BehaviorCategory::class,
            '🔐 Roles' => \App\Models\Role::class,
            '🔑 Permissions' => \App\Models\Permission::class,
            '🕐 Staff Clock-Ins' => \App\Models\StaffClockIn::class,
            '🚪 Resident Sign-Outs' => \App\Models\ResidentSignOut::class,
            '👥 Visitors' => \App\Models\Visitor::class,
        ];

        foreach ($models as $label => $modelClass) {
            try {
                $count = $modelClass::count();
                $this->command->line("  {$label}: {$count}");
            } catch (\Exception $e) {
                $this->command->warn("  {$label}: Unable to count (table may not exist)");
            }
        }

        $this->command->line('');
    }
}
