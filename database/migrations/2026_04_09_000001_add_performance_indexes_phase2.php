<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // vital_signs: heavily queried by resident + date for trends, dashboards, reports
        if (Schema::hasTable('vital_signs')) {
            Schema::table('vital_signs', function (Blueprint $table) {
                try {
                    $table->index(['resident_id', 'measurement_date'], 'vital_signs_resident_date_index');
                } catch (\Exception $e) {}
                try {
                    $table->index(['branch_id', 'measurement_date'], 'vital_signs_branch_date_index');
                } catch (\Exception $e) {}
            });
        }

        // medication_administrations: stats queries filter by status + date
        if (Schema::hasTable('medication_administrations')) {
            Schema::table('medication_administrations', function (Blueprint $table) {
                try {
                    $table->index(['resident_id', 'administered_at', 'status'], 'med_admin_resident_date_status_index');
                } catch (\Exception $e) {}
                try {
                    $table->index(['status', 'administered_at'], 'med_admin_status_date_index');
                } catch (\Exception $e) {}
            });
        }

        // assessments: dashboard counts filter by resident + status
        if (Schema::hasTable('assessments')) {
            Schema::table('assessments', function (Blueprint $table) {
                try {
                    $table->index(['resident_id', 'status'], 'assessments_resident_status_index');
                } catch (\Exception $e) {}
                try {
                    $table->index(['status', 'created_at'], 'assessments_status_created_index');
                } catch (\Exception $e) {}
            });
        }

        // medications: filtered by resident + active status frequently
        if (Schema::hasTable('medications')) {
            Schema::table('medications', function (Blueprint $table) {
                try {
                    $table->index(['resident_id', 'is_active'], 'medications_resident_active_index');
                } catch (\Exception $e) {}
            });
        }

        // assignments: caregiver lookups used in every CaregiverDashboard query
        if (Schema::hasTable('assignments')) {
            Schema::table('assignments', function (Blueprint $table) {
                try {
                    $table->index(['caregiver_id', 'is_active'], 'assignments_caregiver_active_index');
                } catch (\Exception $e) {}
            });
        }
    }

    public function down(): void
    {
        $indexes = [
            'vital_signs' => ['vital_signs_resident_date_index', 'vital_signs_branch_date_index'],
            'medication_administrations' => ['med_admin_resident_date_status_index', 'med_admin_status_date_index'],
            'assessments' => ['assessments_resident_status_index', 'assessments_status_created_index'],
            'medications' => ['medications_resident_active_index'],
            'assignments' => ['assignments_caregiver_active_index'],
        ];

        foreach ($indexes as $table => $indexNames) {
            if (Schema::hasTable($table)) {
                Schema::table($table, function (Blueprint $t) use ($indexNames) {
                    foreach ($indexNames as $name) {
                        try { $t->dropIndex($name); } catch (\Exception $e) {}
                    }
                });
            }
        }
    }
};
