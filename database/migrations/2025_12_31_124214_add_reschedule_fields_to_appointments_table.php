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
        Schema::table('appointments', function (Blueprint $table) {
            $table->date('original_appointment_date')->nullable()->after('appointment_time');
            $table->time('original_appointment_time')->nullable()->after('original_appointment_date');
            $table->text('reschedule_reason')->nullable()->after('original_appointment_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['original_appointment_date', 'original_appointment_time', 'reschedule_reason']);
        });
    }
};
