<?php

namespace App\Http\Controllers\Api;

use App\Models\TLog;
use App\Models\TLogAttachment;
use App\Models\Resident;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class TLogController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = TLog::with(['resident', 'branch', 'reporter', 'enteredBy', 'attachments']);
        
        // Apply branch filter for caregivers
        $this->applyBranchFilter($query, $request);

        // Filter by resident
        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        // Filter by branch
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        // Filter by type
        if ($request->has('type') && $request->get('type') !== 'all') {
            $query->byType($request->get('type'));
        }

        // Filter by notification level
        if ($request->has('notification_level') && $request->get('notification_level') !== 'all') {
            $query->byNotificationLevel($request->get('notification_level'));
        }

        // Date range filter
        if ($request->has('date_from')) {
            $query->whereDate('reported_on', '>=', $request->get('date_from'));
        }
        if ($request->has('date_to')) {
            $query->whereDate('reported_on', '<=', $request->get('date_to'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('summary', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('resident', function ($q) use ($search) {
                      $q->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                  });
            });
        }

        // Order by reported_on (most recent first), fallback to created_at
        $tLogs = $query->orderBy('reported_on', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return response()->json($tLogs);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'resident_id' => 'required|exists:residents,id',
            'types' => 'required|array|min:1',
            'types.*' => 'in:health,notes,follow-up,behavior,contacts,general',
            'notification_level' => 'nullable|in:low,medium,high,urgent',
            'summary' => 'required|string|max:255',
            'description' => 'nullable|string|max:10000',
            'reporter_id' => 'nullable|exists:users,id',
            'reported_on' => 'nullable|date',
        ]);

        // Get resident to auto-fill branch_id
        $resident = Resident::findOrFail($validated['resident_id']);
        
        if (!$resident->branch_id) {
            return $this->error('Resident must be assigned to a branch.', 422);
        }

        // Create T-Log with auto-filled branch_id
        $tLog = TLog::create([
            'resident_id' => $validated['resident_id'],
            'branch_id' => $resident->branch_id, // Auto-filled from resident
            'types' => $validated['types'],
            'notification_level' => $validated['notification_level'] ?? 'low',
            'summary' => $validated['summary'],
            'description' => $validated['description'] ?? null,
            'reporter_id' => $validated['reporter_id'] ?? null,
            'reported_on' => $validated['reported_on'] ?? now(),
            'entered_by_id' => auth()->id(),
        ]);

        // Handle file attachments
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $index => $file) {
                if ($file && $file->isValid()) {
                    $storedPath = $file->store('t-log-attachments', 'public');
                    
                    TLogAttachment::create([
                        't_log_id' => $tLog->id,
                        'file_path' => $storedPath,
                        'file_name' => $file->getClientOriginalName(),
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(),
                        'uploaded_by' => auth()->id(),
                        'description' => $request->input("attachments.{$index}.description"),
                    ]);
                }
            }
        }

        return response()->json($tLog->load(['resident', 'branch', 'reporter', 'enteredBy', 'attachments']), 201);
    }

    public function show($id): JsonResponse
    {
        $tLog = TLog::with(['resident', 'branch', 'reporter', 'enteredBy', 'attachments.uploadedBy'])
            ->findOrFail($id);

        // Check branch access for caregivers
        if (!$this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this T-Log.', 403);
        }

        return response()->json($tLog);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $tLog = TLog::findOrFail($id);

        // Check branch access for caregivers
        if (!$this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this T-Log.', 403);
        }

        $validated = $request->validate([
            'resident_id' => 'sometimes|exists:residents,id',
            'types' => 'sometimes|array|min:1',
            'types.*' => 'in:health,notes,follow-up,behavior,contacts,general',
            'notification_level' => 'nullable|in:low,medium,high,urgent',
            'summary' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:10000',
            'reporter_id' => 'nullable|exists:users,id',
            'reported_on' => 'nullable|date',
        ]);

        // If resident changed, update branch_id
        if (isset($validated['resident_id']) && $validated['resident_id'] != $tLog->resident_id) {
            $resident = Resident::findOrFail($validated['resident_id']);
            if (!$resident->branch_id) {
                return $this->error('Resident must be assigned to a branch.', 422);
            }
            $validated['branch_id'] = $resident->branch_id;
        }

        $tLog->update($validated);

        // Handle new file attachments
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $index => $file) {
                if ($file && $file->isValid()) {
                    $storedPath = $file->store('t-log-attachments', 'public');
                    
                    TLogAttachment::create([
                        't_log_id' => $tLog->id,
                        'file_path' => $storedPath,
                        'file_name' => $file->getClientOriginalName(),
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getMimeType(),
                        'uploaded_by' => auth()->id(),
                        'description' => $request->input("attachments.{$index}.description"),
                    ]);
                }
            }
        }

        return response()->json($tLog->load(['resident', 'branch', 'reporter', 'enteredBy', 'attachments']));
    }

    public function destroy($id): JsonResponse
    {
        $tLog = TLog::findOrFail($id);

        // Check branch access for caregivers
        if (!$this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this T-Log.', 403);
        }

        // Delete attachments
        foreach ($tLog->attachments as $attachment) {
            if (Storage::disk('public')->exists($attachment->file_path)) {
                Storage::disk('public')->delete($attachment->file_path);
            }
            $attachment->delete();
        }

        $tLog->delete();

        return response()->json(['message' => 'T-Log deleted successfully']);
    }

    public function uploadAttachment(Request $request, $id): JsonResponse
    {
        $tLog = TLog::findOrFail($id);

        // Check branch access for caregivers
        if (!$this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this T-Log.', 403);
        }

        $validated = $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'description' => 'nullable|string',
        ]);

        $file = $request->file('file');
        $storedPath = $file->store('t-log-attachments', 'public');

        $attachment = TLogAttachment::create([
            't_log_id' => $tLog->id,
            'file_path' => $storedPath,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'uploaded_by' => auth()->id(),
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json($attachment->load('uploadedBy'), 201);
    }

    public function deleteAttachment($id, $attachmentId): JsonResponse
    {
        $tLog = TLog::findOrFail($id);
        $attachment = TLogAttachment::findOrFail($attachmentId);

        // Check branch access for caregivers
        if (!$this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this T-Log.', 403);
        }

        // Verify attachment belongs to this T-Log
        if ($attachment->t_log_id != $tLog->id) {
            return $this->error('Attachment does not belong to this T-Log.', 422);
        }

        // Delete file from storage
        if (Storage::disk('public')->exists($attachment->file_path)) {
            Storage::disk('public')->delete($attachment->file_path);
        }

        $attachment->delete();

        return response()->json(['message' => 'Attachment deleted successfully']);
    }

    public function downloadAttachment($id, $attachmentId)
    {
        $tLog = TLog::findOrFail($id);
        $attachment = TLogAttachment::findOrFail($attachmentId);

        // Check branch access for caregivers
        if (!$this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this T-Log.', 403);
        }

        // Verify attachment belongs to this T-Log
        if ($attachment->t_log_id != $tLog->id) {
            return $this->error('Attachment does not belong to this T-Log.', 422);
        }

        if (!$attachment->file_path || !Storage::disk('public')->exists($attachment->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        $filePath = Storage::disk('public')->path($attachment->file_path);
        $fileName = $attachment->file_name ?? basename($attachment->file_path);

        return response()->download($filePath, $fileName);
    }
}
