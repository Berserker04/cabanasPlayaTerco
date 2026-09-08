<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePanelAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $user?->loadMissing('roles');

        if (! $user?->canAccessPanel()) {
            abort(403, 'No tienes acceso al panel administrativo.');
        }

        if (! $request->isMethodSafe() && ! $user->isStaff()) {
            abort(403, 'Tu rol de Visualizador solo permite consultar información.');
        }

        return $next($request);
    }
}
