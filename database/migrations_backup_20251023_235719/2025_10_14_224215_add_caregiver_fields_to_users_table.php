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
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone')->nullable()->after('email');
            $table->string('role')->default('admin')->after('phone');
            $table->foreignId('assigned_branch_id')->nullable()->constrained('branches')->onDelete('set null')->after('role');
            $table->boolean('is_active')->default(true)->after('assigned_branch_id');
            $table->date('hire_date')->nullable()->after('is_active');
            $table->text('notes')->nullable()->after('hire_date');
            
            $table->index(['role', 'is_active']);
            $table->index(['assigned_branch_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['assigned_branch_id']);
            $table->dropIndex(['role', 'is_active']);
            $table->dropIndex(['assigned_branch_id', 'is_active']);
            $table->dropColumn(['phone', 'role', 'assigned_branch_id', 'is_active', 'hire_date', 'notes']);
        });
    }
};
