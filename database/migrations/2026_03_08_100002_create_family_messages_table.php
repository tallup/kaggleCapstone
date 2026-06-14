<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('family_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained('residents')->onDelete('cascade');
            $table->string('sender_type', 20); // 'staff' | 'family'
            $table->unsignedBigInteger('sender_id'); // user_id when staff, resident_contact_id when family
            $table->string('recipient_type', 20)->nullable();
            $table->unsignedBigInteger('recipient_id')->nullable();
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['resident_id', 'created_at']);
            $table->index(['sender_type', 'sender_id']);
            $table->index(['recipient_type', 'recipient_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('family_messages');
    }
};
