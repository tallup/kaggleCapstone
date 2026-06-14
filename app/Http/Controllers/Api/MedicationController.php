<?php

namespace App\Http\Controllers\Api;

use App\Models\Medication;
use App\Models\MedicationAdministration;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MedicationController extends BaseApiController
{
    protected $medicationService;

    public function __construct(\App\Services\MedicationService $medicationService)
    {
        $this->medicationService = $medicationService;
    }

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
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('instructions', 'like', "%{$search}%")
                    ->orWhereHas('resident', function ($q) use ($search) {
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

        // Administration-specific logic: Sorting and Visibility
        if ($request->has('for_administration') && $request->get('for_administration') === 'true') {
            // The `administered_at` column stores Pacific time as a bare datetime string (Y-m-d H:i:s)
            // without timezone info. Use plain date strings so the comparison matches stored values.
            $tz = config('app.timezone');
            $adminDateStr = Carbon::now($tz)->toDateString();
            if ($request->filled('administration_date')) {
                $request->validate([
                    'administration_date' => ['required', 'date_format:Y-m-d'],
                ]);
                $adminDateStr = Carbon::createFromFormat('Y-m-d', $request->string('administration_date')->toString(), $tz)
                    ->toDateString();
            }
            $dayStart = $adminDateStr.' 00:00:00';
            $dayEnd = $adminDateStr.' 23:59:59';
            $query->with(['administrations' => function ($q) use ($dayStart, $dayEnd) {
                $q->whereBetween('administered_at', [$dayStart, $dayEnd])
                    ->whereIn('status', ['completed', 'refused', 'hospital_admission', 'pharmacy_administration_confirm']);
            }]);

            $medications = $query->get();
            $medications = $this->medicationService->getMedicationsWithStatus($medications, $adminDateStr);

            // Filter out fully administered meds if requested
            if ($request->get('hide_administered') === 'true') {
                $medications = $medications->filter(function ($med) {
                    return ! $med->is_fully_administered_today;
                })->values();
            }

            // Custom Sorting:
            $medications = $this->medicationService->sortMedicationsByPriority($medications);

            // Simple pagination for the collection
            $perPage = min(100, max(1, (int) $request->get('per_page', 20)));
            $page = (int) $request->get('page', 1);
            $paginatedItems = $medications->forPage($page, $perPage)->values();

            $result = new \Illuminate\Pagination\LengthAwarePaginator(
                $paginatedItems,
                $medications->count(),
                $perPage,
                $page,
                ['path' => $request->url(), 'query' => $request->query()]
            );

            return response()->json($result);
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 20)));

        $medications = $query->orderBy('start_date', 'desc')
            ->paginate($perPage);

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
        $user = auth()->user();

        // Allow administrators and super admins to create medications even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('create_medications')) {
                return $error;
            }
        }

        $validated = $request->validate([
            'resident_id' => 'required|exists:residents,id',
            'branch_id' => 'nullable|exists:branches,id',
            'drug_id' => 'nullable|exists:drugs,id',
            'name' => 'nullable|string|max:255',
            'instructions' => 'nullable|string|max:255',
            'quantity' => 'nullable|string|max:255',
            'diagnosis' => 'nullable|string',
            'prescription_date' => 'nullable|date_format:Y-m-d',
            'start_date' => 'required|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
            'time_1' => 'nullable',
            'time_2' => 'nullable',
            'time_3' => 'nullable',
            'time_4' => 'nullable',
        ]);

        // If branch_id not provided, infer from resident
        if (! isset($validated['branch_id'])) {
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if ($resident) {
                $validated['branch_id'] = $resident->branch_id;
            }
        }

        // If user is a caregiver, ensure they can only create medications for residents in their assigned branch
        if (auth()->user()->hasRole('caregiver')) {
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if (! $resident || $resident->branch_id !== auth()->user()->assigned_branch_id) {
                return response()->json([
                    'message' => 'Unauthorized: You can only create medications for residents in your assigned branch.',
                    'errors' => ['resident_id' => ['You can only create medications for residents in your assigned branch.']],
                ], 403);
            }
            // Force branch_id to caregiver's assigned branch
            $validated['branch_id'] = auth()->user()->assigned_branch_id;
        }

        // Auto-generate name from drug if drug_id is provided but name is not
        if (isset($validated['drug_id']) && ! isset($validated['name'])) {
            $drug = \App\Models\Drug::find($validated['drug_id']);
            if ($drug) {
                $validated['name'] = $drug->name;
            }
        }

        $validated['created_by'] = auth()->id();
        if (! isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $medication = Medication::create($validated);

        return response()->json($medication->load(['resident', 'drug', 'branch']), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = auth()->user();

        // Allow administrators and super admins to edit medications even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');

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
            'prescription_date' => 'nullable|date_format:Y-m-d',
            'start_date' => 'sometimes|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
            'time_1' => 'nullable',
            'time_2' => 'nullable',
            'time_3' => 'nullable',
            'time_4' => 'nullable',
        ]);

        // Permission: full edit requires edit_medications; deactivating only (is_active false) allows edit OR delete permission
        if (! $isSuperAdmin && ! $isAdmin) {
            $onlyDeactivate = count($validated) === 1
                && array_key_exists('is_active', $validated)
                && $validated['is_active'] === false;

            if ($onlyDeactivate) {
                if (! $user->hasPermission('delete_medications') && ! $user->hasPermission('edit_medications')) {
                    return $this->error('Unauthorized. You do not have permission to perform this action.', 403);
                }
            } elseif ($error = $this->requirePermission('edit_medications')) {
                return $error;
            }
        }

        // If user is a caregiver and trying to change resident_id, validate it's in their branch
        if (auth()->user()->hasRole('caregiver') && isset($validated['resident_id'])) {
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if (! $resident || $resident->branch_id !== auth()->user()->assigned_branch_id) {
                return response()->json([
                    'message' => 'Unauthorized: You can only update medications for residents in your assigned branch.',
                    'errors' => ['resident_id' => ['You can only update medications for residents in your assigned branch.']],
                ], 403);
            }
            // Force branch_id to caregiver's assigned branch
            $validated['branch_id'] = auth()->user()->assigned_branch_id;
        }

        // Auto-generate name from drug if drug_id is provided but name is not
        if (isset($validated['drug_id']) && ! isset($validated['name'])) {
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
        $user = auth()->user();

        // Allow administrators and super admins to delete medications even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && ($user->role === 'administrator' || $user->role === 'admin');

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('delete_medications')) {
                return $error;
            }
        }

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

        $perPage = min(100, max(1, (int) $request->get('per_page', 15)));
        $administrations = $query->orderBy('administered_at', 'desc')
            ->paginate($perPage);

        return response()->json($administrations);
    }
}
