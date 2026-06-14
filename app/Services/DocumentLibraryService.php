<?php

namespace App\Services;

use App\Constants\UserRoles;
use App\Models\DocumentFile;
use App\Models\DocumentFolder;
use App\Models\Resident;
use App\Models\ResidentDocument;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentLibraryService
{
    public static function isCaregiverLike(User $user): bool
    {
        return UserRoles::isCaregiverRole($user->role ?? null);
    }

    /**
     * Facility administrators may access facility-only document trees (no resident_id).
     */
    public function canAccessFacilityDocuments(User $user): bool
    {
        if ($user->isSuperAdmin()) {
            return true;
        }

        return $user->isFacilityAdministrator();
    }

    /**
     * Caregivers and branch admins are limited to residents in their assigned branch.
     */
    private function shouldScopeToAssignedBranch(User $user): bool
    {
        if ($user->isSuperAdmin() || $user->isFacilityAdministrator()) {
            return false;
        }

        if (self::isCaregiverLike($user) || $user->isBranchAdmin()) {
            return (int) ($user->assigned_branch_id ?? 0) > 0;
        }

        return false;
    }

    /**
     * Caregivers may access a resident's library only when the resident is in their branch.
     */
    public function caregiverMayAccessResident(User $user, int $residentId): bool
    {
        if (! self::isCaregiverLike($user)) {
            return false;
        }

        $branchId = (int) ($user->assigned_branch_id ?? 0);
        if ($branchId === 0) {
            return false;
        }

        /** @var Resident|null $resident */
        $resident = Resident::query()->whereKey($residentId)->first();

        return $resident !== null && (int) $resident->branch_id === $branchId;
    }

    /**
     * Administrators (facility/branch/super) may access any resident in the scoped facility.
     */
    public function adminMayAccessResident(User $user, int $residentId): bool
    {
        /** @var Resident|null $resident */
        $resident = Resident::query()->whereKey($residentId)->first();
        if ($resident === null) {
            return false;
        }

        if ($user->isBranchAdmin() && $user->assigned_branch_id) {
            return (int) $resident->branch_id === (int) $user->assigned_branch_id;
        }

        return true;
    }

    public function ensureResidentRootFolder(int $facilityId, int $residentId): DocumentFolder
    {
        $resident = Resident::query()->whereKey($residentId)->firstOrFail();

        return DocumentFolder::query()->firstOrCreate(
            [
                'facility_id' => $facilityId,
                'parent_id' => null,
                'resident_id' => $residentId,
            ],
            [
                'name' => __('Documents').' — '.$resident->name,
                'sort_order' => 0,
            ]
        );
    }

    public function assertFolderParentConsistency(DocumentFolder $parent, ?int $residentIdForChild): void
    {
        if ($parent->isFacilityFolder()) {
            if ($residentIdForChild !== null) {
                throw new \InvalidArgumentException('Facility folders cannot contain resident root folders.');
            }
        } else {
            $rid = $parent->resident_id;
            if ($rid === null || $residentIdForChild !== $rid) {
                throw new \InvalidArgumentException('Resident folder hierarchy mismatch.');
            }
        }
    }

    /**
     * @return array{\Illuminate\Support\Collection<int, DocumentFolder>, bool}
     */
    public function listRootFolders(User $user, int $facilityId): array
    {
        if ($this->shouldScopeToAssignedBranch($user)) {
            $branchId = (int) ($user->assigned_branch_id ?? 0);
            if ($branchId === 0) {
                return [collect(), false];
            }
            $residentIds = Resident::query()
                ->where('branch_id', $branchId)
                ->pluck('id')
                ->all();

            foreach ($residentIds as $rid) {
                $this->ensureResidentRootFolder($facilityId, (int) $rid);
            }

            return [
                DocumentFolder::query()
                    ->whereNull('parent_id')
                    ->where('facility_id', $facilityId)
                    ->whereIn('resident_id', $residentIds)
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->withCount(['children', 'files'])
                    ->get(),
                false,
            ];
        }

        return [
            DocumentFolder::query()
                ->whereNull('parent_id')
                ->where('facility_id', $facilityId)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->withCount(['children', 'files'])
                ->get(),
            true,
        ];
    }

    public function userCanViewFolder(User $user, DocumentFolder $folder): bool
    {
        if ($folder->isFacilityFolder()) {
            return $this->canAccessFacilityDocuments($user);
        }

        $rid = (int) $folder->resident_id;

        if ($this->canAccessFacilityDocuments($user)) {
            return $this->adminMayAccessResident($user, $rid);
        }

        return $this->caregiverMayAccessResident($user, $rid);
    }

    public static function descendantFolderIds(int $folderId): array
    {
        $ids = [];
        $queue = [$folderId];
        while ($queue !== []) {
            $current = (int) array_shift($queue);
            $ids[] = $current;
            $children = DocumentFolder::withoutGlobalScopes()
                ->where('parent_id', $current)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
            foreach ($children as $cid) {
                $queue[] = $cid;
            }
        }

        return $ids;
    }

    /**
     * Delete folder subtree: files first, then deepest folders first.
     */
    public function deleteFolderTree(DocumentFolder $folder): void
    {
        $disk = config('filesystems.document_library_disk', 'local');

        DB::transaction(function () use ($folder, $disk) {
            $ids = self::descendantFolderIds($folder->id);
            foreach (array_reverse($ids) as $fid) {
                /** @var DocumentFolder|null $f */
                $f = DocumentFolder::withoutGlobalScopes()->find($fid);
                if (! $f) {
                    continue;
                }
                $files = DocumentFile::withoutGlobalScopes()->where('folder_id', $f->id)->get();
                foreach ($files as $file) {
                    if ($file->storage_path && Storage::disk($disk)->exists($file->storage_path)) {
                        Storage::disk($disk)->delete($file->storage_path);
                    }
                    $file->delete();
                }
            }
            foreach (array_reverse($ids) as $fid) {
                DocumentFolder::withoutGlobalScopes()->whereKey($fid)->delete();
            }
        });
    }

    public function storeUploadedFile(DocumentFolder $folder, \Illuminate\Http\UploadedFile $file, User $user, ?string $displayName, ?string $notes): DocumentFile
    {
        $disk = config('filesystems.document_library_disk', 'local');
        $folder->loadMissing('facility');
        $basename = Str::uuid()->toString();
        if (($ext = $file->getClientOriginalExtension()) !== '') {
            $basename .= '.'.$ext;
        }
        $directory = 'document-library/'.$folder->facility_id.'/'.$folder->id;
        Storage::disk($disk)->putFileAs($directory, $file, $basename);
        $relative = $directory.'/'.$basename;

        return DocumentFile::query()->create([
            'facility_id' => $folder->facility_id,
            'folder_id' => $folder->id,
            'display_name' => $displayName ?: $file->getClientOriginalName(),
            'storage_path' => str_replace('\\', '/', $relative),
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'size_bytes' => $file->getSize(),
            'uploaded_by' => $user->id,
            'notes' => $notes,
        ]);
    }

    /**
     * Copy a legacy ResidentDocument row into the document library (idempotent via legacy_resident_document_id).
     */
    public function importLegacyResidentDocument(ResidentDocument $rd): ?DocumentFile
    {
        if (DocumentFile::withoutGlobalScopes()->where('legacy_resident_document_id', $rd->id)->exists()) {
            return null;
        }

        $resident = Resident::query()->with('branch')->find($rd->resident_id);
        if (! $resident?->branch) {
            return null;
        }

        if (! $rd->file_path || ! Storage::disk('public')->exists($rd->file_path)) {
            return null;
        }

        $facilityId = (int) $resident->branch->facility_id;
        $folder = $this->ensureResidentRootFolder($facilityId, (int) $resident->id);

        $disk = config('filesystems.document_library_disk', 'local');
        $ext = pathinfo($rd->file_path, PATHINFO_EXTENSION);
        $basename = Str::uuid()->toString().($ext !== '' ? '.'.$ext : '');
        $directory = 'document-library/'.$facilityId.'/'.$folder->id;
        $relative = $directory.'/'.$basename;

        Storage::disk($disk)->put($relative, Storage::disk('public')->get($rd->file_path));

        $orig = $rd->file_name ?: basename($rd->file_path);

        return DocumentFile::withoutGlobalScopes()->create([
            'facility_id' => $facilityId,
            'folder_id' => $folder->id,
            'display_name' => $rd->document_name ?: $orig,
            'storage_path' => str_replace('\\', '/', $relative),
            'original_filename' => $orig,
            'mime_type' => $rd->mime_type,
            'size_bytes' => $rd->file_size,
            'uploaded_by' => $rd->uploaded_by,
            'notes' => trim(($rd->notes ? $rd->notes."\n" : '').'[imported from resident_documents #'.$rd->id.']'),
            'legacy_resident_document_id' => $rd->id,
        ]);
    }
}
