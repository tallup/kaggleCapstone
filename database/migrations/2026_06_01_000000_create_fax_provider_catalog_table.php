<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fax_provider_catalog', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique()->comment('Stable key for API/UI (e.g. regional_telnyx)');
            $table->string('canonical_provider')->comment('Built-in driver key: telnyx, documo, fake');
            $table->string('display_name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        if (Schema::hasTable('fax_settings')) {
            Schema::table('fax_settings', function (Blueprint $table) {
                $table->string('provider_choice', 191)->nullable()->after('provider');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('fax_settings')) {
            Schema::table('fax_settings', function (Blueprint $table) {
                if (Schema::hasColumn('fax_settings', 'provider_choice')) {
                    $table->dropColumn('provider_choice');
                }
            });
        }

        Schema::dropIfExists('fax_provider_catalog');
    }
};
