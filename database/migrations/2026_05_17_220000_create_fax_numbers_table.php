<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fax_numbers')) {
            return;
        }

        Schema::create('fax_numbers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained('facilities')->cascadeOnDelete();
            // Which provider this number was purchased from. Lets a facility
            // hold numbers across two providers during a migration period.
            $table->string('provider', 32);
            // Provider-side identifier (Telnyx phone_number_id, Documo number id, etc.)
            $table->string('provider_number_id')->nullable();
            // E.164 format, e.g. +12538542975
            $table->string('e164_number', 24);
            $table->string('friendly_name')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('monthly_cost_cents')->nullable();
            $table->timestamp('provisioned_at')->nullable();
            $table->timestamp('released_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['facility_id', 'e164_number']);
            $table->index(['facility_id', 'is_active']);
            $table->index('provider');
            $table->index('e164_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fax_numbers');
    }
};
