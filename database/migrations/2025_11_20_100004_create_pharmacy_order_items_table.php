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
        if (Schema::hasTable('pharmacy_order_items')) {
            return;
        }
        
        Schema::create('pharmacy_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pharmacy_order_id')->constrained('pharmacy_orders')->onDelete('cascade');
            $table->foreignId('drug_id')->constrained()->onDelete('cascade');
            $table->integer('quantity_ordered');
            $table->integer('quantity_received')->default(0);
            $table->decimal('unit_cost', 10, 2);
            $table->decimal('discount', 5, 2)->default(0)->comment('Discount percentage');
            $table->decimal('line_total', 10, 2)->comment('After discount');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['pharmacy_order_id', 'drug_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pharmacy_order_items');
    }
};









