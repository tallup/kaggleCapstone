<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MedicationAdministration;
use App\Models\Medication;
use App\Models\User;
use App\Models\Branch;
use Carbon\Carbon;

class MedicationAdministrationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $medications = Medication::all();
        $users = User::whereHas('roles', function($query) {
            $query->whereIn('name', ['administrator', 'super_admin', 'caregiver']);
        })->get();

        if ($medications->isEmpty() || $users->isEmpty()) {
            $this->command->warn('No medications or users found. Please run MedicationSeeder and UserSeeder first.');
            return;
        }

        $statuses = ['taken', 'missed', 'refused'];

        foreach ($medications as $medication) {
            // Create 10-30 administration records per medication
            $administrationCount = rand(10, 30);
            
            for ($i = 0; $i < $administrationCount; $i++) {
                $administeredBy = $users->random();
                $administeredAt = Carbon::now()->subDays(rand(1, 90))->setTime(rand(6, 22), rand(0, 59));

                $branchId = $medication->branch_id
                    ?? optional($medication->resident)->branch_id
                    ?? optional($administeredBy)->assigned_branch_id
                    ?? Branch::value('id');

                if (!$branchId) {
                    $this->command->warn("Skipping medication administration for medication ID {$medication->id} due to missing branch assignment.");
                    continue;
                }
                
                MedicationAdministration::create([
                    'medication_id' => $medication->id,
                    'resident_id' => $medication->resident_id,
                    'administered_by' => $administeredBy->id,
                    'administered_at' => $administeredAt,
                    'status' => $statuses[array_rand($statuses)],
                    'dosage_given' => $this->generateDosageGiven($medication),
                    'notes' => $this->generateAdministrationNotes(),
                    'branch_id' => $branchId,
                    'created_at' => $administeredAt,
                    'updated_at' => $administeredAt,
                ]);
            }
        }

        $this->command->info('MedicationAdministrationSeeder completed successfully!');
    }

    private function generateDosageGiven($medication): string
    {
        $dosage = rand(1, 3);
        $units = ['mg', 'ml', 'tablets', 'capsules', 'drops'];
        $unit = $units[array_rand($units)];
        
        return $dosage . ' ' . $unit;
    }

    private function generateAdministrationNotes(): string
    {
        $notes = [
            'Medication administered successfully with no issues.',
            'Resident was cooperative and took medication without difficulty.',
            'Medication was crushed and mixed with food as required.',
            'Resident required encouragement but eventually took medication.',
            'Medication was administered with water as prescribed.',
            'Resident was alert and oriented during administration.',
            'No adverse reactions observed during or after administration.',
            'Medication was given with food to reduce stomach irritation.',
            'Resident was reminded about the importance of taking medication.',
            'Administration was completed according to care plan.',
        ];

        return $notes[array_rand($notes)];
    }

}
