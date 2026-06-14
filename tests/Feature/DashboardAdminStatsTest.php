<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\Branch;
use App\Models\Facility;
use App\Models\FireDrill;
use App\Models\Resident;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardAdminStatsTest extends TestCase
{
    use RefreshDatabase;

    private function createAdminWithContext(): array
    {
        $facility = Facility::create([
            'name' => 'Test Facility',
            'is_active' => true,
        ]);

        $branch = Branch::create([
            'name' => 'Main Branch',
            'facility_id' => $facility->id,
            'is_active' => true,
        ]);

        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'password' => bcrypt('password'),
            'role' => 'administrator',
            'facility_id' => $facility->id,
            'assigned_branch_id' => $branch->id,
            'is_active' => true,
        ]);

        return [$admin, $facility, $branch];
    }

    public function test_admin_with_facility_gets_dashboard_stats_without_error(): void
    {
        [$admin, $facility, $branch] = $this->createAdminWithContext();

        // Seed minimal data
        $resident = Resident::create([
            'first_name' => 'John',
            'last_name' => 'Doe',
            'name' => 'John Doe',
            'branch_id' => $branch->id,
            'is_active' => true,
            'date_of_birth' => '1950-01-01',
            'gender' => 'male',
            'admission_date' => '2020-01-01',
        ]);

        Appointment::create([
            'branch_id' => $branch->id,
            'resident_id' => $resident->id,
            'appointment_date' => Carbon::today(),
            'appointment_time' => '09:00:00',
            'status' => 'scheduled',
            'title' => 'Checkup',
            'created_by' => $admin->id,
        ]);

        $response = $this
            ->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/dashboard/stats');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'total_residents',
                'today_appointments',
                'upcoming_appointments',
                'module_resource_counts' => [
                    'assessments',
                    'sleep',
                    'housekeeping',
                    'incidents',
                    'grocery',
                    'pharmacy',
                    'billing',
                    'fireDrills',
                ],
            ],
        ]);
    }

    public function test_admin_with_facility_gets_upcoming_events_without_500(): void
    {
        [$admin, $facility, $branch] = $this->createAdminWithContext();

        $resident = Resident::create([
            'first_name' => 'Jane',
            'last_name' => 'Smith',
            'name' => 'Jane Smith',
            'branch_id' => $branch->id,
            'is_active' => true,
            'date_of_birth' => '1955-02-02',
            'gender' => 'female',
            'admission_date' => '2021-02-02',
        ]);

        Appointment::create([
            'branch_id' => $branch->id,
            'resident_id' => $resident->id,
            'appointment_date' => Carbon::today()->addDay(),
            'appointment_time' => '11:00:00',
            'status' => 'scheduled',
            'title' => 'Follow-up',
            'created_by' => $admin->id,
        ]);

        FireDrill::create([
            'branch_id' => $branch->id,
            'scheduled_date' => Carbon::today()->addDays(2),
            'scheduled_time' => '10:00:00',
            'status' => 'scheduled',
            'created_by' => $admin->id,
        ]);

        $response = $this
            ->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/dashboard/upcoming-events?limit=5');

        $response->assertOk();
        $this->assertTrue($response->json('data') === null || is_array($response->json('data')));
    }
}
