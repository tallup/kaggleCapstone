<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Backfill facility_id from each notification's user (SQLite-compatible)
        DB::statement("
            UPDATE notifications
            SET facility_id = (
                SELECT users.facility_id FROM users WHERE users.id = notifications.user_id
            )
            WHERE facility_id IS NULL
            AND EXISTS (
                SELECT 1 FROM users WHERE users.id = notifications.user_id AND users.facility_id IS NOT NULL
            )
        ");

        // Backfill branch_id from users.assigned_branch_id
        DB::statement("
            UPDATE notifications
            SET branch_id = (
                SELECT users.assigned_branch_id FROM users WHERE users.id = notifications.user_id
            )
            WHERE branch_id IS NULL
            AND EXISTS (
                SELECT 1 FROM users WHERE users.id = notifications.user_id AND users.assigned_branch_id IS NOT NULL
            )
        ");
    }

    public function down(): void
    {
        // No rollback — data-only migration
    }
};
