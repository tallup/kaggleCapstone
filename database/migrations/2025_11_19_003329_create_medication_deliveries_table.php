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
        if (Schema::hasTable('medication_deliveries')) {
            return;
        }
        
        Schema::create('medication_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('medication_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('received_by')->constrained('users')->onDelete('cascade');
            $table->date('received_date');
            $table->time('received_time');
            $table->string('pharmacy_name');
            $table->string('quantity_received');
            $table->enum('delivery_type', ['individual', 'batch'])->default('individual');
            $table->text('notes')->nullable();
            $table->enum('status', ['received', 'verified', 'stored'])->default('received');
            $table->timestamps();
            
            $table->index(['branch_id', 'received_date']);
            $table->index(['resident_id', 'received_date']);
            $table->index(['medication_id', 'received_date']);
            $table->index('delivery_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medication_deliveries');
    }
};
