<?php

namespace App\Providers;

use App\Contracts\GoogleIdentityVerifier;
use App\Services\GoogleIdTokenVerifier;
use Google\Auth\AccessToken;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(GoogleIdentityVerifier::class, static fn () => new GoogleIdTokenVerifier(new AccessToken));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
