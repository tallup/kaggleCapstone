<?php

namespace App\Console\Commands;

use App\Models\DocumentFile;
use App\Models\ResidentDocument;
use App\Services\DocumentLibraryService;
use Illuminate\Console\Command;

class ImportLegacyResidentDocumentsCommand extends Command
{
    protected $signature = 'documents:import-legacy
                            {--facility= : Only documents for residents whose branch belongs to this facility ID}
                            {--dry-run : List rows that would be imported without writing}';

    protected $description = 'Copy legacy `resident_documents` files into the document library (idempotent).';

    public function handle(DocumentLibraryService $library): int
    {
        $query = ResidentDocument::query()->with(['resident.branch']);

        if ($this->option('facility')) {
            $facilityId = (int) $this->option('facility');
            $query->whereHas('resident.branch', function ($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            });
        }

        $dry = (bool) $this->option('dry-run');
        $imported = 0;
        $skipped = 0;
        $failed = 0;

        $query->orderBy('id')->chunk(100, function ($rows) use ($library, $dry, &$imported, &$skipped, &$failed) {
            foreach ($rows as $rd) {
                if ($dry) {
                    if (DocumentFile::withoutGlobalScopes()->where('legacy_resident_document_id', $rd->id)->exists()) {
                        $skipped++;

                        continue;
                    }
                    $this->line("[dry-run] Would import resident_documents id={$rd->id} resident_id={$rd->resident_id}");
                    $imported++;

                    continue;
                }

                try {
                    $created = $library->importLegacyResidentDocument($rd);
                    if ($created) {
                        $imported++;
                    } else {
                        $skipped++;
                    }
                } catch (\Throwable $e) {
                    $this->error("resident_documents id={$rd->id}: {$e->getMessage()}");
                    $failed++;
                }
            }
        });

        $this->info("Done. Imported: {$imported}, skipped (already present / missing file / no branch): {$skipped}, failed: {$failed}.");

        return self::SUCCESS;
    }
}
