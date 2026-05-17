<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fax_contacts')) {
            return;
        }

        Schema::create('fax_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained('facilities')->cascadeOnDelete();
            $table->string('name');
            $table->string('organization')->nullable();
            // E.164 format, e.g. +14252516337
            $table->string('fax_e164', 24);
            $table->string('phone', 24)->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            // pharmacy | physician | agency | family | other
            $table->string('contact_type', 16)->default('other');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['facility_id', 'is_active']);
            $table->index(['facility_id', 'contact_type']);
            $table->index(['facility_id', 'name']);
            $table->index('fax_e164');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fax_contacts');
    }
};
