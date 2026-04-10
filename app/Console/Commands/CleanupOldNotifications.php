<?php

namespace App\Console\Commands;

use App\Models\Notification;
use Illuminate\Console\Command;

class CleanupOldNotifications extends Command
{
    protected $signature = 'notifications:cleanup
        {--read-days=30 : Delete read notifications older than this many days}
        {--all-days=90 : Delete all notifications older than this many days}';

    protected $description = 'Delete old notifications to prevent table bloat';

    public function handle(): int
    {
        $readDays = (int) $this->option('read-days');
        $allDays = (int) $this->option('all-days');

        // Delete read notifications older than --read-days
        $readDeleted = Notification::read()
            ->where('created_at', '<', now()->subDays($readDays))
            ->delete();

        // Delete all notifications older than --all-days
        $allDeleted = Notification::where('created_at', '<', now()->subDays($allDays))
            ->delete();

        $total = $readDeleted + $allDeleted;
        $this->info("Cleaned up {$total} notifications ({$readDeleted} read > {$readDays}d, {$allDeleted} all > {$allDays}d)");

        return self::SUCCESS;
    }
}
