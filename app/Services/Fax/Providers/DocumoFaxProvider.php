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
 * Documo (mFax) provider — HIPAA-compliant cloud fax.
 *
 * Docs: https://docs.documo.com / https://api.documo.com
 * HIPAA: BAA available; Documo is HITRUST-certified.
 *
 * Webhook verification: HMAC-SHA256 over the raw request body, with the
 * signature provided in the `documo-signature` header, where the shared
 * secret is configured per-webhook in the Documo dashboard.
 */
class DocumoFaxProvider implements FaxProvider
{
    private const BASE_URL = 'https://api.documo.com';

    public function __construct(private array $credentials) {}

    public static function key(): string
    {
        return 'documo';
    }

    public static function displayName(): string
    {
        return 'Documo (mFax)';
    }

    public static function description(): ?string
    {
        return 'HIPAA-compliant cloud fax (HITRUST-certified). BAA available on Business and Enterprise plans.';
    }

    public static function credentialSchema(): array
    {
        return [
            new CredentialField(
                name: 'api_key',
                label: 'API Key',
                type: CredentialField::TYPE_SECRET,
                help: 'Found in Documo Console → Developers → API Keys.',
            ),
            new CredentialField(
                name: 'webhook_secret',
                label: 'Webhook Signing Secret',
                type: CredentialField::TYPE_SECRET,
                help: 'Configured in Documo Console → Webhooks. Used to verify HMAC-SHA256 signatures.',
            ),
            new CredentialField(
                name: 'subaccount_id',
                label: 'Subaccount ID',
                type: CredentialField::TYPE_STRING,
                required: false,
                help: 'Optional. Set if this facility is a Documo subaccount.',
            ),
        ];
    }

    private function http(): PendingRequest
    {
        $apiKey = $this->credentials['api_key'] ?? '';
        if (! $apiKey) {
            throw new RuntimeException('Documo API key missing.');
        }

        $client = Http::withToken($apiKey)
            ->acceptJson()
            ->timeout(20)
            ->baseUrl(self::BASE_URL);

        if (! empty($this->credentials['subaccount_id'])) {
            $client = $client->withHeaders([
                'x-documo-subaccount' => (string) $this->credentials['subaccount_id'],
            ]);
        }

        return $client;
    }

    public function testConnection(): TestResult
    {
        try {
            $response = $this->http()->get('/v1/numbers', ['limit' => 1]);

            if ($response->successful()) {
                return TestResult::ok('Documo API reachable.');
            }

            return TestResult::fail(
                'HTTP '.$response->status().' from Documo: '.($response->json('message') ?? $response->body()),
            );
        } catch (\Throwable $e) {
            return TestResult::fail('Unable to reach Documo: '.$e->getMessage());
        }
    }

    public function send(SendFaxRequest $request): SendResult
    {
        if (! is_file($request->filePath)) {
            return SendResult::fail("Source file not found: {$request->filePath}");
        }

        try {
            $response = $this->http()
                ->attach('files', file_get_contents($request->filePath), basename($request->filePath))
                ->asMultipart()
                ->post('/v1/faxes', array_filter([
                    'recipientFax' => $request->toNumber,
                    'callerId' => $request->fromNumber,
                    'subject' => $request->subject,
                    'reference' => $request->clientReference,
                ]));
        } catch (\Throwable $e) {
            return SendResult::fail('Documo send failed: '.$e->getMessage());
        }

        if ($response->failed()) {
            return SendResult::fail(
                'Documo rejected fax: '.($response->json('message') ?? $response->body()),
                $response->json() ?? [],
            );
        }

        return SendResult::ok(
            providerFaxId: $response->json('id') ?? $response->json('faxId') ?? '',
            status: $response->json('status') ?? 'queued',
            raw: $response->json() ?? [],
        );
    }

