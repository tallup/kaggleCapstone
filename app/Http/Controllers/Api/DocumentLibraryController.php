<?php

namespace App\Http\Controllers\Api;

use App\Models\DocumentFile;
use App\Models\DocumentFolder;
use App\Models\Facility;
use App\Services\DocumentLibraryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentLibraryController extends BaseApiController
{
    public function __construct(
        private DocumentLibraryService $library
    ) {}

    /**
     * Browse folders and files for one level (nested navigation).
     */
    public function tree(Request $request): JsonResponse
    {
        $facility = $this->getCurrentFacility($request->user());
        if (! $facility instanceof Facility) {
            return $this->error('Facility context required.', 400);
        }

        $user = $request->user();
        $parentId = $request->query('parent_id');

        $search = $request->query('search');
        $searchStr = is_string($search) && trim($search) !== '' ? trim($search) : null;

        if ($parentId === null || $parentId === '') {
            [$folders] = $this->library->listRootFolders($user, $facility->id);

            if ($searchStr !== null) {
                $folders = $folders->filter(function (DocumentFolder $f) use ($searchStr) {
                    return mb_stripos($f->name, $searchStr) !== false;
                })->values();
            }

            $folderRows = $folders->map(fn ($f) => $this->formatFolder($f))->values();

            $files = collect();
        } else {
            $parent = DocumentFolder::query()->whereKey((int) $parentId)->firstOrFail();
            if ((int) $parent->facility_id !== (int) $facility->id) {
                return $this->error('Folder not found.', 404);
            }
            if (! $this->library->userCanViewFolder($user, $parent)) {
                return $this->error('You do not have access to this folder.', 403);
            }

            $folders = $parent->children()->withCount(['children', 'files'])->get();
            if ($searchStr !== null) {
                $folders = $folders->filter(function (DocumentFolder $f) use ($searchStr) {
                    return mb_stripos($f->name, $searchStr) !== false;
                })->values();
            }
            $folderRows = $folders->map(fn ($f) => $this->formatFolder($f))->values();

            $fileQuery = DocumentFile::query()->where('folder_id', $parent->id);
            if ($searchStr !== null) {
                $s = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $searchStr).'%';
                $fileQuery->where(function ($w) use ($s) {
                    $w->where('display_name', 'like', $s)
                        ->orWhere('original_filename', 'like', $s);
                });
            }
            $files = $fileQuery->orderBy('display_name')->get()->map(fn ($file) => $this->formatFile($file));
        }

        return response()->json([
            'data' => [
                'parent_id' => $parentId ? (int) $parentId : null,
                'folders' => $folderRows,
                'files' => $files->values(),
            ],
        ]);
    }

    public function storeFolder(Request $request): JsonResponse
    {
        $facility = $this->getCurrentFacility($request->user());
        if (! $facility instanceof Facility) {
            return $this->error('Facility context required.', 400);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'parent_id' => 'nullable|exists:document_folders,id',
            'resident_id' => 'nullable|exists:residents,id',
        ]);

        $user = $request->user();
        $name = $validated['name'];

        if (! empty($validated['parent_id'])) {
            $parent = DocumentFolder::query()->whereKey((int) $validated['parent_id'])->firstOrFail();
            if ((int) $parent->facility_id !== (int) $facility->id) {
                return $this->error('Parent folder not found.', 404);
            }
            if (! $this->library->userCanViewFolder($user, $parent)) {
                return $this->error('You cannot create folders here.', 403);
            }

            $residentId = $parent->resident_id;

            $folder = DocumentFolder::query()->create([
                'facility_id' => $facility->id,
                'parent_id' => $parent->id,
                'resident_id' => $residentId,
                'name' => $name,
                'sort_order' => 0,
            ]);

            return response()->json(['data' => $this->formatFolder($folder->loadCount(['children', 'files']))], 201);
        }

        // Root-level folder
        $residentId = isset($validated['resident_id']) ? (int) $validated['resident_id'] : null;

        if ($residentId === null) {
            if (! $this->library->canAccessFacilityDocuments($user)) {
                return $this->error('Only administrators can create facility document folders.', 403);
            }
        } else {
            if ($this->library->canAccessFacilityDocuments($user)) {
                if (! $this->library->adminMayAccessResident($user, $residentId)) {
                    return $this->error('Resident not found in this facility.', 404);
                }
            } elseif (! $this->library->caregiverMayAccessResident($user, $residentId)) {
                return $this->error('You cannot create a document library for this resident.', 403);
            }
        }

        // Root-level resident library: one folder per resident at facility root
        if ($residentId !== null) {
            $folder = DocumentFolder::query()->firstOrCreate(
                [
                    'facility_id' => $facility->id,
                    'parent_id' => null,
                    'resident_id' => $residentId,
                ],
                [
                    'name' => $name,
                    'sort_order' => 0,
                ]
            );

            $status = $folder->wasRecentlyCreated ? 201 : 200;

            return response()->json([
                'data' => $this->formatFolder($folder->fresh()->loadCount(['children', 'files'])),
                'message' => $status === 201 ? null : 'Resident document folder already exists.',
            ], $status);
        }

        $folder = DocumentFolder::query()->create([
            'facility_id' => $facility->id,
            'parent_id' => null,
            'resident_id' => null,
            'name' => $name,
            'sort_order' => 0,
        ]);

        return response()->json(['data' => $this->formatFolder($folder->loadCount(['children', 'files']))], 201);
    }

    public function updateFolder(Request $request, int $id): JsonResponse
    {
        $facility = $this->getCurrentFacility($request->user());
        if (! $facility instanceof Facility) {
            return $this->error('Facility context required.', 400);
        }

        $folder = DocumentFolder::query()->whereKey($id)->firstOrFail();
        if ((int) $folder->facility_id !== (int) $facility->id) {
            return $this->error('Folder not found.', 404);
        }

        $user = $request->user();
        if (! $this->library->userCanViewFolder($user, $folder)) {
            return $this->error('Forbidden.', 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $folder->update(['name' => $validated['name']]);

        return response()->json(['data' => $this->formatFolder($folder->fresh()->loadCount(['children', 'files']))]);
    }

    public function destroyFolder(Request $request, int $id): JsonResponse
    {
        $facility = $this->getCurrentFacility($request->user());
        if (! $facility instanceof Facility) {
            return $this->error('Facility context required.', 400);
        }

        $folder = DocumentFolder::query()->whereKey($id)->firstOrFail();
        if ((int) $folder->facility_id !== (int) $facility->id) {
            return $this->error('Folder not found.', 404);
        }

        $user = $request->user();
        if (! $this->library->userCanViewFolder($user, $folder)) {
            return $this->error('Forbidden.', 403);
        }

        $this->library->deleteFolderTree($folder);

        return response()->json(['message' => 'Folder deleted.']);
    }

    public function storeFile(Request $request): JsonResponse
    {
        $facility = $this->getCurrentFacility($request->user());
        if (! $facility instanceof Facility) {
            return $this->error('Facility context required.', 400);
        }

        $validated = $request->validate([
            'folder_id' => 'required|exists:document_folders,id',
            'file' => 'required|file|max:10240|mimes:pdf,jpeg,jpg,png,gif,webp,doc,docx',
            'display_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $folder = DocumentFolder::query()->whereKey((int) $validated['folder_id'])->firstOrFail();
        if ((int) $folder->facility_id !== (int) $facility->id) {
            return $this->error('Folder not found.', 404);
        }

        $user = $request->user();
        if (! $this->library->userCanViewFolder($user, $folder)) {
            return $this->error('You cannot upload to this folder.', 403);
        }

        $file = $this->library->storeUploadedFile(
            $folder,
            $request->file('file'),
            $user,
            $validated['display_name'] ?? null,
            $validated['notes'] ?? null
        );

        return response()->json(['data' => $this->formatFile($file->load('uploadedBy'))], 201);
    }

    public function download(Request $request, int $id)
    {
        $facility = $this->getCurrentFacility($request->user());
        if (! $facility instanceof Facility) {
            return $this->error('Facility context required.', 400);
        }

        $doc = DocumentFile::query()->whereKey($id)->firstOrFail();
        if ((int) $doc->facility_id !== (int) $facility->id) {
            return $this->error('File not found.', 404);
        }

        $folder = DocumentFolder::query()->whereKey($doc->folder_id)->firstOrFail();
        $user = $request->user();
        if (! $this->library->userCanViewFolder($user, $folder)) {
            return $this->error('Forbidden.', 403);
        }

        $disk = config('filesystems.document_library_disk', 'local');
        if (! Storage::disk($disk)->exists($doc->storage_path)) {
            return $this->error('File missing from storage.', 410);
        }

        return Storage::disk($disk)->download($doc->storage_path, $doc->original_filename);
    }

    public function destroyFile(Request $request, int $id): JsonResponse
    {
        $facility = $this->getCurrentFacility($request->user());
        if (! $facility instanceof Facility) {
            return $this->error('Facility context required.', 400);
        }

        $doc = DocumentFile::query()->whereKey($id)->firstOrFail();
        if ((int) $doc->facility_id !== (int) $facility->id) {
            return $this->error('File not found.', 404);
        }

        $folder = DocumentFolder::query()->whereKey($doc->folder_id)->firstOrFail();
        $user = $request->user();
        if (! $this->library->userCanViewFolder($user, $folder)) {
            return $this->error('Forbidden.', 403);
        }

        $disk = config('filesystems.document_library_disk', 'local');
        if ($doc->storage_path && Storage::disk($disk)->exists($doc->storage_path)) {
            Storage::disk($disk)->delete($doc->storage_path);
        }
        $doc->delete();

        return response()->json(['message' => 'File deleted.']);
    }

    private function formatFolder(DocumentFolder $folder): array
    {
        return [
            'id' => $folder->id,
            'name' => $folder->name,
            'parent_id' => $folder->parent_id,
            'resident_id' => $folder->resident_id,
            'is_facility' => $folder->isFacilityFolder(),
            'folders_count' => (int) ($folder->children_count ?? $folder->children()->count()),
            'files_count' => (int) ($folder->files_count ?? $folder->files()->count()),
        ];
    }

    private function formatFile(DocumentFile $file): array
    {
        return [
            'id' => $file->id,
            'folder_id' => $file->folder_id,
            'display_name' => $file->display_name,
            'original_filename' => $file->original_filename,
            'mime_type' => $file->mime_type,
            'size_bytes' => $file->size_bytes,
            'notes' => $file->notes,
            'created_at' => $file->created_at?->toIso8601String(),
            'uploaded_by' => $file->relationLoaded('uploadedBy') && $file->uploadedBy
                ? [
                    'id' => $file->uploadedBy->id,
                    'name' => $file->uploadedBy->name,
                ]
                : null,
        ];
    }
}
