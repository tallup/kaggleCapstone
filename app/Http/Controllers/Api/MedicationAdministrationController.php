<?php

namespace App\Http\Controllers\Api;

use App\Models\Medication;
use App\Models\MedicationAdministration;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class MedicationAdministrationController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = $this->buildQuery($request);

        $perPage = (int) $request->get('per_page', 25);
        $perPage = max(1, min(100, $perPage));

        $administrations = $query->with(['medication', 'resident', 'branch', 'administeredBy'])
            ->orderBy('administered_at', 'desc')
            ->paginate($perPage);

        return response()->json($administrations);
    }

    public function stats(Request $request): JsonResponse
    {
        $query = $this->buildQuery($request);

        // Single aggregate query instead of 4 separate count queries
        $counts = (clone $query)->selectRaw("
            count(*) as total,
            sum(case when status = 'completed' then 1 else 0 end) as administered,
            sum(case when status = 'missed' then 1 else 0 end) as missed,
            sum(case when status = 'refused' then 1 else 0 end) as refused
        ")->first();

        $total = (int) $counts->total;
        $administered = (int) $counts->administered;
        $missed = (int) $counts->missed;
        $refused = (int) $counts->refused;

        // Calculate adherence
        $adherence = ($total > 0) ? round(($administered / $total) * 100) : 0;

        // Daily breakdown for charts (last 7 days or selected range)
        $dateFrom = $request->get('date_from')
            ? Carbon::createFromFormat('Y-m-d', $request->get('date_from'), config('app.timezone'))->startOfDay()
            : Carbon::now(config('app.timezone'))->subDays(6)->startOfDay();

        $dateTo = $request->get('date_to')
            ? Carbon::createFromFormat('Y-m-d', $request->get('date_to'), config('app.timezone'))->endOfDay()
            : Carbon::now(config('app.timezone'))->endOfDay();

        // Group by date
        $dailyData = (clone $query)
            ->selectRaw('DATE(administered_at) as date, status, count(*) as count')
            ->groupBy('date', 'status')
            ->orderBy('date')
            ->get();

        // Process daily data into chart format
        $chartData = [];
        $current = $dateFrom->copy();
        while ($current <= $dateTo) {
            $dateStr = $current->toDateString();
            $dayData = $dailyData->where('date', $dateStr);

            $chartData[] = [
                'date' => $dateStr,
                'day' => $current->format('D'), // Mon, Tue, etc.
                'administered' => $dayData->where('status', 'completed')->sum('count'),
                'missed' => $dayData->where('status', 'missed')->sum('count'),
                'refused' => $dayData->where('status', 'refused')->sum('count'),
            ];
            $current->addDay();
        }

        return response()->json([
            'total' => $total,
            'administered' => $administered,
            'missed' => $missed,
            'refused' => $refused,
            'adherence' => $adherence,
            'chart_data' => $chartData,
        ]);
    }

    private function buildQuery(Request $request)
    {
        $query = MedicationAdministration::query();
        $user = $request->user();

        // Scope to user's facility
        if ($user->facility_id) {
            $query->whereHas('branch', function ($q) use ($user) {
                $q->where('facility_id', $user->facility_id);
            });
        }

        // Check if user is a caregiver (including all caregiver-related roles)
        $isCaregiver = $user && in_array($user->role, ['caregiver', 'care_giver', 'nurse', 'registered_nurse', 'licensed_nurse']);

        if ($isCaregiver) {
            if ($user->assigned_branch_id) {
                $query->where('branch_id', $user->assigned_branch_id);
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif ($user && $user->isBranchAdmin() && $user->assigned_branch_id) {
            $query->where('branch_id', $user->assigned_branch_id);
        }

        // Filter by medication
        if ($request->has('medication_id')) {
            $query->where('medication_id', $request->get('medication_id'));
        }

        // Filter by resident
        if ($request->has('resident_id')) {
            $residentId = $request->get('resident_id');

            if ($isCaregiver) {
                $residentBranch = \App\Models\Resident::where('id', $residentId)->value('branch_id');

                if ($user->assigned_branch_id && (int) $residentBranch !== (int) $user->assigned_branch_id) {
                    // This permission check is tricky in a builder helper.
                    // Ideally, we should throw an exception or handle it upstream.
                    // For now, we'll force an empty result if permission denied.
                    $query->whereRaw('1 = 0');
                }
            }

            $query->where('resident_id', $residentId);
        }

        // Filter by branch (only for non-caregivers - caregivers are already filtered above)
        if (! $isCaregiver && $request->has('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        // Filter by status (only if status is provided and not empty)
        if ($request->has('status') && $request->get('status') !== '' && $request->get('status') !== null) {
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

        return $query;
    }

    public function show($id): JsonResponse
    {
        $administration = MedicationAdministration::with(['medication', 'resident', 'branch', 'administeredBy'])
            ->findOrFail($id);

        if (! $this->checkBranchAccess($administration, auth()->user())) {
            return response()->json(['message' => 'Not found'], 404);
        }

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
                    $fail('The '.$attribute.' is not a valid date.');
                }
            }],
            'status' => 'required|in:completed,missed,refused,hospital_admission,pharmacy_administration_confirm',
            'dosage_given' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'document' => 'nullable|file|mimes:pdf,doc,docx,jpg,jpeg,png|max:5120',
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

        $user = auth()->user();
        $branchAccess = (object) ['branch_id' => (int) $validated['branch_id']];
        if (! $this->checkBranchAccess($branchAccess, $user)) {
            return response()->json(['message' => 'You do not have access to this branch.'], 403);
        }

        // Handle document upload for hospital admissions
        if ($request->hasFile('document')) {
            $file = $request->file('document');
            $fileName = time().'_'.$file->getClientOriginalName();
            $filePath = $file->storeAs('hospital-admission-documents', $fileName, 'public');
            $validated['document_path'] = $filePath;
        }

        // Get medication to validate resident matches and enforce rules
        $medication = Medication::findOrFail($validated['medication_id']);
        if ($medication->resident_id != $validated['resident_id']) {
            return response()->json([
                'message' => 'Resident does not match medication resident',
            ], 422);
        }

        if ((int) $medication->branch_id !== (int) $validated['branch_id']) {
            return response()->json([
                'message' => 'Branch does not match medication branch',
            ], 422);
        }

        $resident = \App\Models\Resident::findOrFail($validated['resident_id']);
        if ((int) $resident->branch_id !== (int) $validated['branch_id']) {
            return response()->json([
                'message' => 'Branch does not match resident branch',
            ], 422);
        }

        $validated['administered_by'] = $user->id;

        // Parse administered_at — frontend sends a real UTC ISO-8601 string (new Date().toISOString()).
        // Parse as UTC then convert to app timezone for all date comparisons.
        if (! isset($validated['administered_at']) || empty($validated['administered_at'])) {
            $administeredAt = Carbon::now(config('app.timezone'));
        } else {
            $administeredAt = Carbon::parse($validated['administered_at'], 'UTC')
                ->setTimezone(config('app.timezone'));
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
                $startDateStr = is_string($medication->start_date) ? $medication->start_date : (string) $medication->start_date;
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
                    'message' => 'Medication cannot be administered before its start date.',
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
                $endDateStr = is_string($medication->end_date) ? $medication->end_date : (string) $medication->end_date;
                if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $endDateStr, $matches)) {
                    $endDateStr = $matches[1];
                }
            }

            // Get the date part of administered_at in app timezone as YYYY-MM-DD string
            $administeredDateStr = $administeredAt->copy()->setTimezone(config('app.timezone'))->toDateString();

            // Compare date strings directly (YYYY-MM-DD format allows string comparison)
            if ($administeredDateStr > $endDateStr) {
                return response()->json([
                    'message' => 'Medication administration period has ended.',
                ], 422);
            }
        }
        // If end_date is null, this check is skipped - medication is active indefinitely

        // Enforce daily frequency based on actual time slots
        $instruction = strtolower(trim((string) $medication->instructions));
        $isPrn = str_contains($instruction, 'prn');

        if (! $isPrn) {
            $timeSlots = array_filter([
                $medication->time_1,
                $medication->time_2,
                $medication->time_3,
                $medication->time_4,
            ]);

            if (count($timeSlots) > 0) {
                $tz = config('app.timezone');
                $adminDate = $administeredAt->copy()->setTimezone($tz)->toDateString();
                $toleranceSeconds = 2 * 60 * 60;

                $dayStart = $adminDate.' 00:00:00';
                $dayEnd = $adminDate.' 23:59:59';
                $todayAdmins = MedicationAdministration::where('medication_id', $medication->id)
                    ->whereBetween('administered_at', [$dayStart, $dayEnd])
                    ->where('status', '!=', 'missed')
                    ->get();

                $administeredSlotCount = 0;
                foreach ($timeSlots as $slot) {
                    // MySQL TIME columns return HH:MM:SS — use parse() to handle both HH:MM and HH:MM:SS
                    $scheduledTime = Carbon::parse("$adminDate $slot", $tz);
                    $matched = $todayAdmins->contains(function ($admin) use ($scheduledTime, $toleranceSeconds) {
                        $adminTime = Carbon::parse($admin->administered_at)->setTimezone(config('app.timezone'));

                        return abs($adminTime->diffInSeconds($scheduledTime, false)) <= $toleranceSeconds;
                    });
                    if ($matched) {
                        $administeredSlotCount++;
                    }
                }

                if ($administeredSlotCount >= count($timeSlots)) {
                    return response()->json([
                        'message' => 'Daily administration limit reached for this medication.',
                    ], 422);
                }
            }
        }

        if (in_array($validated['status'], ['completed', 'pharmacy_administration_confirm'], true)
            && ! $this->administeredAtWithinScheduledWindow($medication, $administeredAt)) {
            return response()->json([
                'message' => 'Administration can only be recorded during an open administration window (within ±60 minutes of a scheduled time).',
            ], 422);
        }

        // Prevent duplicate administrations: check if a record with the same medication_id,
        // administered_at (within 1 minute), and status already exists
        $existingAdministration = MedicationAdministration::where('medication_id', $validated['medication_id'])
            ->where('resident_id', $validated['resident_id'])
            ->where('status', $validated['status'])
            ->whereBetween('administered_at', [
                $administeredAt->copy()->subMinute(),
                $administeredAt->copy()->addMinute(),
            ])
            ->first();

        if ($existingAdministration) {
            // Return the existing record instead of creating a duplicate
            return response()->json(
                $existingAdministration->load(['medication', 'resident', 'branch', 'administeredBy']),
                200
            );
        }

        $administration = MedicationAdministration::create($validated);

        // In-app notifications and realtime events are handled by MedicationAdministrationObserver (no email on administration).

        return response()->json($administration->load(['medication', 'resident', 'branch', 'administeredBy']), 201);
    }

    /**
     * Create multiple administrations in one request (e.g. caregiver "Administer All").
     * Runs in a DB transaction; all succeed or none are persisted.
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $request->validate([
            'items' => 'required|array|min:1|max:50',
        ]);

        $items = $request->input('items');

        try {
            $created = DB::transaction(function () use ($request, $items) {
                $out = [];
                foreach ($items as $index => $item) {
                    if (! is_array($item)) {
                        throw new \InvalidArgumentException('Each item must be an object');
                    }

                    $sub = Request::create('/medication-administrations', 'POST', $item);
                    $sub->setUserResolver($request->getUserResolver());

                    try {
                        $response = $this->store($sub);
                    } catch (\Illuminate\Validation\ValidationException $e) {
                        throw new \RuntimeException(json_encode([
                            'type' => 'validation',
                            'errors' => $e->errors(),
                            'failed_index' => $index,
                        ]));
                    }

                    $status = $response->getStatusCode();
                    if ($status >= 400) {
                        $payload = json_decode($response->getContent(), true);

                        throw new \RuntimeException(json_encode([
                            'type' => 'http',
                            'message' => is_array($payload) && isset($payload['message'])
                                ? $payload['message']
                                : 'Failed to create administration',
                            'failed_index' => $index,
                            'http_status' => $status,
                        ]));
                    }

                    $out[] = json_decode($response->getContent(), true);
                }

                return $out;
            });
        } catch (\RuntimeException $e) {
            $decoded = json_decode($e->getMessage(), true);
            if (is_array($decoded) && ($decoded['type'] ?? null) === 'validation') {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => $decoded['errors'] ?? [],
                    'failed_index' => $decoded['failed_index'] ?? null,
                ], 422);
            }
            if (is_array($decoded) && ($decoded['type'] ?? null) === 'http') {
                $httpStatus = (int) ($decoded['http_status'] ?? 422);

                return response()->json([
                    'message' => $decoded['message'] ?? 'Request failed',
                    'failed_index' => $decoded['failed_index'] ?? null,
                ], $httpStatus >= 400 && $httpStatus < 600 ? $httpStatus : 422);
            }

            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'data' => $created,
            'count' => count($created),
        ], 201);
    }

    /**
     * Permanently delete medication administration records for one or more residents (e.g. test data).
     * Restricted to facility/branch admins or users with delete_medications; caregivers cannot use this.
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $user = $request->user();
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && in_array($user->role, ['administrator', 'admin'], true);

        if ($this->isCaregiver($user)) {
            return response()->json([
                'message' => 'Bulk delete is not available for caregiver accounts.',
            ], 403);
        }

        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('delete_medications')) {
                return $error;
            }
        }

        $validated = $request->validate([
            'resident_ids' => 'required|array|min:1|max:100',
            'resident_ids.*' => 'integer|exists:residents,id',
            'date_from' => 'nullable|date_format:Y-m-d',
            'date_to' => 'nullable|date_format:Y-m-d',
            'confirmation' => 'required|string|in:DELETE',
        ]);

        $residentIds = array_values(array_unique(array_map('intval', $validated['resident_ids'])));

        $allowedIds = $this->resolveResidentIdsForBulk($request, $residentIds);
        $rejected = array_values(array_diff($residentIds, $allowedIds));

        if ($rejected !== []) {
            return response()->json([
                'message' => 'Some residents are not in your facility or branch, or could not be found.',
                'invalid_resident_ids' => $rejected,
            ], 422);
        }

        $dateFrom = $validated['date_from'] ?? null;
        $dateTo = $validated['date_to'] ?? null;

        if ($dateFrom && $dateTo) {
            $from = Carbon::createFromFormat('Y-m-d', $dateFrom, config('app.timezone'))->startOfDay();
            $to = Carbon::createFromFormat('Y-m-d', $dateTo, config('app.timezone'))->endOfDay();
            if ($from->gt($to)) {
                return response()->json(['message' => 'date_from must be on or before date_to.'], 422);
            }
        }

        $startDate = $dateFrom
            ? Carbon::createFromFormat('Y-m-d', $dateFrom, config('app.timezone'))->startOfDay()
            : null;
        $endDate = $dateTo
            ? Carbon::createFromFormat('Y-m-d', $dateTo, config('app.timezone'))->endOfDay()
            : null;

        $query = MedicationAdministration::query()->whereIn('resident_id', $allowedIds);

        if ($startDate) {
            $query->where('administered_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('administered_at', '<=', $endDate);
        }

        $deletedCount = 0;

        DB::transaction(function () use ($query, &$deletedCount, $user, $allowedIds, $dateFrom, $dateTo) {
            $toRemove = (clone $query)->get(['id', 'document_path']);

            foreach ($toRemove as $row) {
                if ($row->document_path) {
                    Storage::disk('public')->delete($row->document_path);
                }
            }

            $deletedCount = (clone $query)->delete();

            Log::info('Medication administrations bulk-deleted', [
                'user_id' => $user->id,
                'resident_ids' => $allowedIds,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'deleted_count' => $deletedCount,
            ]);
        });

        return response()->json([
            'message' => "Deleted {$deletedCount} medication administration record(s).",
            'deleted_count' => $deletedCount,
            'resident_ids' => $allowedIds,
        ]);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $administration = MedicationAdministration::findOrFail($id);

        $validated = $request->validate([
            'administered_at' => 'sometimes|date',
            'status' => 'sometimes|in:completed,missed,refused,hospital_admission',
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

    /**
     * Administrator-only: flip a "missed" administration to "completed" for a past slot.
     *
     * Rules (agreed with product):
     * - Only `administrator` and `super_admin` roles may call this. Caregivers/branch-admins cannot.
     * - The target row must currently have status = 'missed' and its ±60-minute window must already be closed.
     * - The medication must have been active on the scheduled date (start_date/end_date).
     * - `administered_at` is preserved exactly (it stays on the originally scheduled slot time) so
     *   printed MARs read identically to a normally-administered dose. No visible audit fields are touched;
     *   the Loggable trait silently records the change in `activity_logs` for internal investigation.
     * - `administered_by` is resolved to the most clinically-appropriate caregiver for the day
     *   (see resolveAdministeredByForLateMark) so the cell shows the right initials on the MAR.
     */
    public function markAdministered(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return $this->error('Unauthorized.', 401);
        }

        $isAdministrator = $user->role === 'administrator' || $user->hasRole('administrator');
        $isSuperAdmin = $user->role === 'super_admin' || $user->hasRole('super_admin');
        if (! $isAdministrator && ! $isSuperAdmin) {
            return $this->error('Only facility administrators can mark a missed medication as administered.', 403);
        }

        try {
            $administration = DB::transaction(function () use ($id, $user) {
                $administration = MedicationAdministration::lockForUpdate()->find($id);
                if (! $administration) {
                    throw new \RuntimeException('not_found');
                }

                // Facility/branch scoping: administrators may only act inside their own facility.
                if (! $this->checkBranchAccess($administration, $user)) {
                    throw new \RuntimeException('forbidden_facility');
                }

                if ($administration->status !== 'missed') {
                    throw new \RuntimeException('not_missed');
                }

                $medication = Medication::find($administration->medication_id);
                if (! $medication) {
                    throw new \RuntimeException('medication_missing');
                }

                $tz = config('app.timezone');
                $scheduledTime = Carbon::parse($administration->administered_at)->setTimezone($tz);

                // The administration window must already have closed. A 'missed' record should
                // only ever exist after its window closed, but we re-check to be defensive.
                $windowEnd = $scheduledTime->copy()->addMinutes(60);
                if ($windowEnd->isFuture()) {
                    throw new \RuntimeException('window_not_closed');
                }

                $scheduledDateStr = $scheduledTime->toDateString();
                if ($medication->start_date) {
                    $startDateStr = $medication->start_date instanceof Carbon
                        ? $medication->start_date->toDateString()
                        : (string) $medication->start_date;
                    if ($scheduledDateStr < $startDateStr) {
                        throw new \RuntimeException('before_start_date');
                    }
                }
                if ($medication->end_date) {
                    $endDateStr = $medication->end_date instanceof Carbon
                        ? $medication->end_date->toDateString()
                        : (string) $medication->end_date;
                    if ($scheduledDateStr > $endDateStr) {
                        throw new \RuntimeException('after_end_date');
                    }
                }

                $resolvedAdministeredBy = $this->resolveAdministeredByForLateMark(
                    (int) $administration->resident_id,
                    $scheduledTime,
                    (int) $user->id
                );

                // Flip the dose. administered_at intentionally untouched.
                $administration->status = 'completed';
                $administration->administered_by = $resolvedAdministeredBy;
                $administration->notes = 'Administered';

                $dosageFromMedication = trim(implode(' ', array_filter([
                    $medication->quantity ? (string) $medication->quantity : null,
                    $medication->form ? (string) $medication->form : null,
                ])));

                $currentDosage = $administration->dosage_given;
                if ($currentDosage === null || $currentDosage === '') {
                    $administration->dosage_given = $dosageFromMedication !== '' ? $dosageFromMedication : 'Administered';
                }

                $administration->save();

                return $administration;
            });
        } catch (\RuntimeException $e) {
            return match ($e->getMessage()) {
                'not_found' => $this->error('Medication administration not found.', 404),
                'forbidden_facility' => $this->error('You do not have access to this medication administration.', 403),
                'not_missed' => $this->error('Only missed medications can be marked as administered.', 422),
                'window_not_closed' => $this->error('This medication slot is still within its administration window.', 422),
                'before_start_date' => $this->error('Medication was not active on the scheduled date (before start date).', 422),
                'after_end_date' => $this->error('Medication was not active on the scheduled date (after end date).', 422),
                'medication_missing' => $this->error('Associated medication record not found.', 404),
                default => $this->error('Unable to mark administration: '.$e->getMessage(), 422),
            };
        }

        return response()->json(
            $administration->load(['medication', 'resident', 'branch', 'administeredBy']),
            200
        );
    }

    /**
     * Find the caregiver to credit for an admin-flipped missed dose.
     *
     * Tie-breaker (agreed with product): the LAST caregiver to administer to this resident on
     * the same day BEFORE the missed slot's scheduled time. If none exists before, fall back to
     * the FIRST caregiver to administer AFTER the missed slot the same day. If no caregiver
     * touched the resident at all that day, attribute the dose to the administrator doing
     * the flip.
     */
    private function resolveAdministeredByForLateMark(int $residentId, Carbon $scheduledTime, int $adminUserId): int
    {
        $tz = config('app.timezone');
        $dayStart = $scheduledTime->copy()->setTimezone($tz)->startOfDay();
        $dayEnd = $scheduledTime->copy()->setTimezone($tz)->endOfDay();

        $baseQuery = MedicationAdministration::query()
            ->where('resident_id', $residentId)
            ->whereBetween('administered_at', [$dayStart, $dayEnd])
            ->whereIn('status', ['completed', 'refused', 'hospital_admission', 'pharmacy_administration_confirm'])
            ->whereNotNull('administered_by')
            ->whereHas('administeredBy', function ($q) {
                $q->whereIn('role', \App\Constants\UserRoles::CAREGIVER_ROLES);
            });

        $lastBefore = (clone $baseQuery)
            ->where('administered_at', '<', $scheduledTime)
            ->orderByDesc('administered_at')
            ->first();

        if ($lastBefore && $lastBefore->administered_by) {
            return (int) $lastBefore->administered_by;
        }

        $firstAfter = (clone $baseQuery)
            ->where('administered_at', '>', $scheduledTime)
            ->orderBy('administered_at')
            ->first();

        if ($firstAfter && $firstAfter->administered_by) {
            return (int) $firstAfter->administered_by;
        }

        return $adminUserId;
    }

    /**
     * Mark missed medications for a date range
     * This endpoint allows manually triggering the missed medication marking process
     */
    public function markMissed(Request $request): JsonResponse
    {
        $request->validate([
            'date_from' => 'nullable|date_format:Y-m-d',
            'date_to' => 'nullable|date_format:Y-m-d',
            'date' => 'nullable|date_format:Y-m-d', // Single date option
        ]);

        // Get system user (first admin user)
        $systemUser = \App\Models\User::whereIn('role', ['super_admin', 'administrator', 'admin'])->first();
        if (! $systemUser) {
            return response()->json(['message' => 'No system user found to mark missed medications'], 500);
        }
        $systemUserId = $systemUser->id;

        // Determine date range
        if ($request->has('date')) {
            // Single date
            $dateFrom = Carbon::createFromFormat('Y-m-d', $request->get('date'), config('app.timezone'))->startOfDay();
            $dateTo = $dateFrom->copy()->endOfDay();
        } elseif ($request->has('date_from') || $request->has('date_to')) {
            // Date range
            $dateFrom = $request->has('date_from')
                ? Carbon::createFromFormat('Y-m-d', $request->get('date_from'), config('app.timezone'))->startOfDay()
                : Carbon::now(config('app.timezone'))->subDays(7)->startOfDay();
            $dateTo = $request->has('date_to')
                ? Carbon::createFromFormat('Y-m-d', $request->get('date_to'), config('app.timezone'))->endOfDay()
                : Carbon::now(config('app.timezone'))->endOfDay();
        } else {
            // Default: last 7 days
            $dateFrom = Carbon::now(config('app.timezone'))->subDays(7)->startOfDay();
            $dateTo = Carbon::now(config('app.timezone'))->endOfDay();
        }

        // Scope to user's facility
        $user = $request->user();
        $medicationsQuery = Medication::where('is_active', true)
            ->where('start_date', '<=', $dateTo->toDateString())
            ->where(function ($q) {
                $q->whereNull('end_date')
                    ->orWhere('end_date', '>=', $dateFrom->toDateString());
            });

        if ($user->facility_id) {
            $medicationsQuery->whereHas('branch', function ($q) use ($user) {
                $q->where('facility_id', $user->facility_id);
            });
        }

        $medications = $medicationsQuery->get();
        $windowMinutes = 60; // 60 minutes before and after scheduled time
        $count = 0;
        $errors = [];

        // Iterate through each day in the range
        $currentDate = $dateFrom->copy();
        while ($currentDate <= $dateTo) {
            $dateStart = $currentDate->copy()->startOfDay();
            $dateEnd = $currentDate->copy()->endOfDay();

            foreach ($medications as $medication) {
                // Check each of the 4 possible time slots
                for ($i = 1; $i <= 4; $i++) {
                    $timeField = "time_{$i}";
                    $scheduledTimeStr = $medication->$timeField;

                    if (! $scheduledTimeStr) {
                        continue;
                    }

                    // Parse scheduled time for the current date
                    try {
                        $timeParts = explode(':', $scheduledTimeStr);
                        if (count($timeParts) !== 2) {
                            continue;
                        }

                        $scheduledTime = $currentDate->copy();
                        $scheduledTime->setTime((int) $timeParts[0], (int) $timeParts[1], 0);
                    } catch (\Exception $e) {
                        continue;
                    }

                    // Calculate administration window
                    $windowStart = $scheduledTime->copy()->subMinutes($windowMinutes);
                    $windowEnd = $scheduledTime->copy()->addMinutes($windowMinutes);

                    // Check if there's already an administration record
                    $hasAdministration = MedicationAdministration::where('medication_id', $medication->id)
                        ->whereBetween('administered_at', [$windowStart, $windowEnd])
                        ->whereIn('status', ['completed', 'refused', 'hospital_admission', 'pharmacy_administration_confirm'])
                        ->exists();

                    // Only mark as missed if no administration exists and the window has passed
                    if (! $hasAdministration && $windowEnd->isPast()) {
                        // Check if missed record already exists
                        $hasMissedRecord = MedicationAdministration::where('medication_id', $medication->id)
                            ->where('status', 'missed')
                            ->whereBetween('administered_at', [
                                $scheduledTime->copy()->subMinutes(5),
                                $scheduledTime->copy()->addMinutes(5),
                            ])
                            ->exists();

                        if (! $hasMissedRecord) {
                            try {
                                MedicationAdministration::create([
                                    'medication_id' => $medication->id,
                                    'resident_id' => $medication->resident_id,
                                    'branch_id' => $medication->branch_id,
                                    'administered_by' => $systemUserId,
                                    'status' => 'missed',
                                    'administered_at' => $scheduledTime,
                                    'notes' => 'Automatically marked as missed',
                                ]);
                                $count++;
                            } catch (\Exception $e) {
                                $errors[] = "Failed to mark medication ID {$medication->id} as missed: ".$e->getMessage();
                            }
                        }
                    }
                }
            }

            $currentDate->addDay();
        }

        return response()->json([
            'message' => "Marked {$count} medication doses as missed",
            'count' => $count,
            'date_from' => $dateFrom->toDateString(),
            'date_to' => $dateTo->toDateString(),
            'errors' => $errors,
        ]);
    }

    /**
     * True for PRN, no scheduled times, or when administered_at falls within ±60 minutes of a scheduled slot.
     */
    private function administeredAtWithinScheduledWindow(Medication $medication, Carbon $administeredAt): bool
    {
        $instruction = strtolower(trim((string) $medication->instructions));
        if (str_contains($instruction, 'prn')) {
            return true;
        }

        $timeSlots = array_filter([
            $medication->time_1,
            $medication->time_2,
            $medication->time_3,
            $medication->time_4,
        ]);

        if (count($timeSlots) === 0) {
            return true;
        }

        $tz = config('app.timezone');
        $windowMinutes = 60;
        $admin = $administeredAt->copy()->setTimezone($tz);

        foreach ($timeSlots as $slot) {
            foreach ([0, 1] as $dayOffset) {
                $day = $admin->copy()->startOfDay()->addDays($dayOffset);
                $dateStr = $day->format('Y-m-d');
                try {
                    $scheduledTime = Carbon::parse("{$dateStr} {$slot}", $tz);
                } catch (\Throwable $e) {
                    continue;
                }
                $windowStart = $scheduledTime->copy()->subMinutes($windowMinutes);
                $windowEnd = $scheduledTime->copy()->addMinutes($windowMinutes);
                if ($admin->between($windowStart, $windowEnd)) {
                    return true;
                }
            }

            $prevDay = $admin->copy()->startOfDay()->subDay()->format('Y-m-d');
            try {
                $scheduledTime = Carbon::parse("{$prevDay} {$slot}", $tz);
            } catch (\Throwable $e) {
                continue;
            }
            $windowStart = $scheduledTime->copy()->subMinutes($windowMinutes);
            $windowEnd = $scheduledTime->copy()->addMinutes($windowMinutes);
            if ($admin->between($windowStart, $windowEnd)) {
                return true;
            }
        }

        return false;
    }
}
