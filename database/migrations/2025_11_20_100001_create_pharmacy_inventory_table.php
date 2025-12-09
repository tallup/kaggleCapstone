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
        if (Schema::hasTable('pharmacy_inventory')) {
            return;
        }
        
        Schema::create('pharmacy_inventory', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('drug_id')->constrained()->onDelete('cascade');
            $table->integer('quantity')->default(0)->comment('Current stock quantity');
            $table->integer('minimum_stock_level')->default(0)->comment('Alert when stock falls below this');
            $table->integer('maximum_stock_level')->nullable()->comment('Maximum recommended stock');
            $table->decimal('unit_cost', 10, 2)->nullable()->comment('Average unit cost');
            $table->string('location')->nullable()->comment('Storage location in facility');
            $table->date('last_received_date')->nullable();
            $table->date('last_dispensed_date')->nullable();
            $table->boolean('requires_refrigeration')->default(false);
            $table->boolean('is_controlled_substance')->default(false);
            $table->text('storage_notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['branch_id', 'drug_id']);
            $table->index(['branch_id', 'quantity']);
            $table->index(['drug_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pharmacy_inventory');
    }
};




























