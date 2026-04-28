<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('document_files', function (Blueprint $table) {
            $table->unsignedBigInteger('legacy_resident_document_id')->nullable()->after('notes');
            $table->foreign('legacy_resident_document_id')
                ->references('id')
                ->on('resident_documents')
                ->nullOnDelete();
        });

        Schema::table('document_files', function (Blueprint $table) {
            $table->unique('legacy_resident_document_id');
        });
    }

    public function down(): void
    {
        Schema::table('document_files', function (Blueprint $table) {
            $table->dropUnique(['legacy_resident_document_id']);
            $table->dropForeign(['legacy_resident_document_id']);
            $table->dropColumn('legacy_resident_document_id');
        });
    }
};
