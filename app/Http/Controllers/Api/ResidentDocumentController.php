<?php

namespace App\Http\Controllers\Api;

use App\Models\ResidentDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ResidentDocumentController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = ResidentDocument::with(['resident', 'appointment', 'uploadedBy']);
        $this->scopeDocumentsForUser($query, $user);

        // Filter by resident
        if ($request->has('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        // Filter by appointment
        if ($request->has('appointment_id')) {
            $query->where('appointment_id', $request->get('appointment_id'));
        }

        // Filter by document type
        if ($request->has('document_type')) {
            $query->where('document_type', $request->get('document_type'));
        }

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function ($q) use ($search) {
                $q->where('document_name', 'like', "%{$search}%")
                    ->orWhere('file_name', 'like', "%{$search}%")
                    ->orWhereHas('resident', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
            });
        }

        $documents = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($documents);
    }

    public function show($id): JsonResponse
    {
        $document = ResidentDocument::with(['resident', 'appointment', 'uploadedBy'])
            ->findOrFail($id);
        if (! $this->canAccessDocument($document, auth()->user())) {
            return response()->json(['message' => 'Resident document not found'], 404);
        }

        $this->attachDownloadUrls($document);

        return response()->json($document);
    }

    public function store(Request $request): JsonResponse
    {
        try {
            // Convert empty strings to null for nullable fields
            $input = $request->all();
            if (isset($input['appointment_id']) && $input['appointment_id'] === '') {
                $input['appointment_id'] = null;
            }
            if (isset($input['notes']) && $input['notes'] === '') {
                $input['notes'] = null;
            }
            $request->merge($input);

            // Log request data for debugging
            \Log::info('Resident document upload request', [
                'has_file' => $request->hasFile('file_path'),
                'file_name' => $request->hasFile('file_path') ? $request->file('file_path')->getClientOriginalName() : null,
                'file_size' => $request->hasFile('file_path') ? $request->file('file_path')->getSize() : null,
                'file_mime' => $request->hasFile('file_path') ? $request->file('file_path')->getMimeType() : null,
                'resident_id' => $request->get('resident_id'),
                'document_name' => $request->get('document_name'),
                'document_type' => $request->get('document_type'),
            ]);

            $validated = $request->validate([
                'resident_id' => 'required|exists:residents,id',
                'appointment_id' => 'nullable|exists:appointments,id',
                'document_name' => 'required|string|max:255',
                'document_type' => 'required|string|in:insurance,medical,legal,admission,appointment,other',
                'file_path' => 'required|file|max:10240|mimes:pdf,jpeg,jpg,png,gif,doc,docx',
                'notes' => 'nullable|string',
            ], [
                'resident_id.required' => 'Resident ID is required.',
                'resident_id.exists' => 'The selected resident does not exist.',
                'document_name.required' => 'Document name is required.',
                'document_type.required' => 'Document type is required.',
                'document_type.in' => 'Invalid document type selected.',
                'file_path.required' => 'A file must be uploaded.',
                'file_path.file' => 'The uploaded file is invalid.',
                'file_path.max' => 'The file size must not exceed 10MB.',
                'file_path.mimes' => 'The file must be a PDF, image (JPG, PNG, GIF), or Word document (DOC, DOCX).',
            ]);

            $resident = \App\Models\Resident::with('branch')->findOrFail($validated['resident_id']);
            if (! $this->canAccessResident($resident, auth()->user())) {
                return response()->json(['message' => 'Resident not found'], 404);
            }

            // Handle file upload
            if ($request->hasFile('file_path')) {
                $file = $request->file('file_path');
                $fileName = time().'_'.$file->getClientOriginalName();
                $filePath = $file->storeAs('resident-documents', $fileName, $this->documentDisk());

                $validated['file_path'] = $filePath;
                $validated['file_name'] = $file->getClientOriginalName();
                $validated['file_size'] = $file->getSize();
                $validated['mime_type'] = $file->getMimeType();
            } else {
                return response()->json(['message' => 'File is required', 'errors' => ['file_path' => ['The file path field is required.']]], 422);
            }

            $validated['uploaded_by'] = auth()->id();

            $document = ResidentDocument::create($validated);

            return response()->json($document->load(['resident', 'appointment', 'uploadedBy']), 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Resident document validation failed', [
                'errors' => $e->errors(),
                'request_data' => $request->except(['file_path']),
            ]);

            return response()->json([
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Resident document upload error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'message' => 'An error occurred while uploading the document: '.$e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $document = ResidentDocument::findOrFail($id);
        if (! $this->canAccessDocument($document, auth()->user())) {
            return response()->json(['message' => 'Resident document not found'], 404);
        }

        // Log incoming request data
        \Log::info('ResidentDocument update request', [
            'id' => $id,
            'all_data' => $request->all(),
            'document_name' => $request->get('document_name'),
            'document_type' => $request->get('document_type'),
            'notes' => $request->get('notes'),
            'appointment_id' => $request->get('appointment_id'),
            'has_file' => $request->hasFile('file_path'),
        ]);

        $validated = $request->validate([
            'resident_id' => 'sometimes|exists:residents,id',
            'appointment_id' => 'nullable|exists:appointments,id',
            'document_name' => 'required|string|max:255',
            'document_type' => 'required|string|in:insurance,medical,legal,admission,appointment,other',
            'file_path' => 'sometimes|file|max:10240|mimes:pdf,jpeg,jpg,png,gif,doc,docx',
            'notes' => 'nullable|string',
        ]);

        \Log::info('ResidentDocument validated data', [
            'validated' => $validated,
        ]);

        if (isset($validated['resident_id'])) {
            $resident = \App\Models\Resident::with('branch')->findOrFail($validated['resident_id']);
            if (! $this->canAccessResident($resident, auth()->user())) {
                return response()->json(['message' => 'Resident not found'], 404);
            }
        }

        // Handle file upload if new file is provided
        if ($request->hasFile('file_path')) {
            // Delete old file
            if ($document->file_path && Storage::disk($this->documentDisk())->exists($document->file_path)) {
                Storage::disk($this->documentDisk())->delete($document->file_path);
            }

            $file = $request->file('file_path');
            $fileName = time().'_'.$file->getClientOriginalName();
            $filePath = $file->storeAs('resident-documents', $fileName, $this->documentDisk());

            $validated['file_path'] = $filePath;
            $validated['file_name'] = $file->getClientOriginalName();
            $validated['file_size'] = $file->getSize();
            $validated['mime_type'] = $file->getMimeType();
        }

        $document->update($validated);

        \Log::info('ResidentDocument after update', [
            'document_name' => $document->document_name,
            'document_type' => $document->document_type,
            'notes' => $document->notes,
        ]);

        return response()->json($document->load(['resident', 'appointment', 'uploadedBy']));
    }

    public function destroy($id): JsonResponse
    {
        $document = ResidentDocument::findOrFail($id);
        if (! $this->canAccessDocument($document, auth()->user())) {
            return response()->json(['message' => 'Resident document not found'], 404);
        }

        // Delete file from storage
        if ($document->file_path && Storage::disk($this->documentDisk())->exists($document->file_path)) {
            Storage::disk($this->documentDisk())->delete($document->file_path);
        }

        $document->delete();

        return response()->json(['message' => 'Resident document deleted successfully']);
    }

    public function download($id)
    {
        $document = ResidentDocument::findOrFail($id);
        if (! $this->canAccessDocument($document, auth()->user())) {
            return response()->json(['message' => 'Resident document not found'], 404);
        }

        if (! $document->file_path || ! Storage::disk($this->documentDisk())->exists($document->file_path)) {
            return response()->json(['message' => 'File not found'], 404);
        }

        $filePath = Storage::disk($this->documentDisk())->path($document->file_path);
        $fileName = $document->file_name ?? basename($document->file_path);

        return response()->download($filePath, $fileName);
    }

    private function scopeDocumentsForUser($query, ?object $user): void
    {
        if ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return;
        }

        $query->whereHas('resident.branch', function ($branchQuery) use ($user) {
            if ($user?->isBranchAdmin() || $this->isCaregiver($user)) {
                $branchQuery->whereKey($user->assigned_branch_id);

                return;
            }

            $facilityId = $user?->facility_id;
            if ($facilityId) {
                $branchQuery->where('facility_id', $facilityId);

                return;
            }

            $branchQuery->whereRaw('1 = 0');
        });
    }

    private function canAccessDocument(ResidentDocument $document, ?object $user): bool
    {
        $document->loadMissing('resident.branch');
        $resident = $document->resident;

        return $resident instanceof \App\Models\Resident
            && $this->canAccessResident($resident, $user);
    }

    private function canAccessResident(\App\Models\Resident $resident, ?object $user): bool
    {
        if (! $user) {
            return false;
        }

        if (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            return true;
        }

        $resident->loadMissing('branch');
        $branch = $resident->branch;
        if (! $branch) {
            return false;
        }

        if (($user->isBranchAdmin() || $this->isCaregiver($user)) && $user->assigned_branch_id) {
            return (int) $branch->id === (int) $user->assigned_branch_id;
        }

        return $user->facility_id
            && (int) $branch->facility_id === (int) $user->facility_id;
    }

    private function attachDownloadUrls(ResidentDocument $document): void
    {
        $downloadUrl = "/api/v1/resident-documents/{$document->id}/download";
        $document->file_url = $downloadUrl;
        $document->download_url = $downloadUrl;
    }

    private function documentDisk(): string
    {
        return config('filesystems.resident_documents_disk', 'local');
    }
}
