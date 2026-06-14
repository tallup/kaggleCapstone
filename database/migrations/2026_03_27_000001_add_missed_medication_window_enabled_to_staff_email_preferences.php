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
        if (Schema::hasColumn('staff_email_preferences', 'missed_medication_window_enabled')) {
            return;
        }
        Schema::table('staff_email_preferences', function (Blueprint $table) {
            $table->boolean('missed_medication_window_enabled')
                ->default(true)
                ->comment('Admins: email when a medication window closes without administration');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('staff_email_preferences', function (Blueprint $table) {
            $table->dropColumn('missed_medication_window_enabled');
        });
    }
};
