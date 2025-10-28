<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations for production MySQL database.
     */
    public function up(): void
    {
        // Drop all existing tables first to ensure clean state
        $this->dropAllTables();
        
        // Create all tables with complete schema in proper order
        $this->createFacilitiesTable();
        $this->createBranchesTable();
        $this->createUsersTable();
        $this->createDrugsTable();
        $this->createResidentsTable();
        $this->createMedicationsTable();
        $this->createVitalSignsTable();
        $this->createAppointmentsTable();
        $this->createOtherTables();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $this->dropAllTables();
    }

    private function dropAllTables(): void
    {
        $driver = DB::getDriverName();
        
        if ($driver === 'mysql') {
            // MySQL syntax
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            
            $tables = DB::select('SHOW TABLES');
            $databaseName = DB::getDatabaseName();
            $tableColumn = 'Tables_in_' . $databaseName;
            
            foreach ($tables as $table) {
                $tableName = $table->$tableColumn;
                if ($tableName !== 'migrations') {
                    DB::statement('DROP TABLE IF EXISTS ' . $tableName);
                }
            }
            
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
        } else {
            // SQLite syntax
            DB::statement('PRAGMA foreign_keys = OFF');
            
            $tables = DB::select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('migrations', 'sqlite_sequence')");
            
            foreach ($tables as $table) {
                DB::statement('DROP TABLE IF EXISTS ' . $table->name);
            }
            
            DB::statement('PRAGMA foreign_keys = ON');
        }
    }

    private function createUsersTable(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('first_name')->nullable();
            $table->string('middle_names')->nullable();
            $table->string('last_name')->nullable();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('phone_number')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('marital_status')->nullable();
            $table->string('sex')->nullable();
            $table->string('position')->nullable();
            $table->string('credentials')->nullable();
            $table->text('credential_details')->nullable();
            $table->date('date_employed')->nullable();
            $table->string('supervisor_name')->nullable();
            $table->string('provider_name')->nullable();
            $table->string('role')->default('admin');
            $table->foreignId('assigned_branch_id')->nullable()->constrained('branches')->onDelete('set null');
            $table->boolean('is_active')->default(true);
            $table->date('hire_date')->nullable();
            $table->text('notes')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['role', 'is_active']);
            $table->index(['assigned_branch_id', 'is_active']);
        });
    }

    private function createBranchesTable(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('address')->nullable();
            $table->foreignId('facility_id')->nullable()->constrained('facilities')->onDelete('set null');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    private function createFacilitiesTable(): void
    {
        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('address')->nullable();
            $table->string('location')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->string('license_number')->nullable();
            $table->date('license_expiry')->nullable();
            $table->string('brochure_file')->nullable();
            $table->string('brochure_url')->nullable();
            $table->string('brochure_color')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    private function createResidentsTable(): void
    {
        Schema::create('residents', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('first_name')->nullable();
            $table->string('middle_names')->nullable();
            $table->string('last_name')->nullable();
            $table->date('date_of_birth');
            $table->string('gender');
            $table->string('phone')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->text('medical_conditions')->nullable();
            $table->text('allergies')->nullable();
            $table->text('medications')->nullable();
            $table->text('dietary_restrictions')->nullable();
            $table->text('mobility_notes')->nullable();
            $table->text('behavioral_notes')->nullable();
            $table->text('care_plan')->nullable();
            $table->string('room_number')->nullable();
            $table->string('room')->nullable();
            $table->string('cart')->nullable();
            $table->string('diagnosis')->nullable();
            $table->string('physician_name')->nullable();
            $table->string('pep_or_doctor')->nullable();
            $table->text('notes')->nullable();
            $table->date('admission_date');
            $table->date('discharge_date')->nullable();
            $table->string('status')->default('active');
            $table->boolean('is_active')->default(true);
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['branch_id', 'status']);
            $table->index(['status', 'admission_date']);
        });
    }

    private function createMedicationsTable(): void
    {
        Schema::create('medications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('drug_id')->nullable()->constrained()->onDelete('set null');
            $table->string('name');
            $table->string('instructions')->nullable();
            $table->string('quantity')->nullable();
            $table->text('diagnosis')->nullable();
            $table->date('prescription_date')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->time('time_1')->nullable();
            $table->time('time_2')->nullable();
            $table->time('time_3')->nullable();
            $table->time('time_4')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['resident_id', 'is_active']);
            $table->index(['branch_id', 'is_active']);
            $table->index(['created_by']);
        });
    }

    private function createVitalSignsTable(): void
    {
        Schema::create('vital_signs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->decimal('temperature', 5, 2)->nullable();
            $table->integer('systolic')->nullable();
            $table->integer('diastolic')->nullable();
            $table->integer('pulse')->nullable();
            $table->integer('respiratory_rate')->nullable();
            $table->decimal('oxygen_saturation', 5, 2)->nullable();
            $table->decimal('weight', 8, 2)->nullable();
            $table->decimal('height', 8, 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('pending');
            $table->integer('pain_level')->nullable();
            $table->text('pain_description')->nullable();
            $table->text('reason_declined')->nullable();
            $table->foreignId('taken_by')->constrained('users')->onDelete('cascade');
            $table->date('measurement_date');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['resident_id', 'measurement_date']);
            $table->index(['branch_id', 'measurement_date']);
            $table->index(['status', 'measurement_date']);
        });
    }

    private function createAppointmentsTable(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->datetime('appointment_date');
            $table->string('location')->nullable();
            $table->string('provider_name')->nullable();
            $table->string('provider_phone')->nullable();
            $table->string('status')->default('scheduled');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['resident_id', 'appointment_date']);
            $table->index(['branch_id', 'appointment_date']);
            $table->index(['status', 'appointment_date']);
        });
    }

    private function createDrugsTable(): void
    {
        Schema::create('drugs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('generic_name')->nullable();
            $table->string('dosage_form')->nullable();
            $table->string('strength')->nullable();
            $table->text('indications')->nullable();
            $table->text('contraindications')->nullable();
            $table->text('side_effects')->nullable();
            $table->text('interactions')->nullable();
            $table->text('dosage_instructions')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    private function createOtherTables(): void
    {
        // Create assignments table
        Schema::create('assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('caregiver_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->timestamp('assigned_at');
            $table->foreignId('assigned_by')->constrained('users')->onDelete('cascade');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['caregiver_id', 'is_active']);
            $table->index(['resident_id', 'is_active']);
            $table->index(['branch_id', 'is_active']);
        });

        // Create assessments table
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('assessor_id')->constrained('users')->onDelete('cascade');
            $table->string('assessment_type');
            $table->date('assessment_date');
            $table->string('status')->default('pending');
            $table->text('notes')->nullable();
            $table->json('scores')->nullable();
            $table->json('recommendations')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['resident_id', 'assessment_date']);
            $table->index(['branch_id', 'status']);
            $table->index(['assessor_id', 'status']);
        });

        // Create leave_requests table
        Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('leave_type');
            $table->text('reason')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->text('approval_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['staff_id', 'status']);
            $table->index(['branch_id', 'start_date']);
            $table->index(['status', 'start_date']);
        });

        // Create sleep_patterns table
        Schema::create('sleep_patterns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->time('bedtime')->nullable();
            $table->time('wake_time')->nullable();
            $table->integer('total_sleep_hours')->nullable();
            $table->integer('sleep_interruptions')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['resident_id', 'date']);
            $table->index(['branch_id', 'date']);
        });

        // Create sleep_records table
        Schema::create('sleep_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('sleep_pattern_id')->nullable()->constrained()->onDelete('set null');
            $table->date('date');
            $table->time('sleep_start')->nullable();
            $table->time('sleep_end')->nullable();
            $table->integer('sleep_duration_minutes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['resident_id', 'date']);
            $table->index(['branch_id', 'date']);
        });

        // Create vital_ranges table
        Schema::create('vital_ranges', function (Blueprint $table) {
            $table->id();
            $table->string('parameter'); // systolic, diastolic, temperature, pulse, oxygen_saturation
            $table->decimal('min_normal', 8, 2)->nullable();
            $table->decimal('max_normal', 8, 2)->nullable();
            $table->decimal('min_warning', 8, 2)->nullable();
            $table->decimal('max_warning', 8, 2)->nullable();
            $table->decimal('min_critical', 8, 2)->nullable();
            $table->decimal('max_critical', 8, 2)->nullable();
            $table->string('unit')->nullable(); // mmHg, °F, BPM, %
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->unique('parameter');
            $table->index(['parameter', 'is_active']);
        });

        // Create medication_administrations table
        Schema::create('medication_administrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medication_id')->constrained()->onDelete('cascade');
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('administered_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('administered_at');
            $table->string('dosage_given')->nullable();
            $table->string('status'); // completed, missed, refused
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->index(['resident_id', 'administered_at']);
            $table->index(['medication_id', 'administered_at']);
            $table->index(['status', 'administered_at']);
        });

        // Create roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('guard_name')->default('web');
            $table->string('display_name')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Create permissions table
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('guard_name')->default('web');
            $table->string('display_name')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Create role_permission table
        Schema::create('role_permission', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained()->onDelete('cascade');
            $table->foreignId('permission_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['role_id', 'permission_id']);
        });

        // Create model_has_roles table
        Schema::create('model_has_roles', function (Blueprint $table) {
            $table->id();
            $table->string('model_type');
            $table->unsignedBigInteger('model_id');
            $table->foreignId('role_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->index(['model_type', 'model_id']);
        });

        // Create sessions table
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });

        // Create cache table
        Schema::create('cache', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->mediumText('value');
            $table->integer('expiration');
        });

        Schema::create('cache_locks', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->string('owner');
            $table->integer('expiration');
        });

        // Create jobs table
        Schema::create('jobs', function (Blueprint $table) {
            $table->id();
            $table->string('queue')->index();
            $table->longText('payload');
            $table->unsignedTinyInteger('attempts');
            $table->unsignedInteger('reserved_at')->nullable();
            $table->unsignedInteger('available_at');
            $table->unsignedInteger('created_at');
        });

        Schema::create('job_batches', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->integer('total_jobs');
            $table->integer('pending_jobs');
            $table->integer('failed_jobs');
            $table->longText('failed_job_ids');
            $table->mediumText('options')->nullable();
            $table->integer('cancelled_at')->nullable();
            $table->integer('created_at');
            $table->integer('finished_at')->nullable();
        });

        Schema::create('failed_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->text('connection');
            $table->text('queue');
            $table->longText('payload');
            $table->longText('exception');
            $table->timestamp('failed_at')->useCurrent();
        });

        // Create password reset tokens table
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        // Create personal access tokens table
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }
};
