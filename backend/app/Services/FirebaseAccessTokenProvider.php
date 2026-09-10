<?php

namespace App\Services;

use Google\Auth\Credentials\ServiceAccountCredentials;
use Google\Auth\HttpHandler\HttpHandlerFactory;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Cache;

class FirebaseAccessTokenProvider
{
    public function token(): string
    {
        $path = config('services.firebase.credentials');
        if (! $path || ! is_readable($path)) {
            throw new \RuntimeException('No se encuentran las credenciales privadas de Firebase.');
        }
        $key = 'firebase:oauth:'.hash('sha256', $path.':'.filemtime($path));

        return Cache::remember($key, 3000, function () use ($path): string {
            $credentials = new ServiceAccountCredentials(
                ['https://www.googleapis.com/auth/firebase.messaging'],
                $path,
            );
            $result = $credentials->fetchAuthToken(HttpHandlerFactory::build(new Client([
                'connect_timeout' => 5, 'timeout' => 10,
            ])));
            if (empty($result['access_token'])) {
                throw new \RuntimeException('Firebase no devolvió un token de acceso.');
            }

            return $result['access_token'];
        });
    }
}
