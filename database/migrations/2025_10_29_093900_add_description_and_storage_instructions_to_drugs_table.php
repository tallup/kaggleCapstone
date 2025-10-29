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
        Schema::table('drugs', function (Blueprint $table) {
            // Add description column if it doesn't exist
            if (!Schema::hasColumn('drugs', 'description')) {
                $table->text('description')->nullable()->after('generic_name');
            }
            
            // Add storage_instructions column if it doesn't exist
            if (!Schema::hasColumn('drugs', 'storage_instructions')) {
                $table->text('storage_instructions')->nullable()->after('dosage_instructions');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('drugs', function (Blueprint $table) {
            if (Schema::hasColumn('drugs', 'description')) {
                $table->dropColumn('description');
            }
            
            if (Schema::hasColumn('drugs', 'storage_instructions')) {
                $table->dropColumn('storage_instructions');
            }
        });
    }
};

