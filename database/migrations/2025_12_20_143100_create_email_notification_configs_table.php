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
        if (Schema::hasTable('email_notification_configs')) {
            return;
        }
        
        Schema::create('email_notification_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained()->onDelete('cascade');
            $table->string('notification_type')->comment('e.g., task_assignment, late_medication, etc.');
            $table->string('module')->nullable()->comment('Optional grouping like medications, tasks, appointments');
            $table->boolean('enabled')->default(true)->comment('Whether this notification type is enabled');
            $table->json('recipient_roles')->nullable()->comment('Array of role names that should receive emails');
            $table->json('recipient_user_ids')->nullable()->comment('Array of specific user IDs that should receive emails');
            
            $table->timestamps();
            
            $table->unique(['facility_id', 'notification_type']);
            $table->index(['facility_id']);
            $table->index(['notification_type']);
            $table->index(['module']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_notification_configs');
    }
};

