<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medication;
use App\Models\MedicationAdministration;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MedicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Medication::with(['resident', 'drug', 'branch', 'createdBy']);

        // Filter by active status
        if ($request->has('active_only') && $request->get('active_only') === 'true') {
            $query->where('is_active', true);
        }

        // Filter by resident
        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        // Filter by branch
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('instructions', 'like', "%{$search}%")
                  ->orWhereHas('resident', function($q) use ($search) {
                      $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                  });
            });
        }

        // If user is a caregiver, show medications for residents in their assigned branch only
        if (auth()->user()->hasRole('caregiver')) {
            $query->whereHas('resident', function ($q) {
                $q->where('branch_id', auth()->user()->assigned_branch_id);
            });
        }

        $medications = $query->orderBy('start_date', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($medications);
    }

    public function show($id): JsonResponse
    {
        $medication = Medication::with(['resident', 'drug', 'branch', 'createdBy', 'administrations'])
            ->findOrFail($id);

        return response()->json($medication);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'resident_id' => 'required|exists:residents,id',
            'branch_id' => 'nullable|exists:branches,id',
            'drug_id' => 'nullable|exists:drugs,id',
            'name' => 'nullable|string|max:255',
            'instructions' => 'nullable|string|max:255',
            'quantity' => 'nullable|string|max:255',
            'diagnosis' => 'nullable|string',
            'prescription_date' => 'nullable|date',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
            'time_1' => 'nullable',
            'time_2' => 'nullable',
            'time_3' => 'nullable',
            'time_4' => 'nullable',
        ]);

        // If branch_id not provided, infer from resident
        if (!isset($validated['branch_id'])) {
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if ($resident) {
                $validated['branch_id'] = $resident->branch_id;
            }
        }

        // If user is a caregiver, ensure they can only create medications for residents in their assigned branch
        if (auth()->user()->hasRole('caregiver')) {
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if (!$resident || $resident->branch_id !== auth()->user()->assigned_branch_id) {
                return response()->json([
                    'message' => 'Unauthorized: You can only create medications for residents in your assigned branch.',
                    'errors' => ['resident_id' => ['You can only create medications for residents in your assigned branch.']]
                ], 403);
            }
            // Force branch_id to caregiver's assigned branch
            $validated['branch_id'] = auth()->user()->assigned_branch_id;
        }

        // Auto-generate name from drug if drug_id is provided but name is not
        if (isset($validated['drug_id']) && !isset($validated['name'])) {
            $drug = \App\Models\Drug::find($validated['drug_id']);
            if ($drug) {
                $validated['name'] = $drug->name;
            }
        }

        $validated['created_by'] = auth()->id();
        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $medication = Medication::create($validated);

        return response()->json($medication->load(['resident', 'drug', 'branch']), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $medication = Medication::with('resident')->findOrFail($id);

        // If user is a caregiver, ensure they can only update medications for residents in their assigned branch
        if (auth()->user()->hasRole('caregiver')) {
            if ($medication->resident->branch_id !== auth()->user()->assigned_branch_id) {
                return response()->json([
                    'message' => 'Unauthorized: You can only update medications for residents in your assigned branch.',
                ], 403);
            }
        }

        $validated = $request->validate([
            'resident_id' => 'sometimes|exists:residents,id',
            'branch_id' => 'nullable|exists:branches,id',
            'drug_id' => 'nullable|exists:drugs,id',
            'name' => 'nullable|string|max:255',
            'instructions' => 'nullable|string|max:255',
            'quantity' => 'nullable|string|max:255',
            'diagnosis' => 'nullable|string',
            'prescription_date' => 'nullable|date',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
            'time_1' => 'nullable',
            'time_2' => 'nullable',
            'time_3' => 'nullable',
            'time_4' => 'nullable',
        ]);

        // If user is a caregiver and trying to change resident_id, validate it's in their branch
        if (auth()->user()->hasRole('caregiver') && isset($validated['resident_id'])) {
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if (!$resident || $resident->branch_id !== auth()->user()->assigned_branch_id) {
                return response()->json([
                    'message' => 'Unauthorized: You can only update medications for residents in your assigned branch.',
                    'errors' => ['resident_id' => ['You can only update medications for residents in your assigned branch.']]
                ], 403);
            }
            // Force branch_id to caregiver's assigned branch
            $validated['branch_id'] = auth()->user()->assigned_branch_id;
        }

        // Auto-generate name from drug if drug_id is provided but name is not
        if (isset($validated['drug_id']) && !isset($validated['name'])) {
            $drug = \App\Models\Drug::find($validated['drug_id']);
            if ($drug) {
                $validated['name'] = $drug->name;
            }
        }

        $medication->update($validated);

        return response()->json($medication->load(['resident', 'drug', 'branch']));
    }

    public function destroy($id): JsonResponse
    {
        $medication = Medication::findOrFail($id);
        $medication->delete();

        return response()->json(['message' => 'Medication deleted successfully']);
    }

    public function administrations(Request $request): JsonResponse
    {
        $query = MedicationAdministration::with(['medication', 'resident', 'administeredBy']);

        // Filter by date
        if ($request->has('date_from')) {
            $query->where('administered_at', '>=', $request->get('date_from'));
        }

        if ($request->has('date_to')) {
            $query->where('administered_at', '<=', $request->get('date_to'));
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        // Filter by resident
        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        $administrations = $query->orderBy('administered_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($administrations);
    }
}

