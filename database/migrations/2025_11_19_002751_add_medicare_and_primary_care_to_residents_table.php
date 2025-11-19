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
        Schema::table('residents', function (Blueprint $table) {
            if (!Schema::hasColumn('residents', 'medicare_number')) {
                $table->string('medicare_number')->nullable()->after('physician_name');
            }
            if (!Schema::hasColumn('residents', 'primary_care_doctor')) {
                $table->string('primary_care_doctor')->nullable()->after('medicare_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('residents', function (Blueprint $table) {
            $table->dropColumn(['medicare_number', 'primary_care_doctor']);
        });
    }
};
