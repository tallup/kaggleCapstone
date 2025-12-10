<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Facility;
use App\Models\Branch;
use App\Models\FireDrillTemplate;
use App\Models\FireDrill;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

class FireDrillTemplateTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(Facility $facility, Branch $branch): User
    {
        $user = User::factory()->create([
            'facility_id' => $facility->id,
            'assigned_branch_id' => $branch->id,
            'role' => 'administrator',
            'is_active' => true,
        ]);

        Sanctum::actingAs($user, ['*']);
        app()->instance('facility', $facility);

        return $user;
    }

    public function test_create_drills_from_template_generates_recurring_dates(): void
    {
        $facility = Facility::create(['name' => 'Alpha', 'is_active' => true]);
        $branch = Branch::create(['name' => 'Alpha Main', 'facility_id' => $facility->id]);
        $user = $this->actingAsAdmin($facility, $branch);

        $template = FireDrillTemplate::create([
            'branch_id' => $branch->id,
            'name' => 'Monthly Safety',
            'frequency' => 'monthly',
            'day_of_month' => 15,
            'scheduled_time' => '09:00:00',
            'created_by' => $user->id,
        ]);

        $response = $this->postJson('/api/v1/fire-drills/from-template', [
            'template_id' => $template->id,
            'start_date' => '2025-01-10',
            'occurrences' => 2,
        ]);

        $response->assertStatus(201);
        $this->assertCount(2, $response->json('data'));

        $dates = collect($response->json('data'))
            ->pluck('scheduled_date')
            ->map(fn($d) => substr($d, 0, 10))
            ->all();
        $this->assertEquals(['2025-01-15', '2025-02-15'], $dates);
    }

    public function test_quick_actions_complete_and_cancel(): void
    {
        $facility = Facility::create(['name' => 'Alpha', 'is_active' => true]);
        $branch = Branch::create(['name' => 'Alpha Main', 'facility_id' => $facility->id]);
        $user = $this->actingAsAdmin($facility, $branch);

        $drill = FireDrill::create([
            'branch_id' => $branch->id,
            'scheduled_date' => '2025-02-01',
            'scheduled_time' => '10:00:00',
            'status' => 'scheduled',
            'created_by' => $user->id,
        ]);

        $this->postJson("/api/v1/fire-drills/{$drill->id}/mark-complete")
            ->assertStatus(200);
        $drill->refresh();
        $this->assertEquals('completed', $drill->status);

        $drill2 = FireDrill::create([
            'branch_id' => $branch->id,
            'scheduled_date' => '2025-03-01',
            'scheduled_time' => '11:00:00',
            'status' => 'scheduled',
            'created_by' => $user->id,
        ]);

        $this->postJson("/api/v1/fire-drills/{$drill2->id}/cancel")
            ->assertStatus(200);
        $drill2->refresh();
        $this->assertEquals('cancelled', $drill2->status);
    }
}

