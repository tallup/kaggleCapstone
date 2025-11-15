<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cleaning_tasks', function (Blueprint $table) {
            $table->time('window_start')->nullable()->after('frequency');
            $table->time('window_end')->nullable()->after('window_start');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cleaning_tasks', function (Blueprint $table) {
            $table->dropColumn(['window_start', 'window_end']);
        });
    }
};
