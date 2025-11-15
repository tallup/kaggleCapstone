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
        Schema::create('cleaning_areas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('shift_label')->nullable();
            $table->string('location')->nullable();
            $table->text('description')->nullable();
            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['branch_id', 'is_active']);
        });

        Schema::create('cleaning_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cleaning_area_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('instructions')->nullable();
            $table->enum('frequency', ['daily', 'weekly', 'monthly', 'adhoc'])->default('daily');
            $table->json('days_of_week')->nullable();
            $table->boolean('is_required')->default(true);
            $table->unsignedInteger('display_order')->default(0);
            $table->unsignedTinyInteger('estimated_minutes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['cleaning_area_id', 'is_active']);
        });

        Schema::create('cleaning_task_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cleaning_task_id')->constrained()->onDelete('cascade');
            $table->foreignId('cleaning_area_id')->constrained('cleaning_areas')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->date('scheduled_date');
            $table->string('shift_label')->nullable();
            $table->enum('status', ['pending', 'completed', 'skipped'])->default('pending');
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('initials', 8)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['scheduled_date', 'status']);
            $table->index(['branch_id', 'scheduled_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cleaning_task_logs');
        Schema::dropIfExists('cleaning_tasks');
        Schema::dropIfExists('cleaning_areas');
    }
};
