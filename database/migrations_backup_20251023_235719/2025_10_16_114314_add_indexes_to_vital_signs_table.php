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
        Schema::table('vital_signs', function (Blueprint $table) {
            // Add indexes for common query patterns
            $table->index('resident_id');
            $table->index('branch_id');
            $table->index('measurement_date');
            $table->index(['resident_id', 'measurement_date']);
            $table->index(['branch_id', 'resident_id']);
            $table->index('status');
            $table->index('taken_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vital_signs', function (Blueprint $table) {
            $table->dropIndex(['resident_id']);
            $table->dropIndex(['branch_id']);
            $table->dropIndex(['measurement_date']);
            $table->dropIndex(['resident_id', 'measurement_date']);
            $table->dropIndex(['branch_id', 'resident_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['taken_by']);
        });
    }
};