<?php

namespace App\Services\Fax\Support;

/**
 * Lightweight representation of a phone number returned by the provider —
 * used both for "search for an available number" and "describe one we own".
 */
class NumberInfo
{
    public function __construct(
        public readonly string $e164Number,
        public readonly ?string $providerNumberId = null,
        public readonly ?int $monthlyCostCents = null,
        public readonly ?string $country = null,
        public readonly ?string $region = null,
        public readonly array $raw = [],
    ) {}

    public function toArray(): array
    {
        return [
            'e164_number' => $this->e164Number,
            'provider_number_id' => $this->providerNumberId,
            'monthly_cost_cents' => $this->monthlyCostCents,
            'country' => $this->country,
            'region' => $this->region,
        ];
    }
}
