<?php

namespace App\Services\Fax\Support;

/**
 * Result of FaxProvider::send().
 *
 * `providerFaxId` is required when ok=true so we can match later webhook
 * events back to the originating Fax row.
 */
class SendResult
{
    public function __construct(
        public readonly bool $ok,
        public readonly ?string $providerFaxId,
        public readonly ?string $status = null,
        public readonly ?string $message = null,
        public readonly array $raw = [],
    ) {}

    public static function ok(string $providerFaxId, ?string $status = 'queued', array $raw = []): self
    {
        return new self(true, $providerFaxId, $status, null, $raw);
    }

    public static function fail(string $message, array $raw = []): self
    {
        return new self(false, null, null, $message, $raw);
    }
}
