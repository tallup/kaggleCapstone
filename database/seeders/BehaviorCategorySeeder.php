<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\BehaviorCategory;

class BehaviorCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create basic behavior categories
        $categoryNames = [
            'Resistive',
            'Behavior',
            'Others',
            'Aggressive Behavior',
            'Wandering',
            'Sleep Disturbance',
            'Anxiety',
            'Depression',
            'Confusion',
            'Resistance to Care',
            'Social Withdrawal',
            'Repetitive Behavior',
            'Hallucinations'
        ];

        foreach ($categoryNames as $name) {
            BehaviorCategory::firstOrCreate(
                ['name' => $name],
                [
                    'description' => null,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $this->command->info('BehaviorCategorySeeder completed successfully!');
    }
}
