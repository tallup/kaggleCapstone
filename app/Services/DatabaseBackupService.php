<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DatabaseBackupService
{
    private const LAST_SCHEDULED_META = '.last_scheduled_backup.json';

    /**
     * Create a database dump on disk under storage/app/backups/.
     *
     * @return array{success: bool, filename?: string, size?: string, created_at?: string, message?: string}
     */
    public function createBackup(bool $scheduled = false): array
    {
        $timestamp = Carbon::now()->format('Y-m-d_H-i-s');
        $prefix = $scheduled ? 'backup_auto_' : 'backup_';
        $filename = "{$prefix}{$timestamp}.sql";
        $backupPath = storage_path("app/backups/{$filename}");

        if (! is_dir(storage_path('app/backups'))) {
            mkdir(storage_path('app/backups'), 0755, true);
        }

        $connection = config('database.default');
        $config = config("database.connections.{$connection}");

        try {
            if ($config['driver'] === 'mysql') {
                $host = $config['host'] ?? 'localhost';
                $database = $config['database'] ?? '';
                $username = $config['username'] ?? '';
                $password = $config['password'] ?? '';

                $command = sprintf(
                    'mysqldump -h %s -u %s -p%s %s > %s 2>&1',
                    escapeshellarg($host),
                    escapeshellarg($username),
                    escapeshellarg($password),
                    escapeshellarg($database),
                    escapeshellarg($backupPath)
                );
                exec($command, $output, $returnVar);
            } elseif ($config['driver'] === 'sqlite') {
                $sourcePath = $config['database'];
                if (! str_starts_with($sourcePath, '/')) {
                    $sourcePath = database_path($sourcePath);
                }

                if (file_exists($sourcePath)) {
                    copy($sourcePath, $backupPath);
                } else {
                    return ['success' => false, 'message' => 'Database file not found'];
                }
            } else {
                return ['success' => false, 'message' => 'Unsupported database driver'];
            }

            if (! file_exists($backupPath)) {
                return ['success' => false, 'message' => 'Failed to create backup file'];
            }

            $fileSize = filesize($backupPath);
            $this->saveBackupMetadata($filename, $fileSize);

            if ($scheduled) {
                $this->writeLastScheduledMeta($filename, $fileSize);
                $this->pruneScheduledBackups();
            }

            return [
                'success' => true,
                'filename' => $filename,
                'size' => $this->formatBytes($fileSize),
                'created_at' => Carbon::now()->toIso8601String(),
            ];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function lastScheduledBackupInfo(): ?array
    {
        $path = storage_path('app/backups/'.self::LAST_SCHEDULED_META);
        if (! file_exists($path)) {
            return null;
        }
        $json = json_decode((string) file_get_contents($path), true);

        return is_array($json) ? $json : null;
    }

    private function writeLastScheduledMeta(string $filename, int $size): void
    {
        $path = storage_path('app/backups/'.self::LAST_SCHEDULED_META);
        file_put_contents($path, json_encode([
            'filename' => $filename,
            'size' => $size,
            'created_at' => Carbon::now()->toIso8601String(),
        ], JSON_PRETTY_PRINT));
    }

    private function pruneScheduledBackups(): void
    {
        $keep = max(1, (int) config('backup.scheduled_keep', 30));
        $dir = storage_path('app/backups');
        $files = glob($dir.'/backup_auto_*.sql') ?: [];
        usort($files, fn ($a, $b) => filemtime($b) <=> filemtime($a));
        $toDelete = array_slice($files, $keep);
        foreach ($toDelete as $path) {
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }

    private function saveBackupMetadata(string $filename, int $size): void
    {
        $metadataFile = storage_path('app/backups/metadata.json');
        $metadata = [];

        if (file_exists($metadataFile)) {
            $metadata = json_decode((string) file_get_contents($metadataFile), true) ?: [];
        }

        $metadata[] = [
            'filename' => $filename,
            'size' => $size,
            'created_at' => Carbon::now()->toIso8601String(),
        ];

        file_put_contents($metadataFile, json_encode($metadata, JSON_PRETTY_PRINT));
    }

    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, $precision).' '.$units[$i];
    }
}
