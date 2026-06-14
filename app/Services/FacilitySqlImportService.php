<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Restores a facility-scoped SQL file: deletes existing tenant rows (same rules as export), then replays INSERTs.
 */
class FacilitySqlImportService
{
    public function __construct(
        private FacilityTenantScopeResolver $scopeResolver,
        private FacilitySqlExportService $exportService
    ) {}

    /**
     * @return array{ok: bool, detail?: string}
     */
    public function importFromFile(string $absolutePath, int $expectedFacilityId): array
    {
        if (! is_readable($absolutePath)) {
            return ['ok' => false, 'detail' => 'Backup file is not readable.'];
        }

        $parsed = $this->parseHeaderFacilityId($absolutePath);
        if ($parsed === null) {
            return ['ok' => false, 'detail' => 'Invalid facility backup file (missing HL360_FACILITY_BACKUP header).'];
        }

        if ($parsed !== $expectedFacilityId) {
            return [
                'ok' => false,
                'detail' => 'Backup is for facility_id='.$parsed.' but restore target is facility_id='.$expectedFacilityId.'.',
            ];
        }

        $scope = $this->scopeResolver->resolve($expectedFacilityId);

        try {
            DB::beginTransaction();

            DB::statement('SET FOREIGN_KEY_CHECKS=0');

            foreach (array_reverse($this->exportService->tableManifest()) as $entry) {
                $table = $entry['table'];
                if (! FacilityTenantScopeResolver::tableExists($table)) {
                    continue;
                }
                $builder = $entry['query']($scope);
                if ($builder === null) {
                    continue;
                }
                $builder->delete();
            }

            $this->executeSqlInsertsFromFile($absolutePath);

            DB::statement('SET FOREIGN_KEY_CHECKS=1');

            DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            Log::error('Facility SQL import failed', [
                'facility_id' => $expectedFacilityId,
                'path' => $absolutePath,
                'error' => $e->getMessage(),
            ]);

            return ['ok' => false, 'detail' => $e->getMessage()];
        }

        return ['ok' => true];
    }

    /**
     * First line: -- HL360_FACILITY_BACKUP facility_id=123 ...
     */
    private function parseHeaderFacilityId(string $absolutePath): ?int
    {
        $fh = fopen($absolutePath, 'rb');
        if ($fh === false) {
            return null;
        }
        $firstLine = fgets($fh);
        fclose($fh);
        if ($firstLine === false) {
            return null;
        }
        if (! preg_match('/^--\s*HL360_FACILITY_BACKUP\s+facility_id=(\d+)/i', trim($firstLine), $m)) {
            return null;
        }

        return (int) $m[1];
    }

    private function executeSqlInsertsFromFile(string $absolutePath): void
    {
        $handle = fopen($absolutePath, 'rb');
        if ($handle === false) {
            throw new \RuntimeException('Could not open backup for import.');
        }

        while (($line = fgets($handle)) !== false) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            if (str_starts_with($line, '--')) {
                continue;
            }
            if (str_starts_with(strtoupper($line), 'SET ')) {
                DB::unprepared($line);

                continue;
            }
            if (str_starts_with(strtoupper($line), 'INSERT ')) {
                DB::unprepared($line);
            }
        }

        fclose($handle);
    }
}
