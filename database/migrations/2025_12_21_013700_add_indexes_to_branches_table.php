<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            // Get existing indexes to avoid errors if they already exist
            $driver = DB::getDriverName();
            $indexes = [];
            
            try {
                if ($driver === 'mysql' || $driver === 'mariadb') {
                    $existingIndexes = DB::select("SHOW INDEXES FROM branches WHERE Key_name != 'PRIMARY'");
                    $indexes = collect($existingIndexes)->pluck('Key_name')->unique()->toArray();
                } elseif ($driver === 'pgsql') {
                    $existingIndexes = DB::select("
                        SELECT indexname 
                        FROM pg_indexes 
                        WHERE tablename = 'branches' 
                        AND indexname != 'branches_pkey'
                    ");
                    $indexes = collect($existingIndexes)->pluck('indexname')->toArray();
                }
                // SQLite doesn't easily expose index names via query, so we'll use try-catch below
            } catch (\Exception $e) {
                // If we can't get indexes, proceed with try-catch for each index
                $indexes = [];
            }

            // Add single index on facility_id (critical for whereHas queries)
            // Use try-catch for SQLite and as fallback for other databases
            if (!in_array('branches_facility_id_index', $indexes)) {
                try {
                    $table->index('facility_id', 'branches_facility_id_index');
                } catch (\Exception $e) {
                    // Index might already exist (especially in SQLite), skip silently
                }
            }

            // Add composite index on facility_id and is_active (common filtering pattern)
            if (!in_array('branches_facility_id_is_active_index', $indexes)) {
                try {
                    $table->index(['facility_id', 'is_active'], 'branches_facility_id_is_active_index');
                } catch (\Exception $e) {
                    // Index might already exist (especially in SQLite), skip silently
                }
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            // Drop indexes if they exist
            try {
                $table->dropIndex('branches_facility_id_index');
            } catch (\Exception $e) {
                // Index doesn't exist, skip
            }

            try {
                $table->dropIndex('branches_facility_id_is_active_index');
            } catch (\Exception $e) {
                // Index doesn't exist, skip
            }
        });
    }
};

