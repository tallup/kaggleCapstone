<?php

namespace App\Http\Controllers\Api;

use App\Models\Incident;
use App\Models\IncidentAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IncidentController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        // Check module access
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
            return $error;
        }

        $query = Incident::with(['resident', 'branch', 'reportedBy', 'assignedTo', 'resolvedBy']);

        // Facility scoping
        $this->applyFacilityFilter($query, $request->user());

        // Apply branch filter for caregivers
        $this->applyBranchFilter($query, $request);

        // Filter by status
        if ($request->has('status') && $request->get('status') !== 'all') {
            $query->where('status', $request->get('status'));
        }

        // Filter by priority
        if ($request->has('priority') && $request->get('priority') !== 'all') {
            $query->where('priority', $request->get('priority'));
        }

        // Filter by severity
        if ($request->has('severity') && $request->get('severity') !== 'all') {
            $query->where('severity', $request->get('severity'));
        }

        // Filter by incident type
        if ($request->has('incident_type') && $request->get('incident_type') !== 'all') {
            $query->where('incident_type', $request->get('incident_type'));
        }

        // Filter by resident
        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        // Filter by branch
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        // Filter by assigned_to
        if ($request->has('assigned_to')) {
            if ($request->get('assigned_to') === 'unassigned') {
                $query->whereNull('assigned_to');
            } else {
                $query->where('assigned_to', $request->get('assigned_to'));
            }
        }

        // Date range filter
        if ($request->has('date_from')) {
            $query->whereDate('incident_date', '>=', $request->get('date_from'));
        }
        if ($request->has('date_to')) {
            $query->whereDate('incident_date', '<=', $request->get('date_to'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('incident_number', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhere('incident_type', 'like', "%{$search}%")
                    ->orWhereHas('resident', function ($q) use ($search) {
                        $q->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        // Order by incident date (most recent first)
        $incidents = $query->orderBy('incident_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($incidents);
    }

    public function show($id): JsonResponse
    {
        // Check module access
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
            return $error;
        }

        $incident = Incident::with([
            'resident',
            'branch',
            'reportedBy',
            'assignedTo',
            'resolvedBy',
            'attachments.uploadedBy',
        ])->findOrFail($id);

        if (! $this->checkFacilityAccess($incident)) {
            return response()->json(['message' => 'Incident not found'], 404);
        }

        return response()->json($incident);
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $user = auth()->user();

            // Allow administrators and super admins to create incidents even without specific permission
            $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
            $isAdmin = $user && $user->isAnyAdmin();

            // Check if user is a caregiver
            $isCaregiver = $this->isCaregiver($user);

            // Caregivers can create incidents for residents in their assigned branch
            // Admins and super admins can create incidents without specific permission
            // Other users need the create_incidents permission
            if (! $isSuperAdmin && ! $isAdmin && ! $isCaregiver) {
                if ($error = $this->requirePermission('create_incidents')) {
                    return $error;
                }
            }

            // Check module access
            if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
                return $error;
            }

            $validated = $request->validate([
                'resident_id' => 'required|exists:residents,id',
                'branch_id' => 'nullable|exists:branches,id',
                'incident_type' => 'required|string|max:255',
                'description' => 'required|string',
                'incident_date' => 'required|date',
                'location' => 'nullable|string|max:255',
                'severity' => 'required|in:low,medium,high,critical',
                'priority' => 'required|in:low,medium,high,critical',
                'status' => 'nullable|in:open,in_progress,resolved,closed,on_hold',
                'action_taken' => 'nullable|string',
                'witnesses' => 'nullable|string',
                'follow_up' => 'nullable|string',
                'assigned_to' => 'nullable|exists:users,id',
            ]);

            // If branch_id not provided, infer from resident
            if (! isset($validated['branch_id'])) {
                $resident = \App\Models\Resident::find($validated['resident_id']);
                if ($resident) {
                    $validated['branch_id'] = $resident->branch_id;
                }
            }

            // If user is a caregiver, ensure they can only create incidents for residents in their assigned branch
            if ($isCaregiver) {
                $resident = \App\Models\Resident::find($validated['resident_id']);
                if (! $resident || $resident->branch_id !== $user->assigned_branch_id) {
                    return response()->json([
                        'message' => 'Unauthorized: You can only create incidents for residents in your assigned branch.',
                        'errors' => ['resident_id' => ['You can only create incidents for residents in your assigned branch.']],
                    ], 403);
                }
                // Force branch_id to caregiver's assigned branch
                $validated['branch_id'] = $user->assigned_branch_id;
            }

            // Set default status if not provided
            if (! isset($validated['status'])) {
                $validated['status'] = Incident::STATUS_OPEN;
            }

            // Set reported_by
            $validated['reported_by'] = auth()->id();

            // Create incident
            \Log::info('Attempting to create incident', ['data' => array_diff_key($validated, ['description' => ''])]);
            $incident = Incident::create($validated);
            \Log::info('Incident created successfully', ['id' => $incident->id, 'number' => $incident->incident_number]);

            // Handle file uploads
            // The frontend sends attachments as attachments[0][file], attachments[1][file], etc.
            // Laravel will parse this into a nested array structure
            $allFiles = $request->allFiles();

            if (isset($allFiles['attachments']) && is_array($allFiles['attachments'])) {
                \Log::info('Processing '.count($allFiles['attachments'])." attachments for incident {$incident->id}");
                foreach ($allFiles['attachments'] as $index => $attachmentItem) {
                    // attachmentItem could be either:
                    // 1. An UploadedFile directly (if sent as attachments[0])
                    // 2. An array with 'file' key (if sent as attachments[0][file])
                    $file = null;
                    $fileType = 'photo';

                    if ($attachmentItem instanceof \Illuminate\Http\UploadedFile) {
                        // Direct file upload
                        $file = $attachmentItem;
                        $fileType = $request->input("attachments.{$index}.file_type", 'photo');
                    } elseif (is_array($attachmentItem)) {
                        // Check if 'file' key exists and is an UploadedFile
                        if (isset($attachmentItem['file']) && $attachmentItem['file'] instanceof \Illuminate\Http\UploadedFile) {
                            // Nested structure: attachments[0][file]
                            $file = $attachmentItem['file'];
                            $fileType = $attachmentItem['file_type'] ?? $request->input("attachments.{$index}.file_type", 'photo');
                        } else {
                            // Skip if file is not a valid UploadedFile
                            \Log::warning("Skipping attachment {$index} for incident {$incident->id}: Not a valid UploadedFile in array");

                            continue;
                        }
                    } else {
                        // Skip if attachmentItem is neither UploadedFile nor array
                        \Log::warning("Skipping attachment {$index} for incident {$incident->id}: Not a valid attachment structure");

                        continue;
                    }

                    // Process the file if we have a valid UploadedFile
                    if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                        \Log::debug('Processing file: '.$file->getClientOriginalName());
                        // Validate file size (2MB = 2048 KB)
                        $maxSize = 2 * 1024 * 1024; // 2MB in bytes
                        if ($file->getSize() > $maxSize) {
                            throw new \Exception("File '{$file->getClientOriginalName()}' exceeds maximum size of 2MB");
                        }

                        // Validate file type
                        $allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                        if (! in_array($file->getMimeType(), $allowedMimes)) {
                            throw new \Exception("File '{$file->getClientOriginalName()}' has an invalid file type. Allowed types: PDF, JPEG, PNG, GIF, WebP, DOC, DOCX");
                        }

                        $storedPath = $file->store('incident-attachments', $this->attachmentDisk());
                        \Log::debug("File stored at: $storedPath");

                        IncidentAttachment::create([
                            'incident_id' => $incident->id,
                            'file_path' => $storedPath,
                            'file_name' => $file->getClientOriginalName(),
                            'file_type' => $fileType,
                            'file_size' => $file->getSize(),
                            'mime_type' => $file->getMimeType(),
                            'uploaded_by' => auth()->id(),
                            'description' => is_array($attachmentItem) && isset($attachmentItem['description'])
                                ? $attachmentItem['description']
                                : $request->input("attachments.{$index}.description"),
                        ]);
                        \Log::debug('Incident attachment record created');
                    } else {
                        $error = $file ? $file->getErrorMessage() : 'File is not instance of UploadedFile';
                        \Log::error("File upload invalid for index {$index}: $error");
                    }
                }
            }

            \Log::info("Incident creation complete for ID {$incident->id}");

            // Notify admins
            try {
                $admins = \App\Models\User::where(function ($query) {
                    $query->whereIn('role', ['admin', 'administrator', 'super_admin']);
                })
                    ->orWhereHas('roles', fn ($q) => $q->whereIn('name', ['admin', 'administrator', 'super_admin']))
                    ->get();

                app(\App\Services\NotificationService::class)->sendIncidentEmail(
                    $incident,
                    $admins,
                    'created'
                );
            } catch (\Exception $e) {
                \Log::error('Failed to trigger incident notification', ['error' => $e->getMessage()]);
            }

            return response()->json($incident->load(['resident', 'branch', 'reportedBy', 'assignedTo', 'attachments']), 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Error creating incident: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'request' => $request->except(['attachments']),
            ]);

            return response()->json([
                'message' => 'Failed to create incident: '.$e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = auth()->user();

        // Allow administrators and super admins to edit incidents even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && $user->isAnyAdmin();

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('edit_incidents')) {
                return $error;
            }
        }

        // Check module access
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
            return $error;
        }

        $incident = Incident::findOrFail($id);

        if (! $this->checkFacilityAccess($incident)) {
            return response()->json(['message' => 'Incident not found'], 404);
        }

        // Check branch access for caregivers
        if (! $this->checkBranchAccess($incident)) {
            return $this->error('You do not have access to this incident.', 403);
        }

        $validated = $request->validate([
            'resident_id' => 'sometimes|exists:residents,id',
            'branch_id' => 'nullable|exists:branches,id',
            'incident_type' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'incident_date' => 'sometimes|date',
            'location' => 'nullable|string|max:255',
            'severity' => 'sometimes|in:low,medium,high,critical',
            'priority' => 'sometimes|in:low,medium,high,critical',
            'status' => 'sometimes|in:open,in_progress,resolved,closed,on_hold',
            'action_taken' => 'nullable|string',
            'witnesses' => 'nullable|string',
            'follow_up' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'resolved_by' => 'nullable|exists:users,id',
            'resolved_at' => 'nullable|date',
        ]);

        // Handle status changes
        if (isset($validated['status'])) {
            if ($validated['status'] === Incident::STATUS_RESOLVED && ! $incident->resolved_by) {
                $validated['resolved_by'] = auth()->id();
                $validated['resolved_at'] = now();
            }
            if ($validated['status'] === Incident::STATUS_CLOSED && ! $incident->resolved_by) {
                $validated['resolved_by'] = auth()->id();
                $validated['resolved_at'] = $incident->resolved_at ?? now();
            }
        }

        $incident->update($validated);

        return response()->json($incident->load(['resident', 'branch', 'reportedBy', 'assignedTo', 'resolvedBy', 'attachments']));
    }

    public function destroy($id): JsonResponse
    {
        $user = auth()->user();

        // Allow administrators and super admins to delete incidents even without specific permission
        $isSuperAdmin = $user && ($user->role === 'super_admin' || $user->hasRole('super_admin'));
        $isAdmin = $user && $user->isAnyAdmin();

        // Check permission only if user is not an admin or super admin
        if (! $isSuperAdmin && ! $isAdmin) {
            if ($error = $this->requirePermission('delete_incidents')) {
                return $error;
            }
        }

        // Check module access
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
            return $error;
        }

        $incident = Incident::findOrFail($id);

        if (! $this->checkFacilityAccess($incident)) {
            return response()->json(['message' => 'Incident not found'], 404);
        }

        // Check branch access for caregivers
        if (! $this->checkBranchAccess($incident)) {
            return $this->error('You do not have access to this incident.', 403);
        }

        if ($this->isCaregiver($user)) {
            return $this->error('Caregivers cannot delete incidents.', 403);
        }

        // Delete attachments
        foreach ($incident->attachments as $attachment) {
            if (Storage::disk($this->attachmentDisk())->exists($attachment->file_path)) {
                Storage::disk($this->attachmentDisk())->delete($attachment->file_path);
            }
            $attachment->delete();
        }

        $incident->delete();

        return response()->json(['message' => 'Incident deleted successfully']);
    }

    public function markResolved(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
            return $error;
        }

        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $incident = Incident::findOrFail($id);
        if (! $this->checkFacilityAccess($incident)) {
            return response()->json(['message' => 'Incident not found'], 404);
        }

        $incident->markAsResolved(auth()->user(), $request->get('notes'));

        return response()->json($incident->load(['resident', 'branch', 'reportedBy', 'assignedTo', 'resolvedBy']));
    }

    public function downloadAttachment($id, $attachmentId)
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
            return $error;
        }

        $incident = Incident::findOrFail($id);
        if (! $this->checkFacilityAccess($incident)) {
            return response()->json(['message' => 'Incident not found'], 404);
        }

        if (! $this->checkBranchAccess($incident)) {
            return $this->error('You do not have access to this incident.', 403);
        }

        $attachment = IncidentAttachment::findOrFail($attachmentId);
        if ((int) $attachment->incident_id !== (int) $incident->id) {
            return $this->error('Attachment does not belong to this incident.', 422);
        }

        if (! $attachment->file_path || ! Storage::disk($this->attachmentDisk())->exists($attachment->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        return Storage::disk($this->attachmentDisk())->download(
            $attachment->file_path,
            $attachment->file_name ?? basename($attachment->file_path)
        );
    }

    public function markClosed(Request $request, $id): JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
            return $error;
        }

        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $incident = Incident::findOrFail($id);
        if (! $this->checkFacilityAccess($incident)) {
            return response()->json(['message' => 'Incident not found'], 404);
        }

        $incident->markAsClosed(auth()->user(), $request->get('notes'));

        return response()->json($incident->load(['resident', 'branch', 'reportedBy', 'assignedTo', 'resolvedBy']));
    }

    /**
     * Export incidents as CSV for compliance. Query params: date_from, date_to, branch_id, status
     */
    public function export(Request $request): StreamedResponse|JsonResponse
    {
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
            return $error;
        }

        $query = Incident::with(['resident', 'branch', 'reportedBy', 'assignedTo', 'resolvedBy']);
        $this->applyFacilityFilter($query, $request->user());
        $this->applyBranchFilter($query, $request);

        if ($request->filled('date_from')) {
            $query->whereDate('incident_date', '>=', $request->get('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('incident_date', '<=', $request->get('date_to'));
        }
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }
        if ($request->filled('status') && $request->get('status') !== 'all') {
            $query->where('status', $request->get('status'));
        }

        $incidents = $query->orderBy('incident_date', 'desc')->orderBy('created_at', 'desc')->get();

        $filename = 'incident_reports_'.now()->format('Y-m-d_H-i-s').'.csv';
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ];

        return response()->streamDownload(function () use ($incidents) {
            $file = fopen('php://output', 'w');
            fputcsv($file, [
                'Incident Number',
                'Resident',
                'Branch',
                'Type',
                'Severity',
                'Priority',
                'Status',
                'Incident Date',
                'Location',
                'Description',
                'Action Taken',
                'Witnesses',
                'Follow Up',
                'Reported By',
                'Assigned To',
                'Resolved By',
                'Resolved At',
            ]);
            foreach ($incidents as $inc) {
                fputcsv($file, [
                    $inc->incident_number ?? '',
                    $inc->resident ? trim($inc->resident->first_name.' '.$inc->resident->last_name) : '',
                    $inc->branch?->name ?? '',
                    $inc->incident_type ?? '',
                    $inc->severity ?? '',
                    $inc->priority ?? '',
                    $inc->status ?? '',
                    $inc->incident_date?->format('Y-m-d H:i') ?? '',
                    $inc->location ?? '',
                    $inc->description ?? '',
                    $inc->action_taken ?? '',
                    $inc->witnesses ?? '',
                    $inc->follow_up ?? '',
                    $inc->reportedBy?->name ?? '',
                    $inc->assignedTo?->name ?? '',
                    $inc->resolvedBy?->name ?? '',
                    $inc->resolved_at?->format('Y-m-d H:i') ?? '',
                ]);
            }
            fclose($file);
        }, $filename, $headers);
    }

    private function attachmentDisk(): string
    {
        return config('filesystems.incident_attachments_disk', 'local');
    }
}
