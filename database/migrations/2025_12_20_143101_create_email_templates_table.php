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
        if (Schema::hasTable('email_templates')) {
            return;
        }
        
        Schema::create('email_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained()->onDelete('cascade');
            $table->string('notification_type')->comment('e.g., task_assignment, late_medication, etc.');
            $table->string('module')->nullable()->comment('Optional grouping like medications, tasks, appointments');
            $table->text('subject_template')->comment('Email subject with variables like {{taskTitle}}');
            $table->text('html_template')->comment('HTML email content with variables');
            $table->boolean('is_active')->default(true)->comment('Whether this template is active');
            
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
        Schema::dropIfExists('email_templates');
    }
};

