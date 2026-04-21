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
        if (!Schema::hasTable('residents')) {
            return;
        }

        Schema::table('residents', function (Blueprint $table) {
            if (!Schema::hasColumn('residents', 'code_status')) {
                $table->string('code_status', 100)->nullable();
            }
            if (!Schema::hasColumn('residents', 'primary_language')) {
                $table->string('primary_language', 100)->nullable();
            }
            if (!Schema::hasColumn('residents', 'pharmacy_name')) {
                $table->string('pharmacy_name', 255)->nullable();
            }
            if (!Schema::hasColumn('residents', 'general_medication_instructions')) {
                $table->text('general_medication_instructions')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('residents')) {
            return;
        }

        Schema::table('residents', function (Blueprint $table) {
            if (Schema::hasColumn('residents', 'general_medication_instructions')) {
                $table->dropColumn('general_medication_instructions');
            }
            if (Schema::hasColumn('residents', 'pharmacy_name')) {
                $table->dropColumn('pharmacy_name');
            }
            if (Schema::hasColumn('residents', 'primary_language')) {
                $table->dropColumn('primary_language');
            }
            if (Schema::hasColumn('residents', 'code_status')) {
                $table->dropColumn('code_status');
            }
        });
    }
};
