<?php

namespace App\Services\Fax\Contracts;

use App\Services\Fax\Support\InboundFax;
use App\Services\Fax\Support\NumberInfo;
use App\Services\Fax\Support\SendFaxRequest;
use App\Services\Fax\Support\SendResult;
use App\Services\Fax\Support\TestResult;
use App\Services\Fax\Support\WebhookResult;
use Illuminate\Http\Request;

/**
 * Driver contract for an external fax provider.
 *
 * Each concrete provider is a stateless object instantiated with a
 * facility's credentials array (whose shape it described via
 * credentialSchema()). Adding a new provider only requires:
 *
 *   1. Implement this interface
 *   2. Add the class to config/fax.php → providers
 *   3. Run `php artisan config:clear`
 *
 * The Fax UI auto-discovers the new provider, renders its credential form
 * from credentialSchema(), and routes inbound webhooks via the unique
 * per-facility URL /webhooks/fax/{key()}/{webhookSecret}.
 */
interface FaxProvider
{
    /**
     * Stable identifier persisted in fax_settings.provider, fax_numbers.provider,
     * and faxes.provider. Lower-snake, e.g. "telnyx", "documo", "fake".
     */
    public static function key(): string;

    /** Human label shown in the settings dropdown */
    public static function displayName(): string;

    /**
     * Optional supporting text shown beneath the provider name in the UI
     * (e.g. "HIPAA-eligible. BAA available on Enterprise plan.").
     */
    public static function description(): ?string;

    /**
     * @return array<int, \App\Services\Fax\Support\CredentialField>
     *
     * Drives the dynamic credential form on the React Settings page.
     */
    public static function credentialSchema(): array;

    /**
     * Construct the provider with this facility's saved credentials.
     * Implementations should NOT make any HTTP calls in the constructor;
     * lazy-instantiate the HTTP client inside the verbs below.
     */
    public function __construct(array $credentials);

    /**
     * Cheap connectivity / auth check. Should NOT cost money or send a fax.
     * Typical implementations call a "list numbers" or "account info"
     * endpoint and translate the result into a TestResult.
     */
    public function testConnection(): TestResult;

    public function send(SendFaxRequest $request): SendResult;

    /**
     * Search the provider's number marketplace for an available fax-capable
     * number matching a US area code (etc.). Limit defaults to 10.
     *
     * @return array<int, NumberInfo>
     */
    public function searchAvailableNumbers(?string $areaCode = null, string $country = 'US', int $limit = 10): array;

    /**
     * Purchase a number from the marketplace. Returns the canonical record
     * with the provider's internal id assigned.
     */
    public function purchaseNumber(string $e164Number): NumberInfo;

    /**
     * Release (cancel) a number we previously purchased. Must be safe to
     * call even if the provider already considers the number gone.
     */
    public function releaseNumber(string $providerNumberId): bool;

    /**
     * Validate the signature/HMAC on an inbound webhook request. Should
     * throw \RuntimeException with a descriptive message on failure — the
     * webhook controller turns that into a 401.
     */
    public function verifyWebhookSignature(Request $request): void;

    /**
     * Convert an already-verified webhook payload into a WebhookResult.
     * The controller uses this to decide whether to update a status,
     * persist a new inbound fax, or ignore the event.
     */
    public function parseWebhook(Request $request): WebhookResult;

    /**
     * Fetch the binary content of an inbound fax's media URL using
     * provider-specific auth headers (some providers require an API key
     * even on their media URLs).
     */
    public function downloadInboundMedia(InboundFax $inbound): string;
}
