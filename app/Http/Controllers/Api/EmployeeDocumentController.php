<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmployeeDocument;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EmployeeDocumentController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $query = EmployeeDocument::with(['user']);

        // Apply facility filtering for non-super admins
        if ($user && $user->role !== 'super_admin') {
            // Filter documents by users in the same facility
            if ($user->facility_id) {
                $query->whereHas('user', function($q) use ($user) {
                    $q->where('facility_id', $user->facility_id);
                });
            } else {
                // User has no facility assigned, return empty results
                return response()->json([
                    'data' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'per_page' => $request->get('per_page', 20),
                    'total' => 0
                ]);
            }
        }

        // Filter by employee
        if ($request->has('user_id')) {
            $query->where('user_id', $request->get('user_id'));
        }

        // Filter by document type
        if ($request->has('document_type')) {
            $query->where('document_type', $request->get('document_type'));
        }

        // Filter by expired status
        if ($request->has('is_expired')) {
            if ($request->get('is_expired') === 'true') {
                $query->where('expiration_date', '<', now());
            } elseif ($request->get('is_expired') === 'false') {
                $query->where(function($q) {
                    $q->where('expiration_date', '>=', now())
                      ->orWhereNull('expiration_date');
                });
            }
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->get('is_active') === 'true');
        }

        // Search
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('document_name', 'like', "%{$search}%")
                  ->orWhere('file_name', 'like', "%{$search}%")
                  ->orWhereHas('user', function($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $documents = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($documents);
    }

    public function show($id): JsonResponse
    {
        $user = auth()->user();
        $document = EmployeeDocument::with(['user'])
            ->findOrFail($id);

        // Check facility access for non-super admins
        if ($user && $user->role !== 'super_admin') {
            if ($user->facility_id) {
                // Verify the document's user belongs to the same facility
                if (!$document->user || $document->user->facility_id !== $user->facility_id) {
                    return response()->json(['message' => 'Employee document not found'], 404);
                }
            } else {
                // User has no facility assigned
                return response()->json(['message' => 'Employee document not found'], 404);
            }
        }

        // Add file URL
        $document->file_url = $document->file_path 
            ? Storage::disk('public')->url($document->file_path)
            : null;

        return response()->json($document);
    }

    public function store(Request $request): JsonResponse
    {
        $user = auth()->user();
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'document_name' => 'required|string|max:255',
            'document_type' => 'required|string|in:contract,id,license,certification,background_check,medical,training,other',
            'file_path' => 'required|file|max:10240|mimes:pdf,jpeg,jpg,png,gif,doc,docx',
            'expiration_date' => 'nullable|date|after:today',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        // Check facility access for non-super admins
        if ($user && $user->role !== 'super_admin') {
            $targetUser = \App\Models\User::find($validated['user_id']);
            if (!$targetUser) {
                return response()->json(['message' => 'User not found'], 404);
            }
            if ($user->facility_id) {
                // Verify the target user belongs to the same facility
                if ($targetUser->facility_id !== $user->facility_id) {
                    return response()->json([
                        'message' => 'You can only create documents for users in your facility.',
                        'errors' => ['user_id' => ['You can only create documents for users in your facility.']]
                    ], 403);
                }
            } else {
                // User has no facility assigned
                return response()->json([
                    'message' => 'You can only create documents for users in your facility.',
                    'errors' => ['user_id' => ['You can only create documents for users in your facility.']]
                ], 403);
            }
        }

        // Handle file upload
        if ($request->hasFile('file_path')) {
            $file = $request->file('file_path');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('employee-documents', $fileName, 'public');
            
            $validated['file_path'] = $filePath;
            $validated['file_name'] = $file->getClientOriginalName();
            $validated['file_size'] = $file->getSize();
            $validated['mime_type'] = $file->getMimeType();
        }

        // Auto-determine is_expired
        if (isset($validated['expiration_date'])) {
            $validated['is_expired'] = \Carbon\Carbon::parse($validated['expiration_date'])->isPast();
        } else {
            $validated['is_expired'] = false;
        }

        if (!isset($validated['is_active'])) {
            $validated['is_active'] = true;
        }

        $document = EmployeeDocument::create($validated);

        // Log activity
        ActivityLogService::activity(
            event: 'created',
            description: 'Created employee document: ' . ($document->document_name ?? 'Document'),
            subject: $document,
            properties: [
                'document_type' => $document->document_type,
                'user_id' => $document->user_id,
                'file_name' => $document->file_name,
            ]
        );

        return response()->json($document->load(['user']), 201);
    }

    public function update(Request $request, $id): JsonResponse
    {
        $user = auth()->user();
        $document = EmployeeDocument::with('user')->findOrFail($id);

        // Check facility access for non-super admins
        if ($user && $user->role !== 'super_admin') {
            if ($user->facility_id) {
                // Verify the document's user belongs to the same facility
                if (!$document->user || $document->user->facility_id !== $user->facility_id) {
                    return response()->json(['message' => 'You do not have access to this employee document.'], 403);
                }
            } else {
                // User has no facility assigned
                return response()->json(['message' => 'You do not have access to this employee document.'], 403);
            }
        }

        $validated = $request->validate([
            'user_id' => 'sometimes|exists:users,id',
            'document_name' => 'sometimes|required|string|max:255',
            'document_type' => 'sometimes|required|string|in:contract,id,license,certification,background_check,medical,training,other',
            'file_path' => 'sometimes|file|max:10240|mimes:pdf,jpeg,jpg,png,gif,doc,docx',
            'expiration_date' => 'nullable|date|after:today',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        // If user_id is being changed, validate facility access
        if (isset($validated['user_id']) && $validated['user_id'] != $document->user_id) {
            if ($user && $user->role !== 'super_admin') {
                $targetUser = \App\Models\User::find($validated['user_id']);
                if (!$targetUser) {
                    return response()->json(['message' => 'User not found'], 404);
                }
                if ($user->facility_id) {
                    // Verify the target user belongs to the same facility
                    if ($targetUser->facility_id !== $user->facility_id) {
                        return response()->json([
                            'message' => 'You can only assign documents to users in your facility.',
                            'errors' => ['user_id' => ['You can only assign documents to users in your facility.']]
                        ], 403);
                    }
                } else {
                    return response()->json([
                        'message' => 'You can only assign documents to users in your facility.',
                        'errors' => ['user_id' => ['You can only assign documents to users in your facility.']]
                    ], 403);
                }
            }
        }

        // Handle file upload if new file is provided
        if ($request->hasFile('file_path')) {
            // Delete old file
            if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
                Storage::disk('public')->delete($document->file_path);
            }

            $file = $request->file('file_path');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('employee-documents', $fileName, 'public');
            
            $validated['file_path'] = $filePath;
            $validated['file_name'] = $file->getClientOriginalName();
            $validated['file_size'] = $file->getSize();
            $validated['mime_type'] = $file->getMimeType();
        }

        // Re-determine is_expired if expiration_date changed
        if (isset($validated['expiration_date'])) {
            $validated['is_expired'] = \Carbon\Carbon::parse($validated['expiration_date'])->isPast();
        } elseif ($document->expiration_date) {
            $validated['is_expired'] = \Carbon\Carbon::parse($document->expiration_date)->isPast();
        }

        $document->update($validated);

        return response()->json($document->load(['user']));
    }

    public function destroy($id): JsonResponse
    {
        $user = auth()->user();
        $document = EmployeeDocument::with('user')->findOrFail($id);

        // Check facility access for non-super admins
        if ($user && $user->role !== 'super_admin') {
            if ($user->facility_id) {
                // Verify the document's user belongs to the same facility
                if (!$document->user || $document->user->facility_id !== $user->facility_id) {
                    return response()->json(['message' => 'You do not have access to this employee document.'], 403);
                }
            } else {
                // User has no facility assigned
                return response()->json(['message' => 'You do not have access to this employee document.'], 403);
            }
        }

        // Delete file from storage
        if ($document->file_path && Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
        }

        $document->delete();

        return response()->json(['message' => 'Employee document deleted successfully']);
    }
}

