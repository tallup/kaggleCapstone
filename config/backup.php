<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Automatic database backups (Super Admin → server disk → download to USB)
    |--------------------------------------------------------------------------
    |
    | Requires the Laravel scheduler: * * * * * cd /path && php artisan schedule:run
    | (e.g. Laravel Forge "Scheduler" or system cron).
    |
    */

    'scheduled_enabled' => env('AUTO_DB_BACKUP_ENABLED', true),

    /** Time (server timezone) for daily automatic backup, e.g. 02:00 */
    'scheduled_time' => env('AUTO_DB_BACKUP_TIME', '02:00'),

    /** Keep only this many automatic backups on disk (oldest auto backups deleted). Manual "Backup Now" files are not pruned. */
    'scheduled_keep' => (int) env('AUTO_DB_BACKUP_KEEP', 30),

    /**
     * Path to the mysql client binary for Super Admin → restore. Use when PHP-FPM has a minimal PATH
     * (e.g. /usr/bin/mysql). Defaults to "mysql" on PATH.
     */
    'mysql_binary' => env('MYSQL_CLI_PATH', 'mysql'),

    /**
     * Path to mysqldump for backups. Must not write stderr into the .sql file (see DatabaseBackupService).
     */
    'mysqldump_binary' => env('MYSQLDUMP_CLI_PATH', 'mysqldump'),

    /**
     * Pass --no-tablespaces to mysqldump (MySQL 8.0.21+). Helps when the DB user lacks PROCESS.
     * Disable on older MySQL/MariaDB if mysqldump reports an unknown option.
     */
    'mysqldump_no_tablespaces' => filter_var(env('MYSQLDUMP_NO_TABLESPACES', true), FILTER_VALIDATE_BOOL),

    /**
     * When true, super admins may run legacy whole-database mysqldump/restore (hosting-style).
     * Default false: backups are per-facility logical exports only.
     */
    'enable_full_database_mysqldump' => filter_var(env('ENABLE_FULL_DATABASE_MYSQLDUMP', false), FILTER_VALIDATE_BOOL),

    /**
     * When true, the scheduler runs {@see \App\Console\Commands\DatabaseBackupCommand} for each active facility.
     */
    'scheduled_facility_backups' => filter_var(env('SCHEDULED_FACILITY_BACKUPS', true), FILTER_VALIDATE_BOOL),

];
