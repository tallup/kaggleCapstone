<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('fax_settings')) {
            return;
        }

        Schema::create('fax_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained('facilities')->cascadeOnDelete();
            // Provider key: telnyx | documo | fake | (null until configured)
            $table->string('provider', 32)->nullable();
            // Encrypted JSON, shape depends on the provider's credentialSchema().
            // Cast via Eloquent's "encrypted:array" so values are never logged
            // or returned to the client in plain text.
            $table->text('credentials')->nullable();
            $table->foreignId('default_from_number_id')
                ->nullable()
                ->constrained('fax_numbers')
                ->nullOnDelete();
            $table->unsignedInteger('cost_per_page_cents')->nullable();
            $table->unsignedSmallInteger('max_file_mb')->default(25);
            $table->unsignedInteger('retention_days')->default(2555);
            $table->longText('cover_page_html')->nullable();
            // Unique per facility: routes inbound webhooks
            // /webhooks/fax/{provider}/{webhook_secret}
            $table->string('webhook_secret', 64)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_tested_at')->nullable();
            // ok | fail | null
            $table->string('last_test_status', 16)->nullable();
            $table->text('last_test_message')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('facility_id');
            $table->index('provider');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fax_settings');
    }
};
