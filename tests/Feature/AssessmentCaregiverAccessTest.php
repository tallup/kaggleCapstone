<?php

namespace Tests\Feature;

use App\Models\Assessment;
use App\Models\AssessmentQuestion;
use App\Models\AssessmentSection;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;
use Tests\Traits\SetupFacility;

class AssessmentCaregiverAccessTest extends TestCase
{
    use RefreshDatabase;
    use SetupFacility;

    protected function setUp(): void
    {
        parent::setUp();
        $this->createFacilityAndBranch();
    }

    protected function actAsCaregiverOnBranch(): User
    {
        $caregiver = User::factory()->create([
            'facility_id' => $this->facility->id,
            'assigned_branch_id' => $this->branch->id,
            'role' => 'caregiver',
            'is_active' => true,
        ]);
        $caregiverRole = Role::firstOrCreate(
            ['name' => 'caregiver'],
            ['guard_name' => 'web'],
        );
        $caregiver->roles()->syncWithoutDetaching([$caregiverRole->id]);
        Sanctum::actingAs($caregiver, ['*']);
        app()->instance('facility', $this->facility);

        return $caregiver;
    }

    protected function seedAssessmentWithQuestion(): array
    {
        $admin = $this->createAndActAs('administrator');
        $resident = $this->createResident();

        $assessment = Assessment::create([
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'assessor_id' => $admin->id,
            'assessment_type' => 'Initial',
            'assessment_date' => now()->toDateString(),
            'status' => 'draft',
        ]);

        $section = AssessmentSection::create([
            'assessment_id' => $assessment->id,
            'section_type' => 'functional',
            'is_completed' => false,
        ]);

        $question = AssessmentQuestion::create([
            'assessment_section_id' => $section->id,
            'question_text' => 'Sample question?',
            'response_type' => 'text',
            'response_value' => null,
            'weight' => 1,
        ]);

        return [$assessment, $question];
    }

    public function test_caregiver_can_list_and_view_assessments(): void
    {
        [$assessment] = $this->seedAssessmentWithQuestion();

        $this->actAsCaregiverOnBranch();

        $this->getJson('/api/v1/assessments')->assertOk();
        $this->getJson('/api/v1/assessments/'.$assessment->id)->assertOk();
    }

    public function test_caregiver_cannot_mutate_assessments(): void
    {
        [$assessment, $question] = $this->seedAssessmentWithQuestion();
        $resident = $assessment->resident;

        $this->actAsCaregiverOnBranch();

        $this->postJson('/api/v1/assessments', [
            'resident_id' => $resident->id,
            'branch_id' => $this->branch->id,
            'assessment_type' => 'Follow-up',
            'assessment_date' => now()->toDateString(),
        ])->assertStatus(403);

        $this->putJson('/api/v1/assessments/'.$assessment->id, [
            'notes' => 'Changed by caregiver',
        ])->assertStatus(403);

        $this->deleteJson('/api/v1/assessments/'.$assessment->id)->assertStatus(403);

        $this->patchJson('/api/v1/assessments/'.$assessment->id.'/status', [
            'status' => 'reviewed',
        ])->assertStatus(403);

        $this->patchJson('/api/v1/assessments/'.$assessment->id.'/questions/'.$question->id, [
            'response_value' => 'Caregiver answer',
        ])->assertStatus(403);
    }
}
