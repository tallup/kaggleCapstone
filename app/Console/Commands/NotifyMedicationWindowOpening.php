<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * @deprecated Pre-window emails were removed to reduce noise. Missed-dose admin emails are sent
 * from medications:mark-missed when a window closes without administration.
 */
class NotifyMedicationWindowOpening extends Command
{
    protected $signature = 'medications:notify-window-opening';

    protected $description = '[Deprecated] No longer sends email. Use medications:mark-missed missed-window notifications instead.';

    public function handle(): int
    {
        Log::debug('medications:notify-window-opening is deprecated and does nothing.');

        return 0;
    }
}
