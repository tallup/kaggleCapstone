<?php

namespace App\Http\Controllers\Api;

use App\Models\Appointment;
use App\Models\ResidentDocument;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AppointmentController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Appointment::with(['resident', 'healthcareProvider', 'appointmentType', 'documents']);
        $user = $request->user();

        // Apply facility filtering for non-super admins
        if ($user && $user->role !== 'super_admin') {
            if ($user->facility_id) {
                // Use optimized whereIn pattern instead of whereHas for better performance
                $branchIds = $this->getFacilityBranchIds($user->facility_id);
                if (!empty($branchIds)) {
                    // Include appointments with branch_id in facility branches
                    // OR appointments where resident's branch is in facility branches (for NULL branch_id cases)
                    $query->where(function($q) use ($branchIds) {
                        $q->whereIn('branch_id', $branchIds)
                          ->orWhereHas('resident', function($residentQuery) use ($branchIds) {
                              $residentQuery->whereIn('branch_id', $branchIds);
                          });
                    });
                } else {
                    // No branches for facility, return empty results
                    return response()->json([
                        'data' => [],
                        'current_page' => 1,
                        'last_page' => 1,
                        'per_page' => $request->get('per_page', 15),
                        'total' => 0
                    ]);
                }
            } else {
                // User has no facility assigned, return empty results
                return response()->json([
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $request->get('per_page', 15),
                    'total' => 0
                ]);
            }
        }

        // Filter by date
        if ($request->has('date_filter')) {
            $filter = $request->get('date_filter');
            if ($filter === 'upcoming') {
                // Include today's appointments in upcoming
                $query->whereDate('appointment_date', '>=', today());
                // Exclude completed and cancelled appointments from upcoming
                $query->whereNotIn('status', ['completed', 'cancelled']);
            } elseif ($filter === 'past') {
                $query->whereDate('appointment_date', '<', today());
            } elseif ($filter === 'today') {
                $query->whereDate('appointment_date', today());
            }
        }

        // Filter by date range
        if ($request->has('date_from')) {
            $query->whereDate('appointment_date', '>=', $request->get('date_from'));
        }
        if ($request->has('date_to')) {
            $query->whereDate('appointment_date', '<=', $request->get('date_to'));
        }

        // Filter by status
        if ($request->has('status') && $request->get('status') !== 'all') {
            $query->where('status', $request->get('status'));
        }

        // Filter by branch - apply after facility filtering to narrow down to specific branch
        if ($request->has('branch_id') && $request->get('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        // Filter by resident
        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        // Order by appointment date (ascending) then by created_at (descending) so newest appointments for same date show first
        $appointments = $query->orderBy('appointment_date', 'asc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($appointments);
    }

    public function show($id): JsonResponse
    {
        $appointment = Appointment::with([
            'resident',
            'healthcareProvider',
            'appointmentType',
            'branch',
            'createdBy',
            'documents.uploadedBy'
        ])
            ->findOrFail($id);

        return response()->json($appointment);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        
        // Super admins and facility/branch admins can create without explicit permission check
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && $user->isAnyAdmin();

        // Caregivers and all other non-admins must have create_appointments (respects facility role overrides)
        if (!$isSuperAdmin && !$isAdmin) {
            if ($error = $this->requirePermission('create_appointments')) {
                return $error;
            }
        }

        $isCaregiver = $this->isCaregiver($user);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'resident_id' => 'required|exists:residents,id',
            'branch_id' => 'nullable|exists:branches,id',
            'appointment_type_id' => 'nullable|exists:appointment_types,id',
            'healthcare_provider_id' => 'nullable|exists:healthcare_providers,id',
            'appointment_date' => 'required|date',
            'appointment_time' => 'required|date_format:H:i',
            'provider_name' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:scheduled,completed,cancelled,confirmed,in_progress,no_show,rescheduled',
            'next_appointment_date' => 'nullable|date',
            'recurrence_pattern' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        // Default status
        if (!isset($validated['status'])) {
            $validated['status'] = 'scheduled';
        }

        // If branch_id not provided, try to infer from resident
        if (!isset($validated['branch_id'])) {
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if ($resident) {
                $validated['branch_id'] = $resident->branch_id;
            }
        }

        // If user is a caregiver, ensure they can only create appointments for residents in their assigned branch
        if ($isCaregiver) {
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if (!$resident || $resident->branch_id !== $user->assigned_branch_id) {
                return response()->json([
                    'message' => 'Unauthorized: You can only create appointments for residents in your assigned branch.',
                    'errors' => ['resident_id' => ['You can only create appointments for residents in your assigned branch.']]
                ], 403);
            }
            // Force branch_id to caregiver's assigned branch
            $validated['branch_id'] = $user->assigned_branch_id;
        }

        // Format appointment_time properly - ensure it's in HH:mm format
        if (isset($validated['appointment_time']) && !empty($validated['appointment_time'])) {
            // If it's already in HH:mm format, add :00 for seconds
            if (preg_match('/^\d{2}:\d{2}$/', $validated['appointment_time'])) {
                $validated['appointment_time'] = $validated['appointment_time'] . ':00';
            }
            // If it's in HH:mm:ss format, keep it as is
            // If it's in other formats, try to parse it
            elseif (!preg_match('/^\d{2}:\d{2}:\d{2}$/', $validated['appointment_time'])) {
                try {
                    $time = \Carbon\Carbon::parse($validated['appointment_time'])->format('H:i:s');
                    $validated['appointment_time'] = $time;
                } catch (\Exception $e) {
                    // If parsing fails, set to null
                    $validated['appointment_time'] = null;
                }
            }
        }

        // Auto-generate a title if missing, to satisfy NOT NULL schema in some setups
        if (!isset($validated['title']) || empty($validated['title'])) {
            $residentName = isset($resident)
                ? trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? ''))
                : 'Resident';
            $dateLabel = is_string($validated['appointment_date'])
                ? date('M j, Y', strtotime($validated['appointment_date']))
                : now()->toDateString();
            $timeLabel = isset($validated['appointment_time']) && !empty($validated['appointment_time'])
                ? date('g:i A', strtotime($validated['appointment_time']))
                : '';
            $withTime = $timeLabel ? " at {$timeLabel}" : '';
            $provider = $validated['provider_name'] ?? null;
            $base = $provider ? "Appointment with {$provider}" : 'Appointment';
            $validated['title'] = "$base - {$residentName} on {$dateLabel}{$withTime}";
        }

        $validated['created_by'] = auth()->id();

        $appointment = Appointment::create($validated);

        return response()->json($appointment->load(['resident', 'healthcareProvider', 'appointmentType']), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $appointment = Appointment::findOrFail($id);
        $user = auth()->user();

        // Check permissions
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && $user->isAnyAdmin();
        $isCaregiver = $this->isCaregiver($user);

        if (!$isSuperAdmin && !$isAdmin && !$isCaregiver) {
            if ($error = $this->requirePermission('update_appointments')) {
                return $error;
            }
        }

        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'resident_id' => 'sometimes|exists:residents,id',
            'branch_id' => 'nullable|exists:branches,id',
            'appointment_type_id' => 'nullable|exists:appointment_types,id',
            'healthcare_provider_id' => 'nullable|exists:healthcare_providers,id',
            'appointment_date' => 'sometimes|required|date',
            'appointment_time' => 'sometimes|required|date_format:H:i',
            'reschedule_reason' => 'nullable|string',
            'provider_name' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'status' => 'nullable|in:scheduled,completed,cancelled,confirmed,in_progress,no_show,rescheduled',
            'notes' => 'nullable|string',
        ]);

        // Check if this is a reschedule (date or time is being changed)
        $isReschedule = false;
        if (isset($validated['appointment_date']) || isset($validated['appointment_time'])) {
            $newDate = $validated['appointment_date'] ?? $appointment->appointment_date;
            $newTime = $validated['appointment_time'] ?? $appointment->appointment_time;
            
            // Compare dates (normalize to strings for comparison)
            $oldDateStr = $appointment->appointment_date instanceof \Carbon\Carbon 
                ? $appointment->appointment_date->toDateString() 
                : $appointment->appointment_date;
            $newDateStr = $newDate instanceof \Carbon\Carbon 
                ? $newDate->toDateString() 
                : $newDate;
            
            $oldTimeStr = $appointment->appointment_time ? substr($appointment->appointment_time, 0, 5) : '';
            $newTimeStr = $newTime ? substr($newTime, 0, 5) : '';
            
            if ($oldDateStr !== $newDateStr || $oldTimeStr !== $newTimeStr) {
                $isReschedule = true;
                
                // Save original date and time if not already saved
                if (!$appointment->original_appointment_date) {
                    $validated['original_appointment_date'] = $appointment->appointment_date;
                    $validated['original_appointment_time'] = $appointment->appointment_time;
                }
                
                // Set status to rescheduled if not explicitly set
                if (!isset($validated['status'])) {
                    $validated['status'] = 'rescheduled';
                }
            }
        }

        // If appointment_date or appointment_time is updated, regenerate title if needed
        if (isset($validated['appointment_date']) || isset($validated['appointment_time'])) {
            $resident = $appointment->resident;
            if ($resident) {
                $appointmentDate = $validated['appointment_date'] ?? $appointment->appointment_date;
                $appointmentTime = $validated['appointment_time'] ?? $appointment->appointment_time;
                
                $residentName = trim(($resident->first_name ?? '') . ' ' . ($resident->last_name ?? ''));
                $dateLabel = is_string($appointmentDate) ? date('M j, Y', strtotime($appointmentDate)) : now()->toDateString();
                $timeLabel = $appointmentTime ? date('g:i A', strtotime($appointmentTime)) : '';
                $withTime = $timeLabel ? " at {$timeLabel}" : '';
                $provider = $validated['provider_name'] ?? $appointment->provider_name;
                $base = $provider ? "Appointment with {$provider}" : 'Appointment';
                $validated['title'] = "$base - {$residentName} on {$dateLabel}{$withTime}";
            }
        }

        $appointment->update($validated);

        return response()->json($appointment->load(['resident', 'healthcareProvider', 'appointmentType', 'branch', 'createdBy']));
    }

    public function updateStatus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:scheduled,completed,cancelled,confirmed,in_progress,no_show,rescheduled',
            'notes' => 'nullable|string',
            'documents' => 'nullable|array',
            'documents.*.document_name' => 'required_with:documents|string|max:255',
            'documents.*.document_type' => 'required_with:documents|string|in:insurance,medical,legal,admission,appointment,other',
            'documents.*.file' => 'required_with:documents|file|max:10240|mimes:pdf,jpeg,jpg,png,gif,doc,docx',
            'documents.*.notes' => 'nullable|string',
        ]);

        $appointment = Appointment::findOrFail($id);
        $appointment->status = $request->get('status');
        
        // Update notes if provided (especially for completed appointments)
        if ($request->has('notes')) {
            $existingNotes = $appointment->notes ? $appointment->notes . "\n\n" : '';
            $statusNote = $request->get('status') === 'completed' && $request->get('notes')
                ? "Completed on " . now()->format('Y-m-d H:i:s') . ": " . $request->get('notes')
                : '';
            $appointment->notes = $existingNotes . $statusNote;
        }
        
        $appointment->save();

        // Handle document uploads if provided
        // Parse documents from FormData format (documents[0][file], documents[0][document_name], etc.)
        $documentCount = 0;
        while ($request->hasFile("documents.{$documentCount}.file")) {
            $file = $request->file("documents.{$documentCount}.file");
            
            if ($file && $file->isValid()) {
                $documentName = $request->get("documents.{$documentCount}.document_name", 'Document');
                $documentType = $request->get("documents.{$documentCount}.document_type", 'appointment');
                $documentNotes = $request->get("documents.{$documentCount}.notes");
                
                $fileName = time() . '_' . $file->getClientOriginalName();
                $filePath = $file->storeAs('resident-documents', $fileName, 'public');
                
                ResidentDocument::create([
                    'resident_id' => $appointment->resident_id,
                    'appointment_id' => $appointment->id,
                    'document_name' => $documentName,
                    'document_type' => $documentType,
                    'file_path' => $filePath,
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getMimeType(),
                    'uploaded_by' => auth()->id(),
                    'notes' => $documentNotes,
                ]);
            }
            $documentCount++;
        }

        return response()->json($appointment->load(['resident', 'healthcareProvider', 'documents']));
    }

    public function types(): JsonResponse
    {
        $types = \App\Models\AppointmentType::all();
        return response()->json($types);
    }

    public function statistics(Request $request): JsonResponse
    {
        try {
            \Log::info('Fetching appointment statistics for user: ' . ($request->user()->id ?? 'none'));
            $user = $request->user();
            
            // Initialize with zeros
            $stats = [
                'today' => 0,
                'upcoming' => 0,
                'completed' => 0,
                'cancelled' => 0,
                'total' => 0,
                'this_week' => 0,
                'this_month' => 0,
            ];
            
            // Get requested branch_id from query parameter
            $requestedBranchId = $request->get('branch_id');
            
            // Get branch IDs for facility filtering
            $branchIds = [];
            if ($requestedBranchId) {
                // If a specific branch is requested, use only that branch
                $branchIds = [(int)$requestedBranchId];
            } elseif ($user && $user->role !== 'super_admin' && $user->facility_id) {
                try {
                    $branchIds = $this->getFacilityBranchIds($user->facility_id);
                } catch (\Throwable $e) {
                    \Log::error('Error getting facility branch IDs for stats', ['error' => $e->getMessage()]);
                    return response()->json($stats);
                }
                
                if (empty($branchIds)) {
                    return response()->json($stats);
                }
            }

            $today = now()->toDateString();
            $startOfWeek = now()->startOfWeek()->toDateString();
            $endOfWeek = now()->endOfWeek()->toDateString();
            $startOfMonth = now()->startOfMonth()->toDateString();
            $endOfMonth = now()->endOfMonth()->toDateString();

            // Get resident IDs for this facility
            $residentIds = [];
            if (!empty($branchIds)) {
                try {
                    $residentIds = DB::table('residents')
                        ->whereIn('branch_id', $branchIds)
                        ->pluck('id')
                        ->toArray();
                } catch (\Throwable $e) {
                    \Log::error('Error fetching resident IDs for stats', ['error' => $e->getMessage()]);
                }
            }

            // Build base query
            if (!empty($branchIds)) {
                // Today
                $stats['today'] = DB::table('appointments')
                    ->where(function($q) use ($branchIds, $residentIds) {
                        $q->whereIn('branch_id', $branchIds);
                        if (!empty($residentIds)) {
                            $q->orWhereIn('resident_id', $residentIds);
                        }
                    })
                    ->whereDate('appointment_date', $today)
                    ->whereNull('deleted_at')
                    ->count();

                // Upcoming
                $stats['upcoming'] = DB::table('appointments')
                    ->where(function($q) use ($branchIds, $residentIds) {
                        $q->whereIn('branch_id', $branchIds);
                        if (!empty($residentIds)) {
                            $q->orWhereIn('resident_id', $residentIds);
                        }
                    })
                    ->whereIn('status', ['scheduled', 'confirmed', 'in_progress'])
                    ->whereDate('appointment_date', '>=', $today)
                    ->whereNull('deleted_at')
                    ->count();

                // Completed
                $stats['completed'] = DB::table('appointments')
                    ->where(function($q) use ($branchIds, $residentIds) {
                        $q->whereIn('branch_id', $branchIds);
                        if (!empty($residentIds)) {
                            $q->orWhereIn('resident_id', $residentIds);
                        }
                    })
                    ->where('status', 'completed')
                    ->whereNull('deleted_at')
                    ->count();

                // Total
                $stats['total'] = DB::table('appointments')
                    ->where(function($q) use ($branchIds, $residentIds) {
                        $q->whereIn('branch_id', $branchIds);
                        if (!empty($residentIds)) {
                            $q->orWhereIn('resident_id', $residentIds);
                        }
                    })
                    ->whereNull('deleted_at')
                    ->count();

                // This month
                $stats['this_month'] = DB::table('appointments')
                    ->where(function($q) use ($branchIds, $residentIds) {
                        $q->whereIn('branch_id', $branchIds);
                        if (!empty($residentIds)) {
                            $q->orWhereIn('resident_id', $residentIds);
                        }
                    })
                    ->whereBetween('appointment_date', [$startOfMonth, $endOfMonth])
                    ->whereNull('deleted_at')
                    ->count();
            } else {
                // Super admin - no filtering
                $stats['today'] = DB::table('appointments')->whereDate('appointment_date', $today)->whereNull('deleted_at')->count();
                $stats['upcoming'] = DB::table('appointments')->whereIn('status', ['scheduled', 'confirmed', 'in_progress'])->whereDate('appointment_date', '>=', $today)->whereNull('deleted_at')->count();
                $stats['completed'] = DB::table('appointments')->where('status', 'completed')->whereNull('deleted_at')->count();
                $stats['total'] = DB::table('appointments')->whereNull('deleted_at')->count();
                $stats['this_month'] = DB::table('appointments')->whereBetween('appointment_date', [$startOfMonth, $endOfMonth])->whereNull('deleted_at')->count();
            }

            return response()->json($stats);
            
        } catch (\Throwable $e) {
            \Log::error('CRITICAL ERROR in Appointment statistics', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile()
            ]);

            return response()->json([
                'today' => 0,
                'upcoming' => 0,
                'completed' => 0,
                'cancelled' => 0,
                'total' => 0,
                'this_week' => 0,
                'this_month' => 0,
                'diagnostic_error' => $e->getMessage()
            ], 200);
        }
    }
}

