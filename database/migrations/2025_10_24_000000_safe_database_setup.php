<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
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
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('phone')->nullable();
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
            $table->foreignId('facility_id')->nullable()->constrained('facilities')->onDelete('set null'); // Add facility_id column
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
            $table->string('location')->nullable(); // Add location column
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->string('license_number')->nullable();
            $table->date('license_expiry')->nullable();
            $table->string('brochure_file')->nullable();
            $table->string('brochure_url')->nullable();
            $table->string('brochure_color')->nullable(); // Add brochure_color column
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
            $table->string('first_name')->nullable(); // Add first_name column
            $table->string('middle_names')->nullable(); // Add middle_names column
            $table->string('last_name')->nullable(); // Add last_name column
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
            $table->string('room')->nullable(); // Add room column
            $table->string('cart')->nullable(); // Add cart column
            $table->string('diagnosis')->nullable(); // Add diagnosis column
            $table->string('physician_name')->nullable(); // Add physician_name column
            $table->string('pep_or_doctor')->nullable(); // Add pep_or_doctor column
            $table->text('notes')->nullable(); // Add notes column
            $table->date('admission_date');
            $table->date('discharge_date')->nullable();
            $table->string('status')->default('active');
            $table->boolean('is_active')->default(true); // Add is_active column
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
            $table->integer('systolic_bp')->nullable();
            $table->integer('diastolic_bp')->nullable();
            $table->integer('heart_rate')->nullable();
            $table->integer('respiratory_rate')->nullable();
            $table->decimal('oxygen_saturation', 5, 2)->nullable();
            $table->decimal('weight', 8, 2)->nullable();
            $table->decimal('height', 8, 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('recorded_by')->constrained('users')->onDelete('cascade');
            $table->timestamp('recorded_at');
            $table->timestamps();
            
            $table->index(['resident_id', 'recorded_at']);
            $table->index(['branch_id', 'recorded_at']);
            $table->index(['status', 'recorded_at']);
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
    }
};
