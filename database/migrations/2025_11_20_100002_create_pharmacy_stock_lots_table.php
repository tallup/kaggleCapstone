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
        if (Schema::hasTable('pharmacy_stock_lots')) {
            return;
        }
        
        Schema::create('pharmacy_stock_lots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pharmacy_inventory_id')->constrained('pharmacy_inventory')->onDelete('cascade');
            $table->foreignId('branch_id')->constrained()->onDelete('cascade');
            $table->foreignId('drug_id')->constrained()->onDelete('cascade');
            $table->string('lot_number')->nullable();
            $table->date('manufacture_date')->nullable();
            $table->date('expiration_date');
            $table->integer('quantity')->default(0);
            $table->integer('remaining_quantity')->default(0);
            $table->decimal('unit_cost', 10, 2)->nullable();
            $table->date('received_date');
            $table->foreignId('received_by')->constrained('users')->onDelete('cascade');
            $table->foreignId('supplier_id')->nullable()->constrained('pharmacy_suppliers')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['expiration_date']);
            $table->index(['branch_id', 'drug_id']);
            $table->index(['pharmacy_inventory_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pharmacy_stock_lots');
    }
};





