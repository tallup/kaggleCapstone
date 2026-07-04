<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Use the complete database seeder which seeds ALL tables
        // For production: Use CompleteDatabaseSeeder
        // For development with more data: Use ComprehensiveSeeder
        $this->call([
            CompleteDatabaseSeeder::class,
            FacilitySettingsSeeder::class,
            FaxModuleSeeder::class,
            DemoDataBackfillSeeder::class,
        ]);

        // Alternative: Use ComprehensiveSeeder for development (creates more test data)
        // $this->call([
        //     UnifiedProductionSeeder::class,
        //     ComprehensiveSeeder::class,
        // ]);
    }
}
