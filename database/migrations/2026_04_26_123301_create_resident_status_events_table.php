<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('resident_status_events')) {
            return;
        }

        Schema::create('resident_status_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('facility_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status_type', 50);
            $table->string('from_status', 50)->nullable();
            $table->string('to_status', 50)->nullable();
            $table->timestamp('effective_at');
            $table->json('details')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['resident_id', 'status_type', 'effective_at'], 'rse_resident_status_effective_idx');
            $table->index(['facility_id', 'effective_at'], 'rse_facility_effective_idx');
            $table->index(['branch_id', 'effective_at'], 'rse_branch_effective_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resident_status_events');
    }
};
