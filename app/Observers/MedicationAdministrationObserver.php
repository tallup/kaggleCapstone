<?php

namespace App\Observers;

use App\Events\MedicationAdministrationCreated;
use App\Models\MedicationAdministration;
use App\Models\Notification;
use App\Models\PharmacyInventory;
use App\Models\PharmacyStockTransaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MedicationAdministrationObserver
{
    /**
     * Handle the MedicationAdministration "created" event.
     */
    public function created(MedicationAdministration $administration): void
    {
        // Load relationships
        $administration->load(['resident.assignments.caregiver', 'resident.branch.facility', 'medication.drug', 'administeredBy']);

        // Reduce pharmacy inventory when medication is administered
        if ($administration->status === 'completed') {
            $this->reduceInventory($administration);
        }

        // Only create notification for completed administrations
        if ($administration->status !== 'completed') {
            return;
        }

        // Get assigned caregivers for this resident
        $caregivers = $administration->resident?->assignments
            ->where('is_active', true)
            ->pluck('caregiver')
            ->filter();

        // If no caregivers, notify all admins/managers
        if ($caregivers->isEmpty()) {
            $caregivers = User::whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
                ->where('is_active', true)
                ->get();
        }

        // Also notify the person who administered it (if different from assigned caregivers)
        $administeredBy = $administration->administeredBy;
        if ($administeredBy) {
            $alreadyIncluded = $caregivers->contains(function ($caregiver) use ($administeredBy) {
                return $caregiver->id === $administeredBy->id;
            });
            if (! $alreadyIncluded) {
                $caregivers->push($administeredBy);
            }
        }

        foreach ($caregivers as $caregiver) {
            $medicationName = $administration->medication->drug?->name ?? $administration->medication->name ?? 'Medication';
            $residentName = trim(($administration->resident->first_name ?? '').' '.($administration->resident->last_name ?? ''));
            $administeredByName = trim(($administration->administeredBy->first_name ?? '').' '.($administration->administeredBy->last_name ?? ''));

            // Format administered time
            $administeredAt = $administration->administered_at
                ? Carbon::parse($administration->administered_at)->format('M d, Y g:i A')
                : 'TBD';

            // Build message
            $message = "{$medicationName} was administered to {$residentName}";
            if ($administeredByName) {
                $message .= " by {$administeredByName}";
            }
            $message .= " on {$administeredAt}";

            if ($administration->dosage_given) {
                $message .= " (Dosage: {$administration->dosage_given})";
            }

            Notification::create([
                'user_id' => $caregiver->id,
                'facility_id' => $administration->resident?->branch?->facility_id ?? null,
                'branch_id' => $administration->branch_id ?? $administration->resident?->branch_id ?? null,
                'type' => 'medication_administered',
                'title' => 'Medication Administered',
                'message' => $message,
                'icon' => 'pill',
                'icon_color' => 'text-green-600',
                'action_url' => '/medications',
                'metadata' => [
                    'medication_administration_id' => $administration->id,
                    'medication_id' => $administration->medication_id,
                    'resident_id' => $administration->resident_id,
                    'administered_by' => $administration->administered_by,
                ],
            ]);
        }

        // Broadcast real-time event
        event(new MedicationAdministrationCreated($administration));
    }

    /**
     * Handle the MedicationAdministration "updated" event.
     *
     * Triggered when an administrator uses the late-mark endpoint to flip a missed dose to
     * completed. In that case the dose was never previously dispensed, so pharmacy inventory
     * still needs to drop now. We intentionally do NOT send the standard "X was administered"
     * notification here — it would be misleading wording for a backdated entry.
     */
    public function updated(MedicationAdministration $administration): void
    {
        $originalStatus = $administration->getOriginal('status');
        $statusChanged = $originalStatus !== $administration->status;
        $becameCompleted = $statusChanged && $administration->status === 'completed';

        if (! $becameCompleted) {
            return;
        }

        // Only reduce inventory if the prior status had not already consumed stock.
        if ($originalStatus === 'completed') {
            return;
        }

        $administration->loadMissing(['medication.drug', 'resident.branch.facility']);
        $this->reduceInventory($administration);
    }

    /**
     * Reduce pharmacy inventory when medication is administered
     */
    private function reduceInventory(MedicationAdministration $administration): void
    {
        try {
            // Check if medication has a drug_id
            if (! $administration->medication || ! $administration->medication->drug_id) {
                Log::debug('Medication administration has no drug_id, skipping inventory reduction', [
                    'administration_id' => $administration->id,
                    'medication_id' => $administration->medication_id,
                ]);

                return;
            }

            $drugId = $administration->medication->drug_id;
            $branchId = $administration->branch_id;
            $performedBy = $administration->administered_by;

            if (! $branchId) {
                Log::warning('Medication administration has no branch_id, skipping inventory reduction', [
                    'administration_id' => $administration->id,
                ]);

                return;
            }

            // Find or create pharmacy inventory for this drug and branch
            $inventory = PharmacyInventory::withoutGlobalScopes()
                ->where('drug_id', $drugId)
                ->where('branch_id', $branchId)
                ->first();

            if (! $inventory) {
                Log::info('No pharmacy inventory found for drug and branch, skipping inventory reduction', [
                    'drug_id' => $drugId,
                    'branch_id' => $branchId,
                    'administration_id' => $administration->id,
                ]);

                return;
            }

            // Calculate quantity to reduce (default to 1, or parse from dosage_given if available)
            $quantityToReduce = 1;
            if ($administration->dosage_given) {
                // Try to extract numeric value from dosage_given (e.g., "2 tablets" -> 2)
                if (preg_match('/(\d+)/', $administration->dosage_given, $matches)) {
                    $quantityToReduce = (int) $matches[1];
                }
            }

            // Use database transaction to ensure consistency
            DB::transaction(function () use ($inventory, $quantityToReduce, $drugId, $branchId, $performedBy, $administration) {
                // Lock the inventory row to prevent race conditions
                $inventory = PharmacyInventory::withoutGlobalScopes()
                    ->where('id', $inventory->id)
                    ->lockForUpdate()
                    ->first();

                if (! $inventory) {
                    return;
                }

                $quantityBefore = $inventory->quantity;
                $quantityAfter = max(0, $quantityBefore - $quantityToReduce); // Don't go below 0

                // Update inventory
                $inventory->quantity = $quantityAfter;
                $inventory->last_dispensed_date = now()->toDateString();
                $inventory->save();

                // Create stock transaction record
                PharmacyStockTransaction::create([
                    'pharmacy_inventory_id' => $inventory->id,
                    'branch_id' => $branchId,
                    'drug_id' => $drugId,
                    'transaction_type' => 'dispensed',
                    'quantity_change' => -$quantityToReduce, // Negative for dispensed
                    'quantity_before' => $quantityBefore,
                    'quantity_after' => $quantityAfter,
                    'unit_cost' => $inventory->unit_cost,
                    'performed_by' => $performedBy,
                    'reference_number' => 'MA-'.$administration->id, // Medication Administration reference
                    'notes' => "Medication administered to resident ID: {$administration->resident_id}",
                    'transaction_date' => $administration->administered_at ?? now(),
                ]);

                Log::info('Pharmacy inventory reduced for medication administration', [
                    'administration_id' => $administration->id,
                    'drug_id' => $drugId,
                    'branch_id' => $branchId,
                    'quantity_reduced' => $quantityToReduce,
                    'quantity_before' => $quantityBefore,
                    'quantity_after' => $quantityAfter,
                ]);
            });
        } catch (\Exception $e) {
            // Log error but don't fail the medication administration
            Log::error('Failed to reduce pharmacy inventory for medication administration', [
                'administration_id' => $administration->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
