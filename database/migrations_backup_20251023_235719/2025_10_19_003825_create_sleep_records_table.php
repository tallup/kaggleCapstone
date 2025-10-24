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
        Schema::create('sleep_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained();
            $table->date('sleep_date');
            $table->time('sleep_time');
            $table->time('wake_time');
            $table->decimal('total_sleep_hours', 4, 2);
            $table->integer('sleep_quality')->nullable()->check('sleep_quality >= 1 AND sleep_quality <= 10');
            $table->integer('restlessness_episodes')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
            
            $table->index(['resident_id', 'sleep_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sleep_records');
    }
};
