<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\BehaviorCategory;
use App\Models\BehaviorDefinition;

class BehaviorDefinitionSeeder extends Seeder
{
    public function run(): void
    {
        $data = [
            'Resistive' => [
                'Resistive to care',
                'Resistive to medication',
                'Resistive to meals',
                'Resistive to bathing',
            ],
            'Behavior' => [
                'Pacing',
                'Wandering',
                'Screaming',
                'Agitation',
                'Aggression',
                'Sunbounding',
            ],
            'Others' => [
                'Insomnia',
                'Anxiety',
                'Hallucinations',
                'Exit Seeking',
            ],
        ];

        foreach ($data as $categoryName => $definitions) {
            $category = BehaviorCategory::where('name', $categoryName)->first();
            if ($category) {
                foreach ($definitions as $defName) {
                    BehaviorDefinition::updateOrCreate(
                        [
                            'behavior_category_id' => $category->id,
                            'name' => $defName,
                        ],
                        [
                            'is_active' => true,
                        ]
                    );
                }
            }
        }
    }
}
