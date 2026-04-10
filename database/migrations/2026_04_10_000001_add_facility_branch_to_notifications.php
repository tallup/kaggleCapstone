<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('facility_id')->nullable()->after('user_id');
            $table->unsignedBigInteger('branch_id')->nullable()->after('facility_id');

            try { $table->index(['facility_id', 'user_id', 'is_read'], 'notif_facility_user_read_idx'); } catch (\Exception $e) {}
            try { $table->index(['user_id', 'type', 'created_at'], 'notif_user_type_created_idx'); } catch (\Exception $e) {}
        });
    }

    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            try { $table->dropIndex('notif_facility_user_read_idx'); } catch (\Exception $e) {}
            try { $table->dropIndex('notif_user_type_created_idx'); } catch (\Exception $e) {}
            $table->dropColumn(['facility_id', 'branch_id']);
        });
    }
};
