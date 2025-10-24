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
        Schema::create('sleep_patterns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->integer('month');
            $table->integer('year');
            $table->decimal('total_sleep_hours', 8, 2);
            $table->decimal('total_awake_hours', 8, 2);
            $table->decimal('avg_sleep_hours', 4, 2);
            $table->integer('days_with_records');
            $table->time('common_sleep_time')->nullable();
            $table->time('common_wake_time')->nullable();
            $table->integer('sleep_quality_score')->nullable();
            $table->text('key_observations')->nullable();
            $table->timestamps();
            
            $table->unique(['resident_id', 'month', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sleep_patterns');
    }
};
