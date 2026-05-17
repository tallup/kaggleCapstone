<?php

namespace App\Services\Fax\Support;

/**
 * Result of FaxProvider::testConnection().
 *
 * Returned to the API and persisted on FaxSetting as last_test_status /
 * last_test_message so the UI can keep showing the latest test outcome.
 */
class TestResult
{
    public function __construct(
        public readonly bool $ok,
        public readonly string $message,
        /** @var array<string, mixed> */
        public readonly array $details = [],
    ) {}

    public static function ok(string $message = 'Connected', array $details = []): self
    {
        return new self(true, $message, $details);
    }

    public static function fail(string $message, array $details = []): self
    {
        return new self(false, $message, $details);
    }

    public function toArray(): array
    {
        return [
            'ok' => $this->ok,
            'message' => $this->message,
            'details' => $this->details,
        ];
    }
}
