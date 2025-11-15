<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MedicationAdministration;
use App\Models\Medication;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class MedicationAdministrationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = MedicationAdministration::with(['medication', 'resident', 'branch', 'administeredBy']);
        $user = $request->user();

        if ($user && $user->hasRole('caregiver')) {
            if ($user->assigned_branch_id) {
                $query->where('branch_id', $user->assigned_branch_id);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        // Filter by medication
        if ($request->has('medication_id')) {
            $query->where('medication_id', $request->get('medication_id'));
        }

        // Filter by resident
        if ($request->has('resident_id')) {
            $residentId = $request->get('resident_id');

            if ($user && $user->hasRole('caregiver')) {
                $residentBranch = \App\Models\Resident::where('id', $residentId)->value('branch_id');

                if ($user->assigned_branch_id && (int) $residentBranch !== (int) $user->assigned_branch_id) {
                    return response()->json([
                        'message' => 'You do not have permission to view medication history for this resident.',
                    ], 403);
                }
            }

            $query->where('resident_id', $residentId);
        }

        // Filter by branch
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        // Filter by date - use date comparison in app timezone
        if ($request->has('date_from')) {
            $dateFrom = $request->get('date_from');
            // Parse the date string and create start of day in app timezone
            $startDate = Carbon::createFromFormat('Y-m-d', $dateFrom, config('app.timezone'))->startOfDay();
            $query->where('administered_at', '>=', $startDate);
        }

        if ($request->has('date_to')) {
            $dateTo = $request->get('date_to');
            // Parse the date string and create end of day in app timezone
            $endDate = Carbon::createFromFormat('Y-m-d', $dateTo, config('app.timezone'))->endOfDay();
            $query->where('administered_at', '<=', $endDate);
        }

        // Filter by today
        if ($request->has('today') && $request->get('today') === 'true') {
            $query->whereDate('administered_at', today());
        }

        $perPage = (int) $request->get('per_page', 25);
        $perPage = max(1, min(100, $perPage));

        $administrations = $query->orderBy('administered_at', 'desc')
            ->paginate($perPage);

        return response()->json($administrations);
    }

    public function show($id): JsonResponse
    {
        $administration = MedicationAdministration::with(['medication', 'resident', 'branch', 'administeredBy'])
            ->findOrFail($id);

        return response()->json($administration);
    }

    public function store(Request $request): JsonResponse
    {
        // Custom validation for administered_at to accept ISO format
        $request->validate([
            'medication_id' => 'required|exists:medications,id',
            'resident_id' => 'required|exists:residents,id',
            'branch_id' => 'required|exists:branches,id',
            'administered_at' => ['required', function ($attribute, $value, $fail) {
                // Try to parse the date - accept ISO strings and other formats
                try {
                    Carbon::parse($value);
                } catch (\Exception $e) {
                    $fail('The ' . $attribute . ' is not a valid date.');
                }
            }],
            'status' => 'required|in:completed,missed,refused',
            'dosage_given' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);
        
        $validated = $request->only([
            'medication_id',
            'resident_id',
            'branch_id',
            'administered_at',
            'status',
            'dosage_given',
            'notes',
        ]);

        // Get medication to validate resident matches and enforce rules
        $medication = Medication::findOrFail($validated['medication_id']);
        if ($medication->resident_id != $validated['resident_id']) {
            return response()->json([
                'message' => 'Resident does not match medication resident'
            ], 422);
        }

        $validated['administered_by'] = auth()->id();

        // Parse and normalize administered_at to app timezone
        // The frontend sends ISO strings where UTC components represent Pacific time
        // So we need to extract the components directly without timezone conversion
        if (!isset($validated['administered_at']) || empty($validated['administered_at'])) {
            $administeredAt = Carbon::now(config('app.timezone'));
        } else {
            $administeredAtString = $validated['administered_at'];
            
            // If it's an ISO string (ending in Z or with timezone), extract components directly
            // The frontend sends times where UTC components = Pacific components
            if (is_string($administeredAtString) && preg_match('/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/', $administeredAtString, $matches)) {
                // Extract date/time components directly from ISO string
                // These components represent Pacific time (not UTC, despite the Z suffix)
                $year = (int)$matches[1];
                $month = (int)$matches[2];
                $day = (int)$matches[3];
                $hour = (int)$matches[4];
                $minute = (int)$matches[5];
                $second = (int)$matches[6];
                
                // Create Carbon instance directly in app timezone with these components
                $administeredAt = Carbon::create($year, $month, $day, $hour, $minute, $second, config('app.timezone'));
            } else {
                // Fallback to Carbon::parse
                $administeredAt = Carbon::parse($administeredAtString, config('app.timezone'));
            }
        }
        
        $validated['administered_at'] = $administeredAt;

        // Enforce date range: cannot administer before start_date or after end_date (if set)
        // Compare dates only (not times) to avoid timezone issues - use string comparison
        if ($medication->start_date) {
            // Get the date as YYYY-MM-DD string to avoid timezone conversion issues
            // Since start_date is cast as 'date', it's a Carbon instance
            if ($medication->start_date instanceof Carbon) {
                // Get the date string in YYYY-MM-DD format (this avoids timezone shifts)
                $startDateStr = $medication->start_date->toDateString();
            } else {
                // If it's a string, extract just the date part
                $startDateStr = is_string($medication->start_date) ? $medication->start_date : (string)$medication->start_date;
                if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $startDateStr, $matches)) {
                    $startDateStr = $matches[1];
                }
            }
            
            // Get the date part of administered_at in app timezone as YYYY-MM-DD string
            $administeredDateStr = $administeredAt->copy()->setTimezone(config('app.timezone'))->toDateString();
            
            // Compare date strings directly (YYYY-MM-DD format allows string comparison)
            if ($administeredDateStr < $startDateStr) {
                \Log::warning('Medication administration rejected - date before start', [
                    'medication_id' => $medication->id,
                    'start_date' => $startDateStr,
                    'administered_date' => $administeredDateStr,
                ]);
                return response()->json([
                    'message' => 'Medication cannot be administered before its start date.'
                ], 422);
            }
        }
        // Check end_date - if null, medication has no end period (active indefinitely)
        if ($medication->end_date) {
            // Get the date as YYYY-MM-DD string to avoid timezone conversion issues
            if ($medication->end_date instanceof Carbon) {
                // Get the date string in YYYY-MM-DD format (this avoids timezone shifts)
                $endDateStr = $medication->end_date->toDateString();
            } else {
                // If it's a string, extract just the date part
                $endDateStr = is_string($medication->end_date) ? $medication->end_date : (string)$medication->end_date;
                if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $endDateStr, $matches)) {
                    $endDateStr = $matches[1];
                }
            }
            
            // Get the date part of administered_at in app timezone as YYYY-MM-DD string
            $administeredDateStr = $administeredAt->copy()->setTimezone(config('app.timezone'))->toDateString();
            
            // Compare date strings directly (YYYY-MM-DD format allows string comparison)
            if ($administeredDateStr > $endDateStr) {
                return response()->json([
                    'message' => 'Medication administration period has ended.'
                ], 422);
            }
        }
        // If end_date is null, this check is skipped - medication is active indefinitely

        // Enforce daily frequency based on instructions
        $instruction = strtolower((string) $medication->instructions);
        $allowedPerDay = null; // null means unlimited (e.g., PRN)
        if (in_array($instruction, ['b.i.d', 'bid', 'b.i.d.'])) {
            $allowedPerDay = 2;
        } elseif (in_array($instruction, ['t.i.d', 'tid', 't.i.d.'])) {
            $allowedPerDay = 3;
        } elseif (in_array($instruction, ['q.i.d', 'qid', 'q.i.d.'])) {
            $allowedPerDay = 4;
        } elseif (in_array($instruction, ['a.m', 'am', 'p.m', 'pm', 'h.s', 'hs'])) {
            $allowedPerDay = 1;
        } elseif ($instruction === 'prn') {
            $allowedPerDay = null; // as needed
        }

        if (!is_null($allowedPerDay)) {
            $countToday = MedicationAdministration::where('medication_id', $medication->id)
                ->whereDate('administered_at', $administeredAt->toDateString())
                ->count();

            if ($countToday >= $allowedPerDay) {
                return response()->json([
                    'message' => 'Daily administration limit reached for this medication.'
                ], 422);
            }
        }

        $administration = MedicationAdministration::create($validated);

        return response()->json($administration->load(['medication', 'resident', 'branch', 'administeredBy']), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $administration = MedicationAdministration::findOrFail($id);

        $validated = $request->validate([
            'administered_at' => 'sometimes|date',
            'status' => 'sometimes|in:completed,missed,refused',
            'dosage_given' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $administration->update($validated);

        return response()->json($administration->load(['medication', 'resident', 'branch', 'administeredBy']));
    }

    public function destroy($id): JsonResponse
    {
        $administration = MedicationAdministration::findOrFail($id);
        $administration->delete();

        return response()->json(['message' => 'Medication administration deleted successfully']);
    }
}

