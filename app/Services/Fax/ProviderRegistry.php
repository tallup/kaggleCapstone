<?php

namespace App\Services\Fax;

use App\Services\Fax\Contracts\FaxProvider;
use InvalidArgumentException;

/**
 * Singleton registry of available FaxProvider classes.
 *
 * Built once from config('fax.providers') at boot. Lets the controllers /
 * UI ask "what providers are installed?" and "give me a fresh instance of
 * provider X" without leaking config into business logic.
 */
class ProviderRegistry
{
    /** @var array<string, class-string<FaxProvider>> */
    private array $providers = [];

    /**
     * @param  array<int, class-string<FaxProvider>>  $providerClasses
     */
    public function __construct(array $providerClasses = [])
    {
        foreach ($providerClasses as $class) {
            if (! is_subclass_of($class, FaxProvider::class)) {
                throw new InvalidArgumentException("{$class} does not implement FaxProvider.");
            }
            $this->providers[$class::key()] = $class;
        }
    }

    public function register(string $providerClass): void
    {
        if (! is_subclass_of($providerClass, FaxProvider::class)) {
            throw new InvalidArgumentException("{$providerClass} does not implement FaxProvider.");
        }
        $this->providers[$providerClass::key()] = $providerClass;
    }

    public function has(string $key): bool
    {
        return isset($this->providers[$key]);
    }

    /**
     * @return array<string, class-string<FaxProvider>>
     */
    public function all(): array
    {
        return $this->providers;
    }

    /**
     * Returns the providers in a UI-friendly shape — suitable for direct
     * return from a JSON endpoint.
     *
     * @return array<int, array<string, mixed>>
     */
    public function describe(): array
    {
        return collect($this->providers)
            ->map(fn (string $class, string $key) => [
                'key' => $key,
                'display_name' => $class::displayName(),
                'description' => $class::description(),
                'credential_schema' => collect($class::credentialSchema())
                    ->map(fn ($field) => $field->toArray())
                    ->all(),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $credentials
     */
    public function make(string $key, array $credentials = []): FaxProvider
    {
        if (! isset($this->providers[$key])) {
            throw new InvalidArgumentException("Unknown fax provider [{$key}].");
        }

        $class = $this->providers[$key];

        return new $class($credentials);
    }
}
