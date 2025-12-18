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
        if (Schema::hasTable('staff_email_preferences')) {
            return;
        }
        
        Schema::create('staff_email_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade')->comment('If null, applies to all facility users as default');
            
            // Notification type preferences
            $table->boolean('late_medication_enabled')->default(true)->comment('Receive emails for late medications');
            $table->boolean('late_vital_sign_enabled')->default(true)->comment('Receive emails for late vital signs');
            $table->boolean('appointment_reminder_enabled')->default(true)->comment('Receive emails for appointment reminders');
            $table->boolean('incident_alert_enabled')->default(true)->comment('Receive emails for incident alerts');
            $table->boolean('resident_sign_out_enabled')->default(true)->comment('Receive emails for resident sign-outs');
            $table->boolean('medication_administration_enabled')->default(true)->comment('Receive emails for medication administrations');
            $table->boolean('critical_vital_sign_enabled')->default(true)->comment('Receive emails for critical vital signs');
            $table->boolean('daily_summary_enabled')->default(false)->comment('Receive daily summary emails');
            
            // Global email toggle
            $table->boolean('email_enabled')->default(true)->comment('Master toggle for all email notifications');
            
            // Frequency settings
            $table->string('frequency')->default('immediate')->comment('immediate, daily_digest, weekly_digest');
            $table->time('digest_time')->nullable()->comment('Time to send digest emails (if frequency is digest)');
            
            $table->timestamps();

            $table->unique(['facility_id', 'user_id']);
            $table->index(['facility_id']);
            $table->index(['user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('staff_email_preferences');
    }
};
