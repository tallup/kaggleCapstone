<?php

namespace App\Services;

use App\Models\Facility;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class MailConfigurationService
{
    /**
     * Configure mail settings for a specific facility.
     * 
     * This method reads facility email settings and applies them to the Mail facade.
     * Uses global AWS credentials from .env while allowing facility-specific
     * configuration like from address, name, mail driver, and optional region override.
     *
     * @param Facility $facility
     * @return void
     */
    public function configureForFacility(Facility $facility): void
    {
        if (! config('mail.notifications_enabled')) {
            return;
        }

        try {
            $settings = \App\Models\FacilitySetting::where('facility_id', $facility->id)
                ->where('category', 'email')
                ->get()
                ->mapWithKeys(function ($setting) {
                    return [$setting->key => $setting->casted_value];
                });

            // Get mail driver from facility settings or use default
            $mailDriver = $settings->get('mail_driver') ?? config('mail.default');
            
            // Only configure if facility has email settings
            if ($mailDriver && in_array($mailDriver, ['ses', 'ses-v2', 'smtp', 'sendmail', 'log', 'mailgun', 'postmark'], true)) {
                // Set the default mailer
                Config::set('mail.default', $mailDriver);

                // Configure from address and name from facility settings
                $fromAddress = $settings->get('mail_from_address');
                $fromName = $settings->get('mail_from_name');

                if ($fromAddress) {
                    Config::set('mail.from.address', $fromAddress);
                }

                if ($fromName) {
                    Config::set('mail.from.name', $fromName);
                }

                // For SES/SES v2, configure region override if specified
                if (in_array($mailDriver, ['ses', 'ses-v2'], true)) {
                    $sesRegion = $settings->get('ses_region');
                    $sesConfigSet = $settings->get('ses_configuration_set');

                    if ($sesRegion) {
                        // Update the mailer configuration for this facility
                        $mailerConfig = config("mail.mailers.{$mailDriver}", []);
                        $mailerConfig['region'] = $sesRegion;
                        Config::set("mail.mailers.{$mailDriver}", $mailerConfig);
                    }

                    if ($sesConfigSet) {
                        $mailerConfig = config("mail.mailers.{$mailDriver}", []);
                        $mailerConfig['options']['ConfigurationSetName'] = $sesConfigSet;
                        Config::set("mail.mailers.{$mailDriver}", $mailerConfig);
                    }
                }

                Log::debug('Mail configured for facility', [
                    'facility_id' => $facility->id,
                    'mail_driver' => $mailDriver,
                    'from_address' => $fromAddress,
                    'from_name' => $fromName,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to configure mail for facility', [
                'facility_id' => $facility->id,
                'error' => $e->getMessage(),
            ]);
            // Fall back to default configuration
        }
    }

    /**
     * Get the configured mailer instance for a facility.
     * 
     * @param Facility $facility
     * @return \Illuminate\Mail\Mailer
     */
    public function getConfiguredMailer(Facility $facility)
    {
        $this->configureForFacility($facility);
        return Mail::mailer();
    }

    /**
     * Get facility from a resident (through branch).
     * 
     * @param \App\Models\Resident $resident
     * @return Facility|null
     */
    public function getFacilityFromResident($resident): ?Facility
    {
        if (!$resident) {
            return null;
        }
        return $resident->branch?->facility;
    }

    /**
     * Get facility from a user.
     * 
     * @param \App\Models\User $user
     * @return Facility|null
     */
    public function getFacilityFromUser($user): ?Facility
    {
        if ($user->facility_id) {
            return \App\Models\Facility::find($user->facility_id);
        }

        if ($user->assigned_branch_id) {
            $branch = \App\Models\Branch::find($user->assigned_branch_id);
            return $branch?->facility;
        }

        return null;
    }
}

