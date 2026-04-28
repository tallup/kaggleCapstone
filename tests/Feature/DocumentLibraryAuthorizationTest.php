<?php

namespace Tests\Feature;

use App\Models\DocumentFolder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
