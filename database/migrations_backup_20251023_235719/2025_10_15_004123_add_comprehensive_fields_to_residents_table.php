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
            // Add new comprehensive fields
            $table->string('middle_names')->nullable()->after('first_name');
            $table->text('diagnosis')->nullable()->after('date_of_birth');
            $table->text('allergies')->nullable()->after('diagnosis');
            $table->string('physician_name')->nullable()->after('allergies');
            $table->string('pep_or_doctor')->nullable()->after('physician_name');
            $table->string('room')->nullable()->after('branch_id');
            $table->string('cart')->nullable()->after('room');
            $table->string('profile_image')->nullable()->after('cart');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('residents', function (Blueprint $table) {
            $table->dropColumn([
                'middle_names', 'diagnosis', 'allergies', 'physician_name',
                'pep_or_doctor', 'room', 'cart', 'profile_image'
            ]);
        });
    }
};
