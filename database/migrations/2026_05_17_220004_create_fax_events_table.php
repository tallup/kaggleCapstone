<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fax_events')) {
            return;
        }

        Schema::create('fax_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fax_id')->constrained('faxes')->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained('facilities')->cascadeOnDelete();
            $table->string('event_type', 64);
            $table->json('event_payload')->nullable();
            $table->string('provider_event_id')->nullable();
            $table->timestamp('received_at');
            $table->timestamps();

            $table->index(['fax_id', 'received_at']);
            $table->index('event_type');
            $table->index(['provider_event_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fax_events');
    }
};
