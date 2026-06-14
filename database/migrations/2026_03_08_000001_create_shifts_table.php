<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->string('shift_type', 50)->default('regular'); // morning, evening, night, regular
            $table->text('notes')->nullable();
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index(['branch_id', 'start_at']);
            $table->index(['user_id', 'start_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shifts');
    }
};
