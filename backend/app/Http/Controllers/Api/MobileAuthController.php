<?php

namespace App\Http\Controllers\Api;

use App\Contracts\GoogleIdentityVerifier;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\MobileGoogleLoginRequest;
use App\Http\Requests\Auth\MobileLoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\DeviceToken;
use App\Models\User;
use App\Services\MobileAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use UnexpectedValueException;

class MobileAuthController extends Controller
{
    public function __construct(
        private readonly MobileAuthService $mobileAuthService,
        private readonly GoogleIdentityVerifier $googleIdentityVerifier,
    ) {}

    public function login(MobileLoginRequest $request): JsonResponse
    {
        $data = $request->validated();
        $user = $this->mobileAuthService->passwordUser($data['email'], $data['password']);

        if ($this->mobileAuthService->approvalRequired($user)) {
            return $this->pendingResponse($user);
        }

        return $this->sessionResponse($user, $data, 'Inicio de sesión móvil exitoso.');
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->mobileAuthService->registerPending($request->validated());

        return $this->pendingResponse($user, 'Cuenta creada. Un administrador debe aprobar tu acceso.');
    }

    public function google(MobileGoogleLoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        try {
            $identity = $this->googleIdentityVerifier->verify($data['id_token']);
        } catch (LogicException $exception) {
            return response()->json(['message' => $exception->getMessage()], 503);
        } catch (UnexpectedValueException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        }

        $user = $this->mobileAuthService->resolveGoogleUser($identity);

        if ($this->mobileAuthService->approvalRequired($user)) {
            return $this->pendingResponse($user);
        }

        return $this->sessionResponse($user, $data, 'Inicio de sesión con Google exitoso.');
    }

    /**
     * @param  array{device_name?: string|null, platform?: string|null, push_token?: string|null}  $device
     */
    private function sessionResponse(User $user, array $device, string $message): JsonResponse
    {
        $token = $this->mobileAuthService->issueToken($user, $device);

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
                'approval_required' => false,
            ],
            'message' => $message,
        ]);
    }

    private function pendingResponse(
        User $user,
        string $message = 'Tu acceso al panel está pendiente de aprobación.',
    ): JsonResponse {
        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'approval_required' => true,
            ],
            'message' => $message,
        ], 202);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        if ($request->filled('push_token')) {
            DeviceToken::where('token', $request->string('push_token')->toString())->delete();
        }

        return response()->json([
            'message' => 'Sesion movil cerrada.',
        ]);
    }
}
