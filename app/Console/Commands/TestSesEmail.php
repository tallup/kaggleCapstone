<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class TestSesEmail extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'ses:test {email : The email address to send a test email to}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a test email via Amazon SES to verify configuration';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $recipientEmail = $this->argument('email');
        
        // Validate email
        if (!filter_var($recipientEmail, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email address: ' . $recipientEmail);
            return 1;
        }

        $this->info('Testing Amazon SES configuration...');
        $this->info('Mail driver: ' . config('mail.default'));
        $this->info('From address: ' . config('mail.from.address'));
        $this->info('From name: ' . config('mail.from.name'));
        $this->info('AWS Region: ' . config('mail.mailers.ses.region'));
        $this->newLine();

        try {
            Mail::raw('This is a test email from your Laravel application using Amazon SES. If you receive this, your SES configuration is working correctly!', function ($message) use ($recipientEmail) {
                $message->to($recipientEmail)
                        ->subject('Test Email from Laravel - Amazon SES');
            });

            $this->info('✓ Test email sent successfully to: ' . $recipientEmail);
            $this->info('Check your inbox (and spam folder) for the test email.');
            
            return 0;
        } catch (\Exception $e) {
            $this->error('✗ Failed to send test email');
            $this->error('Error: ' . $e->getMessage());
            $this->newLine();
            $this->warn('Troubleshooting tips:');
            $this->line('1. Verify your AWS credentials in .env (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)');
            $this->line('2. Check that MAIL_MAILER is set to "ses" or "ses-v2"');
            $this->line('3. Ensure your "From" email/domain is verified in Amazon SES');
            $this->line('4. Verify AWS_DEFAULT_REGION matches your SES region');
            $this->line('5. Check Laravel logs: storage/logs/laravel.log');
            
            Log::error('SES test email failed', [
                'recipient' => $recipientEmail,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return 1;
        }
    }
}

