<?php

namespace App\Services\Fax\Support;

/**
 * Provider-neutral shape of an inbound fax extracted from a webhook payload.
 *
 * The webhook controller turns the raw HTTP body into one of these via the
 * provider's parseInboundWebhook() method, then hands it to FaxManager to
 * persist the PDF + Fax row.
 */
class InboundFax
{
    public function __construct(
        public readonly string $providerFaxId,
        public readonly string $fromNumber,
        public readonly string $toNumber,
        /**
         * Either a remote URL (we'll download) or null when the provider
         * pushes the PDF inline.
         */
        public readonly ?string $mediaUrl = null,
        /** Raw PDF bytes if pushed inline; mutually exclusive with mediaUrl */
        public readonly ?string $mediaBytes = null,
        public readonly ?int $pageCount = null,
        public readonly ?\DateTimeInterface $receivedAt = null,
        public readonly array $raw = [],
    ) {}
}
