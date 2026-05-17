<?php

namespace App\Services\Fax\Providers;

use App\Services\Fax\Contracts\FaxProvider;
use App\Services\Fax\Support\CredentialField;
use App\Services\Fax\Support\InboundFax;
use App\Services\Fax\Support\NumberInfo;
use App\Services\Fax\Support\SendFaxRequest;
use App\Services\Fax\Support\SendResult;
use App\Services\Fax\Support\TestResult;
use App\Services\Fax\Support\WebhookResult;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Telnyx Programmable Fax driver.
 *
 * Docs: https://developers.telnyx.com/api/programmable-fax
 * HIPAA: BAA available on Telnyx Enterprise plan.
 *
 * Inbound signatures are verified with Ed25519 over
 * "{timestamp}|{raw body}" using the public key Telnyx publishes per
 * application. The public key is per-app and must be saved alongside the
 * api key on the FaxSetting row.
 */
class TelnyxFaxProvider implements FaxProvider
{
    private const BASE_URL = 'https://api.telnyx.com/v2';

    public function __construct(private array $credentials) {}

    public static function key(): string
    {
        return 'telnyx';
    }

    public static function displayName(): string
    {
        return 'Telnyx';
    }

    public static function description(): ?string
    {
        return 'HIPAA-eligible programmable fax (BAA available on Enterprise plan).';
    }

    public static function credentialSchema(): array
    {
        return [
            new CredentialField(
                name: 'api_key',
                label: 'API Key',
                type: CredentialField::TYPE_SECRET,
                help: 'Found in Telnyx Mission Control → API Keys.',
                placeholder: 'KEY...',
            ),
            new CredentialField(
                name: 'fax_application_id',
                label: 'Fax Application ID',
                type: CredentialField::TYPE_STRING,
                help: 'Create a Programmable Fax application and paste its UUID here.',
                placeholder: '00000000-0000-0000-0000-000000000000',
            ),
            new CredentialField(
                name: 'connection_id',
                label: 'Connection ID',
                type: CredentialField::TYPE_STRING,
                required: false,
                help: 'Optional. Some Telnyx accounts route fax sends through a Connection.',
            ),
            new CredentialField(
                name: 'webhook_public_key',
                label: 'Webhook Public Key (Ed25519)',
                type: CredentialField::TYPE_SECRET,
                help: 'From your Fax Application → Webhook Signing → Public Key. Required to verify inbound webhooks.',
            ),
        ];
    }

    private function http(): PendingRequest
    {
        $apiKey = $this->credentials['api_key'] ?? '';
        if (! $apiKey) {
            throw new RuntimeException('Telnyx API key missing.');
        }

        return Http::withToken($apiKey)
            ->acceptJson()
            ->timeout(20)
            ->baseUrl(self::BASE_URL);
    }

    public function testConnection(): TestResult
    {
        try {
            $response = $this->http()->get('/phone_numbers', ['page[size]' => 1]);

            if ($response->successful()) {
                return TestResult::ok('Telnyx API reachable.', [
                    'phone_numbers' => $response->json('meta.total_results'),
                ]);
            }

            return TestResult::fail(
                'HTTP '.$response->status().' from Telnyx: '.($response->json('errors.0.detail') ?? $response->body()),
            );
        } catch (\Throwable $e) {
            return TestResult::fail('Unable to reach Telnyx: '.$e->getMessage());
        }
    }

    public function send(SendFaxRequest $request): SendResult
    {
        $appId = $this->credentials['fax_application_id'] ?? '';
        if (! $appId) {
            return SendResult::fail('Telnyx Fax Application ID is missing.');
        }

        if (! is_file($request->filePath)) {
            return SendResult::fail("Source file not found: {$request->filePath}");
        }

        try {
            $response = $this->http()
                ->attach('media', file_get_contents($request->filePath), basename($request->filePath))
                ->asMultipart()
                ->post('/faxes', array_filter([
                    'connection_id' => $this->credentials['connection_id'] ?? null,
                    'from' => $request->fromNumber,
                    'to' => $request->toNumber,
                    'quality' => $request->options['quality'] ?? 'high',
                    'store_media' => true,
                    'client_state' => $request->clientReference
                        ? base64_encode($request->clientReference)
                        : null,
                ]));
        } catch (\Throwable $e) {
            return SendResult::fail('Telnyx send failed: '.$e->getMessage());
        }

        if ($response->failed()) {
            return SendResult::fail(
                'Telnyx rejected fax: '.($response->json('errors.0.detail') ?? $response->body()),
                $response->json() ?? [],
            );
        }

        return SendResult::ok(
            providerFaxId: $response->json('data.id'),
            status: $response->json('data.status') ?? 'queued',
            raw: $response->json() ?? [],
        );
    }

