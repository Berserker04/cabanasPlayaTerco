<?php

namespace App\Services;

use App\Contracts\GoogleIdentityVerifier;
use Google\Auth\AccessToken;
use LogicException;
use Throwable;
use UnexpectedValueException;

final class GoogleIdTokenVerifier implements GoogleIdentityVerifier
{
    /**
     * @return array{sub: string, email: string, name: string, avatar: string|null}
     */
    public function verify(string $idToken): array
    {
        $clientId = trim((string) config('services.google.client_id'));

        if ($clientId === '') {
            throw new LogicException('Inicio de sesión con Google no está configurado.');
        }

        try {
            $claims = (array) (new AccessToken)->verify($idToken);
        } catch (Throwable $exception) {
            throw new UnexpectedValueException('No pudimos validar la identidad de Google.', previous: $exception);
        }

        $issuer = (string) ($claims['iss'] ?? '');
        $audience = $claims['aud'] ?? null;
        $email = trim((string) ($claims['email'] ?? ''));
        $subject = trim((string) ($claims['sub'] ?? ''));
        $emailVerified = filter_var($claims['email_verified'] ?? false, FILTER_VALIDATE_BOOL);

        if (
            ! in_array($issuer, ['accounts.google.com', 'https://accounts.google.com'], true)
            || ! $this->audienceContains($audience, $clientId)
            || $subject === ''
            || $email === ''
            || ! filter_var($email, FILTER_VALIDATE_EMAIL)
            || ! $emailVerified
        ) {
            throw new UnexpectedValueException('La identidad de Google no es válida para esta aplicación.');
        }

        $name = trim((string) ($claims['name'] ?? ''));

        return [
            'sub' => $subject,
            'email' => $email,
            'name' => $name !== '' ? $name : str($email)->before('@')->headline()->toString(),
            'avatar' => isset($claims['picture']) ? (string) $claims['picture'] : null,
        ];
    }

    private function audienceContains(mixed $audience, string $clientId): bool
    {
        if (is_array($audience)) {
            return in_array($clientId, $audience, true);
        }

        return hash_equals($clientId, (string) $audience);
    }
}
