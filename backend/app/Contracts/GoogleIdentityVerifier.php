<?php

namespace App\Contracts;

interface GoogleIdentityVerifier
{
    /**
     * @return array{sub: string, email: string, name: string, avatar: string|null}
     */
    public function verify(string $idToken): array;
}
