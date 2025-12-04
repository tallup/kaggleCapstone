<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
                ],
                'error' => 'Unable to fetch statistics',
            ], 200);
        }
    }

    /**
     * Create a database backup
     */
    public function createBackup(Request $request): JsonResponse
    {
        $user = Auth::user();
        
        if (!$user || ($user->role !== 'super_admin' && $user->role !== 'administrator')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        try {
            $timestamp = Carbon::now()->format('Y-m-d_H-i-s');
            $filename = "backup_{$timestamp}.sql";
            $backupPath = storage_path("app/backups/{$filename}");

            // Ensure backups directory exists
            if (!is_dir(storage_path('app/backups'))) {
                mkdir(storage_path('app/backups'), 0755, true);
            }

            // Get database connection details
            $connection = config('database.default');
            $config = config("database.connections.{$connection}");

            // Create backup using mysqldump or sqlite dump
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
                $sourcePath = database_path($config['database']);
                if (file_exists($sourcePath)) {
                    copy($sourcePath, $backupPath);
                } else {
                    return response()->json(['message' => 'Database file not found'], 404);
                }
            } else {
                return response()->json(['message' => 'Unsupported database driver'], 400);
            }

            if (file_exists($backupPath)) {
                $fileSize = filesize($backupPath);
                
                // Store backup metadata
                $this->saveBackupMetadata($filename, $fileSize);

                return response()->json([
                    'message' => 'Backup created successfully',
                    'data' => [
                        'filename' => $filename,
                        'size' => $this->formatBytes($fileSize),
                        'created_at' => Carbon::now()->toIso8601String(),
                    ],
                ]);
            } else {
                return response()->json(['message' => 'Failed to create backup'], 500);
            }
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create backup: ' . $e->getMessage(),
            ], 500);
        }
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
                $files = glob($backupsDir . '/backup_*.sql');
                
                foreach ($files as $file) {
                    $filename = basename($file);
                    $backups[] = [
                        'filename' => $filename,
                        'size' => $this->formatBytes(filesize($file)),
                        'created_at' => Carbon::createFromTimestamp(filemtime($file))->toIso8601String(),
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
                $targetPath = database_path($config['database']);
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
                $dbPath = database_path($config['database']);
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

    /**
     * Save backup metadata
     */
    private function saveBackupMetadata(string $filename, int $size): void
    {
        // Store metadata in a JSON file
        $metadataFile = storage_path('app/backups/metadata.json');
        $metadata = [];

        if (file_exists($metadataFile)) {
            $metadata = json_decode(file_get_contents($metadataFile), true) ?: [];
        }

        $metadata[] = [
            'filename' => $filename,
            'size' => $size,
            'created_at' => Carbon::now()->toIso8601String(),
        ];

        file_put_contents($metadataFile, json_encode($metadata, JSON_PRETTY_PRINT));
    }
}

