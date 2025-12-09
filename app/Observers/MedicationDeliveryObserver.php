<?php

namespace App\Observers;

use App\Models\MedicationDelivery;
use App\Models\Notification;
use App\Models\User;

class MedicationDeliveryObserver
{
    /**
     * Handle the MedicationDelivery "created" event.
     */
    public function created(MedicationDelivery $delivery): void
    {
        $delivery->load(['branch', 'resident', 'medication', 'receivedBy']);

        // Get all administrators and managers for the facility
        $facility = $delivery->branch?->facility ?? null;
        if (!$facility) {
            return;
        }

        $admins = User::where('facility_id', $facility->id)
            ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        // Also notify the person who received it if they're not already in the list
        if ($delivery->receivedBy && !$admins->contains('id', $delivery->receivedBy->id)) {
            $admins->push($delivery->receivedBy);
        }

        $pharmacyName = $delivery->pharmacy_name ?? 'Unknown Pharmacy';
        $branchName = $delivery->branch?->name ?? '';
        $deliveryType = $delivery->delivery_type === 'individual' ? 'Individual' : 'Batch';
        
        $message = "New {$deliveryType} medication delivery from {$pharmacyName} received at {$branchName}.";
        
        if ($delivery->delivery_type === 'individual' && $delivery->resident) {
            $residentName = trim(($delivery->resident->first_name ?? '') . ' ' . ($delivery->resident->last_name ?? ''));
            $medicationName = $delivery->medication?->name ?? 'Unknown Medication';
            $message = "Medication delivery for {$residentName}: {$medicationName} ({$delivery->quantity_received}) from {$pharmacyName}.";
        }

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'medication_delivery_received',
                'title' => 'Medication Delivery Received',
                'message' => $message,
                'icon' => 'truck',
                'icon_color' => 'text-green-600',
                'action_url' => '/medication-deliveries',
                'metadata' => [
                    'medication_delivery_id' => $delivery->id,
                    'delivery_type' => $delivery->delivery_type,
                    'resident_id' => $delivery->resident_id,
                    'pharmacy_name' => $pharmacyName,
                ],
            ]);
        }
    }
}

