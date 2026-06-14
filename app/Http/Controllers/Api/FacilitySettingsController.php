<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Facility;
use App\Models\FacilitySetting;
use App\Services\MailConfigurationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class FacilitySettingsController extends Controller
{
    /**
     * Get settings for a specific facility and category.
     */
    public function show(Request $request, Facility $facility, string $category): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Only super_admin can access any facility. Others must belong to the facility.
        if ($user->role !== 'super_admin' && $user->facility_id !== $facility->id) {
            return response()->json(['message' => 'Unauthorized. Facility access required.'], 403);
        }

        $settings = FacilitySetting::where('facility_id', $facility->id)
            ->where('category', $category)
            ->get()
            ->mapWithKeys(function (FacilitySetting $setting) {
                return [
                    $setting->key => [
                        'value' => $setting->casted_value,
                        'type' => $setting->type,
                        'description' => $setting->description,
                    ],
                ];
            });

        return response()->json([
            'data' => $settings,
        ]);
    }

    /**
     * Update settings for a specific facility and category.
     *
     * Validation rules are defined per category to keep payloads structured
     * and prevent invalid configuration from being saved.
     */
    public function update(Request $request, Facility $facility, string $category): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Only super_admin or facility admin/manager can update settings.
        $isAdmin = $user->role === 'super_admin' || $user->isFacilityAdministrator() || $user->isBranchAdmin() || $user->role === 'manager';

        if (!$isAdmin || ($user->role !== 'super_admin' && $user->facility_id !== $facility->id)) {
            return response()->json(['message' => 'Unauthorized. Admin access required for this facility.'], 403);
        }

        // Resolve validation rules based on category
        $rules = $this->rulesForCategory($category);

        // Expect payload: { settings: { key: { value, ... } } }
        $validated = $request->validate($rules);

        $settingsPayload = $validated['settings'];

        foreach ($settingsPayload as $key => $config) {
            $type = $config['type'] ?? 'string';

            /** @var FacilitySetting $setting */
            $setting = FacilitySetting::firstOrNew([
                'facility_id' => $facility->id,
                'category' => $category,
                'key' => $key,
            ]);

            $setting->type = $type;
            $setting->description = $config['description'] ?? $setting->description;
            $setting->value = $config['value'] ?? null;
            $setting->save();
        }

        return $this->show($request, $facility, $category);
    }

    /**
     * Send a test email using the facility's configured email settings.
     */
    public function testEmail(Request $request, Facility $facility): JsonResponse
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Only super_admin or facility admin/manager can send test emails.
        $isAdmin = $user->role === 'super_admin' || $user->isFacilityAdministrator() || $user->isBranchAdmin() || $user->role === 'manager';

        if (!$isAdmin || ($user->role !== 'super_admin' && $user->facility_id !== $facility->id)) {
            return response()->json(['message' => 'Unauthorized. Admin access required for this facility.'], 403);
        }

        $validated = $request->validate([
            'recipient' => 'required|email',
        ]);

        try {
            // Configure mail for facility
            $mailConfigService = app(MailConfigurationService::class);
            $mailConfigService->configureForFacility($facility);

            // Get from address and name from facility settings or use defaults
            $settings = FacilitySetting::where('facility_id', $facility->id)
                ->where('category', 'email')
                ->get()
                ->mapWithKeys(function ($setting) {
                    return [$setting->key => $setting->casted_value];
                });

            $fromAddress = $settings->get('mail_from_address') ?? config('mail.from.address');
            $fromName = $settings->get('mail_from_name') ?? config('mail.from.name');

            // Send test email
            Mail::raw('This is a test email from ' . $facility->name . '. Your email configuration is working correctly.', function ($message) use ($validated, $fromAddress, $fromName, $facility) {
                $message->to($validated['recipient'])
                    ->subject('Test Email - ' . $facility->name)
                    ->from($fromAddress, $fromName);
            });

            Log::info('Test email sent', [
                'facility_id' => $facility->id,
                'recipient' => $validated['recipient'],
                'from_address' => $fromAddress,
            ]);

            return response()->json([
                'message' => 'Test email sent successfully',
                'recipient' => $validated['recipient'],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send test email', [
                'facility_id' => $facility->id,
                'recipient' => $validated['recipient'],
                'error' => $e->getMessage(),
            ]);

            // Provide helpful error messages for common SES issues
            $errorMessage = $e->getMessage();
            $helpfulMessage = 'Failed to send test email. ';

            if (str_contains($errorMessage, 'Email address not verified') || str_contains($errorMessage, 'not verified')) {
                $helpfulMessage .= 'The sender email address is not verified in Amazon SES. Please verify it in the AWS SES console.';
            } elseif (str_contains($errorMessage, 'sandbox') || str_contains($errorMessage, 'production access')) {
                $helpfulMessage .= 'Your Amazon SES account is in sandbox mode. You can only send to verified email addresses. Request production access in the AWS SES console.';
            } elseif (str_contains($errorMessage, 'Invalid') || str_contains($errorMessage, 'credentials')) {
                $helpfulMessage .= 'Invalid AWS credentials. Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.';
            } else {
                $helpfulMessage .= $errorMessage;
            }

            return response()->json([
                'message' => $helpfulMessage,
                'error' => $errorMessage,
            ], 500);
        }
    }

    /**
     * Get validation rules per category.
     */
    protected function rulesForCategory(string $category): array
    {
        $base = [
            'settings' => 'required|array',
            'settings.*.type' => 'nullable|string|in:string,boolean,integer,json',
            'settings.*.description' => 'nullable|string',
        ];

        return match ($category) {
            'email' => array_merge($base, [
                'settings.mail_driver.value' => 'nullable|string|in:smtp,sendmail,log,mailgun,postmark,ses,ses-v2',
                'settings.mail_host.value' => 'nullable|string|max:255',
                'settings.mail_port.value' => 'nullable|integer|min:1|max:65535',
                'settings.mail_username.value' => 'nullable|string|max:255',
                'settings.mail_password.value' => 'nullable|string|max:255',
                'settings.mail_encryption.value' => 'nullable|string|in:tls,ssl,null',
                'settings.mail_from_address.value' => 'nullable|email',
                'settings.mail_from_name.value' => 'nullable|string|max:255',
                'settings.ses_region.value' => 'nullable|string|max:50',
                'settings.ses_configuration_set.value' => 'nullable|string|max:255',
                'settings.test_recipient.value' => 'nullable|email',
            ]),
            'security' => array_merge($base, [
                'settings.password_min_length.value' => 'nullable|integer|min:6|max:128',
                'settings.password_require_uppercase.value' => 'nullable|boolean',
                'settings.password_require_number.value' => 'nullable|boolean',
                'settings.password_require_symbol.value' => 'nullable|boolean',
                'settings.session_timeout_minutes.value' => 'nullable|integer|min:5|max:1440',
                'settings.max_login_attempts.value' => 'nullable|integer|min:3|max:20',
                'settings.enable_two_factor.value' => 'nullable|boolean',
            ]),
            'general' => array_merge($base, [
                'settings.display_name.value' => 'nullable|string|max:255',
                'settings.timezone.value' => 'nullable|string|max:100',
                'settings.locale.value' => 'nullable|string|max:10',
                'settings.date_format.value' => 'nullable|string|max:50',
                'settings.time_format.value' => 'nullable|string|max:50',
            ]),
            'notification' => array_merge($base, [
                'settings.enable_email_notifications.value' => 'nullable|boolean',
                'settings.enable_in_app_notifications.value' => 'nullable|boolean',
                'settings.notify_on_incident.value' => 'nullable|boolean',
                'settings.notify_on_check_in_out.value' => 'nullable|boolean',
                'settings.notify_on_resident_sign_out.value' => 'nullable|boolean',
                'settings.daily_summary_time.value' => 'nullable|string|max:10',
            ]),
            'database' => array_merge($base, [
                'settings.read_replica_enabled.value' => 'nullable|boolean',
                'settings.query_logging_enabled.value' => 'nullable|boolean',
                'settings.slow_query_threshold_ms.value' => 'nullable|integer|min:0|max:60000',
            ]),
            'server' => array_merge($base, [
                'settings.maintenance_mode.value' => 'nullable|boolean',
                'settings.queue_concurrency.value' => 'nullable|integer|min:1|max:50',
                'settings.log_retention_days.value' => 'nullable|integer|min:1|max:365',
            ]),
            default => array_merge($base, [
                'settings.*.value' => 'nullable',
            ]),
        };
    }
}


