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
            // Add missing columns if they don't exist
            if (!Schema::hasColumn('residents', 'last_name')) {
                $table->string('last_name')->nullable()->after('middle_names');
            }
            if (!Schema::hasColumn('residents', 'gender')) {
                $table->string('gender')->nullable()->after('date_of_birth');
            }
            if (!Schema::hasColumn('residents', 'phone')) {
                $table->string('phone')->nullable()->after('gender');
            }
            if (!Schema::hasColumn('residents', 'emergency_contact_name')) {
                $table->string('emergency_contact_name')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('residents', 'emergency_contact_phone')) {
                $table->string('emergency_contact_phone')->nullable()->after('emergency_contact_name');
            }
            if (!Schema::hasColumn('residents', 'medical_conditions')) {
                $table->text('medical_conditions')->nullable()->after('emergency_contact_phone');
            }
            if (!Schema::hasColumn('residents', 'medications')) {
                $table->text('medications')->nullable()->after('allergies');
            }
            if (!Schema::hasColumn('residents', 'dietary_restrictions')) {
                $table->text('dietary_restrictions')->nullable()->after('medications');
            }
            if (!Schema::hasColumn('residents', 'mobility_notes')) {
                $table->text('mobility_notes')->nullable()->after('dietary_restrictions');
            }
            if (!Schema::hasColumn('residents', 'behavioral_notes')) {
                $table->text('behavioral_notes')->nullable()->after('mobility_notes');
            }
            if (!Schema::hasColumn('residents', 'care_plan')) {
                $table->text('care_plan')->nullable()->after('behavioral_notes');
            }
            if (!Schema::hasColumn('residents', 'room_number')) {
                $table->string('room_number')->nullable()->after('pep_or_doctor');
            }
            if (!Schema::hasColumn('residents', 'notes')) {
                $table->text('notes')->nullable()->after('cart');
            }
            if (!Schema::hasColumn('residents', 'admission_date')) {
                $table->date('admission_date')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('residents', 'discharge_date')) {
                $table->date('discharge_date')->nullable()->after('admission_date');
            }
            if (!Schema::hasColumn('residents', 'status')) {
                $table->string('status')->default('active')->after('discharge_date');
            }
        });

        // Add indexes if they don't exist
        Schema::table('residents', function (Blueprint $table) {
            $indexes = Schema::getConnection()->getDoctrineSchemaManager()
                ->listTableIndexes('residents');
            
            if (!isset($indexes['residents_branch_id_status_index'])) {
                $table->index(['branch_id', 'status'], 'residents_branch_id_status_index');
            }
            if (!isset($indexes['residents_status_admission_date_index'])) {
                $table->index(['status', 'admission_date'], 'residents_status_admission_date_index');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('residents', function (Blueprint $table) {
            // Remove indexes first
            $indexes = Schema::getConnection()->getDoctrineSchemaManager()
                ->listTableIndexes('residents');
            
            if (isset($indexes['residents_branch_id_status_index'])) {
                $table->dropIndex('residents_branch_id_status_index');
            }
            if (isset($indexes['residents_status_admission_date_index'])) {
                $table->dropIndex('residents_status_admission_date_index');
            }

            // Remove columns
            $columns = Schema::getColumnListing('residents');
            
            if (in_array('status', $columns)) {
                $table->dropColumn('status');
            }
            if (in_array('discharge_date', $columns)) {
                $table->dropColumn('discharge_date');
            }
            if (in_array('admission_date', $columns)) {
                $table->dropColumn('admission_date');
            }
            if (in_array('notes', $columns)) {
                $table->dropColumn('notes');
            }
            if (in_array('room_number', $columns)) {
                $table->dropColumn('room_number');
            }
            if (in_array('care_plan', $columns)) {
                $table->dropColumn('care_plan');
            }
            if (in_array('behavioral_notes', $columns)) {
                $table->dropColumn('behavioral_notes');
            }
            if (in_array('mobility_notes', $columns)) {
                $table->dropColumn('mobility_notes');
            }
            if (in_array('dietary_restrictions', $columns)) {
                $table->dropColumn('dietary_restrictions');
            }
            if (in_array('medications', $columns)) {
                $table->dropColumn('medications');
            }
            if (in_array('medical_conditions', $columns)) {
                $table->dropColumn('medical_conditions');
            }
            if (in_array('emergency_contact_phone', $columns)) {
                $table->dropColumn('emergency_contact_phone');
            }
            if (in_array('emergency_contact_name', $columns)) {
                $table->dropColumn('emergency_contact_name');
            }
            if (in_array('phone', $columns)) {
                $table->dropColumn('phone');
            }
            if (in_array('gender', $columns)) {
                $table->dropColumn('gender');
            }
            if (in_array('last_name', $columns)) {
                $table->dropColumn('last_name');
            }
        });
    }
};