    public function searchAvailableNumbers(?string $areaCode = null, string $country = 'US', int $limit = 10): array
    {
        try {
            $response = $this->http()->get('/available_phone_numbers', array_filter([
                'filter[country_code]' => $country,
                'filter[national_destination_code]' => $areaCode,
                'filter[features]' => 'fax',
                'filter[limit]' => $limit,
            ]));
        } catch (\Throwable $e) {
            return [];
        }

        if ($response->failed()) {
            return [];
        }

        return collect($response->json('data') ?? [])
            ->map(fn ($item) => new NumberInfo(
                e164Number: $item['phone_number'] ?? '',
                providerNumberId: null,
                monthlyCostCents: isset($item['cost_information']['monthly_cost'])
                    ? (int) round(((float) $item['cost_information']['monthly_cost']) * 100)
                    : null,
                country: $item['country_code'] ?? $country,
                region: $item['region_information'][0]['region_name'] ?? null,
                raw: $item,
            ))
            ->all();
    }

    public function purchaseNumber(string $e164Number): NumberInfo
    {
        $response = $this->http()->post('/number_orders', [
            'phone_numbers' => [['phone_number' => $e164Number]],
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Telnyx purchase failed: '.($response->json('errors.0.detail') ?? $response->body()));
        }

        $first = $response->json('data.phone_numbers.0') ?? [];

        return new NumberInfo(
            e164Number: $first['phone_number'] ?? $e164Number,
            providerNumberId: $first['id'] ?? null,
            monthlyCostCents: null,
            country: $first['country_code'] ?? 'US',
            raw: $response->json() ?? [],
        );
    }

    public function releaseNumber(string $providerNumberId): bool
    {
        try {
            $response = $this->http()->delete('/phone_numbers/'.$providerNumberId);

            return $response->successful();
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function verifyWebhookSignature(Request $request): void
    {
        $publicKey = $this->credentials['webhook_public_key'] ?? '';
        if (! $publicKey) {
            throw new RuntimeException('Telnyx webhook public key not configured.');
        }

        $signature = $request->header('telnyx-signature-ed25519', '');
        $timestamp = $request->header('telnyx-timestamp', '');

        if (! $signature || ! $timestamp) {
            throw new RuntimeException('Missing telnyx-signature-ed25519 / telnyx-timestamp headers.');
        }

        $tolerance = (int) config('fax.webhook_timestamp_tolerance', 300);
        if (abs(time() - (int) $timestamp) > $tolerance) {
            throw new RuntimeException('Webhook timestamp outside tolerance window.');
        }

        if (! function_exists('sodium_crypto_sign_verify_detached')) {
            throw new RuntimeException('libsodium not available for Ed25519 verification.');
        }

        $expected = $timestamp.'|'.$request->getContent();
        $valid = sodium_crypto_sign_verify_detached(
            base64_decode($signature, true) ?: '',
            $expected,
            base64_decode($publicKey, true) ?: '',
        );

        if (! $valid) {
            throw new RuntimeException('Invalid Telnyx webhook signature.');
        }
    }

    public function parseWebhook(Request $request): WebhookResult
    {
        $data = $request->json('data.payload') ?? [];
        $type = $request->json('data.event_type') ?? '';
        $eventId = $request->json('data.id');
        $providerFaxId = $data['fax_id'] ?? $data['id'] ?? null;

        if ($type === 'fax.received') {
            return WebhookResult::inbound(
                new InboundFax(
                    providerFaxId: $providerFaxId ?? '',
                    fromNumber: $data['from'] ?? '',
                    toNumber: $data['to'] ?? '',
                    mediaUrl: $data['media_url'] ?? null,
                    pageCount: $data['page_count'] ?? null,
                    receivedAt: isset($data['received_at']) ? new \DateTimeImmutable($data['received_at']) : null,
                    raw: $data,
                ),
                eventId: $eventId,
                raw: $request->all(),
            );
        }

        $statusMap = [
            'fax.queued' => 'queued',
            'fax.media.processed' => 'sending',
            'fax.sending.started' => 'sending',
            'fax.delivered' => 'delivered',
            'fax.failed' => 'failed',
        ];

        if (! isset($statusMap[$type]) || ! $providerFaxId) {
            return WebhookResult::ignore(['type' => $type]);
        }

        return WebhookResult::status(
            providerFaxId: $providerFaxId,
            newStatus: $statusMap[$type],
            reason: $data['failure_reason'] ?? null,
            eventId: $eventId,
            raw: $request->all(),
        );
    }

    public function downloadInboundMedia(InboundFax $inbound): string
    {
        if (! $inbound->mediaUrl) {
            return $inbound->mediaBytes ?? '';
        }

        $response = $this->http()
            ->withOptions(['stream' => false])
            ->get($inbound->mediaUrl);

        if ($response->failed()) {
            throw new RuntimeException('Failed to download Telnyx media: HTTP '.$response->status());
        }

        return $response->body();
    }
}
