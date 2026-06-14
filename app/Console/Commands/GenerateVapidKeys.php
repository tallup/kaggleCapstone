<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

class GenerateVapidKeys extends Command
{
    protected $signature = 'webpush:vapid';
    protected $description = 'Generate VAPID keys for Web Push notifications';

    public function handle(): int
    {
        $keys = VAPID::createVapidKeys();
        $this->info('Add these to your .env file (and set VITE_VAPID_PUBLIC_KEY for the frontend):');
        $this->newLine();
        $this->line('VAPID_PUBLIC_KEY=' . $keys['publicKey']);
        $this->line('VAPID_PRIVATE_KEY=' . $keys['privateKey']);
        $this->line('VAPID_SUBJECT=mailto:your-email@example.com');
        $this->newLine();
        $this->line('For Vite (frontend), add to .env:');
        $this->line('VITE_VAPID_PUBLIC_KEY=' . $keys['publicKey']);
        return self::SUCCESS;
    }
}
