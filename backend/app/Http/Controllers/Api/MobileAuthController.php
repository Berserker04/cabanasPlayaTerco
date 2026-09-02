<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\DeviceToken;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class MobileAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:120'],
            'platform' => ['nullable', 'string', 'max:40'],
            'push_token' => ['nullable', 'string', 'max:500'],
        ]);

        $user = User::query()
            ->where('email', $data['email'])
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales no son correctas.'],
            ]);
        }

        $user->load('roles');

        if (! $user->isStaff()) {
            abort(403, 'Acceso denegado. Se requiere rol operativo.');
        }

        if (! empty($data['push_token'])) {
            DeviceToken::updateOrCreate(
                ['token' => $data['push_token']],
                [
                    'user_id' => $user->id,
                    'platform' => $data['platform'] ?? null,
                    'device_name' => $data['device_name'] ?? null,
                    'last_used_at' => now(),
                ],
            );
        }

        $token = $user->createToken($data['device_name'] ?? 'mobile', ['mobile'])->plainTextToken;

        return response()->json([
            'data' => [
                'user' => new UserResource($user),
                'token' => $token,
            ],
            'message' => 'Inicio de sesion movil exitoso.',
        ]);
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
