<?php

namespace App\Services;

use App\Models\EmailNotificationConfig;
use App\Models\User;
use App\Models\Facility;
use Illuminate\Support\Collection;

class EmailRecipientService
{
    /**
     * Get recipients for a notification type based on facility configuration
     * 
     * @param Facility $facility
     * @param string $notificationType
     * @return Collection<User>
     */
    public function getRecipients(Facility $facility, string $notificationType): Collection
    {
        // Get the configuration for this facility and notification type
        $config = EmailNotificationConfig::forFacility($facility->id)
            ->forNotificationType($notificationType)
            ->enabled()
            ->first();

        // If no config exists or is disabled, return empty collection
        if (!$config || !$config->enabled) {
            return collect([]);
        }

        $recipients = collect([]);

        // Get users by roles if specified
        if (!empty($config->recipient_roles)) {
            $roleRecipients = User::where('facility_id', $facility->id)
                ->where('is_active', true)
                ->where(function ($query) use ($config) {
                    // Check direct role field
                    $query->whereIn('role', $config->recipient_roles);
                    
                    // Also check roles relationship
                    $query->orWhereHas('roles', function ($q) use ($config) {
                        $q->whereIn('name', $config->recipient_roles);
                    });
                })
                ->whereNotNull('email')
                ->get();
            
            $recipients = $recipients->merge($roleRecipients);
        }

        // Get specific users by IDs if specified
        if (!empty($config->recipient_user_ids)) {
            $specificUsers = User::where('facility_id', $facility->id)
                ->whereIn('id', $config->recipient_user_ids)
                ->where('is_active', true)
                ->whereNotNull('email')
                ->get();
            
            $recipients = $recipients->merge($specificUsers);
        }

        // Remove duplicates; super admins must not receive facility notification emails
        return $recipients->unique('id')->reject(fn (User $u) => $u->isSuperAdmin())->values();
    }

    /**
     * Check if a notification type is enabled for a facility
     * 
     * @param Facility $facility
     * @param string $notificationType
     * @return bool
     */
    public function isNotificationEnabled(Facility $facility, string $notificationType): bool
    {
        $config = EmailNotificationConfig::forFacility($facility->id)
            ->forNotificationType($notificationType)
            ->first();

        return $config && $config->enabled;
    }

    /**
     * Get all notification configs for a facility
     * 
     * @param Facility $facility
     * @return Collection<EmailNotificationConfig>
     */
    public function getConfigsForFacility(Facility $facility): Collection
    {
        return EmailNotificationConfig::forFacility($facility->id)->get();
    }

    /**
     * Get config for a specific notification type
     * 
     * @param Facility $facility
     * @param string $notificationType
     * @return EmailNotificationConfig|null
     */
    public function getConfig(Facility $facility, string $notificationType): ?EmailNotificationConfig
    {
        return EmailNotificationConfig::forFacility($facility->id)
            ->forNotificationType($notificationType)
            ->first();
    }
}

