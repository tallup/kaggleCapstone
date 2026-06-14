<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\EmployeeDocument;
use App\Models\Facility;
use App\Models\Incident;
use App\Models\IncidentAttachment;
use App\Models\ResidentDocument;
use App\Models\TLog;
use App\Models\TLogAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class PreLaunchDocumentAccessTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    private Facility $otherFacility;

    private Branch $otherBranch;

    protected function setUp(): void
    {
        parent::setUp();

        $this->createFacilityAndBranch('Owner Facility');

        $this->otherFacility = Facility::factory()->create(['name' => 'Other Facility']);
        $this->otherBranch = Branch::factory()->create([
            'facility_id' => $this->otherFacility->id,
            'name' => 'Other Branch',
        ]);
    }

    public function test_facility_admin_cannot_list_resident_documents_from_other_facility(): void
    {
        $this->createAndActAs('administrator');
        $ownResident = $this->createResident($this->branch);
        $foreignResident = $this->createResident($this->otherBranch);

        $ownDocument = $this->residentDocumentFor($ownResident->id, 'own.pdf');
        $foreignDocument = $this->residentDocumentFor($foreignResident->id, 'foreign.pdf');

        $response = $this->getJson('/api/v1/resident-documents');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();
        $this->assertContains($ownDocument->id, $ids);
        $this->assertNotContains($foreignDocument->id, $ids);
    }

    public function test_facility_admin_cannot_show_download_update_or_delete_foreign_resident_document(): void
    {
        Storage::fake('public');

        $this->createAndActAs('administrator');
        $foreignResident = $this->createResident($this->otherBranch);
        $foreignDocument = $this->residentDocumentFor($foreignResident->id, 'foreign.pdf');
        Storage::disk('public')->put($foreignDocument->file_path, 'foreign document');

        $this->getJson("/api/v1/resident-documents/{$foreignDocument->id}")
            ->assertStatus(404);

        $this->get("/api/v1/resident-documents/{$foreignDocument->id}/download")
            ->assertStatus(404);

        $this->putJson("/api/v1/resident-documents/{$foreignDocument->id}", [
            'document_name' => 'Changed',
            'document_type' => 'medical',
        ])->assertStatus(404);

        $this->deleteJson("/api/v1/resident-documents/{$foreignDocument->id}")
            ->assertStatus(404);

        $this->assertDatabaseHas('resident_documents', [
            'id' => $foreignDocument->id,
            'document_name' => 'foreign.pdf',
        ]);
    }

    public function test_resident_document_show_does_not_expose_public_storage_url(): void
    {
        $this->createAndActAs('administrator');
        $resident = $this->createResident($this->branch);
        $document = $this->residentDocumentFor($resident->id, 'own.pdf');

        $response = $this->getJson("/api/v1/resident-documents/{$document->id}");

        $response->assertOk();
        $this->assertStringNotContainsString('/storage/', (string) $response->json('file_url'));
        $this->assertSame("/api/v1/resident-documents/{$document->id}/download", $response->json('download_url'));
    }

    public function test_employee_document_show_uses_controlled_download_url(): void
    {
        $staff = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'caregiver',
            'is_active' => true,
        ]);
        $this->createAndActAs('administrator');
        $document = $this->employeeDocumentFor($staff->id, 'staff.pdf');

        $response = $this->getJson("/api/v1/employee-documents/{$document->id}");

        $response->assertOk();
        $this->assertStringNotContainsString('/storage/', (string) $response->json('file_url'));
        $this->assertSame("/api/v1/employee-documents/{$document->id}/download", $response->json('download_url'));
    }

    public function test_facility_admin_cannot_download_foreign_employee_document(): void
    {
        $foreignStaff = User::factory()->create([
            'facility_id' => $this->otherFacility->id,
            'assigned_branch_id' => $this->otherBranch->id,
            'role' => 'caregiver',
            'is_active' => true,
        ]);
        $this->createAndActAs('administrator');
        $document = $this->employeeDocumentFor($foreignStaff->id, 'foreign-staff.pdf');

        $this->get("/api/v1/employee-documents/{$document->id}/download")
            ->assertStatus(404);
    }

    public function test_t_log_attachment_uses_controlled_download_url(): void
    {
        $this->createAndActAs('administrator');
        $resident = $this->createResident($this->branch);
        $tLog = $this->tLogFor($resident->id, $this->branch->id);
        $attachment = $this->tLogAttachmentFor($tLog->id, 'note.pdf');

        $response = $this->getJson("/api/v1/t-logs/{$tLog->id}");

        $response->assertOk();
        $fileUrl = $response->json('attachments.0.file_url');
        $this->assertStringNotContainsString('/storage/', (string) $fileUrl);
        $this->assertSame("/api/v1/t-logs/{$tLog->id}/attachments/{$attachment->id}/download", $fileUrl);
    }

    public function test_incident_attachment_uses_controlled_download_url_and_blocks_foreign_download(): void
    {
        $this->createAndActAs('administrator');
        $ownResident = $this->createResident($this->branch);
        $ownIncident = $this->incidentFor($ownResident->id, $this->branch->id);
        $ownAttachment = $this->incidentAttachmentFor($ownIncident->id, 'incident.pdf');

        $response = $this->getJson("/api/v1/incidents/{$ownIncident->id}");

        $response->assertOk();
        $fileUrl = $response->json('attachments.0.file_url');
        $this->assertStringNotContainsString('/storage/', (string) $fileUrl);
        $this->assertSame("/api/v1/incidents/{$ownIncident->id}/attachments/{$ownAttachment->id}/download", $fileUrl);

        $foreignResident = $this->createResident($this->otherBranch);
        $foreignIncident = $this->incidentFor($foreignResident->id, $this->otherBranch->id);
        $foreignAttachment = $this->incidentAttachmentFor($foreignIncident->id, 'foreign-incident.pdf');

        $this->get("/api/v1/incidents/{$foreignIncident->id}/attachments/{$foreignAttachment->id}/download")
            ->assertStatus(404);
    }

    private function residentDocumentFor(int $residentId, string $name): ResidentDocument
    {
        return ResidentDocument::query()->create([
            'resident_id' => $residentId,
            'document_name' => $name,
            'document_type' => 'medical',
            'file_path' => 'resident-documents/'.$name,
            'file_name' => $name,
            'file_size' => 12,
            'mime_type' => 'application/pdf',
            'uploaded_by' => auth()->id(),
            'notes' => null,
        ]);
    }

    private function employeeDocumentFor(int $userId, string $name): EmployeeDocument
    {
        return EmployeeDocument::query()->create([
            'user_id' => $userId,
            'document_name' => $name,
            'document_type' => 'contract',
            'file_path' => 'employee-documents/'.$name,
            'file_name' => $name,
            'file_size' => 12,
            'mime_type' => 'application/pdf',
            'expiration_date' => null,
            'is_expired' => false,
            'notes' => null,
            'is_active' => true,
        ]);
    }

    private function tLogFor(int $residentId, int $branchId): TLog
    {
        return TLog::withoutGlobalScopes()->create([
            'resident_id' => $residentId,
            'branch_id' => $branchId,
            'types' => ['notes'],
            'notification_level' => 'low',
            'summary' => 'Progress note',
            'description' => 'Progress note body',
            'reporter_id' => auth()->id(),
            'reported_on' => now(),
            'entered_by_id' => auth()->id(),
        ]);
    }

    private function tLogAttachmentFor(int $tLogId, string $name): TLogAttachment
    {
        return TLogAttachment::query()->create([
            't_log_id' => $tLogId,
            'file_path' => 't-log-attachments/'.$name,
            'file_name' => $name,
            'file_size' => 12,
            'mime_type' => 'application/pdf',
            'uploaded_by' => auth()->id(),
            'description' => null,
        ]);
    }

    private function incidentFor(int $residentId, int $branchId): Incident
    {
        return Incident::withoutGlobalScopes()->create([
            'resident_id' => $residentId,
            'branch_id' => $branchId,
            'incident_type' => 'Fall',
            'description' => 'Incident body',
            'incident_date' => now(),
            'location' => 'Bedroom',
            'severity' => 'low',
            'priority' => 'low',
            'status' => Incident::STATUS_OPEN,
            'reported_by' => auth()->id(),
        ]);
    }

    private function incidentAttachmentFor(int $incidentId, string $name): IncidentAttachment
    {
        return IncidentAttachment::query()->create([
            'incident_id' => $incidentId,
            'file_path' => 'incident-attachments/'.$name,
            'file_name' => $name,
            'file_type' => 'document',
            'file_size' => 12,
            'mime_type' => 'application/pdf',
            'uploaded_by' => auth()->id(),
            'description' => null,
        ]);
    }
}
