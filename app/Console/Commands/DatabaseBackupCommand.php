<?php

namespace App\Console\Commands;

use App\Models\Facility;
use App\Services\DatabaseBackupService;
use App\Services\FacilitySqlExportService;
use Illuminate\Console\Command;

class DatabaseBackupCommand extends Command
{
    protected $signature = 'database:backup
                            {--scheduled : Run as the automatic daily backup (per-facility or legacy full mysqldump)}
                            {--facility= : Export one facility by ID (non-scheduled)}';

    protected $description = 'Create facility-scoped SQL backups (default) or legacy full mysqldump when enabled';

    public function handle(DatabaseBackupService $backupService, FacilitySqlExportService $facilityExport): int
    {
        if ($this->option('scheduled') && ! config('backup.scheduled_enabled', true)) {
            $this->info('Automatic backups are disabled (AUTO_DB_BACKUP_ENABLED=false). Skipping.');

            return self::SUCCESS;
        }

        $scheduled = (bool) $this->option('scheduled');
        $singleFacility = $this->option('facility');

        if (! $scheduled && $singleFacility !== null && $singleFacility !== '') {
            $result = $facilityExport->export((int) $singleFacility, false);
            if (! ($result['success'] ?? false)) {
                $this->error($result['message'] ?? 'Backup failed');

                return self::FAILURE;
            }
            $this->info(sprintf('Backup created: %s (%s)', $result['filename'], $result['size'] ?? ''));

            return self::SUCCESS;
        }

        if (! $scheduled && $singleFacility === null && config('backup.enable_full_database_mysqldump', false)) {
            $result = $backupService->createBackup(false);
            if (! ($result['success'] ?? false)) {
                $this->error($result['message'] ?? 'Backup failed');

                return self::FAILURE;
            }
            $this->info(sprintf('Full database backup created: %s (%s)', $result['filename'], $result['size'] ?? ''));

            return self::SUCCESS;
        }

        if ($scheduled && config('backup.scheduled_facility_backups', true)) {
            $facilities = Facility::withoutGlobalScopes()->where('is_active', true)->get();
            if ($facilities->isEmpty()) {
                $this->warn('No active facilities found; nothing to back up.');

                return self::SUCCESS;
            }

            foreach ($facilities as $facility) {
                $result = $facilityExport->export((int) $facility->id, true);
                if (! ($result['success'] ?? false)) {
                    $this->error(sprintf('Facility %d backup failed: %s', $facility->id, $result['message'] ?? 'unknown'));

                    return self::FAILURE;
                }
                $this->line(sprintf('Facility %d: %s (%s)', $facility->id, $result['filename'], $result['size'] ?? ''));
            }

            return self::SUCCESS;
        }

        if ($scheduled && config('backup.enable_full_database_mysqldump', false)) {
            $result = $backupService->createBackup(true);

            if (! ($result['success'] ?? false)) {
                $this->error($result['message'] ?? 'Backup failed');

                return self::FAILURE;
            }

            $this->info(sprintf(
                'Full database backup created: %s (%s)',
                $result['filename'],
                $result['size'] ?? ''
            ));

            return self::SUCCESS;
        }

        if ($scheduled) {
            $this->info('Scheduled facility backups are off (SCHEDULED_FACILITY_BACKUPS=false) and full mysqldump is disabled. Skipping.');

            return self::SUCCESS;
        }

        $this->warn('Use --facility=ID for a facility export, or enable ENABLE_FULL_DATABASE_MYSQLDUMP for a full mysqldump, or use Super Admin → Database in the UI.');

        return self::SUCCESS;
    }
}

