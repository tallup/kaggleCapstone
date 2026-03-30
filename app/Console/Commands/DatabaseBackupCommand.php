<?php

namespace App\Console\Commands;

use App\Services\DatabaseBackupService;
use Illuminate\Console\Command;

class DatabaseBackupCommand extends Command
{
    protected $signature = 'database:backup
                            {--scheduled : Run as the automatic daily backup (applies retention to backup_auto_* files)}';

    protected $description = 'Create a database backup file in storage/app/backups (used by the scheduler for automatic backups)';

    public function handle(DatabaseBackupService $backupService): int
    {
        if ($this->option('scheduled') && ! config('backup.scheduled_enabled', true)) {
            $this->info('Automatic backups are disabled (AUTO_DB_BACKUP_ENABLED=false). Skipping.');

            return self::SUCCESS;
        }

        $scheduled = (bool) $this->option('scheduled');
        $result = $backupService->createBackup($scheduled);

        if (! ($result['success'] ?? false)) {
            $this->error($result['message'] ?? 'Backup failed');

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Backup created: %s (%s)',
            $result['filename'],
            $result['size'] ?? ''
        ));

        return self::SUCCESS;
    }
}
