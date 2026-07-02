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
        if (Schema::hasTable('pharmacy_stock_transactions')) {
            return;
        }
        
        Schema::create('pharmacy_stock_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pharmacy_inventory_id')->constrained('pharmacy_inventory')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('drug_id')->constrained()->onDelete('cascade');
            $table->foreignId('stock_lot_id')->nullable()->constrained('pharmacy_stock_lots')->onDelete('set null');
            $table->enum('transaction_type', ['received', 'dispensed', 'adjusted', 'expired', 'damaged', 'returned'])->index();
            $table->integer('quantity_change')->comment('Positive for received, negative for dispensed');
            $table->integer('quantity_before');
            $table->integer('quantity_after');
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->foreignId('performed_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('pharmacy_order_id')->nullable()->constrained('pharmacy_orders')->onDelete('set null');
            $table->foreignId('medication_delivery_id')->nullable()->constrained('medication_deliveries')->onDelete('set null');
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('transaction_date');
            $table->timestamps();

            $table->index(['branch_id', 'drug_id', 'transaction_date'], 'pst_branch_drug_txndate_index');
            $table->index(['transaction_type', 'transaction_date'], 'pst_type_txndate_index');
            $table->index(['pharmacy_inventory_id', 'transaction_date'], 'pst_inventory_txndate_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pharmacy_stock_transactions');
    }
};




































