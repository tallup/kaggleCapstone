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
        Schema::create('cleaning_task_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cleaning_task_id')->constrained('cleaning_tasks')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('scheduled_date');
            $table->enum('status', ['assigned', 'acknowledged', 'completed', 'overdue'])->default('assigned');
            $table->timestamp('notified_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();

            $table->unique(['cleaning_task_id', 'user_id', 'scheduled_date'], 'task_user_date_unique');
            $table->index(['user_id', 'scheduled_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cleaning_task_assignments');
    }
};
