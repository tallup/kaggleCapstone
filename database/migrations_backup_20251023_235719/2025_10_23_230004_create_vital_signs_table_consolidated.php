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
        Schema::create('vital_signs', function (Blueprint $table) {
            $table->id();
            $table->date('measurement_date');
            $table->integer('systolic')->nullable();
            $table->integer('diastolic')->nullable();
            $table->decimal('temperature', 5, 2)->nullable();
            $table->integer('pulse')->nullable();
            $table->integer('oxygen_saturation')->nullable();
            $table->integer('pain_level')->nullable();
            $table->string('pain_description')->nullable();
            $table->text('reason_declined')->nullable();
            $table->enum('status', ['approved', 'pending_review', 'declined', 'critical'])->default('pending_review');
            $table->text('notes')->nullable();
            $table->foreignId('taken_by')->nullable()->constrained('users');
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vital_signs');
    }
};
