<?php

namespace App\Http\Controllers\Api;

use App\Constants\Modules;
use App\Models\FaxSetting;
use App\Services\Fax\FaxManager;
use App\Services\Fax\ProviderRegistry;
use App\Services\Fax\Support\CredentialField;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class FaxSettingsController extends BaseApiController
{
    /**
     * GET /api/v1/fax/providers
     * List installed providers + their dynamic credential schemas.
     */
    public function providers(Request $request): JsonResponse
    {
        if ($error = $this->guard()) {
            return $error;
        }

        return $this->success([
            'providers' => app(ProviderRegistry::class)->describe(),
        ]);
    }

    /**
     * GET /api/v1/fax/settings
     * Return the current facility's FaxSetting (auto-creating on first GET).
     * Credentials are NEVER returned raw; only a per-field configured/missing map.
     */
    public function show(Request $request): JsonResponse
    {
        if ($error = $this->guard()) {
            return $error;
        }

        $facility = $this->getCurrentFacility($request->user());
        if (! $facility) {
            return $this->error('Facility context required.', 400);
        }

        $settings = $this->resolveOrCreateSettings((int) $facility->id, $request->user()?->id);

        return $this->success($this->transformSettings($settings));
    }

    /**
     * PUT /api/v1/fax/settings
     * Hard gate: validates + tests provider credentials BEFORE persisting.
     */
    public function update(Request $request): JsonResponse
    {
        if ($error = $this->guard()) {
            return $error;
        }

        $facility = $this->getCurrentFacility($request->user());
        if (! $facility) {
            return $this->error('Facility context required.', 400);
        }

        $registry = app(ProviderRegistry::class);

        try {
            $validated = $request->validate([
                'provider' => ['required', 'string', function ($attribute, $value, $fail) use ($registry) {
                    if (! $registry->has($value)) {
                        $fail("Unknown fax provider [{$value}].");
                    }
                }],
                'credentials' => ['sometimes', 'array'],
                'cost_per_page_cents' => ['sometimes', 'nullable', 'integer', 'min:0'],
                'max_file_mb' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:200'],
                'retention_days' => ['sometimes', 'nullable', 'integer', 'min:1'],
                'cover_page_html' => ['sometimes', 'nullable', 'string'],
                'is_active' => ['sometimes', 'boolean'],
                'default_from_number_id' => ['sometimes', 'nullable', 'integer', 'exists:fax_numbers,id'],
            ]);
        } catch (ValidationException $e) {
            return $this->error('Validation failed.', 422, $e->errors());
        }

        $settings = $this->resolveOrCreateSettings((int) $facility->id, $request->user()?->id);

        $existingCreds = is_array($settings->credentials) ? $settings->credentials : [];
        $incomingCreds = $validated['credentials'] ?? [];

        // Merge so the UI can omit secret fields it doesn't want to change.
        // Treat empty strings as "no change".
        $mergedCreds = $existingCreds;
        foreach ($incomingCreds as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $mergedCreds[$key] = $value;
        }

        // Validate the merged credential shape against the provider's schema.
        $schema = $this->schemaFor($validated['provider']);
        $schemaErrors = $this->validateCredentialsAgainstSchema($mergedCreds, $schema);
        if (! empty($schemaErrors)) {
            return $this->error('Credential validation failed.', 422, ['credentials' => $schemaErrors]);
        }

        $choice = $validated['provider'];
        $canonical = $registry->canonicalKey($choice);

        // Hard gate: must pass a live testConnection() before we persist.
        $result = app(FaxManager::class)->testCredentials($choice, $mergedCreds);
        if (! $result->ok) {
            return $this->error(
                'Provider rejected the credentials. Connection test failed.',
                422,
                ['credentials' => [$result->message]]
            );
        }

        $settings->provider = $canonical;
        $settings->provider_choice = $choice !== $canonical ? $choice : null;
        $settings->credentials = $mergedCreds;
        $settings->last_tested_at = now();
        $settings->last_test_status = 'ok';
        $settings->last_test_message = $result->message;
        $settings->updated_by = $request->user()?->id;

        foreach (['cost_per_page_cents', 'max_file_mb', 'retention_days', 'cover_page_html', 'is_active', 'default_from_number_id'] as $field) {
            if (array_key_exists($field, $validated)) {
                $settings->{$field} = $validated[$field];
            }
        }

        $settings->save();

        return $this->success($this->transformSettings($settings->refresh()), 'Fax settings updated.');
    }

    /**
     * POST /api/v1/fax/settings/test-connection
     * Test arbitrary {provider, credentials} WITHOUT persisting.
     */
    public function testConnection(Request $request): JsonResponse
    {
        if ($error = $this->guard()) {
            return $error;
        }

        $facility = $this->getCurrentFacility($request->user());
        if (! $facility) {
            return $this->error('Facility context required.', 400);
        }

        $registry = app(ProviderRegistry::class);

        try {
            $validated = $request->validate([
                'provider' => ['required', 'string', function ($attribute, $value, $fail) use ($registry) {
                    if (! $registry->has($value)) {
                        $fail("Unknown fax provider [{$value}].");
                    }
                }],
                'credentials' => ['sometimes', 'array'],
            ]);
        } catch (ValidationException $e) {
            return $this->error('Validation failed.', 422, $e->errors());
        }

        $settings = $this->resolveOrCreateSettings((int) $facility->id, $request->user()?->id);
        $existingCreds = is_array($settings->credentials) ? $settings->credentials : [];

        $incomingCreds = $validated['credentials'] ?? [];
        $mergedCreds = $existingCreds;
        foreach ($incomingCreds as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $mergedCreds[$key] = $value;
        }

        $result = app(FaxManager::class)->testCredentials($validated['provider'], $mergedCreds);

        return $this->success($result->toArray());
    }

    /**
     * GET /api/v1/fax/settings/webhook-url
     * Return the per-facility inbound webhook URL. The secret itself is never returned.
     */
    public function webhookUrl(Request $request): JsonResponse
    {
        if ($error = $this->guard()) {
            return $error;
        }

        $facility = $this->getCurrentFacility($request->user());
        if (! $facility) {
            return $this->error('Facility context required.', 400);
        }

        $settings = $this->resolveOrCreateSettings((int) $facility->id, $request->user()?->id);

        $provider = $settings->provider ?: 'telnyx';
        $secret = $settings->getRawOriginal('webhook_secret') ?? $settings->webhook_secret;

        return $this->success([
            'url' => url('/api/v1/webhooks/fax/'.$provider.'/'.$secret),
            'provider' => $provider,
            'secret_present' => ! empty($secret),
        ]);
    }

    /**
     * POST /api/v1/fax/settings/rotate-webhook
     * Roll the webhook secret and return the new URL.
     */
    public function rotateWebhook(Request $request): JsonResponse
    {
        if ($error = $this->guard()) {
            return $error;
        }

        $facility = $this->getCurrentFacility($request->user());
        if (! $facility) {
            return $this->error('Facility context required.', 400);
        }

        $settings = $this->resolveOrCreateSettings((int) $facility->id, $request->user()?->id);

        $newSecret = $settings->rotateWebhookSecret();
        $provider = $settings->provider ?: 'telnyx';

        return $this->success([
            'url' => url('/api/v1/webhooks/fax/'.$provider.'/'.$newSecret),
            'provider' => $provider,
            'secret_present' => true,
        ], 'Webhook secret rotated.');
    }

    /**
     * Shared permission + module gate. Settings management requires the
     * highest fax permission level.
     */
    private function guard(): ?JsonResponse
    {
        if ($error = $this->requireModuleAccess(Modules::FAX)) {
            return $error;
        }
        if ($error = $this->requirePermission('fax.manage_settings')) {
            return $error;
        }

        return null;
    }

    /**
     * Look up (or first-time create) the FaxSetting row for a facility.
     * Bypasses the FacilityScope so super admins editing in a facility
     * context still see the right row, and so first-time GETs can seed
     * a row even when no facility context is set in the global scope.
     */
    private function resolveOrCreateSettings(int $facilityId, ?int $userId): FaxSetting
    {
        $settings = FaxSetting::withoutGlobalScopes()
            ->where('facility_id', $facilityId)
            ->first();

        if (! $settings) {
            $defaults = (array) config('fax.defaults', []);
            $settings = new FaxSetting([
                'facility_id' => $facilityId,
                'cost_per_page_cents' => $defaults['cost_per_page_cents'] ?? null,
                'max_file_mb' => $defaults['max_file_mb'] ?? 25,
                'retention_days' => $defaults['retention_days'] ?? 2555,
                'is_active' => true,
                'created_by' => $userId,
            ]);
            $settings->facility_id = $facilityId;
            $settings->save();
        }

        return $settings;
    }

    /**
     * @return array<int, CredentialField>
     */
    private function schemaFor(string $providerKey): array
    {
        $registry = app(ProviderRegistry::class);
        $canonical = $registry->canonicalKey($providerKey);
        $class = $registry->all()[$canonical] ?? null;
        if (! $class) {
            return [];
        }

        return $class::credentialSchema();
    }

    /**
     * Returns ['field_name' => 'error message', ...]
     */
    private function validateCredentialsAgainstSchema(array $credentials, array $schema): array
    {
        $errors = [];
        foreach ($schema as $field) {
            if (! $field instanceof CredentialField) {
                continue;
            }
            $value = $credentials[$field->name] ?? null;
            if ($field->required && ($value === null || $value === '')) {
                $errors[$field->name] = "Field [{$field->label}] is required.";

                continue;
            }
            if ($field->type === CredentialField::TYPE_SELECT
                && $field->options
                && $value !== null
                && $value !== ''
            ) {
                $allowed = array_map(fn ($opt) => $opt['value'] ?? null, $field->options);
                if (! in_array($value, $allowed, true)) {
                    $errors[$field->name] = "Value for [{$field->label}] is not one of the allowed options.";
                }
            }
        }

        return $errors;
    }

    /**
     * Build the JSON-safe representation of a FaxSetting row.
     * Critically: this NEVER returns raw credentials or the webhook secret.
     */
    private function transformSettings(FaxSetting $settings): array
    {
        $canonicalProvider = $settings->provider;
        $uiProvider = $settings->provider_choice ?: $canonicalProvider;
        $schema = $canonicalProvider ? $this->schemaFor($uiProvider) : [];
        $creds = is_array($settings->credentials) ? $settings->credentials : [];

        $credentialsStatus = [];
        foreach ($schema as $field) {
            if (! $field instanceof CredentialField) {
                continue;
            }
            $value = $creds[$field->name] ?? null;
            $credentialsStatus[$field->name] = ($value !== null && $value !== '') ? 'configured' : 'missing';
        }

        $secret = $settings->getRawOriginal('webhook_secret');
        $webhookUrl = ($canonicalProvider && $secret)
            ? url('/api/v1/webhooks/fax/'.$canonicalProvider.'/'.$secret)
            : null;

        return [
            'id' => $settings->id,
            'facility_id' => $settings->facility_id,
            'provider' => $uiProvider,
            'is_active' => (bool) $settings->is_active,
            'is_configured' => $settings->isConfigured(),
            'is_healthy' => $settings->isHealthy(),
            'cost_per_page_cents' => $settings->cost_per_page_cents,
            'max_file_mb' => $settings->max_file_mb,
            'retention_days' => $settings->retention_days,
            'cover_page_html' => $settings->cover_page_html,
            'default_from_number_id' => $settings->default_from_number_id,
            'last_tested_at' => optional($settings->last_tested_at)->toIso8601String(),
            'last_test_status' => $settings->last_test_status,
            'last_test_message' => $settings->last_test_message,
            'credentials_status' => $credentialsStatus,
            'webhook_url' => $webhookUrl,
            'secret_present' => ! empty($secret),
            'created_at' => optional($settings->created_at)->toIso8601String(),
            'updated_at' => optional($settings->updated_at)->toIso8601String(),
        ];
    }
}
