<?php

namespace App\Services\Fax\Support;

/**
 * Normalised view of an incoming webhook payload.
 *
 * `kind` is the lifecycle hint used by FaxManager to decide what to do:
 *   - 'status'  → update an existing outbound Fax row's status
 *   - 'inbound' → create a new inbound Fax row + download/store PDF
 *   - 'ignore'  → unsupported or duplicate event, no action
 */
class WebhookResult
{
    public const KIND_STATUS = 'status';

    public const KIND_INBOUND = 'inbound';

    public const KIND_IGNORE = 'ignore';

    public function __construct(
        public readonly string $kind,
        public readonly ?string $providerFaxId = null,
        public readonly ?string $newStatus = null,
        public readonly ?string $statusReason = null,
        public readonly ?InboundFax $inbound = null,
        public readonly ?string $providerEventId = null,
        public readonly array $raw = [],
    ) {}

    public static function status(string $providerFaxId, string $newStatus, ?string $reason = null, ?string $eventId = null, array $raw = []): self
    {
        return new self(self::KIND_STATUS, $providerFaxId, $newStatus, $reason, null, $eventId, $raw);
    }

    public static function inbound(InboundFax $inbound, ?string $eventId = null, array $raw = []): self
    {
        return new self(self::KIND_INBOUND, $inbound->providerFaxId, null, null, $inbound, $eventId, $raw);
    }

    public static function ignore(array $raw = []): self
    {
        return new self(self::KIND_IGNORE, null, null, null, null, null, $raw);
    }
}
