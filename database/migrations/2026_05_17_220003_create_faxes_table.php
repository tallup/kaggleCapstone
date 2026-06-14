<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('faxes')) {
            return;
        }

        Schema::create('faxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('facility_id')->constrained('facilities')->cascadeOnDelete();
            // outbound | inbound
            $table->string('direction', 16);
            $table->string('provider', 32);
            // Provider-side identifier of the fax transmission; unique within
            // the lifetime of a provider for idempotent webhook handling.
            $table->string('provider_fax_id')->nullable();
            // E.164 from / to numbers. Inbound: to_number = our number,
            // from_number = sender. Outbound: vice versa.
            $table->string('from_number', 24)->nullable();
            $table->string('to_number', 24);
            $table->foreignId('from_number_id')
                ->nullable()
                ->constrained('fax_numbers')
                ->nullOnDelete();
            $table->foreignId('contact_id')
                ->nullable()
                ->constrained('fax_contacts')
                ->nullOnDelete();
            $table->foreignId('resident_id')
                ->nullable()
                ->constrained('residents')
                ->nullOnDelete();
            // refills | orders | records (extendable via config('fax.types'))
            $table->string('fax_type', 32)->nullable();
            $table->string('subject')->nullable();
            $table->unsignedSmallInteger('page_count')->nullable();
            // Path relative to the configured fax disk:
            //   faxes/{facility_id}/{yyyy}/{mm}/{uuid}.pdf
            $table->string('file_path')->nullable();
            $table->string('file_hash', 64)->nullable();
            $table->string('mime_type', 64)->nullable();
            // queued | sending | delivered | failed | received | read
            $table->string('status', 16);
            $table->text('status_reason')->nullable();
            $table->longText('cover_page_html')->nullable();
            $table->unsignedInteger('cost_cents')->nullable();
            $table->foreignId('sent_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->unsignedSmallInteger('retry_count')->default(0);
            $table->timestamp('last_provider_event_at')->nullable();
            // HIPAA hint. Defaults true; the audit log respects it.
            $table->boolean('is_phi')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['facility_id', 'direction', 'status']);
            $table->index(['facility_id', 'sent_at']);
            $table->index(['facility_id', 'received_at']);
            $table->index(['facility_id', 'fax_type']);
            $table->index(['provider', 'provider_fax_id']);
            $table->index('resident_id');
            $table->index('contact_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faxes');
    }
};
