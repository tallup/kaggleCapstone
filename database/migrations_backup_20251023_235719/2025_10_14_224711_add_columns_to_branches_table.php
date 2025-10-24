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
        Schema::table('branches', function (Blueprint $table) {
            $table->string('name')->after('id');
            $table->text('address')->after('name');
            $table->foreignId('facility_id')->constrained()->onDelete('cascade')->after('address');
            $table->string('phone')->nullable()->after('facility_id');
            $table->string('email')->nullable()->after('phone');
            $table->boolean('is_active')->default(true)->after('email');
            
            $table->index(['facility_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropForeign(['facility_id']);
            $table->dropIndex(['facility_id', 'is_active']);
            $table->dropColumn(['name', 'address', 'facility_id', 'phone', 'email', 'is_active']);
        });
    }
};
