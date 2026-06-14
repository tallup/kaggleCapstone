<?php

namespace App\Http\Controllers\Api;

use App\Models\Resident;
use App\Models\TLog;
use App\Models\TLogAttachment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TLogController extends BaseApiController
{
    /**
     * Caregivers may create and view progress notes but not edit, delete, or change attachments.
     */
    private function rejectIfCaregiverModification(): ?JsonResponse
    {
        $user = auth()->user();
        if ($user && ($user->isCaregiver() || $this->isCaregiver($user))) {
            return $this->error(
                'You do not have permission to change or delete progress notes. You can add new notes or view existing ones.',
                403
            );
        }

        return null;
    }

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

        if (! $resident->branch_id) {
            return $this->error('Resident must be assigned to a branch.', 422);
        }

        // Create progress note with auto-filled branch_id
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
                    $storedPath = $file->store('t-log-attachments', $this->attachmentDisk());

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
        if (! $this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this progress note.', 403);
        }

        return response()->json($tLog);
    }

    public function update(Request $request, $id): JsonResponse
    {
        if ($response = $this->rejectIfCaregiverModification()) {
            return $response;
        }

        $tLog = TLog::findOrFail($id);

        // Check branch access for caregivers
        if (! $this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this progress note.', 403);
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
            if (! $resident->branch_id) {
                return $this->error('Resident must be assigned to a branch.', 422);
            }
            $validated['branch_id'] = $resident->branch_id;
        }

        $tLog->update($validated);

        // Handle new file attachments
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $index => $file) {
                if ($file && $file->isValid()) {
                    $storedPath = $file->store('t-log-attachments', $this->attachmentDisk());

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
        if ($response = $this->rejectIfCaregiverModification()) {
            return $response;
        }

        $tLog = TLog::findOrFail($id);

        // Check branch access for caregivers
        if (! $this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this progress note.', 403);
        }

        // Delete attachments
        foreach ($tLog->attachments as $attachment) {
            if (Storage::disk($this->attachmentDisk())->exists($attachment->file_path)) {
                Storage::disk($this->attachmentDisk())->delete($attachment->file_path);
            }
            $attachment->delete();
        }

        $tLog->delete();

        return response()->json(['message' => 'Progress note deleted successfully']);
    }

    public function uploadAttachment(Request $request, $id): JsonResponse
    {
        if ($response = $this->rejectIfCaregiverModification()) {
            return $response;
        }

        $tLog = TLog::findOrFail($id);

        // Check branch access for caregivers
        if (! $this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this progress note.', 403);
        }

        $validated = $request->validate([
            'file' => 'required|file|max:10240', // 10MB max
            'description' => 'nullable|string',
        ]);

        $file = $request->file('file');
        $storedPath = $file->store('t-log-attachments', $this->attachmentDisk());

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
        if ($response = $this->rejectIfCaregiverModification()) {
            return $response;
        }

        $tLog = TLog::findOrFail($id);
        $attachment = TLogAttachment::findOrFail($attachmentId);

        // Check branch access for caregivers
        if (! $this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this progress note.', 403);
        }

        // Verify attachment belongs to this progress note
        if ($attachment->t_log_id != $tLog->id) {
            return $this->error('Attachment does not belong to this progress note.', 422);
        }

        // Delete file from storage
        if (Storage::disk($this->attachmentDisk())->exists($attachment->file_path)) {
            Storage::disk($this->attachmentDisk())->delete($attachment->file_path);
        }

        $attachment->delete();

        return response()->json(['message' => 'Attachment deleted successfully']);
    }

    public function downloadAttachment($id, $attachmentId)
    {
        $tLog = TLog::findOrFail($id);
        $attachment = TLogAttachment::findOrFail($attachmentId);

        // Check branch access for caregivers
        if (! $this->checkBranchAccess($tLog)) {
            return $this->error('You do not have access to this progress note.', 403);
        }

        // Verify attachment belongs to this progress note
        if ($attachment->t_log_id != $tLog->id) {
            return $this->error('Attachment does not belong to this progress note.', 422);
        }

        if (! $attachment->file_path || ! Storage::disk($this->attachmentDisk())->exists($attachment->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        $filePath = Storage::disk($this->attachmentDisk())->path($attachment->file_path);
        $fileName = $attachment->file_name ?? basename($attachment->file_path);

        return response()->download($filePath, $fileName);
    }

    /**
     * Export resident care logs (progress notes) as CSV for compliance/reporting.
     * Query params: date_from, date_to, branch_id, resident_id
     */
    public function exportCareLogs(Request $request): StreamedResponse|JsonResponse
    {
        $query = TLog::with(['resident', 'branch', 'reporter', 'enteredBy']);

        $this->applyBranchFilter($query, $request);

        if ($request->filled('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('reported_on', '>=', $request->get('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('reported_on', '<=', $request->get('date_to'));
        }

        $tLogs = $query->orderBy('reported_on', 'desc')->orderBy('created_at', 'desc')->get();

        $filename = 'resident_care_logs_'.now()->format('Y-m-d_H-i-s').'.csv';
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ];

        return response()->streamDownload(function () use ($tLogs) {
            $file = fopen('php://output', 'w');
            fputcsv($file, [
                'Resident Name',
                'Branch',
                'Date',
                'Types',
                'Notification Level',
                'Summary',
                'Description',
                'Reporter',
                'Entered By',
                'Reported On',
            ]);
            foreach ($tLogs as $log) {
                fputcsv($file, [
                    $log->resident?->name ?? '',
                    $log->branch?->name ?? '',
                    $log->reported_on?->format('Y-m-d') ?? '',
                    is_array($log->types) ? implode(', ', $log->types) : (string) $log->types,
                    $log->notification_level ?? '',
                    $log->summary ?? '',
                    $log->description ?? '',
                    $log->reporter?->name ?? '',
                    $log->enteredBy?->name ?? '',
                    $log->reported_on?->format('Y-m-d H:i') ?? '',
                ]);
            }
            fclose($file);
        }, $filename, $headers);
    }

    private function attachmentDisk(): string
    {
        return config('filesystems.t_log_attachments_disk', 'local');
    }
}
