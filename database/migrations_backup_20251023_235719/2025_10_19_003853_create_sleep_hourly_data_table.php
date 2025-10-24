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
        Schema::create('sleep_hourly_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sleep_pattern_id')->constrained()->onDelete('cascade');
            $table->decimal('hour_00', 3, 2)->default(0);
            $table->decimal('hour_01', 3, 2)->default(0);
            $table->decimal('hour_02', 3, 2)->default(0);
            $table->decimal('hour_03', 3, 2)->default(0);
            $table->decimal('hour_04', 3, 2)->default(0);
            $table->decimal('hour_05', 3, 2)->default(0);
            $table->decimal('hour_06', 3, 2)->default(0);
            $table->decimal('hour_07', 3, 2)->default(0);
            $table->decimal('hour_08', 3, 2)->default(0);
            $table->decimal('hour_09', 3, 2)->default(0);
            $table->decimal('hour_10', 3, 2)->default(0);
            $table->decimal('hour_11', 3, 2)->default(0);
            $table->decimal('hour_12', 3, 2)->default(0);
            $table->decimal('hour_13', 3, 2)->default(0);
            $table->decimal('hour_14', 3, 2)->default(0);
            $table->decimal('hour_15', 3, 2)->default(0);
            $table->decimal('hour_16', 3, 2)->default(0);
            $table->decimal('hour_17', 3, 2)->default(0);
            $table->decimal('hour_18', 3, 2)->default(0);
            $table->decimal('hour_19', 3, 2)->default(0);
            $table->decimal('hour_20', 3, 2)->default(0);
            $table->decimal('hour_21', 3, 2)->default(0);
            $table->decimal('hour_22', 3, 2)->default(0);
            $table->decimal('hour_23', 3, 2)->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sleep_hourly_data');
    }
};
