<?php

/**
 * Diagnostic script to check medication administration records on production
 * Run this via: php check-production-medication-records.php
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\MedicationAdministration;
use App\Models\Medication;
use App\Models\Resident;

echo "=== Medication Administration Records Diagnostic ===\n\n";

// Check total records
$totalRecords = MedicationAdministration::count();
$missedRecords = MedicationAdministration::where('status', 'missed')->count();
echo "Total administration records: {$totalRecords}\n";
echo "Total missed records: {$missedRecords}\n\n";

// Check specific medication ID 17
$medication17 = Medication::find(17);
if ($medication17) {
    echo "Medication ID 17 found:\n";
    echo "  Name: {$medication17->name}\n";
    echo "  Resident ID: {$medication17->resident_id}\n";
    echo "  Branch ID: {$medication17->branch_id}\n";
    echo "  Active: " . ($medication17->is_active ? 'Yes' : 'No') . "\n";
    $startDate = $medication17->start_date ? $medication17->start_date : 'null';
    $endDate = $medication17->end_date ? $medication17->end_date : 'null';
    echo "  Start Date: {$startDate}\n";
    echo "  End Date: {$endDate}\n";
    echo "  Times: {$medication17->time_1}, {$medication17->time_2}, {$medication17->time_3}, {$medication17->time_4}\n\n";
    
    $med17Records = MedicationAdministration::where('medication_id', 17)->count();
    echo "  Total administration records for medication 17: {$med17Records}\n";
    $med17Missed = MedicationAdministration::where('medication_id', 17)->where('status', 'missed')->count();
    echo "  Missed records for medication 17: {$med17Missed}\n\n";
} else {
    echo "Medication ID 17 NOT FOUND\n\n";
}

// Check resident ID 32
$resident32 = Resident::find(32);
if ($resident32) {
    echo "Resident ID 32 found:\n";
    echo "  Name: {$resident32->first_name} {$resident32->last_name}\n";
    echo "  Branch ID: {$resident32->branch_id}\n";
    echo "  Active: " . ($resident32->is_active ? 'Yes' : 'No') . "\n\n";
    
    $resident32Records = MedicationAdministration::where('resident_id', 32)->count();
    echo "  Total administration records for resident 32: {$resident32Records}\n";
    $resident32Missed = MedicationAdministration::where('resident_id', 32)->where('status', 'missed')->count();
    echo "  Missed records for resident 32: {$resident32Missed}\n\n";
    
    // Check medications for resident 32
    $resident32Meds = Medication::where('resident_id', 32)->get();
    echo "  Medications for resident 32: {$resident32Meds->count()}\n";
    foreach ($resident32Meds as $med) {
        echo "    - ID {$med->id}: {$med->name} (Active: " . ($med->is_active ? 'Yes' : 'No') . ")\n";
    }
    echo "\n";
} else {
    echo "Resident ID 32 NOT FOUND\n\n";
}

// Check records for medication 17 + resident 32 combination
$combinedRecords = MedicationAdministration::where('medication_id', 17)
    ->where('resident_id', 32)
    ->count();
echo "Records for medication 17 + resident 32: {$combinedRecords}\n\n";

// Check recent missed records (last 10)
echo "Recent missed records (last 10):\n";
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
    echo "  ID {$record->id}: Med {$record->medication_id} ({$medName}) - Resident {$record->resident_id} ({$residentFirstName} {$residentLastName}) - {$record->administered_at}\n";
}

echo "\n=== End of Diagnostic ===\n";
