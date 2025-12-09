<?php

namespace App\Observers;

use App\Models\PharmacyOrder;
use App\Models\Notification;
use App\Models\User;

class PharmacyOrderObserver
{
    /**
     * Handle the PharmacyOrder "created" event.
     */
    public function created(PharmacyOrder $order): void
    {
        $order->load(['branch', 'supplier', 'orderedBy']);

        // Get all administrators and managers for the facility
        $facility = $order->branch?->facility ?? null;
        if (!$facility) {
            return;
        }

        $admins = User::where('facility_id', $facility->id)
            ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        // Also notify the creator if they're not already in the list
        if ($order->orderedBy && !$admins->contains('id', $order->orderedBy->id)) {
            $admins->push($order->orderedBy);
        }

        $total = number_format($order->total ?? 0, 2);
        $supplierName = $order->supplier?->name ?? 'Unknown Supplier';
        $branchName = $order->branch?->name ?? '';

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'pharmacy_order_created',
                'title' => 'New Pharmacy Order Created',
                'message' => "New pharmacy order {$order->order_number} for \${$total} from {$supplierName} ({$branchName}) has been created.",
                'icon' => 'shopping-cart',
                'icon_color' => 'text-blue-600',
                'action_url' => '/pharmacy/orders',
                'metadata' => [
                    'pharmacy_order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'total' => $order->total,
                    'supplier_id' => $order->supplier_id,
                ],
            ]);
        }
    }

    /**
     * Handle the PharmacyOrder "updated" event.
     */
    public function updated(PharmacyOrder $order): void
    {
        // Only notify on status changes
        if (!$order->wasChanged('status')) {
            return;
        }

        $order->load(['branch', 'supplier']);

        $facility = $order->branch?->facility ?? null;
        if (!$facility) {
            return;
        }

        $admins = User::where('facility_id', $facility->id)
            ->whereIn('role', ['administrator', 'admin', 'manager', 'super_admin'])
            ->where('is_active', true)
            ->get();

        $statusLabels = [
            'draft' => 'Draft',
            'pending' => 'Pending',
            'confirmed' => 'Confirmed',
            'partially_received' => 'Partially Received',
            'received' => 'Received',
            'cancelled' => 'Cancelled',
        ];

        $newStatus = $statusLabels[$order->status] ?? $order->status;
        $supplierName = $order->supplier?->name ?? 'Unknown Supplier';

        foreach ($admins as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'pharmacy_order_status_changed',
                'title' => 'Pharmacy Order Status Updated',
                'message' => "Pharmacy order {$order->order_number} from {$supplierName} status changed to {$newStatus}.",
                'icon' => 'package',
                'icon_color' => 'text-yellow-600',
                'action_url' => '/pharmacy/orders',
                'metadata' => [
                    'pharmacy_order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                ],
            ]);
        }
    }
}

