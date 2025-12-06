<?php

namespace App\Http\Controllers\Api;

use App\Models\Incident;
use App\Models\IncidentAttachment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class IncidentController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        // Check module access
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
            return $error;
        }

        $query = Incident::with(['resident', 'branch', 'reportedBy', 'assignedTo', 'resolvedBy']);
        
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
            'attachments.uploadedBy'
        ])->findOrFail($id);

        return response()->json($incident);
    }

    public function store(Request $request): JsonResponse
    {
        if ($error = $this->requirePermission('create_incidents')) {
            return $error;
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
            'attachments' => 'nullable|array',
            'attachments.*.file' => 'required_with:attachments|file|max:10240|mimes:pdf,jpeg,jpg,png,gif,doc,docx,webp',
            'attachments.*.file_type' => 'nullable|in:photo,document,video,other',
            'attachments.*.description' => 'nullable|string',
        ]);

        // If branch_id not provided, infer from resident
        if (!isset($validated['branch_id'])) {
            $resident = \App\Models\Resident::find($validated['resident_id']);
            if ($resident) {
                $validated['branch_id'] = $resident->branch_id;
            }
        }

        // Set default status if not provided
        if (!isset($validated['status'])) {
            $validated['status'] = Incident::STATUS_OPEN;
        }

        // Set reported_by
        $validated['reported_by'] = auth()->id();

        // Create incident
        $incident = Incident::create($validated);

        // Handle file uploads
        // The frontend sends attachments as attachments[0][file], attachments[1][file], etc.
        // Laravel will parse this into a nested array structure
        $allFiles = $request->allFiles();
        
        if (isset($allFiles['attachments']) && is_array($allFiles['attachments'])) {
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
                        continue;
                    }
                } else {
                    // Skip if attachmentItem is neither UploadedFile nor array
                    continue;
                }
                
                // Process the file if we have a valid UploadedFile
                if ($file instanceof \Illuminate\Http\UploadedFile && $file->isValid()) {
                    $storedPath = $file->store('incident-attachments', 'public');
                    
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
                }
            }
        }

        return response()->json($incident->load(['resident', 'branch', 'reportedBy', 'assignedTo', 'attachments']), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        if ($error = $this->requirePermission('edit_incidents')) {
            return $error;
        }

        // Check module access
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
            return $error;
        }

        $incident = Incident::findOrFail($id);
        
        // Check branch access for caregivers
        if (!$this->checkBranchAccess($incident)) {
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
            if ($validated['status'] === Incident::STATUS_RESOLVED && !$incident->resolved_by) {
                $validated['resolved_by'] = auth()->id();
                $validated['resolved_at'] = now();
            }
            if ($validated['status'] === Incident::STATUS_CLOSED && !$incident->resolved_by) {
                $validated['resolved_by'] = auth()->id();
                $validated['resolved_at'] = $incident->resolved_at ?? now();
            }
        }

        $incident->update($validated);

        return response()->json($incident->load(['resident', 'branch', 'reportedBy', 'assignedTo', 'resolvedBy', 'attachments']));
    }

    public function destroy($id): JsonResponse
    {
        if ($error = $this->requirePermission('delete_incidents')) {
            return $error;
        }

        // Check module access
        if ($error = $this->requireModuleAccess(\App\Constants\Modules::INCIDENTS)) {
            return $error;
        }

        $incident = Incident::findOrFail($id);
        
        // Check branch access for caregivers
        if (!$this->checkBranchAccess($incident)) {
            return $this->error('You do not have access to this incident.', 403);
        }
        
        // Delete attachments
        foreach ($incident->attachments as $attachment) {
            if (Storage::disk('public')->exists($attachment->file_path)) {
                Storage::disk('public')->delete($attachment->file_path);
            }
            $attachment->delete();
        }
        
        $incident->delete();

        return response()->json(['message' => 'Incident deleted successfully']);
    }

    public function markResolved(Request $request, $id): JsonResponse
    {
        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $incident = Incident::findOrFail($id);
        $incident->markAsResolved(auth()->user(), $request->get('notes'));

        return response()->json($incident->load(['resident', 'branch', 'reportedBy', 'assignedTo', 'resolvedBy']));
    }

    public function markClosed(Request $request, $id): JsonResponse
    {
        $request->validate([
            'notes' => 'nullable|string',
        ]);

        $incident = Incident::findOrFail($id);
        $incident->markAsClosed(auth()->user(), $request->get('notes'));

        return response()->json($incident->load(['resident', 'branch', 'reportedBy', 'assignedTo', 'resolvedBy']));
    }
}
