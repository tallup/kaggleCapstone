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
        $driver = DB::getDriverName();

        // Add composite index on residents table for common query patterns
        if (Schema::hasTable('residents')) {
            Schema::table('residents', function (Blueprint $table) use ($driver) {
                $indexes = $this->getExistingIndexes('residents', $driver);
                
                // Add composite index for branch_id + is_active + status (common filtering pattern)
                if (!in_array('residents_branch_id_is_active_status_index', $indexes)) {
                    try {
                        $table->index(['branch_id', 'is_active', 'status'], 'residents_branch_id_is_active_status_index');
                    } catch (\Exception $e) {
                        // Index might already exist, skip
                    }
                }
            });
        }

        // Add composite index on appointments table for common query patterns
        if (Schema::hasTable('appointments')) {
            Schema::table('appointments', function (Blueprint $table) use ($driver) {
                $indexes = $this->getExistingIndexes('appointments', $driver);
                
                // Add composite index for branch_id + status + appointment_date (common filtering pattern)
                if (!in_array('appointments_branch_id_status_date_index', $indexes)) {
                    try {
                        $table->index(['branch_id', 'status', 'appointment_date'], 'appointments_branch_id_status_date_index');
                    } catch (\Exception $e) {
                        // Index might already exist, skip
                    }
                }
            });
        }
    }

    /**
     * Get existing indexes for a table
     */
    private function getExistingIndexes(string $tableName, string $driver): array
    {
        $indexes = [];
        
        try {
            if ($driver === 'mysql' || $driver === 'mariadb') {
                $existingIndexes = DB::select("SHOW INDEXES FROM {$tableName} WHERE Key_name != 'PRIMARY'");
                $indexes = collect($existingIndexes)->pluck('Key_name')->unique()->toArray();
            } elseif ($driver === 'pgsql') {
                $existingIndexes = DB::select("
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE tablename = ? 
                    AND indexname != ?
                ", [$tableName, $tableName . '_pkey']);
                $indexes = collect($existingIndexes)->pluck('indexname')->toArray();
            }
            // SQLite doesn't easily expose index names, so we'll use try-catch in the migration
        } catch (\Exception $e) {
            // If we can't get indexes, return empty array and rely on try-catch
        }
        
        return $indexes;
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('residents')) {
            Schema::table('residents', function (Blueprint $table) {
                try {
                    $table->dropIndex('residents_branch_id_is_active_status_index');
                } catch (\Exception $e) {
                    // Index doesn't exist, skip
                }
            });
        }

        if (Schema::hasTable('appointments')) {
            Schema::table('appointments', function (Blueprint $table) {
                try {
                    $table->dropIndex('appointments_branch_id_status_date_index');
                } catch (\Exception $e) {
                    // Index doesn't exist, skip
                }
            });
        }
    }
};

