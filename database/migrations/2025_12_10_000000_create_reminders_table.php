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
        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('facility_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('category')->default('general'); // medication, bill, appointment, renewal, general
            $table->text('description')->nullable();
            $table->string('channel')->default('in_app'); // in_app, email (future)
            $table->string('schedule_type')->default('one_time'); // one_time, recurring
            $table->timestamp('due_at')->nullable(); // for one-time reminders
            $table->json('recurrence_pattern')->nullable(); // structured JSON for recurring rules
            $table->string('status')->default('active'); // active, paused, completed, cancelled
            $table->string('action_url')->nullable();
            $table->json('metadata')->nullable(); // resident_id, invoice_id, document info, etc.
            $table->timestamp('last_scheduled_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['facility_id', 'status']);
            $table->index(['schedule_type', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};

