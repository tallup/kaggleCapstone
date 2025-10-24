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
        Schema::create('residents', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('first_name')->nullable();
            $table->string('middle_names')->nullable();
            $table->date('date_of_birth');
            $table->text('diagnosis')->nullable();
            $table->text('allergies')->nullable();
            $table->string('physician_name')->nullable();
            $table->string('pep_or_doctor')->nullable();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('room')->nullable();
            $table->string('cart')->nullable();
            $table->string('profile_image')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('residents');
    }
};
