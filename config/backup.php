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

];
