<?php

namespace App\Services\Fax;

use App\Models\Facility;
use App\Models\Fax;
use App\Models\FaxEvent;
use App\Models\FaxNumber;
use App\Models\FaxSetting;
use App\Services\Fax\Contracts\FaxProvider;
use App\Services\Fax\Support\InboundFax;
use App\Services\Fax\Support\SendFaxRequest;
use App\Services\Fax\Support\SendResult;
use App\Services\Fax\Support\TestResult;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Facade-style entry point used by controllers / jobs / webhooks.
 *
 *   $manager = app(FaxManager::class);
 *   $provider = $manager->forFacility($facility);
 *   $provider->send(...);
 *
 * Also exposes the orchestration helpers that have to touch multiple
 * tables (FaxSetting, FaxNumber, Fax, FaxEvent) and the file disk in one
 * coherent operation, so individual controllers don't have to re-implement
 * the storage / status-update dance.
 */
class FaxManager
{
    public function __construct(private ProviderRegistry $registry) {}

    public function registry(): ProviderRegistry
    {
        return $this->registry;
    }

    public function settingsFor(Facility $facility): ?FaxSetting
    {
        return FaxSetting::withoutGlobalScopes()
            ->where('facility_id', $facility->id)
            ->first();
    }

    /**
     * Get a provider instance pre-configured with the facility's saved
     * credentials. Throws when the facility has not configured the module.
     */
    public function forFacility(Facility $facility): FaxProvider
    {
        $settings = $this->settingsFor($facility);

        if (! $settings || ! $settings->isConfigured()) {
            throw new RuntimeException("Facility [{$facility->id}] has no fax provider configured.");
        }

        if (! $this->registry->has($settings->provider)) {
            throw new RuntimeException("Provider [{$settings->provider}] is no longer registered.");
        }

        return $this->registry->make($settings->provider, $settings->credentials ?? []);
    }

    /**
     * Test a provider with arbitrary credentials WITHOUT persisting them —
     * used by the React Fax Settings page's "Test connection" button before
     * the user saves.
     */
    public function testCredentials(string $providerKey, array $credentials): TestResult
    {
        if (! $this->registry->has($providerKey)) {
            return TestResult::fail("Unknown provider [{$providerKey}].");
        }

        return $this->registry->make($providerKey, $credentials)->testConnection();
    }

    /**
     * Persist a successfully-sent (or queued) outbound Fax row.
     *
     * The actual `$result->providerFaxId` is stored so that webhook events
     * referencing the same id can update the row's status atomically.
     */
    public function recordOutbound(
        Facility $facility,
        FaxSetting $settings,
        FaxNumber $fromNumber,
        SendFaxRequest $request,
        SendResult $result,
        array $attributes
    ): Fax {
        $fax = new Fax(array_merge([
            'facility_id' => $facility->id,
            'direction' => Fax::DIRECTION_OUTBOUND,
            'provider' => $settings->provider,
            'provider_fax_id' => $result->providerFaxId,
            'from_number' => $request->fromNumber,
            'to_number' => $request->toNumber,
            'from_number_id' => $fromNumber->id,
            'status' => $result->ok ? ($result->status ?? Fax::STATUS_QUEUED) : Fax::STATUS_FAILED,
            'status_reason' => $result->ok ? null : $result->message,
            'sent_at' => $result->ok ? now() : null,
        ], $attributes));

        $fax->facility_id = $facility->id;
        $fax->save();

        $this->recordEvent($fax, $result->ok ? 'sent' : 'send_failed', [
            'send_result' => $result->raw,
            'message' => $result->message,
        ]);

        return $fax;
    }

    /**
     * Persist an inbound Fax row + download/store the PDF, after the
     * provider has verified the webhook signature and parsed the payload.
     */
    public function recordInbound(
        Facility $facility,
        FaxSetting $settings,
        InboundFax $inbound
    ): Fax {
        $existing = Fax::withoutGlobalScopes()
            ->where('provider', $settings->provider)
            ->where('provider_fax_id', $inbound->providerFaxId)
            ->first();

        if ($existing) {
            return $existing;
        }

        $disk = Storage::disk(config('fax.disk', 'local'));
        $bytes = $this->registry->make($settings->provider, $settings->credentials ?? [])
            ->downloadInboundMedia($inbound);

        if ($bytes === '' || $bytes === null) {
            throw new RuntimeException("Inbound fax {$inbound->providerFaxId} had no media.");
        }

        $path = $this->storagePathFor($facility->id, $inbound->receivedAt ?? now());
        $disk->put($path, $bytes);

        $fax = Fax::create([
            'facility_id' => $facility->id,
            'direction' => Fax::DIRECTION_INBOUND,
            'provider' => $settings->provider,
            'provider_fax_id' => $inbound->providerFaxId,
            'from_number' => $inbound->fromNumber,
            'to_number' => $inbound->toNumber,
            'status' => Fax::STATUS_RECEIVED,
            'received_at' => $inbound->receivedAt ?? now(),
            'page_count' => $inbound->pageCount,
            'file_path' => $path,
            'file_hash' => hash('sha256', $bytes),
            'mime_type' => 'application/pdf',
            'is_phi' => true,
        ]);

        $this->recordEvent($fax, 'received', ['raw' => $inbound->raw]);

        return $fax;
    }

    /**
     * Update an outbound Fax's status from a status webhook event.
     * No-op (and just records an event) if the fax row is already in a
     * terminal state.
     */
    public function applyStatus(Fax $fax, string $newStatus, ?string $reason = null, ?string $providerEventId = null, array $rawPayload = []): void
    {
        if ($fax->isTerminal() && $fax->status === $newStatus) {
            return;
        }

        $fax->status = $newStatus;
        if ($reason) {
            $fax->status_reason = $reason;
        }
        $fax->last_provider_event_at = now();
        $fax->save();

        $this->recordEvent($fax, "status.{$newStatus}", $rawPayload, $providerEventId);
    }

    public function recordEvent(Fax $fax, string $type, array $payload = [], ?string $providerEventId = null): FaxEvent
    {
        return FaxEvent::create([
            'fax_id' => $fax->id,
            'facility_id' => $fax->facility_id,
            'event_type' => $type,
            'event_payload' => $payload,
            'provider_event_id' => $providerEventId,
            'received_at' => now(),
        ]);
    }

    public function storagePathFor(int $facilityId, \DateTimeInterface $when): string
    {
        $root = trim((string) config('fax.storage_path', 'faxes'), '/');
        $year = Carbon::instance(\DateTimeImmutable::createFromInterface($when))->format('Y');
        $month = Carbon::instance(\DateTimeImmutable::createFromInterface($when))->format('m');

        return "{$root}/{$facilityId}/{$year}/{$month}/".Str::uuid()->toString().'.pdf';
    }
}
