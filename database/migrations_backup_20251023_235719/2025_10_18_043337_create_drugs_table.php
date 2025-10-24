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
        Schema::create('drugs', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('generic_name')->nullable();
            $table->text('description')->nullable();
            $table->string('dosage_form')->nullable(); // tablet, capsule, liquid, injection, etc.
            $table->string('strength')->nullable(); // 500mg, 10ml, etc.
            $table->text('indications')->nullable(); // what it's used for
            $table->text('contraindications')->nullable(); // when not to use
            $table->text('side_effects')->nullable();
            $table->text('storage_instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('drugs');
    }
};
