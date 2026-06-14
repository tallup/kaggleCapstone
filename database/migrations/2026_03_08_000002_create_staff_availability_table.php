<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_availability', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('facility_id')->nullable()->constrained()->onDelete('cascade');
            $table->unsignedTinyInteger('day_of_week')->nullable(); // 1-7 (Monday=1), null when date is set
            $table->date('date')->nullable(); // one-off override when set
            $table->time('start_time');
            $table->time('end_time');
            $table->string('type', 20)->default('available'); // available, unavailable
            $table->timestamps();

            $table->index(['user_id', 'day_of_week']);
            $table->index(['user_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_availability');
    }
};
