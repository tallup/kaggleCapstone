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
        Schema::create('assessment_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_section_id')->constrained()->onDelete('cascade');
            $table->string('question_text');
            $table->enum('response_type', ['text', 'number', 'select', 'radio', 'checkbox', 'date']);
            $table->json('response_options')->nullable(); // For select, radio, checkbox options
            $table->text('response_value')->nullable();
            $table->text('notes')->nullable();
            $table->integer('weight')->default(1); // For scoring calculations
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assessment_questions');
    }
};
