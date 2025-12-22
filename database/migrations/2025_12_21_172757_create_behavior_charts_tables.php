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
        Schema::create('behavior_charts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('caregiver_id')->constrained('users')->onDelete('cascade');
            $table->date('chart_date');
            $table->timestamp('submitted_at')->nullable();
            $table->string('status')->default('draft'); // draft, submitted
            $table->timestamps();
            
            // Allow only one chart per resident per day
            $table->unique(['resident_id', 'chart_date']);
        });

        Schema::create('behavior_chart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('behavior_chart_id')->constrained()->onDelete('cascade');
            $table->foreignId('behavior_definition_id')->constrained()->onDelete('cascade');
            $table->boolean('value')->default(false); // true = Yes, false = No
            $table->timestamps();

            // Ensure unique definition per chart
            $table->unique(['behavior_chart_id', 'behavior_definition_id'], 'chart_def_unique');
        });

        Schema::create('behavior_chart_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('behavior_chart_id')->constrained()->onDelete('cascade');
            $table->dateTime('occurred_at');
            $table->text('behavior_description');
            $table->text('triggers')->nullable();
            $table->text('caregiver_intervention')->nullable();
            $table->boolean('reported_to_provider')->default(false);
            $table->text('outcome')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('behavior_chart_logs');
        Schema::dropIfExists('behavior_chart_items');
        Schema::dropIfExists('behavior_charts');
    }
};
