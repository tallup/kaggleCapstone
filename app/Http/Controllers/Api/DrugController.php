<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Drug;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DrugController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $query = Drug::query();

        // Filter by facility: Show only drugs used in medications or pharmacy inventory within user's facility
        // Super admins see all drugs
        // COMMENTED OUT: This restricts viewing newly created drugs which are not yet used.
        // Users should see the global drug list to be able to add/manage them.
        /*
        if ($user && $user->role !== 'super_admin') {
            if ($user->facility_id) {
                $query->where(function($q) use ($user) {
                    // Drugs used in medications within facility branches
                    $q->whereHas('medications.branch', function($branchQuery) use ($user) {
                        $branchQuery->where('facility_id', $user->facility_id);
                    })
                    // OR drugs in pharmacy inventory within facility branches
                    ->orWhereHas('pharmacyInventory.branch', function($branchQuery) use ($user) {
                        $branchQuery->where('facility_id', $user->facility_id);
                    });
                });
            } else {
                // User has no facility assigned, return empty results
                $query->whereRaw('1 = 0'); // Force empty result
            }
        }
        */

        // Filter by active status
        if ($request->has('active_only') && $request->get('active_only') === 'true') {
            $query->where('is_active', true);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('generic_name', 'like', "%{$search}%");
            });
        }

        $drugs = $query->orderBy('name', 'asc')
            ->paginate($request->get('per_page', 100));

        return response()->json($drugs);
    }

    public function show($id): JsonResponse
    {
        $drug = Drug::findOrFail($id);
        return response()->json($drug);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        
        // Check permission
        if (!$user || !$user->hasPermission('create_drugs')) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to create drugs.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'generic_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'dosage_form' => 'nullable|string|max:255',
            'strength' => 'nullable|string|max:255',
            'indications' => 'nullable|string',
            'contraindications' => 'nullable|string',
            'side_effects' => 'nullable|string',
            'storage_instructions' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $drug = Drug::create($validated);
        return response()->json($drug, 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = auth()->user();
        
        // Check permission
        if (!$user || !$user->hasPermission('edit_drugs')) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to edit drugs.',
            ], 403);
        }

        $drug = Drug::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'generic_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'dosage_form' => 'nullable|string|max:255',
            'strength' => 'nullable|string|max:255',
            'indications' => 'nullable|string',
            'contraindications' => 'nullable|string',
            'side_effects' => 'nullable|string',
            'storage_instructions' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $drug->update($validated);
        return response()->json($drug);
    }

    public function destroy($id): JsonResponse
    {
        $user = auth()->user();
        
        // Check permission
        if (!$user || !$user->hasPermission('delete_drugs')) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to delete drugs.',
            ], 403);
        }

        $drug = Drug::findOrFail($id);
        $drug->delete();
        return response()->json(['message' => 'Drug deleted successfully']);
    }
}

