<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\DatabaseBackupService;
use App\Services\FacilitySqlExportService;
use App\Services\FacilitySqlImportService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DatabaseManagementController extends Controller
{
    /**
     * Super admin access may be stored on users.role or only on Spatie roles — keep checks in sync with User model.
     */
    private function canManageDatabase(?User $user): bool
    {
        if (! $user instanceof User) {
            return false;
        }

        return $user->isSuperAdmin();
    }

    /**
     * Per-facility logical backup/restore (super admin only).
     */
    private function canManageFacilityBackup(?User $user): bool
    {
        return $user instanceof User && $user->isSuperAdmin();
    }

    /**
     * Get database statistics
     */
    public function stats(): JsonResponse
    {
        $user = Auth::user();

        if (! $this->canManageDatabase($user)) {
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
                    'full_database_mysqldump_enabled' => (bool) config('backup.enable_full_database_mysqldump', false),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'data' => [
                    'database_size' => 'N/A',
                    'total_backups' => 0,
                    'storage_used' => 'N/A',
                    'full_database_mysqldump_enabled' => (bool) config('backup.enable_full_database_mysqldump', false),
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
     * Create a facility-scoped logical backup (default), or legacy full mysqldump when enabled.
     */
    public function createBackup(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $this->canManageFacilityBackup($user)) {
            return response()->json(['message' => 'Unauthorized. Super admin access required for database backup.'], 403);
        }

        $validated = $request->validate([
            'full_database' => 'sometimes|boolean',
            'facility_id' => 'required_unless:full_database,true|nullable|integer|exists:facilities,id',
        ]);

        $fullDatabase = filter_var($validated['full_database'] ?? false, FILTER_VALIDATE_BOOL);

        if ($fullDatabase) {
            if (! config('backup.enable_full_database_mysqldump', false)) {
                return response()->json([
                    'message' => 'Full-database mysqldump is disabled. Set ENABLE_FULL_DATABASE_MYSQLDUMP=true if you need it.',
                ], 403);
            }

            $result = app(DatabaseBackupService::class)->createBackup(false);

            if (! ($result['success'] ?? false)) {
                $status = ($result['message'] ?? '') === 'Database file not found' ? 404 : 500;

                return response()->json([
                    'message' => $result['message'] ?? 'Failed to create backup',
                ], $status);
            }

            return response()->json([
                'message' => 'Full database backup created successfully',
                'data' => [
                    'filename' => $result['filename'],
                    'size' => $result['size'],
                    'created_at' => $result['created_at'],
                    'type' => 'full_mysqldump',
                ],
            ]);
        }

        $facilityId = (int) $validated['facility_id'];
        $result = app(FacilitySqlExportService::class)->export($facilityId, false);

        if (! ($result['success'] ?? false)) {
            return response()->json([
                'message' => $result['message'] ?? 'Failed to create facility backup',
            ], 500);
        }

        return response()->json([
            'message' => 'Facility backup created successfully',
            'data' => [
                'filename' => $result['filename'],
                'facility_id' => $facilityId,
                'size' => $result['size'],
                'created_at' => $result['created_at'],
                'type' => 'facility',
            ],
        ]);
    }

    /**
     * List backups for a facility (logical SQL) and optionally legacy full-database files.
     */
    public function recentBackups(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Align with stats(): anyone who can see backup counts must be able to load the list (otherwise UI shows 0 files with a 403).
        if (! $this->canManageDatabase($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Query params are strings; avoid `integer` + `boolean` rules that 422 on ?facility_id=1&include_full_database=true
        $validated = $request->validate([
            'facility_id' => ['required', 'numeric', 'min:1'],
        ]);

        $facilityId = (int) $validated['facility_id'];
        $backups = [];

        try {
            // List every per-facility .sql under storage/app/backups/facilities/*/ so super-admins see all
            // tenant backups (not only the folder for the currently selected facility).
            $facilitiesRoot = storage_path('app/backups/facilities');
            if (is_dir($facilitiesRoot)) {
                foreach (glob($facilitiesRoot.'/*', GLOB_ONLYDIR) ?: [] as $dir) {
                    $basename = basename((string) $dir);
                    if (! ctype_digit($basename)) {
                        continue;
                    }
                    $dirFacilityId = (int) $basename;
                    foreach (scandir($dir) ?: [] as $name) {
                        if ($name === '.' || $name === '..') {
                            continue;
                        }
                        if (! preg_match('/\.sql$/i', $name)) {
                            continue;
                        }
                        $file = $dir.'/'.$name;
                        if (! is_file($file)) {
                            continue;
                        }
                        $filename = $name;
                        $backups[] = [
                            'filename' => $filename,
                            'facility_id' => $dirFacilityId,
                            'size' => $this->formatBytes(filesize($file)),
                            'created_at' => Carbon::createFromTimestamp(filemtime($file))->toIso8601String(),
                            'is_automatic' => str_starts_with($filename, 'backup_auto_facility_'),
                            'type' => 'facility',
                            'matches_selected_facility' => $dirFacilityId === $facilityId,
                        ];
                    }
                }
            }

            // Whole-database mysqldumps in storage/app/backups/backup_*.sql — list for visibility even when
            // ENABLE_FULL_DATABASE_MYSQLDUMP is false; download/restore still enforce config.
            if ($request->boolean('include_full_database', true)) {
                $rootDir = storage_path('app/backups');
                if (is_dir($rootDir)) {
                    foreach (scandir($rootDir) ?: [] as $name) {
                        if ($name === '.' || $name === '..') {
                            continue;
                        }
                        if (! preg_match('/^backup_.*\.sql$/i', $name)) {
                            continue;
                        }
                        $file = $rootDir.'/'.$name;
                        if (! is_file($file) || str_contains($file, '/facilities/')) {
                            continue;
                        }
                        $filename = $name;
                        $backups[] = [
                            'filename' => $filename,
                            'facility_id' => null,
                            'size' => $this->formatBytes(filesize($file)),
                            'created_at' => Carbon::createFromTimestamp(filemtime($file))->toIso8601String(),
                            'is_automatic' => str_starts_with($filename, 'backup_auto_'),
                            'type' => 'full_mysqldump',
                            'download_requires_full_database_config' => ! config('backup.enable_full_database_mysqldump', false),
                        ];
                    }
                }
            }

            usort($backups, function ($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });

            $meta = $this->getBackupListingMeta($facilityId);
            $meta['legacy_full_database_enabled'] = (bool) config('backup.enable_full_database_mysqldump', false);

            return response()->json(['data' => $backups, 'meta' => $meta]);
        } catch (\Exception $e) {
            Log::error('recentBackups failed', [
                'facility_id' => $request->input('facility_id'),
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'data' => [],
                'meta' => $this->getBackupListingMeta((int) $request->input('facility_id', 0)),
            ]);
        }
    }

    /**
     * Download a facility backup or legacy full-database backup.
     */
    public function downloadBackup(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse|\Illuminate\Http\JsonResponse
    {
        $user = Auth::user();

        if (! $this->canManageDatabase($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Query string params are strings; `integer`/`boolean` rules often 422 on GET ?facility_id=1&full_database=true
        $validated = $request->validate([
            'filename' => ['required', 'string', 'max:512'],
            'facility_id' => ['nullable', 'numeric', 'min:1'],
        ]);

        $filename = basename($validated['filename']);
        if (! preg_match('/\.sql$/i', $filename)) {
            return response()->json(['message' => 'Invalid backup file'], 400);
        }

        $wantsFullDatabase = filter_var($request->query('full_database', false), FILTER_VALIDATE_BOOLEAN);

        try {
            if ($wantsFullDatabase && config('backup.enable_full_database_mysqldump', false)) {
                if (! str_starts_with($filename, 'backup_')) {
                    return response()->json(['message' => 'Invalid backup file'], 400);
                }
                $backupPath = storage_path('app/backups/'.$filename);
            } else {
                $facilityId = (int) ($validated['facility_id'] ?? 0);
                if ($facilityId < 1) {
                    return response()->json(['message' => 'facility_id is required for facility backups.'], 422);
                }
                if (! preg_match('/^backup_(auto_)?facility_\d+_/i', $filename)) {
                    return response()->json(['message' => 'Invalid facility backup filename.'], 400);
                }
                $backupPath = storage_path('app/backups/facilities/'.$facilityId.'/'.$filename);
            }

            if (! file_exists($backupPath)) {
                return response()->json(['message' => 'Backup file not found'], 404);
            }

            return response()->download($backupPath, $filename, [
                'Content-Type' => 'application/sql',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to download backup: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Restore from a facility logical backup or legacy full mysqldump (when enabled).
     */
    public function restoreBackup(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $this->canManageFacilityBackup($user)) {
            return response()->json(['message' => 'Unauthorized. Super admin access required.'], 403);
        }

        $validated = $request->validate([
            'filename' => 'required|string',
            'facility_id' => 'required_unless:full_database,true|nullable|integer|exists:facilities,id',
            'full_database' => 'sometimes|boolean',
            'confirmation' => 'required|string|in:DELETE',
        ]);

        $filename = basename($validated['filename']);
        if (! str_ends_with($filename, '.sql')) {
            return response()->json(['message' => 'Invalid backup file'], 400);
        }

        try {
            $fullDatabase = filter_var($validated['full_database'] ?? false, FILTER_VALIDATE_BOOL);

            if ($fullDatabase) {
                if (! config('backup.enable_full_database_mysqldump', false)) {
                    return response()->json([
                        'message' => 'Full-database restore is disabled.',
                    ], 403);
                }

                if (! str_starts_with($filename, 'backup_')) {
                    return response()->json(['message' => 'Invalid backup file'], 400);
                }

                $backupPath = storage_path('app/backups/'.$filename);

                if (! file_exists($backupPath)) {
                    return response()->json(['message' => 'Backup file not found'], 404);
                }

                return $this->restoreFullMysqldumpFile($backupPath);
            }

            $facilityId = (int) $validated['facility_id'];
            if (! preg_match('/^backup_(auto_)?facility_\d+_/i', $filename)) {
                return response()->json(['message' => 'Invalid facility backup filename.'], 400);
            }

            $backupPath = storage_path('app/backups/facilities/'.$facilityId.'/'.$filename);

            if (! file_exists($backupPath)) {
                return response()->json(['message' => 'Backup file not found'], 404);
            }

            $connection = config('database.default');
            $driver = config("database.connections.{$connection}.driver");

            if (! in_array($driver, ['mysql', 'mariadb'], true)) {
                return response()->json([
                    'message' => 'Facility backup restore requires MySQL/MariaDB.',
                ], 400);
            }

            set_time_limit(0);

            $import = app(FacilitySqlImportService::class)->importFromFile($backupPath, $facilityId);

            if (! $import['ok']) {
                return response()->json([
                    'message' => 'Failed to restore facility backup',
                    'detail' => $import['detail'] ?? null,
                ], 500);
            }

            return response()->json([
                'message' => 'Facility backup restored successfully',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to restore backup: '.$e->getMessage(),
            ], 500);
        }
    }

    private function restoreFullMysqldumpFile(string $backupPath): JsonResponse
    {
        $connection = config('database.default');
        $config = config("database.connections.{$connection}");

        if (in_array($config['driver'], ['mysql', 'mariadb'], true)) {
            set_time_limit(0);

            $prepared = $this->prepareSqlDumpForRestore($backupPath);
            if (! empty($prepared['error'])) {
                return response()->json([
                    'message' => $prepared['error'],
                ], 422);
            }
            $restore = ['ok' => false];
            try {
                $restore = $this->runMysqlRestoreFromSqlFile($prepared['path'], $config);
            } finally {
                if (! empty($prepared['temp']) && is_file($prepared['path'])) {
                    @unlink($prepared['path']);
                }
            }

            if (! $restore['ok']) {
                Log::warning('Database restore failed', [
                    'detail' => $restore['detail'] ?? null,
                ]);

                return response()->json([
                    'message' => 'Failed to restore backup',
                    'detail' => $restore['detail'] ?? 'Unknown error (check server logs).',
                ], 500);
            }
        } elseif ($config['driver'] === 'sqlite') {
            $targetPath = $config['database'];
            if (! str_starts_with($targetPath, '/')) {
                $targetPath = database_path($targetPath);
            }
            copy($backupPath, $targetPath);
        } else {
            return response()->json(['message' => 'Unsupported database driver'], 400);
        }

        return response()->json([
            'message' => 'Backup restored successfully',
        ]);
    }

    /**
     * Refresh cache and optimize data
     */
    public function refreshData(): JsonResponse
    {
        $user = Auth::user();

        if (! $this->canManageDatabase($user)) {
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
                'message' => 'Failed to refresh data: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Old automatic backups used `mysqldump ... > file 2>&1`, merging stderr into the file. Recovery:
     * 1) Cut from the first real dump header (`-- MySQL dump` / `-- MariaDB dump`) so leading warnings/errors vanish.
     * 2) Remove any remaining lines that are clearly mysqldump/mysql CLI output.
     *
     * Manual backups usually need no changes and compare equal after sanitization.
     *
     * @return array{path: string, temp: bool, error?: string}
     */
    private function prepareSqlDumpForRestore(string $backupPath): array
    {
        $raw = file_get_contents($backupPath);
        if ($raw === false || $raw === '') {
            return ['path' => $backupPath, 'temp' => false];
        }

        $cleaned = $this->sanitizeCorruptedMysqlDump($raw);

        if ($cleaned === '') {
            return [
                'path' => $backupPath,
                'temp' => false,
                'error' => 'This backup file contains no usable SQL after removing mysqldump error text. The automatic backup likely failed when it was created. Use another backup file or create a new backup.',
            ];
        }

        if ($cleaned === $raw) {
            return ['path' => $backupPath, 'temp' => false];
        }

        $temp = sys_get_temp_dir().'/hl360-restore-'.uniqid('', true).'.sql';
        if (file_put_contents($temp, $cleaned) === false) {
            return ['path' => $backupPath, 'temp' => false];
        }

        return ['path' => $temp, 'temp' => true];
    }

    /**
     * Repair .sql files where stderr was mixed into stdout (legacy backup command).
     */
    private function sanitizeCorruptedMysqlDump(string $raw): string
    {
        $s = preg_replace('/^\xEF\xBB\xBF/', '', $raw);

        // Prefer MariaDB string first (both can appear; pick earliest position).
        $cutAt = null;
        foreach (['-- MariaDB dump', '-- MySQL dump'] as $needle) {
            $p = stripos($s, $needle);
            if ($p !== false && ($cutAt === null || $p < $cutAt)) {
                $cutAt = $p;
            }
        }
        if ($cutAt !== null && $cutAt > 0) {
            $s = substr($s, $cutAt);
        }

        // Lines mysqldump/mysql wrote into the stream (warnings, errors, PROCESS privilege, etc.).
        $s = preg_replace('/^\s*(mysqldump|mysql):\s*.*$/m', '', $s);
        $s = preg_replace('/^\s*Warning:\s*(mysqldump|mysql):\s*.*$/m', '', $s);
        $s = preg_replace("/\n{3,}/", "\n\n", $s);

        return ltrim((string) $s);
    }

    /**
     * Restore MySQL/MariaDB from a .sql file by piping stdin (avoids shell redirection and broken -p + escapeshellarg).
     *
     * @return array{ok: bool, detail?: string}
     */
    private function runMysqlRestoreFromSqlFile(string $backupPath, array $config): array
    {
        $parts = [config('backup.mysql_binary', 'mysql')];

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
            // Single argv "-ppassword" — no shell; special characters in password are safe.
            $parts[] = '-p'.$password;
        }

        $parts[] = $config['database'] ?? '';

        $descriptorSpec = [
            0 => ['file', $backupPath, 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $process = proc_open($parts, $descriptorSpec, $pipes, null, null);

        if (! is_resource($process)) {
            return [
                'ok' => false,
                'detail' => 'Could not start the mysql client. Ensure the `mysql` CLI is installed and on PATH for the PHP/web user (e.g. www-data).',
            ];
        }

        $stdout = stream_get_contents($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        if ($exitCode === 0) {
            return ['ok' => true];
        }

        $combined = trim($stderr !== '' ? $stderr : $stdout);
        if ($combined === '') {
            $combined = 'mysql exited with code '.$exitCode.'.';
        }

        if (strlen($combined) > 2000) {
            $combined = substr($combined, 0, 2000).'…';
        }

        return ['ok' => false, 'detail' => $combined];
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
                $result = DB::select('SELECT 
                    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb 
                    FROM information_schema.tables 
                    WHERE table_schema = ?', [$config['database']]);

                if (! empty($result) && isset($result[0]->size_mb)) {
                    return $this->formatBytes($result[0]->size_mb * 1024 * 1024);
                }
            } elseif ($config['driver'] === 'sqlite') {
                // Handle both absolute paths and relative paths
                $dbPath = $config['database'];
                if (! str_starts_with($dbPath, '/')) {
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
     * Get backup count (all facility-scoped SQL files + legacy root mysqldumps). Matches what can appear in the list.
     */
    private function getBackupCount(): int
    {
        try {
            $n = 0;
            $facilitiesRoot = storage_path('app/backups/facilities');
            if (is_dir($facilitiesRoot)) {
                foreach (glob($facilitiesRoot.'/*', GLOB_ONLYDIR) ?: [] as $dir) {
                    foreach (scandir($dir) ?: [] as $name) {
                        if ($name === '.' || $name === '..') {
                            continue;
                        }
                        if (! preg_match('/\.sql$/i', $name)) {
                            continue;
                        }
                        $f = $dir.'/'.$name;
                        if (is_file($f)) {
                            $n++;
                        }
                    }
                }
            }
            $rootDir = storage_path('app/backups');
            if (is_dir($rootDir)) {
                foreach (scandir($rootDir) ?: [] as $name) {
                    if ($name === '.' || $name === '..') {
                        continue;
                    }
                    if (! preg_match('/^backup_.*\.sql$/i', $name)) {
                        continue;
                    }
                    $f = $rootDir.'/'.$name;
                    if (is_file($f)) {
                        $n++;
                    }
                }
            }

            return $n;
        } catch (\Exception $e) {
            return 0;
        }
    }

    /**
     * Inventory for super-admin backup UI (explains why “all sites” may not match the selected facility).
     *
     * @return array{files_for_selected_facility: int, facility_scoped_files_total: int, legacy_root_files_total: int, facility_ids_with_backups: array<int, int>}
     */
    private function getBackupListingMeta(int $selectedFacilityId): array
    {
        $filesForSelected = 0;
        $facilityScopedTotal = 0;
        $legacyRootTotal = 0;
        /** @var array<int, int> */
        $facilityIdsWithBackups = [];

        $facilitiesRoot = storage_path('app/backups/facilities');
        if (is_dir($facilitiesRoot)) {
            foreach (glob($facilitiesRoot.'/*', GLOB_ONLYDIR) ?: [] as $dir) {
                $basename = basename((string) $dir);
                if (! ctype_digit($basename)) {
                    continue;
                }
                $fid = (int) $basename;
                $count = 0;
                foreach (scandir($dir) ?: [] as $name) {
                    if ($name === '.' || $name === '..') {
                        continue;
                    }
                    if (! preg_match('/\.sql$/i', $name)) {
                        continue;
                    }
                    if (is_file($dir.'/'.$name)) {
                        $count++;
                    }
                }
                if ($count > 0) {
                    $facilityIdsWithBackups[$fid] = $count;
                    $facilityScopedTotal += $count;
                }
                if ($fid === $selectedFacilityId) {
                    $filesForSelected = $count;
                }
            }
        }

        $rootDir = storage_path('app/backups');
        if (is_dir($rootDir)) {
            foreach (scandir($rootDir) ?: [] as $name) {
                if ($name === '.' || $name === '..') {
                    continue;
                }
                if (! preg_match('/^backup_.*\.sql$/i', $name)) {
                    continue;
                }
                $sqlPath = $rootDir.'/'.$name;
                if (is_file($sqlPath)) {
                    $legacyRootTotal++;
                }
            }
        }

        ksort($facilityIdsWithBackups);

        return [
            'files_for_selected_facility' => $filesForSelected,
            'facility_scoped_files_total' => $facilityScopedTotal,
            'legacy_root_files_total' => $legacyRootTotal,
            'facility_ids_with_backups' => $facilityIdsWithBackups,
        ];
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

        return round($bytes, $precision).' '.$units[$i];
    }
}
