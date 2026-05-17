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
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Reference / development provider.
 *
 * Records all "sends" to the application log, immediately returns a faked
 * provider_fax_id, and lets QA exercise the entire UI / API stack without
 * a paid Telnyx or Documo account.
 *
 * Inbound: webhooks come in via POST /webhooks/fax/fake/{secret} and are
 * accepted with no signature verification — only enable this provider on
 * staging / local.
 */
class FakeFaxProvider implements FaxProvider
{
    private array $credentials;

    public static function key(): string
    {
        return 'fake';
    }

    public static function displayName(): string
    {
        return 'Fake (Development)';
    }

    public static function description(): ?string
    {
        return 'No-op provider for local development. Pretends every send succeeds and ignores webhook signatures.';
    }

    public static function credentialSchema(): array
    {
        return [
            new CredentialField(
                name: 'mode',
                label: 'Mode',
                type: CredentialField::TYPE_SELECT,
                required: false,
                help: 'Choose how the fake provider should behave for testing.',
                options: [
                    ['value' => 'always_succeed', 'label' => 'Always succeed'],
                    ['value' => 'always_fail', 'label' => 'Always fail'],
                    ['value' => 'random', 'label' => 'Random (80% success)'],
                ],
            ),
        ];
    }

    public function __construct(array $credentials)
    {
        $this->credentials = $credentials;
    }

    public function testConnection(): TestResult
    {
        return TestResult::ok('Fake provider is always reachable.');
    }

    public function send(SendFaxRequest $request): SendResult
    {
        $mode = $this->credentials['mode'] ?? 'always_succeed';

        $willSucceed = match ($mode) {
            'always_fail' => false,
            'random' => random_int(1, 100) <= 80,
            default => true,
        };

        if (! $willSucceed) {
            return SendResult::fail('Simulated provider failure (mode=always_fail).');
        }

        return SendResult::ok(
            providerFaxId: 'fake_'.Str::uuid(),
            status: 'queued',
            raw: ['simulated' => true, 'to' => $request->toNumber],
        );
    }

    public function searchAvailableNumbers(?string $areaCode = null, string $country = 'US', int $limit = 10): array
    {
        $area = $areaCode ?: '206';
        $results = [];
        for ($i = 0; $i < $limit; $i++) {
            $results[] = new NumberInfo(
                e164Number: '+1'.$area.str_pad((string) random_int(1000000, 9999999), 7, '0', STR_PAD_LEFT),
                providerNumberId: 'fake_num_'.Str::random(8),
                monthlyCostCents: 100,
                country: $country,
                region: 'US-'.$area,
            );
        }

        return $results;
    }

    public function purchaseNumber(string $e164Number): NumberInfo
    {
        return new NumberInfo(
            e164Number: $e164Number,
            providerNumberId: 'fake_num_'.Str::random(8),
            monthlyCostCents: 100,
            country: 'US',
        );
    }

    public function releaseNumber(string $providerNumberId): bool
    {
        return true;
    }

    public function verifyWebhookSignature(Request $request): void
    {
        // Intentionally a no-op for the fake provider.
    }

    public function parseWebhook(Request $request): WebhookResult
    {
        $payload = $request->json()->all();
        $type = $payload['type'] ?? 'status';

        if ($type === 'inbound') {
            return WebhookResult::inbound(
                new InboundFax(
                    providerFaxId: $payload['provider_fax_id'] ?? 'fake_in_'.Str::uuid(),
                    fromNumber: $payload['from'] ?? '+15555550100',
                    toNumber: $payload['to'] ?? '+15555550101',
                    mediaBytes: base64_decode($payload['pdf_base64'] ?? '', true) ?: null,
                    pageCount: $payload['pages'] ?? 1,
                    receivedAt: now(),
                ),
                eventId: $payload['event_id'] ?? null,
                raw: $payload,
            );
        }

        return WebhookResult::status(
            providerFaxId: $payload['provider_fax_id'] ?? '',
            newStatus: $payload['status'] ?? 'delivered',
            reason: $payload['reason'] ?? null,
            eventId: $payload['event_id'] ?? null,
            raw: $payload,
        );
    }

    public function downloadInboundMedia(InboundFax $inbound): string
    {
        return $inbound->mediaBytes ?? '';
    }
}
