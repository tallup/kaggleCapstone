<?php

namespace App\Providers;

use App\Services\Fax\FaxManager;
use App\Services\Fax\ProviderRegistry;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\ServiceProvider;

class FaxServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ProviderRegistry::class, function (Application $app) {
            return new ProviderRegistry(
                (array) config('fax.providers', []),
            );
        });

        $this->app->singleton(FaxManager::class, function (Application $app) {
            return new FaxManager($app->make(ProviderRegistry::class));
        });
    }

    public function boot(): void {}
}
