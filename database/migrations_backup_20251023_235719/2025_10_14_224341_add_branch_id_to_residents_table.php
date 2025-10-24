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
            $table->foreignId('branch_id')->nullable()->constrained()->onDelete('set null')->after('id');
            $table->string('first_name')->nullable()->after('branch_id');
            $table->string('last_name')->nullable()->after('first_name');
            $table->date('date_of_birth')->nullable()->after('last_name');
            $table->string('room_number')->nullable()->after('date_of_birth');
            $table->date('admission_date')->nullable()->after('room_number');
            $table->text('medical_conditions')->nullable()->after('admission_date');
            $table->string('emergency_contact_name')->nullable()->after('medical_conditions');
            $table->string('emergency_contact_phone')->nullable()->after('emergency_contact_name');
            $table->text('notes')->nullable()->after('emergency_contact_phone');
            $table->boolean('is_active')->default(true)->after('notes');
            
            $table->index(['branch_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('residents', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
            $table->dropIndex(['branch_id', 'is_active']);
            $table->dropColumn([
                'branch_id', 'first_name', 'last_name', 'date_of_birth', 
                'room_number', 'admission_date', 'medical_conditions',
                'emergency_contact_name', 'emergency_contact_phone', 'notes', 'is_active'
            ]);
        });
    }
};
