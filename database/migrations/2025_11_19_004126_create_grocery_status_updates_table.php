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
        if (Schema::hasTable('grocery_status_updates')) {
            return;
        }
        
        Schema::create('grocery_status_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('updated_by')->constrained('users')->onDelete('cascade');
            $table->date('week_start_date'); // Monday of the week
            $table->enum('status', ['pending', 'in_progress', 'completed', 'needs_attention'])->default('pending');
            $table->text('items_needed')->nullable();
            $table->text('items_received')->nullable();
            $table->text('notes')->nullable();
            $table->datetime('completed_at')->nullable();
            $table->timestamps();
            
            $table->index(['branch_id', 'week_start_date']);
            $table->index('week_start_date');
            // Note: No unique constraint - allow multiple updates per branch per week
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grocery_status_updates');
    }
};
