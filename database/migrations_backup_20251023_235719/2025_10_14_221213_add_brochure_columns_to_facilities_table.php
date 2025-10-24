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
        Schema::table('facilities', function (Blueprint $table) {
            $table->text('description')->nullable();
            $table->string('brochure_url')->nullable()->after('description');
            $table->string('brochure_color')->default('blue')->after('brochure_url');
            $table->boolean('is_active')->default(true)->after('brochure_color');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('facilities', function (Blueprint $table) {
            $table->dropColumn(['description', 'brochure_url', 'brochure_color', 'is_active']);
        });
    }
};
