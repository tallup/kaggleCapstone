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
        Schema::create('medication_administrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medication_id')->constrained()->onDelete('cascade');
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('administered_by')->constrained('users')->onDelete('cascade');
            $table->datetime('administered_at');
            $table->string('status')->default('taken'); // taken, missed, refused
            $table->text('notes')->nullable();
            $table->string('dosage_given')->nullable(); // e.g., "1 tablet", "2ml"
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medication_administrations');
    }
};
