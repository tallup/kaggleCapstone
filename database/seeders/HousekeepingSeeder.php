<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Branch;
use App\Models\CleaningArea;
use App\Models\CleaningTask;

class HousekeepingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $branch = Branch::first();

        if (!$branch) {
            $this->command?->warn('No branches found. Skipping housekeeping seeder.');
            return;
        }

        $areas = [
            [
                'name' => 'Kitchen & Dining',
                'shift_label' => 'Day Shift',
                'location' => 'Main Level',
                'description' => 'Prep area, residents\' snacks, meal cleanup.',
                'display_order' => 1,
                'tasks' => [
                    [
                        'title' => 'Sanitize counters & prep tables',
                        'instructions' => 'Use approved disinfectant after each meal service.',
                        'frequency' => 'daily',
                        'is_required' => true,
                        'display_order' => 1,
                    ],
                    [
                        'title' => 'Wipe microwave & appliances',
                        'instructions' => 'Inside/outside microwave, fridge handles, dishwasher door.',
                        'frequency' => 'daily',
                        'is_required' => true,
                        'display_order' => 2,
                    ],
                    [
                        'title' => 'Sweep & spot mop floors',
                        'frequency' => 'daily',
                        'is_required' => true,
                        'display_order' => 3,
                    ],
                    [
                        'title' => 'Deep clean fridge shelves',
                        'instructions' => 'Remove leftovers, wipe shelves, document discarded food.',
                        'frequency' => 'weekly',
                        'days_of_week' => ['monday'],
                        'display_order' => 10,
                    ],
                ],
            ],
            [
                'name' => 'Common Area / Living Room',
                'shift_label' => 'Swing Shift',
                'location' => 'Main Level',
                'description' => 'Resident lounge and TV area.',
                'display_order' => 2,
                'tasks' => [
                    [
                        'title' => 'Sanitize tables & remote controls',
                        'frequency' => 'daily',
                        'display_order' => 1,
                    ],
                    [
                        'title' => 'Reset furniture & pillows',
                        'instructions' => 'Stage recliners, fold blankets, ensure walking paths.',
                        'frequency' => 'daily',
                        'display_order' => 2,
                    ],
                    [
                        'title' => 'Dust wall décor & railings',
                        'frequency' => 'weekly',
                        'days_of_week' => ['wednesday'],
                        'display_order' => 5,
                    ],
                ],
            ],
            [
                'name' => 'Float #1 (RM 2-3)',
                'shift_label' => 'Night Float',
                'location' => 'East Wing',
                'description' => 'Rooms 2-3 bathrooms, hall touchpoints, trash.',
                'display_order' => 3,
                'tasks' => [
                    [
                        'title' => 'Restock PPE & paper goods',
                        'instructions' => 'Gloves, masks, paper towels outside rooms 2 & 3.',
                        'frequency' => 'daily',
                        'display_order' => 1,
                    ],
                    [
                        'title' => 'Disinfect door handles & rails',
                        'frequency' => 'daily',
                        'display_order' => 2,
                    ],
                    [
                        'title' => 'Detail clean shower & tub',
                        'frequency' => 'weekly',
                        'days_of_week' => ['friday'],
                        'display_order' => 5,
                    ],
                ],
            ],
            [
                'name' => 'Laundry / Utility',
                'shift_label' => 'Day Float',
                'location' => 'Lower Level',
                'description' => 'Resident laundry, supply closet, lint traps.',
                'display_order' => 4,
                'tasks' => [
                    [
                        'title' => 'Run individual laundry loads',
                        'instructions' => 'Follow posted schedule, note any stains or missing items.',
                        'frequency' => 'daily',
                        'display_order' => 1,
                    ],
                    [
                        'title' => 'Sanitize folding table & hampers',
                        'frequency' => 'daily',
                        'display_order' => 2,
                    ],
                    [
                        'title' => 'Clean dryer lint traps & vents',
                        'frequency' => 'weekly',
                        'days_of_week' => ['tuesday', 'saturday'],
                        'display_order' => 5,
                    ],
                ],
            ],
        ];

        foreach ($areas as $areaData) {
            $tasks = $areaData['tasks'] ?? [];
            unset($areaData['tasks']);

            $area = CleaningArea::updateOrCreate(
                [
                    'branch_id' => $branch->id,
                    'name' => $areaData['name'],
                ],
                array_merge($areaData, [
                    'branch_id' => $branch->id,
                    'is_active' => $areaData['is_active'] ?? true,
                ])
            );

            foreach ($tasks as $taskData) {
                CleaningTask::updateOrCreate(
                    [
                        'cleaning_area_id' => $area->id,
                        'title' => $taskData['title'],
                    ],
                    array_merge([
                        'cleaning_area_id' => $area->id,
                        'instructions' => $taskData['instructions'] ?? null,
                        'frequency' => $taskData['frequency'] ?? 'daily',
                        'days_of_week' => $taskData['days_of_week'] ?? null,
                        'is_required' => $taskData['is_required'] ?? true,
                        'display_order' => $taskData['display_order'] ?? 0,
                        'estimated_minutes' => $taskData['estimated_minutes'] ?? null,
                        'is_active' => $taskData['is_active'] ?? true,
                    ])
                );
            }
        }

        $this->command?->info('Housekeeping areas and tasks seeded successfully.');
    }
}
