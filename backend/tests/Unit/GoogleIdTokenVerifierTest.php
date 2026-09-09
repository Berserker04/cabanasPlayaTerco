<?php

namespace Tests\Unit;

use App\Services\GoogleIdTokenVerifier;
use Firebase\JWT\JWT;
use Google\Auth\AccessToken;
use GuzzleHttp\Psr7\Response;
use LogicException;
use phpseclib3\Crypt\RSA;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use UnexpectedValueException;

class GoogleIdTokenVerifierTest extends TestCase
{
    private const NOW = 1700000000;

    private static string $privateKey;

    private static string $certificates;

    private int $previousLeeway;

    private ?int $previousTimestamp;

    public static function setUpBeforeClass(): void
    {
        parent::setUpBeforeClass();

        $key = RSA::createKey(2048);
        self::$privateKey = $key->toString('PKCS8');
        $certificates = json_decode($key->getPublicKey()->toString('JWK'), true);
        $certificates['keys'][0]['kid'] = 'test-key';
        $certificates['keys'][0]['alg'] = 'RS256';
        self::$certificates = json_encode($certificates, JSON_THROW_ON_ERROR);
    }

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.google.client_id' => 'web-client.apps.googleusercontent.com']);
        $this->previousLeeway = JWT::$leeway;
        $this->previousTimestamp = JWT::$timestamp;
        JWT::$leeway = 7;
        JWT::$timestamp = self::NOW;
    }

    protected function tearDown(): void
    {
        JWT::$leeway = $this->previousLeeway;
        JWT::$timestamp = $this->previousTimestamp;

        parent::tearDown();
    }

    public function test_accepts_a_signed_token_when_google_clock_is_ten_seconds_ahead(): void
    {
        $identity = $this->verifier()->verify($this->token(['iat' => self::NOW + 10]));

        $this->assertSame('google-subject', $identity['sub']);
        $this->assertSame('operator@example.com', $identity['email']);
        $this->assertSame('Operator', $identity['name']);
        $this->assertSame(7, JWT::$leeway);
    }

    #[DataProvider('invalidClaims')]
    public function test_rejects_invalid_tokens_and_restores_clock_tolerance(array $claims): void
    {
        try {
            $this->verifier()->verify($this->token($claims));
            $this->fail('An invalid identity token must not be accepted.');
        } catch (UnexpectedValueException) {
            $this->assertSame(7, JWT::$leeway);
        }
    }

    public static function invalidClaims(): array
    {
        return [
            'future beyond tolerance' => [['iat' => self::NOW + 61]],
            'expired beyond tolerance' => [['exp' => self::NOW - 61]],
            'different audience' => [['aud' => 'another-client.apps.googleusercontent.com']],
            'different issuer' => [['iss' => 'https://example.com']],
            'unverified email' => [['email_verified' => false]],
            'missing subject' => [['sub' => '']],
        ];
    }

    public function test_rejects_a_tampered_signature(): void
    {
        $parts = explode('.', $this->token());
        $signature = JWT::urlsafeB64Decode($parts[2]);
        $signature[0] = chr(ord($signature[0]) ^ 1);
        $parts[2] = JWT::urlsafeB64Encode($signature);

        $this->expectException(UnexpectedValueException::class);

        $this->verifier()->verify(implode('.', $parts));
    }

    public function test_requires_the_server_client_id(): void
    {
        config(['services.google.client_id' => '']);

        $this->expectException(LogicException::class);

        $this->verifier()->verify($this->token());
    }

    private function verifier(): GoogleIdTokenVerifier
    {
        return new GoogleIdTokenVerifier(new AccessToken(
            static fn () => new Response(200, [], self::$certificates),
        ));
    }

    private function token(array $claims = []): string
    {
        return JWT::encode(array_replace([
            'iss' => 'https://accounts.google.com',
            'aud' => 'web-client.apps.googleusercontent.com',
            'sub' => 'google-subject',
            'email' => 'operator@example.com',
            'email_verified' => true,
            'name' => 'Operator',
            'iat' => self::NOW,
            'exp' => self::NOW + 3600,
        ], $claims), self::$privateKey, 'RS256', 'test-key');
    }
}