    public function searchAvailableNumbers(?string $areaCode = null, string $country = 'US', int $limit = 10): array
    {
        try {
            $response = $this->http()->get('/v1/numbers/available', array_filter([
                'country' => $country,
                'areaCode' => $areaCode,
                'limit' => $limit,
            ]));
        } catch (\Throwable $e) {
            return [];
        }

        if ($response->failed()) {
            return [];
        }

        return collect($response->json('data') ?? $response->json() ?? [])
            ->map(fn ($item) => new NumberInfo(
                e164Number: $item['number'] ?? $item['phoneNumber'] ?? '',
                providerNumberId: $item['id'] ?? null,
                monthlyCostCents: isset($item['monthlyPrice'])
                    ? (int) round(((float) $item['monthlyPrice']) * 100)
                    : null,
                country: $item['country'] ?? $country,
                region: $item['region'] ?? null,
                raw: $item,
            ))
            ->all();
    }

    public function purchaseNumber(string $e164Number): NumberInfo
    {
        $response = $this->http()->post('/v1/numbers', [
            'number' => $e164Number,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Documo purchase failed: '.($response->json('message') ?? $response->body()));
        }

        return new NumberInfo(
            e164Number: $response->json('number') ?? $e164Number,
            providerNumberId: $response->json('id'),
            country: $response->json('country') ?? 'US',
            raw: $response->json() ?? [],
        );
    }

    public function releaseNumber(string $providerNumberId): bool
    {
        try {
            $response = $this->http()->delete('/v1/numbers/'.$providerNumberId);

            return $response->successful();
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function verifyWebhookSignature(Request $request): void
    {
        $secret = $this->credentials['webhook_secret'] ?? '';
        if (! $secret) {
            throw new RuntimeException('Documo webhook secret not configured.');
        }

        $given = $request->header('documo-signature', '');
        if (! $given) {
            throw new RuntimeException('Missing documo-signature header.');
        }

        $expected = hash_hmac('sha256', $request->getContent(), $secret);

        if (! hash_equals($expected, $given)) {
            throw new RuntimeException('Invalid Documo webhook signature.');
        }
    }

    public function parseWebhook(Request $request): WebhookResult
    {
        $payload = $request->json()->all();
        $event = $payload['event'] ?? '';
        $data = $payload['data'] ?? [];
        $providerFaxId = $data['id'] ?? $data['faxId'] ?? null;

        if ($event === 'fax.received' || $event === 'inbound.fax') {
            return WebhookResult::inbound(
                new InboundFax(
                    providerFaxId: $providerFaxId ?? '',
                    fromNumber: $data['from'] ?? $data['senderFax'] ?? '',
                    toNumber: $data['to'] ?? $data['recipientFax'] ?? '',
                    mediaUrl: $data['mediaUrl'] ?? $data['downloadUrl'] ?? null,
                    pageCount: $data['pages'] ?? $data['pageCount'] ?? null,
                    receivedAt: isset($data['receivedAt']) ? new \DateTimeImmutable($data['receivedAt']) : null,
                    raw: $data,
                ),
                eventId: $payload['eventId'] ?? null,
                raw: $payload,
            );
        }

        $statusMap = [
            'fax.queued' => 'queued',
            'fax.sending' => 'sending',
            'fax.delivered' => 'delivered',
            'fax.failed' => 'failed',
            'fax.sent' => 'delivered',
        ];

        if (! isset($statusMap[$event]) || ! $providerFaxId) {
            return WebhookResult::ignore(['event' => $event]);
        }

        return WebhookResult::status(
            providerFaxId: $providerFaxId,
            newStatus: $statusMap[$event],
            reason: $data['failureReason'] ?? $data['errorMessage'] ?? null,
            eventId: $payload['eventId'] ?? null,
            raw: $payload,
        );
    }

    public function downloadInboundMedia(InboundFax $inbound): string
    {
        if (! $inbound->mediaUrl) {
            return $inbound->mediaBytes ?? '';
        }

        $response = $this->http()->get($inbound->mediaUrl);

        if ($response->failed()) {
            throw new RuntimeException('Failed to download Documo media: HTTP '.$response->status());
        }

        return $response->body();
    }
}
