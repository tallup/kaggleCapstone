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
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('assessor_id')->constrained('users')->onDelete('cascade');
            $table->enum('assessment_type', ['initial', 'periodic', 'focused', 'discharge']);
            $table->date('assessment_date');
            $table->enum('status', ['draft', 'submitted', 'reviewed', 'approved', 'archived'])->default('draft');
            $table->text('notes')->nullable();
            $table->json('scores')->nullable(); // Store section scores
            $table->json('recommendations')->nullable(); // Store care plan recommendations
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessments');
    }
};
