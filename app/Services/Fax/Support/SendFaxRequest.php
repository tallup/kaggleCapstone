<?php

namespace App\Services\Fax\Support;

/**
 * Provider-agnostic shape passed into FaxProvider::send().
 *
 * Lives in this support namespace (not coupled to Eloquent) so providers can
 * be exercised in isolation by unit tests without requiring a Fax model.
 */
class SendFaxRequest
{
    public function __construct(
        /** E.164 from number, must be a number provisioned to this facility */
        public readonly string $fromNumber,
        /** E.164 destination */
        public readonly string $toNumber,
        /** Absolute path to the PDF on local disk (already validated PDF) */
        public readonly string $filePath,
        public readonly ?string $coverPageHtml = null,
        public readonly ?string $subject = null,
        /** Opaque correlator; providers should echo it back on webhooks if supported */
        public readonly ?string $clientReference = null,
        /** Provider-specific options, e.g. ["quality" => "fine"] */
        public readonly array $options = [],
    ) {}
}
