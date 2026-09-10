<?php

namespace App\Services;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;
use JsonException;
use Symfony\Component\HttpFoundation\Cookie;

final class GoogleOAuthState
{
    public const COOKIE_NAME = 'google_oauth_browser';

    private const STATE_TTL_SECONDS = 600;

    private const COOKIE_TTL_MINUTES = 30;

    /**
     * @return array{state: string, browser_token: string}
     */
    public function issue(Request $request, string $next): array
    {
        $browserToken = (string) $request->cookie(self::COOKIE_NAME, '');

        if (strlen($browserToken) !== 64) {
            $browserToken = Str::random(64);
        }

        $payload = json_encode([
            'browser' => hash('sha256', $browserToken),
            'expires_at' => now()->addSeconds(self::STATE_TTL_SECONDS)->timestamp,
            'next' => $next,
        ], JSON_THROW_ON_ERROR);

        return [
            'state' => Crypt::encryptString($payload),
            'browser_token' => $browserToken,
        ];
    }

    public function retrieveNext(Request $request): ?string
    {
        $state = $request->string('state')->toString();
        $browserToken = (string) $request->cookie(self::COOKIE_NAME, '');

        if ($state === '' || strlen($browserToken) !== 64) {
            return null;
        }

        try {
            $payload = json_decode(
                Crypt::decryptString($state),
                true,
                flags: JSON_THROW_ON_ERROR,
            );
        } catch (DecryptException|JsonException) {
            return null;
        }

        if (
            ! is_array($payload)
            || ! is_string($payload['browser'] ?? null)
            || ! is_int($payload['expires_at'] ?? null)
            || ! is_string($payload['next'] ?? null)
            || $payload['expires_at'] < now()->timestamp
            || ! hash_equals($payload['browser'], hash('sha256', $browserToken))
        ) {
            return null;
        }

        return $payload['next'];
    }

    public function browserCookie(string $browserToken): Cookie
    {
        return cookie(
            self::COOKIE_NAME,
            $browserToken,
            self::COOKIE_TTL_MINUTES,
            (string) config('session.path', '/'),
            config('session.domain'),
            (bool) config('session.secure'),
            true,
            false,
            (string) config('session.same_site', 'lax'),
        );
    }
}
