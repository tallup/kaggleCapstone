<?php

namespace App\Services;

use Carbon\Carbon;

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
            if (in_array($config['driver'], ['mysql', 'mariadb'], true)) {
                $dump = $this->runMysqlDumpToFile($backupPath, $config);
                if (! ($dump['ok'] ?? false)) {
                    return [
                        'success' => false,
                        'message' => $dump['message'] ?? 'Failed to create database dump',
                    ];
                }
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
            if ($fileSize === 0) {
                @unlink($backupPath);

                return ['success' => false, 'message' => 'Backup file was empty (check mysqldump errors).'];
            }
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

    /**
     * Run mysqldump with stdout only to the file. Never use shell `2>&1` — stderr warnings must not be written into the .sql file.
     *
     * @return array{ok: bool, message?: string}
     */
    private function runMysqlDumpToFile(string $backupPath, array $config): array
    {
        $parts = [config('backup.mysqldump_binary', 'mysqldump')];

        $socket = $config['unix_socket'] ?? '';
        if (is_string($socket) && $socket !== '') {
            $parts[] = '--socket='.$socket;
        } else {
            $parts[] = '-h';
            $parts[] = $config['host'] ?? '127.0.0.1';
            $port = (int) ($config['port'] ?? 3306);
            if ($port !== 3306) {
                $parts[] = '-P';
                $parts[] = (string) $port;
            }
        }

        $parts[] = '-u';
        $parts[] = $config['username'] ?? 'root';

        $password = $config['password'] ?? '';
        if ($password !== '') {
            $parts[] = '-p'.$password;
        }

        // InnoDB snapshot without global locks; often avoids requiring PROCESS (see mysqldump privilege errors).
        $parts[] = '--single-transaction';
        $parts[] = '--quick';
        $parts[] = '--set-charset';
        $parts[] = '--default-character-set=utf8mb4';
        if (config('backup.mysqldump_no_tablespaces', true)) {
            $parts[] = '--no-tablespaces';
        }

        $parts[] = $config['database'] ?? '';

        $descriptorSpec = [
            0 => ['pipe', 'r'],
            1 => ['file', $backupPath, 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($parts, $descriptorSpec, $pipes, null, null);

        if (! is_resource($process)) {
            return ['ok' => false, 'message' => 'Could not start mysqldump. Install the client tools or set MYSQLDUMP_CLI_PATH in .env.'];
        }

        fclose($pipes[0]);

        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        if ($exitCode !== 0) {
            if (file_exists($backupPath)) {
                @unlink($backupPath);
            }

            $detail = trim($stderr !== '' ? $stderr : 'mysqldump exited with code '.$exitCode.'.');
            if (strlen($detail) > 1500) {
                $detail = substr($detail, 0, 1500).'…';
            }

            return ['ok' => false, 'message' => 'mysqldump failed: '.$detail];
        }

        return ['ok' => true];
    }
}
