<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('residents')) {
            return;
        }

        Schema::table('residents', function (Blueprint $table) {
            if (!Schema::hasColumn('residents', 'lifecycle_status')) {
                $table->string('lifecycle_status', 50)->default('active')->index();
            }
            if (!Schema::hasColumn('residents', 'lifecycle_status_changed_at')) {
                $table->timestamp('lifecycle_status_changed_at')->nullable();
            }
            if (!Schema::hasColumn('residents', 'temporary_status')) {
                $table->string('temporary_status', 50)->nullable()->index();
            }
            if (!Schema::hasColumn('residents', 'temporary_status_started_at')) {
                $table->timestamp('temporary_status_started_at')->nullable();
            }
            if (!Schema::hasColumn('residents', 'temporary_status_note')) {
                $table->text('temporary_status_note')->nullable();
            }
            if (!Schema::hasColumn('residents', 'discharge_reason')) {
                $table->string('discharge_reason')->nullable();
            }
            if (!Schema::hasColumn('residents', 'discharge_destination')) {
                $table->string('discharge_destination')->nullable();
            }
            if (!Schema::hasColumn('residents', 'discharge_notes')) {
                $table->text('discharge_notes')->nullable();
            }
        });

        DB::table('residents')
            ->whereIn('status', ['active', 'discharged', 'transferred', 'deceased'])
            ->update(['lifecycle_status' => DB::raw('status')]);

        DB::table('residents')
            ->where('is_active', true)
            ->whereNotIn('status', ['active', 'discharged', 'transferred', 'deceased'])
            ->update(['lifecycle_status' => 'active']);

        DB::table('residents')
            ->where('is_active', false)
            ->update(['lifecycle_status' => 'discharged']);

        DB::table('residents')
            ->whereNull('lifecycle_status')
            ->update(['lifecycle_status' => 'active']);
    }

    public function down(): void
    {
        if (!Schema::hasTable('residents')) {
            return;
        }

        Schema::table('residents', function (Blueprint $table) {
            foreach ([
                'discharge_notes',
                'discharge_destination',
                'discharge_reason',
                'temporary_status_note',
                'temporary_status_started_at',
                'temporary_status',
                'lifecycle_status_changed_at',
                'lifecycle_status',
            ] as $column) {
                if (Schema::hasColumn('residents', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
