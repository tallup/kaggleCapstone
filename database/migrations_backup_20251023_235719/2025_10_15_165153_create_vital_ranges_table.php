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
        Schema::create('vital_ranges', function (Blueprint $table) {
            $table->id();
            $table->string('parameter')->unique(); // systolic, diastolic, temperature, pulse, oxygen_saturation
            $table->decimal('min_normal', 8, 2)->nullable();
            $table->decimal('max_normal', 8, 2)->nullable();
            $table->decimal('min_warning', 8, 2)->nullable();
            $table->decimal('max_warning', 8, 2)->nullable();
            $table->decimal('min_critical', 8, 2)->nullable();
            $table->decimal('max_critical', 8, 2)->nullable();
            $table->string('unit')->nullable(); // mmHg, °F, BPM, %
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vital_ranges');
    }
};
