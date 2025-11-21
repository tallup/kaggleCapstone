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
        if (!Schema::hasTable('facility_role_permissions')) {
            Schema::create('facility_role_permissions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('facility_id')->constrained('facilities')->onDelete('cascade');
                $table->foreignId('role_id')->constrained('roles')->onDelete('cascade');
                $table->foreignId('permission_id')->constrained('permissions')->onDelete('cascade');
                $table->boolean('is_allowed')->default(true);
                $table->timestamps();
                
                $table->unique(['facility_id', 'role_id', 'permission_id']);
                $table->index('facility_id');
                $table->index('role_id');
                $table->index(['facility_id', 'role_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('facility_role_permissions');
    }
};
