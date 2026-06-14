<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\DocumentFile;
use App\Models\DocumentFolder;
use App\Models\Facility;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class DocumentLibraryAuthorizationTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    public function test_caregiver_tree_root_excludes_facility_only_folders(): void
    {
        [$facility, $branch] = $this->createFacilityAndBranch();
        $this->createAndActAs('administrator', $facility, $branch);

        DocumentFolder::query()->withoutGlobalScopes()->create([
            'facility_id' => $facility->id,
            'parent_id' => null,
            'resident_id' => null,
            'name' => 'Facility-licenses',
            'sort_order' => 0,
        ]);

        $resident = $this->createResident($branch);

        $cg = User::factory()->create([
            'facility_id' => $facility->id,
            'assigned_branch_id' => $branch->id,
            'role' => 'caregiver',
            'is_active' => true,
        ]);

        Sanctum::actingAs($cg);
        app()->instance('facility', $facility);

        $response = $this->getJson('/api/v1/document-library/tree');

        $response->assertOk();
        $names = collect($response->json('data.folders'))->pluck('name')->all();
        $this->assertNotContains('Facility-licenses', $names);
        $this->assertNotEmpty(array_filter($names, fn ($n) => str_contains((string) $n, $resident->name)));
    }

    public function test_caregiver_cannot_download_file_in_facility_folder(): void
    {
        [$facility, $branch] = $this->createFacilityAndBranch();

        $folder = DocumentFolder::query()->withoutGlobalScopes()->create([
            'facility_id' => $facility->id,
            'parent_id' => null,
            'resident_id' => null,
            'name' => 'Secret',
            'sort_order' => 0,
        ]);

        $cg = User::factory()->create([
            'facility_id' => $facility->id,
            'assigned_branch_id' => $branch->id,
            'role' => 'caregiver',
            'is_active' => true,
        ]);

        Sanctum::actingAs($cg);
        app()->instance('facility', $facility);

        $this->getJson('/api/v1/document-library/tree')
            ->assertOk();

        $file = \App\Models\DocumentFile::query()->withoutGlobalScopes()->create([
            'facility_id' => $facility->id,
            'folder_id' => $folder->id,
            'display_name' => 'doc.pdf',
            'storage_path' => 'never',
            'original_filename' => 'doc.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1,
            'uploaded_by' => $cg->id,
        ]);

        $this->get('/api/v1/document-library/files/'.$file->id.'/download')
            ->assertStatus(403);
    }

    public function test_duplicate_resident_root_post_returns_200_with_message(): void
    {
        [$facility, $branch] = $this->createFacilityAndBranch();
        $resident = $this->createResident($branch);
        $this->createAndActAs('administrator', $facility, $branch);

        $body = [
            'name' => 'Documents — '.$resident->name,
            'resident_id' => $resident->id,
        ];

        $this->postJson('/api/v1/document-library/folders', $body)->assertStatus(201);

        $second = $this->postJson('/api/v1/document-library/folders', $body);
        $second->assertStatus(200);
        $this->assertSame('Resident document folder already exists.', $second->json('message'));
    }

    public function test_tree_search_filters_root_folder_names(): void
    {
        [$facility, $branch] = $this->createFacilityAndBranch();
        $this->createAndActAs('administrator', $facility, $branch);

        DocumentFolder::query()->withoutGlobalScopes()->create([
            'facility_id' => $facility->id,
            'parent_id' => null,
            'resident_id' => null,
            'name' => 'Alpha Facility',
            'sort_order' => 0,
        ]);
        DocumentFolder::query()->withoutGlobalScopes()->create([
            'facility_id' => $facility->id,
            'parent_id' => null,
            'resident_id' => null,
            'name' => 'Beta Facility',
            'sort_order' => 0,
        ]);

        $names = collect(
            $this->getJson('/api/v1/document-library/tree?search=alpha')
                ->assertOk()
                ->json('data.folders')
        )->pluck('name')->all();

        $this->assertContains('Alpha Facility', $names);
        $this->assertNotContains('Beta Facility', $names);
    }

    public function test_facility_admin_cannot_browse_foreign_folder_or_download_delete_foreign_file(): void
    {
        [$facility, $branch] = $this->createFacilityAndBranch();
        $otherFacility = Facility::factory()->create(['name' => 'Other Facility']);
        $otherBranch = Branch::factory()->create(['facility_id' => $otherFacility->id]);
        $this->createAndActAs('administrator', $facility, $branch);

        $foreignFolder = DocumentFolder::query()->withoutGlobalScopes()->create([
            'facility_id' => $otherFacility->id,
            'parent_id' => null,
            'resident_id' => null,
            'name' => 'Foreign Folder',
            'sort_order' => 0,
        ]);
        $foreignFile = DocumentFile::query()->withoutGlobalScopes()->create([
            'facility_id' => $otherFacility->id,
            'folder_id' => $foreignFolder->id,
            'display_name' => 'foreign.pdf',
            'storage_path' => 'document-library/'.$otherFacility->id.'/'.$foreignFolder->id.'/foreign.pdf',
            'original_filename' => 'foreign.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 12,
            'uploaded_by' => auth()->id(),
        ]);

        $this->getJson('/api/v1/document-library/tree?parent_id='.$foreignFolder->id)
            ->assertStatus(404);
        $this->get('/api/v1/document-library/files/'.$foreignFile->id.'/download')
            ->assertStatus(404);
        $this->deleteJson('/api/v1/document-library/files/'.$foreignFile->id)
            ->assertStatus(404);

        $this->assertDatabaseHas('document_files', [
            'id' => $foreignFile->id,
            'display_name' => 'foreign.pdf',
        ]);

        // Keep the foreign branch live so FacilityScope can resolve the second tenant in SQLite tests.
        $this->assertNotNull($otherBranch->id);
    }

    public function test_facility_admin_cannot_upload_to_update_or_delete_foreign_folder(): void
    {
        [$facility, $branch] = $this->createFacilityAndBranch();
        $otherFacility = Facility::factory()->create(['name' => 'Other Facility']);
        $this->createAndActAs('administrator', $facility, $branch);

        $foreignFolder = DocumentFolder::query()->withoutGlobalScopes()->create([
            'facility_id' => $otherFacility->id,
            'parent_id' => null,
            'resident_id' => null,
            'name' => 'Foreign Folder',
            'sort_order' => 0,
        ]);

        $this->postJson('/api/v1/document-library/files', [
            'folder_id' => $foreignFolder->id,
            'file' => UploadedFile::fake()->create('foreign.pdf', 12, 'application/pdf'),
        ])->assertStatus(404);

        $this->patchJson('/api/v1/document-library/folders/'.$foreignFolder->id, [
            'name' => 'Changed',
        ])->assertStatus(404);

        $this->deleteJson('/api/v1/document-library/folders/'.$foreignFolder->id)
            ->assertStatus(404);

        $this->assertDatabaseHas('document_folders', [
            'id' => $foreignFolder->id,
            'name' => 'Foreign Folder',
        ]);
    }

    public function test_super_admin_root_tree_only_shows_current_facility_folders(): void
    {
        [$facility, $branch] = $this->createFacilityAndBranch();
        $otherFacility = Facility::factory()->create(['name' => 'Other Facility']);

        DocumentFolder::query()->withoutGlobalScopes()->create([
            'facility_id' => $facility->id,
            'parent_id' => null,
            'resident_id' => null,
            'name' => 'Current Facility Folder',
            'sort_order' => 0,
        ]);
        DocumentFolder::query()->withoutGlobalScopes()->create([
            'facility_id' => $otherFacility->id,
            'parent_id' => null,
            'resident_id' => null,
            'name' => 'Foreign Facility Folder',
            'sort_order' => 0,
        ]);

        $superAdmin = User::factory()->superAdmin()->create(['is_active' => true]);
        Sanctum::actingAs($superAdmin, ['*']);
        app()->instance('facility', $facility);

        $names = collect(
            $this->getJson('/api/v1/document-library/tree')
                ->assertOk()
                ->json('data.folders')
        )->pluck('name')->all();

        $this->assertContains('Current Facility Folder', $names);
        $this->assertNotContains('Foreign Facility Folder', $names);
        $this->assertNotNull($branch->id);
    }

    public function test_branch_admin_tree_root_excludes_other_branch_resident_and_facility_folders(): void
    {
        [$facility, $assignedBranch] = $this->createFacilityAndBranch();
        $otherBranch = Branch::factory()->create(['facility_id' => $facility->id]);

        DocumentFolder::query()->withoutGlobalScopes()->create([
            'facility_id' => $facility->id,
            'parent_id' => null,
            'resident_id' => null,
            'name' => 'Facility-licenses',
            'sort_order' => 0,
        ]);

        $ownResident = $this->createResident($assignedBranch);
        $otherResident = $this->createResident($otherBranch);

        $branchAdmin = User::factory()->create([
            'facility_id' => $facility->id,
            'assigned_branch_id' => $assignedBranch->id,
            'role' => 'admin',
            'is_active' => true,
        ]);

        Sanctum::actingAs($branchAdmin, ['*']);
        app()->instance('facility', $facility);

        $response = $this->getJson('/api/v1/document-library/tree');
        $response->assertOk();

        $names = collect($response->json('data.folders'))->pluck('name')->all();
        $this->assertNotContains('Facility-licenses', $names);
        $this->assertTrue(collect($names)->contains(fn ($n) => str_contains((string) $n, $ownResident->name)));
        $this->assertFalse(collect($names)->contains(fn ($n) => str_contains((string) $n, $otherResident->name)));
    }

    public function test_branch_admin_cannot_download_file_for_other_branch_resident(): void
    {
        [$facility, $assignedBranch] = $this->createFacilityAndBranch();
        $otherBranch = Branch::factory()->create(['facility_id' => $facility->id]);
        $otherResident = $this->createResident($otherBranch);

        $folder = DocumentFolder::query()->withoutGlobalScopes()->create([
            'facility_id' => $facility->id,
            'parent_id' => null,
            'resident_id' => $otherResident->id,
            'name' => 'Other Branch Docs',
            'sort_order' => 0,
        ]);

        $branchAdmin = User::factory()->create([
            'facility_id' => $facility->id,
            'assigned_branch_id' => $assignedBranch->id,
            'role' => 'admin',
            'is_active' => true,
        ]);

        Sanctum::actingAs($branchAdmin, ['*']);
        app()->instance('facility', $facility);

        $file = DocumentFile::query()->withoutGlobalScopes()->create([
            'facility_id' => $facility->id,
            'folder_id' => $folder->id,
            'display_name' => 'secret.pdf',
            'storage_path' => 'never',
            'original_filename' => 'secret.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1,
            'uploaded_by' => $branchAdmin->id,
        ]);

        $this->get('/api/v1/document-library/files/'.$file->id.'/download')
            ->assertStatus(403);
    }
}
