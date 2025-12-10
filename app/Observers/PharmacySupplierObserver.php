<?php

namespace App\Observers;

use App\Models\PharmacySupplier;
use App\Models\Notification;
use App\Models\User;

class PharmacySupplierObserver
{
    /**
     * Handle the PharmacySupplier "created" event.
     */
    public function created(PharmacySupplier $supplier): void
    {
        $supplier->load('createdBy');

        // Get all administrators and managers for the facility
        $facility = $supplier->createdBy?->facility ?? null;
        if (!$facility) {
            return;
        }

        $admins = User::where('facility_id', $facility->id)
            ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        // Also notify the creator if they're not already in the list
        if ($supplier->createdBy && !$admins->contains('id', $supplier->createdBy->id)) {
            $admins->push($supplier->createdBy);
        }

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'pharmacy_supplier_created',
                'title' => 'New Pharmacy Supplier Added',
                'message' => "New pharmacy supplier '{$supplier->name}' has been added.",
                'icon' => 'building-2',
                'icon_color' => 'text-blue-600',
                'action_url' => '/pharmacy/suppliers',
                'metadata' => [
                    'pharmacy_supplier_id' => $supplier->id,
                    'supplier_name' => $supplier->name,
                ],
            ]);
        }
    }

    /**
     * Handle the PharmacySupplier "updated" event.
     */
    public function updated(PharmacySupplier $supplier): void
    {
        $supplier->load('createdBy');

        $facility = $supplier->createdBy?->facility ?? null;
        if (!$facility) {
            return;
        }

        $admins = User::where('facility_id', $facility->id)
            ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'pharmacy_supplier_updated',
                'title' => 'Pharmacy Supplier Updated',
                'message' => "Pharmacy supplier '{$supplier->name}' has been updated.",
                'icon' => 'edit',
                'icon_color' => 'text-yellow-600',
                'action_url' => '/pharmacy/suppliers',
                'metadata' => [
                    'pharmacy_supplier_id' => $supplier->id,
                    'supplier_name' => $supplier->name,
                ],
            ]);
        }
    }
}


