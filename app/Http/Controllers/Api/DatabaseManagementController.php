<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DatabaseBackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Carbon\Carbon;

class DatabaseManagementController extends Controller
{
    /**
     * Get database statistics
     */
    public function stats(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || ($user->role !== 'super_admin' && $user->role !== 'administrator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            // Get database size
            $dbSize = $this->getDatabaseSize();
            
            // Get backup count
            $backupCount = $this->getBackupCount();
            
            // Get storage used
            $storageUsed = $this->getStorageUsed();

            return response()->json([
                'data' => [
                    'database_size' => $dbSize,
                    'total_backups' => $backupCount,
                    'storage_used' => $storageUsed,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'data' => [
                    'database_size' => 'N/A',
                    'total_backups' => 0,
                    'storage_used' => 'N/A',
                    'auto_backup_enabled' => (bool) config('backup.scheduled_enabled', true),
                    'auto_backup_time' => config('backup.scheduled_time', '02:00'),
                    'auto_backup_keep' => (int) config('backup.scheduled_keep', 30),
                    'last_auto_backup_at' => null,
                    'last_auto_backup_filename' => null,
                ],
                'error' => 'Unable to fetch statistics',
            ], 200);
        }
    }

    /**
     * Create a database backup (manual; filename prefix backup_, not pruned automatically)
     */
    public function createBackup(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $user || ($user->role !== 'super_admin' && $user->role !== 'administrator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $result = app(DatabaseBackupService::class)->createBackup(false);

        if (! ($result['success'] ?? false)) {
            $status = ($result['message'] ?? '') === 'Database file not found' ? 404 : 500;

            return response()->json([
                'message' => $result['message'] ?? 'Failed to create backup',
            ], $status);
        }

        return response()->json([
            'message' => 'Backup created successfully',
            'data' => [
                'filename' => $result['filename'],
                'size' => $result['size'],
                'created_at' => $result['created_at'],
            ],
        ]);
    }

    /**
     * Get list of recent backups
     */
    public function recentBackups(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || ($user->role !== 'super_admin' && $user->role !== 'administrator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $backupsDir = storage_path('app/backups');
            $backups = [];

            if (is_dir($backupsDir)) {
                $files = glob($backupsDir.'/backup_*.sql');

                foreach ($files as $file) {
                    $filename = basename($file);
                    $backups[] = [
                        'filename' => $filename,
                        'size' => $this->formatBytes(filesize($file)),
                        'created_at' => Carbon::createFromTimestamp(filemtime($file))->toIso8601String(),
                        'is_automatic' => str_starts_with($filename, 'backup_auto_'),
                    ];
                }

                // Sort by creation date, newest first
                usort($backups, function ($a, $b) {
                    return strtotime($b['created_at']) - strtotime($a['created_at']);
                });
            }

            return response()->json(['data' => $backups]);
        } catch (\Exception $e) {
            return response()->json(['data' => []]);
        }
    }

    /**
     * Download a backup file
     */
    public function downloadBackup(Request $request, string $filename): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || ($user->role !== 'super_admin' && $user->role !== 'administrator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $backupPath = storage_path("app/backups/{$filename}");

            // Security: backup_*.sql includes manual (backup_2026-...) and automatic (backup_auto_...)
            if (! str_starts_with($filename, 'backup_') || ! str_ends_with($filename, '.sql')) {
                return response()->json(['message' => 'Invalid backup file'], 400);
            }

            if (!file_exists($backupPath)) {
                return response()->json(['message' => 'Backup file not found'], 404);
            }

            return response()->download($backupPath, $filename, [
                'Content-Type' => 'application/sql',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to download backup: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Restore from a backup
     */
    public function restoreBackup(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || ($user->role !== 'super_admin' && $user->role !== 'administrator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'filename' => 'required|string',
        ]);

        try {
            $filename = $request->input('filename');
            $backupPath = storage_path("app/backups/{$filename}");

            if (!file_exists($backupPath)) {
                return response()->json(['message' => 'Backup file not found'], 404);
            }

            // Get database connection details
            $connection = config('database.default');
            $config = config("database.connections.{$connection}");

            if ($config['driver'] === 'mysql') {
                $host = $config['host'] ?? 'localhost';
                $database = $config['database'] ?? '';
                $username = $config['username'] ?? '';
                $password = $config['password'] ?? '';

                $command = sprintf(
                    'mysql -h %s -u %s -p%s %s < %s 2>&1',
                    escapeshellarg($host),
                    escapeshellarg($username),
                    escapeshellarg($password),
                    escapeshellarg($database),
                    escapeshellarg($backupPath)
                );
                exec($command, $output, $returnVar);

                if ($returnVar !== 0) {
                    return response()->json(['message' => 'Failed to restore backup'], 500);
                }
            } elseif ($config['driver'] === 'sqlite') {
                // Handle both absolute paths and relative paths
                $targetPath = $config['database'];
                if (!str_starts_with($targetPath, '/')) {
                    $targetPath = database_path($targetPath);
                }
                copy($backupPath, $targetPath);
            } else {
                return response()->json(['message' => 'Unsupported database driver'], 400);
            }

            return response()->json([
                'message' => 'Backup restored successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to restore backup: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Refresh cache and optimize data
     */
    public function refreshData(): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || ($user->role !== 'super_admin' && $user->role !== 'administrator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            // Clear all caches
            Artisan::call('cache:clear');
            Artisan::call('config:clear');
            Artisan::call('route:clear');
            Artisan::call('view:clear');

            // Optimize database (if supported)
            try {
                Artisan::call('optimize:clear');
            } catch (\Exception $e) {
                // Ignore if optimize:clear doesn't exist
            }

            return response()->json([
                'message' => 'Data refreshed and cache cleared successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to refresh data: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get database size
     */
    private function getDatabaseSize(): string
    {
        try {
            $connection = config('database.default');
            $config = config("database.connections.{$connection}");

            if ($config['driver'] === 'mysql') {
                $result = DB::select("SELECT 
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb 
                    FROM information_schema.tables 
                    WHERE table_schema = ?", [$config['database']]);
                
                if (!empty($result) && isset($result[0]->size_mb)) {
                    return $this->formatBytes($result[0]->size_mb * 1024 * 1024);
                }
            } elseif ($config['driver'] === 'sqlite') {
                // Handle both absolute paths and relative paths
                $dbPath = $config['database'];
                if (!str_starts_with($dbPath, '/')) {
                    $dbPath = database_path($dbPath);
                }
                if (file_exists($dbPath)) {
                    return $this->formatBytes(filesize($dbPath));
                }
            }

            return 'N/A';
        } catch (\Exception $e) {
            return 'N/A';
        }
    }

    /**
     * Get backup count
     */
    private function getBackupCount(): int
    {
        try {
            $backupsDir = storage_path('app/backups');
            if (is_dir($backupsDir)) {
                return count(glob($backupsDir . '/backup_*.sql'));
            }
            return 0;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Get storage used
     */
    private function getStorageUsed(): string
    {
        try {
            $storagePath = storage_path('app');
            $size = $this->getDirectorySize($storagePath);
            return $this->formatBytes($size);
        } catch (\Exception $e) {
            return 'N/A';
        }
    }

    /**
     * Calculate directory size recursively
     */
    private function getDirectorySize(string $directory): int
    {
        $size = 0;
        if (is_dir($directory)) {
            foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($directory)) as $file) {
                if ($file->isFile()) {
                    $size += $file->getSize();
                }
            }
        }
        return $size;
    }

    /**
     * Format bytes to human readable format
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }

}

