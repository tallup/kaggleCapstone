<?php

namespace App\Http\Controllers\Api;

use App\Constants\Modules;
use App\Models\Branch;
use App\Models\MedicationDelivery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MedicationDeliveryController extends BaseApiController
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $query = MedicationDelivery::with(['branch', 'resident', 'medication', 'receivedBy']);
        $user = $request->user();
        $isCaregiver = $user && in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse']);

        // Facility scoping
        $this->applyFacilityFilter($query, $user);

        // Filter by branch for caregivers
        if ($isCaregiver && $user->assigned_branch_id) {
            $query->where('branch_id', $user->assigned_branch_id);
        }

        // Filter by branch
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        // Filter by resident (e.g. Medication Hub per-resident tab)
        if ($request->filled('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        // Filter by delivery type
        if ($request->has('delivery_type')) {
            $query->where('delivery_type', $request->get('delivery_type'));
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        // Filter by date range
        if ($request->has('from_date')) {
            $query->whereDate('received_date', '>=', $request->get('from_date'));
        }
        if ($request->has('to_date')) {
            $query->whereDate('received_date', '<=', $request->get('to_date'));
        }

        $perPage = (int) $request->get('per_page', 50);
        $perPage = max(1, min(100, $perPage));
        $deliveries = $query->orderBy('received_date', 'desc')->paginate($perPage);

        return response()->json($deliveries);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
                return $error;
            }

            $validated = $request->validate([
                'branch_id' => 'required|exists:branches,id',
                'delivery_type' => 'required|in:individual,batch',
                'resident_id' => 'nullable|exists:residents,id',
                'medication_id' => 'nullable|exists:medications,id',
                'pharmacy_name' => 'nullable|string|max:255',
                'quantity_received' => 'required|string|max:255',
                'received_date' => 'required|date',
                'received_time' => 'required|string',
                'status' => 'nullable|in:received,verified,stored',
                'notes' => 'nullable|string',
            ]);

            // Facility enforcement for non-super admins
            $facility = $this->getCurrentFacility($request->user());
            if ($facility) {
                $branch = Branch::find($validated['branch_id']);
                if (! $branch || $branch->facility_id !== $facility->id) {
                    return response()->json([
                        'message' => 'The selected branch does not belong to your facility.',
                    ], 403);
                }
            }

            // Validate medication_id is required for individual deliveries
            if ($validated['delivery_type'] === 'individual' && empty($validated['medication_id'])) {
                return response()->json([
                    'message' => 'Medication is required for individual deliveries.',
                ], 422);
            }

            $validated['received_by'] = auth()->id();
            $validated['status'] = $validated['status'] ?? 'received';

            // Clean up null values for optional fields
            if (empty($validated['resident_id'])) {
                $validated['resident_id'] = null;
            }
            if (empty($validated['medication_id'])) {
                $validated['medication_id'] = null;
            }
            $validated['pharmacy_name'] = trim((string) ($validated['pharmacy_name'] ?? ''));

            // Convert received_time to proper format (HH:MM:SS)
            if (isset($validated['received_time'])) {
                $time = trim($validated['received_time']);

                // Handle "HH:MM AM/PM" format (e.g., "09:48 AM")
                if (preg_match('/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i', $time, $matches)) {
                    $hours = (int) $matches[1];
                    $minutes = $matches[2];
                    $ampm = strtoupper($matches[3]);

                    if ($ampm === 'PM' && $hours !== 12) {
                        $hours += 12;
                    } elseif ($ampm === 'AM' && $hours === 12) {
                        $hours = 0;
                    }

                    $validated['received_time'] = sprintf('%02d:%s:00', $hours, $minutes);
                }
                // If time is in HH:MM format, add :00 for seconds
                elseif (preg_match('/^\d{1,2}:\d{2}$/', $time)) {
                    $parts = explode(':', $time);
                    $hours = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
                    $minutes = str_pad($parts[1], 2, '0', STR_PAD_LEFT);
                    $validated['received_time'] = $hours.':'.$minutes.':00';
                }
                // If time is in HH:MM:SS format, ensure proper padding
                elseif (preg_match('/^\d{1,2}:\d{2}:\d{2}$/', $time)) {
                    $parts = explode(':', $time);
                    $hours = str_pad($parts[0], 2, '0', STR_PAD_LEFT);
                    $minutes = str_pad($parts[1], 2, '0', STR_PAD_LEFT);
                    $seconds = str_pad($parts[2], 2, '0', STR_PAD_LEFT);
                    $validated['received_time'] = $hours.':'.$minutes.':'.$seconds;
                }
                // Try Carbon parsing as fallback
                else {
                    try {
                        $parsedTime = \Carbon\Carbon::parse($time)->format('H:i:s');
                        $validated['received_time'] = $parsedTime;
                    } catch (\Exception $e) {
                        Log::warning('Could not parse received_time', [
                            'time' => $time,
                            'error' => $e->getMessage(),
                        ]);
                        // Default to current time if parsing fails
                        $validated['received_time'] = now()->format('H:i:s');
                    }
                }
            }

            Log::info('Creating medication delivery', [
                'validated_data' => array_merge($validated, ['received_time' => $validated['received_time'] ?? 'not set']),
            ]);

            // Create without global scopes to avoid facility scope issues during creation
            $delivery = MedicationDelivery::withoutGlobalScopes()->create($validated);

            // Load relationships safely - only load if they exist
            try {
                $delivery->load(['branch', 'receivedBy']);

                // Only load optional relationships if they exist
                if ($delivery->resident_id) {
                    $delivery->load('resident');
                }
                if ($delivery->medication_id) {
                    $delivery->load('medication');
                }
            } catch (\Exception $e) {
                // If relationship loading fails, log but don't fail the request
                Log::warning('Failed to load some relationships for medication delivery', [
                    'delivery_id' => $delivery->id,
                    'error' => $e->getMessage(),
                ]);
            }

            return response()->json($delivery, 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error creating medication delivery', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request' => $request->all(),
            ]);

            return response()->json([
                'message' => 'Failed to create medication delivery',
                'error' => config('app.debug') ? $e->getMessage() : 'An error occurred while creating the medication delivery.',
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $delivery = MedicationDelivery::with(['branch', 'resident', 'medication', 'receivedBy'])
            ->findOrFail($id);

        if (! $this->checkFacilityAccess($delivery)) {
            return response()->json(['message' => 'Medication delivery not found'], 404);
        }

        $user = request()->user();
        $isCaregiver = $user && in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse']);
        if ($isCaregiver && $user->assigned_branch_id && (int) $delivery->branch_id !== (int) $user->assigned_branch_id) {
            return response()->json([
                'message' => 'You do not have permission to view this delivery.',
            ], 403);
        }

        return response()->json($delivery);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $delivery = MedicationDelivery::findOrFail($id);

        if (! $this->checkFacilityAccess($delivery)) {
            return response()->json(['message' => 'Medication delivery not found'], 404);
        }

        $validated = $request->validate([
            'branch_id' => 'sometimes|exists:branches,id',
            'delivery_type' => 'sometimes|in:individual,batch',
            'resident_id' => 'nullable|exists:residents,id',
            'medication_id' => 'nullable|exists:medications,id',
            'pharmacy_name' => 'sometimes|nullable|string|max:255',
            'quantity_received' => 'sometimes|string|max:255',
            'received_date' => 'sometimes|date',
            'received_time' => 'sometimes|string',
            'status' => 'sometimes|in:received,verified,stored',
            'notes' => 'nullable|string',
        ]);

        // Validate medication_id is required for individual deliveries
        if (isset($validated['delivery_type']) && $validated['delivery_type'] === 'individual' && empty($validated['medication_id'])) {
            return response()->json([
                'message' => 'Medication is required for individual deliveries.',
            ], 422);
        }

        if (isset($validated['branch_id'])) {
            $facility = $this->getCurrentFacility($request->user());
            if ($facility) {
                $branch = Branch::find($validated['branch_id']);
                if (! $branch || $branch->facility_id !== $facility->id) {
                    return response()->json([
                        'message' => 'The selected branch does not belong to your facility.',
                    ], 403);
                }
            }
        }

        if (array_key_exists('pharmacy_name', $validated)) {
            $validated['pharmacy_name'] = trim((string) ($validated['pharmacy_name'] ?? ''));
        }

        $delivery->update($validated);

        return response()->json($delivery->load(['branch', 'resident', 'medication', 'receivedBy']));
    }

    /**
     * Store multiple deliveries in bulk.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $validated = $request->validate([
            'deliveries' => 'required|array|min:1',
            'deliveries.*.branch_id' => 'required|exists:branches,id',
            'deliveries.*.delivery_type' => 'required|in:individual,batch',
            'deliveries.*.resident_id' => 'nullable|exists:residents,id',
            'deliveries.*.medication_id' => 'nullable|exists:medications,id',
            'deliveries.*.pharmacy_name' => 'nullable|string|max:255',
            'deliveries.*.quantity_received' => 'required|string|max:255',
            'deliveries.*.received_date' => 'required|date',
            'deliveries.*.received_time' => 'required|string',
            'deliveries.*.status' => 'nullable|in:received,verified,stored',
            'deliveries.*.notes' => 'nullable|string',
        ]);

        $facility = $this->getCurrentFacility($request->user());

        $created = [];
        $errors = [];

        foreach ($validated['deliveries'] as $index => $deliveryData) {
            // Validate medication_id is required for individual deliveries
            if ($deliveryData['delivery_type'] === 'individual' && empty($deliveryData['medication_id'])) {
                $errors[] = [
                    'index' => $index,
                    'message' => 'Medication is required for individual deliveries.',
                ];

                continue;
            }

            // Facility enforcement for non-super admins
            if ($facility) {
                $branch = Branch::find($deliveryData['branch_id']);
                if (! $branch || $branch->facility_id !== $facility->id) {
                    $errors[] = [
                        'index' => $index,
                        'message' => 'The selected branch does not belong to your facility.',
                    ];

                    continue;
                }
            }

            try {
                $deliveryData['received_by'] = auth()->id();
                $deliveryData['status'] = $deliveryData['status'] ?? 'received';
                $deliveryData['pharmacy_name'] = trim((string) ($deliveryData['pharmacy_name'] ?? ''));

                $delivery = MedicationDelivery::create($deliveryData);
                $created[] = $delivery->load(['branch', 'resident', 'medication', 'receivedBy']);
            } catch (\Exception $e) {
                $errors[] = [
                    'index' => $index,
                    'message' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'message' => count($created).' delivery(ies) created successfully.',
            'created' => $created,
            'errors' => $errors,
            'success_count' => count($created),
            'error_count' => count($errors),
        ], count($created) > 0 ? 201 : 422);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::PHARMACY)) {
            return $error;
        }

        $delivery = MedicationDelivery::findOrFail($id);

        if (! $this->checkFacilityAccess($delivery)) {
            return response()->json(['message' => 'Medication delivery not found'], 404);
        }
        $delivery->delete();

        return response()->json(['message' => 'Medication delivery deleted successfully']);
    }
}
