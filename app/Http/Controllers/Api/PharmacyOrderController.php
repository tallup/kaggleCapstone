<?php

namespace App\Http\Controllers\Api;

use App\Constants\Modules;
use App\Http\Controllers\Controller;
use App\Models\PharmacyOrder;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PharmacyOrderController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }
        $query = PharmacyOrder::with(['branch', 'supplier', 'orderedBy', 'receivedBy', 'items.drug'])
            ->withCount('items');
        
        // Apply facility filtering (FacilityScope handles this, but we ensure it's applied)
        $this->applyFacilityFilter($query);
        
        $user = $request->user();
        $isCaregiver = $user && in_array($user->role, ['caregiver', 'care_giver', 'nurse']);
        
        if ($isCaregiver && $user->assigned_branch_id) {
            $query->where('branch_id', $user->assigned_branch_id);
        }
        
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }
        
        if ($request->has('supplier_id')) {
            $query->where('supplier_id', $request->get('supplier_id'));
        }
        
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }
        
        if ($request->has('from_date')) {
            $query->whereDate('order_date', '>=', $request->get('from_date'));
        }
        
        if ($request->has('to_date')) {
            $query->whereDate('order_date', '<=', $request->get('to_date'));
        }
        
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  });
            });
        }
        
        $perPage = (int) $request->get('per_page', 50);
        $perPage = max(1, min(100, $perPage));
        $orders = $query->orderBy('order_date', 'desc')->paginate($perPage);
        
        return response()->json($orders);
    }
    
    public function store(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'supplier_id' => 'required|exists:pharmacy_suppliers,id',
            'status' => 'required|in:draft,pending,confirmed,partially_received,received,cancelled',
            'order_date' => 'required|date',
            'expected_delivery_date' => 'nullable|date',
            'subtotal' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'shipping' => 'nullable|numeric|min:0',
            'total' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.drug_id' => 'required|exists:drugs,id',
            'items.*.quantity_ordered' => 'nullable|integer|min:0',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0|max:100',
            'items.*.notes' => 'nullable|string',
        ]);
        
        // Verify facility access for branch and supplier
        $user = auth()->user();
        if ($user && $user->role !== 'super_admin') {
            $facility = null;
            try {
                $facility = app()->bound('facility') ? app('facility') : null;
            } catch (\Exception $e) {
                $facility = null;
            }
            
            if (!$facility && $user->facility_id) {
                $facility = \App\Models\Facility::find($user->facility_id);
            }
            
            if ($facility) {
                // Verify branch belongs to facility
                $branch = \App\Models\Branch::find($validated['branch_id']);
                if (!$branch || $branch->facility_id !== $facility->id) {
                    return response()->json([
                        'message' => 'The selected branch does not belong to your facility.',
                    ], 403);
                }
                
                // Verify supplier belongs to facility (through creator or orders)
                $supplier = \App\Models\PharmacySupplier::find($validated['supplier_id']);
                if ($supplier) {
                    $hasAccess = ($supplier->createdBy && $supplier->createdBy->facility_id === $facility->id) ||
                                 $supplier->orders()->whereHas('branch', function ($q) use ($facility) {
                                     $q->where('facility_id', $facility->id);
                                 })->exists();
                    
                    if (!$hasAccess) {
                        return response()->json([
                            'message' => 'The selected supplier does not belong to your facility.',
                        ], 403);
                    }
                }
            }
        }
        
        try {
            return DB::transaction(function () use ($validated) {
                $validated['ordered_by'] = auth()->id();
                $items = $validated['items'];
                unset($validated['items']);
                
                $order = PharmacyOrder::create($validated);
                
                foreach ($items as $itemData) {
                    $item = $order->items()->create($itemData);
                    $item->calculateLineTotal();
                    $item->save();
                }
                
                $order->calculateTotal();
                $order->save();
                
                return response()->json($order->load(['branch', 'supplier', 'orderedBy', 'items.drug']), 201);
            });
        } catch (\Exception $e) {
            \Log::error('Error creating pharmacy order: ' . $e->getMessage(), [
                'exception' => $e,
                'trace' => $e->getTraceAsString(),
            ]);
            
            return response()->json([
                'message' => 'Failed to create order. Please try again.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
    
    public function show(string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $order = PharmacyOrder::with(['branch', 'supplier', 'orderedBy', 'receivedBy', 'items.drug', 'transactions'])
            ->withCount('items')
            ->findOrFail($id);
        
        // Verify facility access for non-super admins
        if (!$this->checkFacilityAccess($order)) {
            return response()->json(['message' => 'Order not found'], 404);
        }
        
        return response()->json($order);
    }
    
    public function update(Request $request, string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $order = PharmacyOrder::findOrFail($id);
        
        // Verify facility access for non-super admins
        if (!$this->checkFacilityAccess($order)) {
            return response()->json(['message' => 'Order not found'], 404);
        }
        
        $validated = $request->validate([
            'branch_id' => 'sometimes|exists:branches,id',
            'supplier_id' => 'sometimes|exists:pharmacy_suppliers,id',
            'status' => 'sometimes|in:draft,pending,confirmed,partially_received,received,cancelled',
            'order_date' => 'sometimes|date',
            'expected_delivery_date' => 'nullable|date',
            'received_date' => 'nullable|date',
            'subtotal' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'shipping' => 'nullable|numeric|min:0',
            'total' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'received_by' => 'nullable|exists:users,id',
        ]);
        
        if (isset($validated['status']) && $validated['status'] === 'received' && !$order->received_date) {
            $validated['received_date'] = now();
            $validated['received_by'] = auth()->id();
        }
        
        $order->update($validated);
        $order->calculateTotal();
        $order->save();
        
        return response()->json($order->load(['branch', 'supplier', 'orderedBy', 'receivedBy', 'items.drug']));
    }
    
    public function destroy(string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $order = PharmacyOrder::findOrFail($id);
        
        // Verify facility access for non-super admins
        if (!$this->checkFacilityAccess($order)) {
            return response()->json(['message' => 'Order not found'], 404);
        }
        
        if (!in_array($order->status, ['draft', 'cancelled'])) {
            return response()->json([
                'message' => 'Can only delete draft or cancelled orders.',
            ], 422);
        }
        
        $order->delete();
        
        return response()->json(['message' => 'Order deleted successfully']);
    }
    
    public function markAsReceived(Request $request, string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $order = PharmacyOrder::with('items')->findOrFail($id);
        
        // Verify facility access for non-super admins
        if (!$this->checkFacilityAccess($order)) {
            return response()->json(['message' => 'Order not found'], 404);
        }
        
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:pharmacy_order_items,id',
            'items.*.quantity_received' => 'required|integer|min:0',
        ]);
        
        return DB::transaction(function () use ($order, $validated) {
            $allReceived = true;
            
            foreach ($validated['items'] as $itemData) {
                $item = $order->items()->findOrFail($itemData['id']);
                $item->quantity_received = $itemData['quantity_received'];
                $item->save();
                
                if ($item->quantity_received < $item->quantity_ordered) {
                    $allReceived = false;
                }
            }
            
            if ($allReceived) {
                $order->markAsReceived(auth()->id());
            } else {
                $order->status = 'partially_received';
                $order->save();
            }
            
            return response()->json($order->load(['branch', 'supplier', 'items.drug']));
        });
    }
}
