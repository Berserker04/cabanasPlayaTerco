<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class AuthController extends Controller
{
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'phone'    => $request->phone,
        ]);

        $this->assignDefaultRole($user);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'data'    => new UserResource($user->load('roles')),
            'message' => 'Registro exitoso.',
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Las credenciales no son correctas.'],
            ]);
        }

        $request->session()->regenerate();

        $user = Auth::user()->load('roles');

        return response()->json([
            'data'    => new UserResource($user),
            'message' => 'Inicio de sesion exitoso.',
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Sesion cerrada.',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()->load('roles')),
        ]);
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());

        return response()->json([
            'data'    => new UserResource($user->fresh()->load('roles')),
            'message' => 'Perfil actualizado.',
        ]);
    }

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $status = Password::sendResetLink($request->only('email'));

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => 'Enlace de recuperacion enviado al correo.',
        ]);
    }

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => 'Contrasena actualizada exitosamente.',
        ]);
    }

    public function googleRedirect(Request $request): JsonResponse
    {
        if (! config('services.google.client_id') || ! config('services.google.client_secret')) {
            return response()->json([
                'message' => 'Inicio de sesion con Google no esta configurado.',
            ], 503);
        }

        $request->session()->put(
            'auth.google_next',
            $this->sanitizeFrontendPath($request->query('next')),
        );

        $url = Socialite::driver('google')
            ->redirect()
            ->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    public function googleCallback(Request $request): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable) {
            return redirect()->away($this->frontendUrl('/login?error=google'));
        }

        if (! $googleUser->getEmail()) {
            return redirect()->away($this->frontendUrl('/login?error=google-email'));
        }

        $user = User::where('google_id', $googleUser->getId())
            ->orWhere('email', $googleUser->getEmail())
            ->first();

        if ($user) {
            $user->forceFill([
                'google_id'         => $googleUser->getId(),
                'name'              => $googleUser->getName(),
                'email'             => $googleUser->getEmail(),
                'avatar'            => $googleUser->getAvatar(),
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();
        } else {
            $user = User::create([
                'name'              => $googleUser->getName(),
                'email'             => $googleUser->getEmail(),
                'google_id'         => $googleUser->getId(),
                'avatar'            => $googleUser->getAvatar(),
                'email_verified_at' => now(),
                'password'          => Hash::make(Str::password(32)),
            ]);
        }

        $this->assignDefaultRole($user);

        Auth::login($user);
        $request->session()->regenerate();

        $next = $this->sanitizeFrontendPath(
            $request->session()->pull('auth.google_next'),
            $user->isAdmin(),
        );

        if ($next === '/' && $user->isAdmin()) {
            $next = '/admin';
        }

        return redirect()->away($this->frontendUrl($next));
    }

    private function assignDefaultRole(User $user): void
    {
        if ($user->roles()->exists()) {
            return;
        }

        $role = Role::where('name', 'user')->first();

        if ($role) {
            $user->roles()->attach($role);
        }
    }

    private function sanitizeFrontendPath(mixed $path, bool $allowAdmin = true): string
    {
        if (! is_string($path)) {
            return '/';
        }

        $path = trim($path);

        if ($path === '' || ! str_starts_with($path, '/') || str_starts_with($path, '//')) {
            return '/';
        }

        if (str_contains($path, '\\') || str_contains($path, "\n") || str_contains($path, "\r")) {
            return '/';
        }

        if (
            ! $allowAdmin
            && ($path === '/admin' || str_starts_with($path, '/admin/') || str_starts_with($path, '/admin?'))
        ) {
            return '/';
        }

        return $path;
    }

    private function frontendUrl(string $path): string
    {
        return rtrim((string) config('services.frontend.url', 'http://localhost:3000'), '/').$path;
    }
}
