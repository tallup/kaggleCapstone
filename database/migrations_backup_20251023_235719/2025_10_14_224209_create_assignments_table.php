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
        Schema::create('assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caregiver_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->timestamp('assigned_at');
            $table->foreignId('assigned_by')->constrained('users')->onDelete('cascade');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            
            // Unique constraint to prevent duplicate active assignments
            $table->unique(['caregiver_id', 'resident_id', 'is_active'], 'unique_active_assignment');
            
            // Indexes for performance
            $table->index(['branch_id', 'is_active']);
            $table->index(['caregiver_id', 'is_active']);
            $table->index(['resident_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};
