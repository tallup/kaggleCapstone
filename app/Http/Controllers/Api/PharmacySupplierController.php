<?php

namespace App\Http\Controllers\Api;

use App\Constants\Modules;
use App\Http\Controllers\Controller;
use App\Models\PharmacySupplier;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PharmacySupplierController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }
        $query = PharmacySupplier::with(['createdBy'])->withCount('orders');
        
        // Apply facility filtering for non-super admins
        $user = $request->user();
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
                // Filter suppliers by those created by users in the facility OR
                // suppliers that have orders for branches in the facility
                $query->where(function ($q) use ($facility) {
                    $q->whereHas('createdBy', function ($q) use ($facility) {
                        $q->where('facility_id', $facility->id);
                    })->orWhereHas('orders.branch', function ($q) use ($facility) {
                        $q->where('facility_id', $facility->id);
                    });
                });
            } else {
                // User has no facility, return empty results
                return response()->json([
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $request->get('per_page', 50),
                    'total' => 0
                ]);
            }
        }
        
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }
        
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('contact_person', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }
        
        $perPage = (int) $request->get('per_page', 50);
        $perPage = max(1, min(100, $perPage));
        $suppliers = $query->orderBy('name')->paginate($perPage);
        
        return response()->json($suppliers);
    }
    
    public function store(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);
        
        $validated['created_by'] = auth()->id();
        $validated['is_active'] = $validated['is_active'] ?? true;
        
        $supplier = PharmacySupplier::create($validated);
        
        return response()->json($supplier->load(['createdBy']), 201);
    }
    
    public function show(string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $supplier = PharmacySupplier::with(['createdBy', 'orders'])
            ->withCount('orders')
            ->findOrFail($id);
        
        // Verify facility access for non-super admins
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
                $hasAccess = ($supplier->createdBy && $supplier->createdBy->facility_id === $facility->id) ||
                             $supplier->orders()->whereHas('branch', function ($q) use ($facility) {
                                 $q->where('facility_id', $facility->id);
                             })->exists();
                
                if (!$hasAccess) {
                    return response()->json(['message' => 'Supplier not found'], 404);
                }
            } else {
                return response()->json(['message' => 'Supplier not found'], 404);
            }
        }
        
        return response()->json($supplier);
    }
    
    public function update(Request $request, string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $supplier = PharmacySupplier::findOrFail($id);
        
        // Verify facility access for non-super admins
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
                $hasAccess = ($supplier->createdBy && $supplier->createdBy->facility_id === $facility->id) ||
                             $supplier->orders()->whereHas('branch', function ($q) use ($facility) {
                                 $q->where('facility_id', $facility->id);
                             })->exists();
                
                if (!$hasAccess) {
                    return response()->json(['message' => 'Supplier not found'], 404);
                }
            } else {
                return response()->json(['message' => 'Supplier not found'], 404);
            }
        }
        
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'sometimes|email|max:255',
            'address' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);
        
        $supplier->update($validated);
        
        return response()->json($supplier->load(['createdBy']));
    }
    
    public function destroy(string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $supplier = PharmacySupplier::findOrFail($id);
        
        // Verify facility access for non-super admins
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
                $hasAccess = ($supplier->createdBy && $supplier->createdBy->facility_id === $facility->id) ||
                             $supplier->orders()->whereHas('branch', function ($q) use ($facility) {
                                 $q->where('facility_id', $facility->id);
                             })->exists();
                
                if (!$hasAccess) {
                    return response()->json(['message' => 'Supplier not found'], 404);
                }
            } else {
                return response()->json(['message' => 'Supplier not found'], 404);
            }
        }

        // Soft delete: supplier row stays for FK integrity (orders/stock lots may still reference it).
        $supplier->delete();
        
        return response()->json(['message' => 'Supplier deleted successfully']);
    }
}
