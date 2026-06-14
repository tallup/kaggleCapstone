<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\MedicationAdministration;
use App\Models\Medication;
use App\Models\Resident;

class CheckMedicationRecords extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medications:check-records {--medication= : Medication ID to check} {--resident= : Resident ID to check}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Diagnostic command to check medication administration records';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Medication Administration Records Diagnostic ===\n");

        // Check total records
        $totalRecords = MedicationAdministration::count();
        $missedRecords = MedicationAdministration::where('status', 'missed')->count();
        $this->info("Total administration records: {$totalRecords}");
        $this->info("Total missed records: {$missedRecords}\n");

        // Check specific medication if provided
        $medicationId = $this->option('medication');
        if ($medicationId) {
            $medication = Medication::find($medicationId);
            if ($medication) {
                $this->info("Medication ID {$medicationId} found:");
                $this->line("  Name: {$medication->name}");
                $this->line("  Resident ID: {$medication->resident_id}");
                $this->line("  Branch ID: {$medication->branch_id}");
                $this->line("  Active: " . ($medication->is_active ? 'Yes' : 'No'));
                $startDate = $medication->start_date ? $medication->start_date : 'null';
                $endDate = $medication->end_date ? $medication->end_date : 'null';
                $this->line("  Start Date: {$startDate}");
                $this->line("  End Date: {$endDate}");
                $this->line("  Times: {$medication->time_1}, {$medication->time_2}, {$medication->time_3}, {$medication->time_4}\n");
                
                $medRecords = MedicationAdministration::where('medication_id', $medicationId)->count();
                $this->info("  Total administration records for medication {$medicationId}: {$medRecords}");
                $medMissed = MedicationAdministration::where('medication_id', $medicationId)->where('status', 'missed')->count();
                $this->info("  Missed records for medication {$medicationId}: {$medMissed}\n");
            } else {
                $this->error("Medication ID {$medicationId} NOT FOUND\n");
            }
        }

        // Check specific resident if provided
        $residentId = $this->option('resident');
        if ($residentId) {
            $resident = Resident::find($residentId);
            if ($resident) {
                $this->info("Resident ID {$residentId} found:");
                $this->line("  Name: {$resident->first_name} {$resident->last_name}");
                $this->line("  Branch ID: {$resident->branch_id}");
                $this->line("  Active: " . ($resident->is_active ? 'Yes' : 'No') . "\n");
                
                $residentRecords = MedicationAdministration::where('resident_id', $residentId)->count();
                $this->info("  Total administration records for resident {$residentId}: {$residentRecords}");
                $residentMissed = MedicationAdministration::where('resident_id', $residentId)->where('status', 'missed')->count();
                $this->info("  Missed records for resident {$residentId}: {$residentMissed}\n");
                
                // Check medications for this resident
                $residentMeds = Medication::where('resident_id', $residentId)->get();
                $this->info("  Medications for resident {$residentId}: {$residentMeds->count()}");
                foreach ($residentMeds as $med) {
                    $this->line("    - ID {$med->id}: {$med->name} (Active: " . ($med->is_active ? 'Yes' : 'No') . ")");
                }
                $this->line("");
            } else {
                $this->error("Resident ID {$residentId} NOT FOUND\n");
            }
        }

        // Check combination if both provided
        if ($medicationId && $residentId) {
            $combinedRecords = MedicationAdministration::where('medication_id', $medicationId)
                ->where('resident_id', $residentId)
                ->count();
            $this->info("Records for medication {$medicationId} + resident {$residentId}: {$combinedRecords}\n");
        }

        // Check recent missed records (last 10)
        $this->info("Recent missed records (last 10):");
        $recentMissed = MedicationAdministration::where('status', 'missed')
            ->orderBy('administered_at', 'desc')
            ->limit(10)
            ->get(['id', 'medication_id', 'resident_id', 'administered_at', 'status']);
        
        foreach ($recentMissed as $record) {
            $med = Medication::find($record->medication_id);
            $resident = Resident::find($record->resident_id);
            $medName = $med ? $med->name : 'Unknown';
            $residentFirstName = $resident ? $resident->first_name : 'Unknown';
            $residentLastName = $resident ? $resident->last_name : '';
            $this->line("  ID {$record->id}: Med {$record->medication_id} ({$medName}) - Resident {$record->resident_id} ({$residentFirstName} {$residentLastName}) - {$record->administered_at}");
        }

        $this->info("\n=== End of Diagnostic ===");

        return 0;
    }
}
