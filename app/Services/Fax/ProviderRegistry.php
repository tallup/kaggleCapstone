<?php

namespace App\Services\Fax;

use App\Models\FaxProviderCatalog;
use App\Services\Fax\Contracts\FaxProvider;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;

/**
 * Registry of available FaxProvider classes plus optional catalog aliases.
 *
 * Built-in drivers come from config('fax.providers'). Rows in fax_provider_catalog
 * add extra dropdown options (custom slug + label) that map to the same PHP driver.
 */
class ProviderRegistry
{
    /** @var array<string, class-string<FaxProvider>> canonical key => class */
    private array $canonicalProviders = [];

    /** @var array<string, string> catalog slug => canonical key */
    private array $aliases = [];

    private bool $aliasesLoaded = false;

    /**
     * @param  array<int, class-string<FaxProvider>>  $providerClasses
     */
    public function __construct(array $providerClasses = [])
    {
        foreach ($providerClasses as $class) {
            if (! is_subclass_of($class, FaxProvider::class)) {
                throw new InvalidArgumentException("{$class} does not implement FaxProvider.");
            }
            $this->canonicalProviders[$class::key()] = $class;
        }
    }

    public function register(string $providerClass): void
    {
        if (! is_subclass_of($providerClass, FaxProvider::class)) {
            throw new InvalidArgumentException("{$providerClass} does not implement FaxProvider.");
        }
        $this->canonicalProviders[$providerClass::key()] = $providerClass;
    }

    /**
     * Canonical provider keys from config (telnyx, documo, …), not catalog slugs.
     *
     * @return array<string, class-string<FaxProvider>>
     */
    public function all(): array
    {
        return $this->canonicalProviders;
    }

    /** Built-in keys only — used for validation against fax_provider_catalog. */
    public function canonicalKeys(): array
    {
        return array_keys($this->canonicalProviders);
    }

    public function has(string $key): bool
    {
        $this->ensureAliasesLoaded();

        return isset($this->canonicalProviders[$this->canonicalKey($key)]);
    }

    /**
     * Resolve a UI key (catalog slug or canonical) to the canonical driver key.
     */
    public function canonicalKey(string $key): string
    {
        $this->ensureAliasesLoaded();

        if (isset($this->aliases[$key])) {
            return $this->aliases[$key];
        }

        if (isset($this->canonicalProviders[$key])) {
            return $key;
        }

        return $key;
    }

    /**
     * @param  array<string, mixed>  $credentials
     */
    public function make(string $key, array $credentials = []): FaxProvider
    {
        $this->ensureAliasesLoaded();
        $canonical = $this->canonicalKey($key);
        if (! isset($this->canonicalProviders[$canonical])) {
            throw new InvalidArgumentException("Unknown fax provider [{$key}].");
        }

        $class = $this->canonicalProviders[$canonical];

        return new $class($credentials);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function describe(): array
    {
        $this->ensureAliasesLoaded();
        $out = [];

        if ($this->aliases !== []) {
            $catalog = FaxProviderCatalog::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('display_name')
                ->get();

            foreach ($catalog as $row) {
                $canonical = $row->canonical_provider;
                if (! isset($this->canonicalProviders[$canonical])) {
                    continue;
                }
                $class = $this->canonicalProviders[$canonical];
                $out[] = $this->describeOne(
                    $row->slug,
                    $row->display_name,
                    $row->description ?: $class::description(),
                    $class
                );
            }
        }

        foreach ($this->canonicalProviders as $key => $class) {
            $out[] = $this->describeOne($key, $class::displayName(), $class::description(), $class);
        }

        return $out;
    }

    /**
     * @param  class-string<FaxProvider>  $class
     * @return array<string, mixed>
     */
    private function describeOne(string $key, string $displayName, ?string $description, string $class): array
    {
        return [
            'key' => $key,
            'display_name' => $displayName,
            'description' => $description,
            'credential_schema' => collect($class::credentialSchema())
                ->map(fn ($field) => $field->toArray())
                ->all(),
        ];
    }

    private function ensureAliasesLoaded(): void
    {
        if ($this->aliasesLoaded) {
            return;
        }
        $this->aliasesLoaded = true;

        if (! Schema::hasTable('fax_provider_catalog')) {
            return;
        }

        FaxProviderCatalog::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->each(function (FaxProviderCatalog $row): void {
                if (isset($this->canonicalProviders[$row->canonical_provider])) {
                    $this->aliases[$row->slug] = $row->canonical_provider;
                }
            });
    }
}
