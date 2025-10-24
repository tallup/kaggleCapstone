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
        // Create users table
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

        // Create branches table
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Create facilities table
        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('description')->nullable();
            $table->string('license_number')->nullable();
            $table->string('location')->nullable();
            $table->string('brochure_title')->nullable();
            $table->text('brochure_description')->nullable();
            $table->string('brochure_image')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Create residents table
        Schema::create('residents', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('first_name')->nullable();
            $table->string('middle_names')->nullable();
            $table->date('date_of_birth');
            $table->text('diagnosis')->nullable();
            $table->text('allergies')->nullable();
            $table->string('physician_name')->nullable();
            $table->string('pep_or_doctor')->nullable();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('room')->nullable();
            $table->string('cart')->nullable();
            $table->string('profile_image')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Create drugs table
        Schema::create('drugs', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('generic_name')->nullable();
            $table->string('dosage_form')->nullable();
            $table->string('strength')->nullable();
            $table->text('indications')->nullable();
            $table->text('contraindications')->nullable();
            $table->text('side_effects')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Create medications table
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
        });

        // Create vital_signs table
        Schema::create('vital_signs', function (Blueprint $table) {
            $table->id();
            $table->date('measurement_date');
            $table->integer('systolic')->nullable();
            $table->integer('diastolic')->nullable();
            $table->decimal('temperature', 5, 2)->nullable();
            $table->integer('pulse')->nullable();
            $table->integer('oxygen_saturation')->nullable();
            $table->integer('pain_level')->nullable();
            $table->string('pain_description')->nullable();
            $table->text('reason_declined')->nullable();
            $table->enum('status', ['approved', 'pending_review', 'declined', 'critical'])->default('pending_review');
            $table->text('notes')->nullable();
            $table->foreignId('taken_by')->nullable()->constrained('users');
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            // Add indexes for common query patterns
            $table->index('resident_id');
            $table->index('branch_id');
            $table->index('measurement_date');
            $table->index(['resident_id', 'measurement_date']);
            $table->index(['branch_id', 'resident_id']);
            $table->index('status');
            $table->index('taken_by');
        });

        // Create appointments table
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('appointment_type_id')->constrained()->onDelete('cascade');
            $table->foreignId('healthcare_provider_id')->nullable()->constrained()->onDelete('set null');
            $table->date('appointment_date');
            $table->time('appointment_time')->nullable();
            $table->string('provider_name')->nullable();
            $table->string('location')->nullable();
            $table->text('description')->nullable();
            $table->enum('status', ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'])->default('scheduled');
            $table->date('next_appointment_date')->nullable();
            $table->string('recurrence_pattern')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
            $table->softDeletes();
        });

        // Create appointment_types table
        Schema::create('appointment_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->integer('duration_minutes')->default(30);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Create healthcare_providers table
        Schema::create('healthcare_providers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('specialty')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Create medication_administrations table
        Schema::create('medication_administrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medication_id')->constrained()->onDelete('cascade');
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('administered_by')->constrained('users')->onDelete('cascade');
            $table->datetime('administered_at');
            $table->string('dosage_given')->nullable();
            $table->enum('status', ['completed', 'missed', 'refused'])->default('completed');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Create incidents table
        Schema::create('incidents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->string('incident_type');
            $table->text('description');
            $table->datetime('incident_date');
            $table->string('severity')->default('low');
            $table->text('action_taken')->nullable();
            $table->text('follow_up')->nullable();
            $table->foreignId('reported_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });

        // Create behaviors table
        Schema::create('behaviors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('behavior_category_id')->constrained()->onDelete('cascade');
            $table->string('behavior_type');
            $table->text('description');
            $table->datetime('occurred_at');
            $table->string('severity')->default('low');
            $table->text('intervention')->nullable();
            $table->text('outcome')->nullable();
            $table->foreignId('reported_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });

        // Create behavior_categories table
        Schema::create('behavior_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Create roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('display_name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Create permissions table
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('display_name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Create role_permissions table
        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained()->onDelete('cascade');
            $table->foreignId('permission_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['role_id', 'permission_id']);
        });

        // Create user_roles table
        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('role_id')->constrained()->onDelete('cascade');
            $table->timestamps();
            
            $table->unique(['user_id', 'role_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('behavior_categories');
        Schema::dropIfExists('behaviors');
        Schema::dropIfExists('incidents');
        Schema::dropIfExists('medication_administrations');
        Schema::dropIfExists('healthcare_providers');
        Schema::dropIfExists('appointment_types');
        Schema::dropIfExists('appointments');
        Schema::dropIfExists('vital_signs');
        Schema::dropIfExists('medications');
        Schema::dropIfExists('drugs');
        Schema::dropIfExists('residents');
        Schema::dropIfExists('facilities');
        Schema::dropIfExists('branches');
        Schema::dropIfExists('users');
    }
};
