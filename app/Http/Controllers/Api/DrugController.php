<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Drug;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DrugController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Drug::query();

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
        $drug = Drug::findOrFail($id);
        $drug->delete();
        return response()->json(['message' => 'Drug deleted successfully']);
    }
}

