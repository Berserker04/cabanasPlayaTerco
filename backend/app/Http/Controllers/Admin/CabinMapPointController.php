<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CabinMapPointResource;
use App\Models\CabinMapPoint;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CabinMapPointController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => CabinMapPointResource::collection(
            CabinMapPoint::with('cabin')->orderBy('sort_order')->orderBy('id')->get()
        )]);
    }

    public function publicIndex(): JsonResponse
    {
        return response()->json(['data' => CabinMapPointResource::collection(
            CabinMapPoint::whereHas('cabin', fn ($query) => $query->withoutTrashed()->visible())
                ->orderBy('sort_order')->orderBy('id')->get()
        )]);
    }

    public function store(Request $request): JsonResponse
    {
        $point = CabinMapPoint::create([...$this->validatePoint($request), 'key' => 'cabana_'.Str::uuid()]);

        return response()->json(['data' => new CabinMapPointResource($point), 'message' => 'Punto creado.'], 201);
    }

    public function update(Request $request, CabinMapPoint $cabinMapPoint): JsonResponse
    {
        $cabinMapPoint->update($this->validatePoint($request));

        return response()->json(['data' => new CabinMapPointResource($cabinMapPoint->fresh()->load('cabin')), 'message' => 'Punto actualizado.']);
    }

    public function destroy(CabinMapPoint $cabinMapPoint): JsonResponse
    {
        DB::transaction(function () use ($cabinMapPoint): void {
            $point = CabinMapPoint::lockForUpdate()->findOrFail($cabinMapPoint->id);
            if ($point->cabin()->exists()) {
                throw ValidationException::withMessages(['point' => 'Este punto pertenece a una cabaña y sigue reservado, aunque esté oculta o eliminada.']);
            }
            $point->delete();
        });

        return response()->json(['message' => 'Punto eliminado.']);
    }

    private function validatePoint(Request $request): array
    {
        return $request->validate([
            'label' => ['required', 'string', 'max:100'],
            'x' => ['required', 'numeric', 'between:0,100'],
            'y' => ['required', 'numeric', 'between:0,100'],
            'sort_order' => ['required', 'integer', 'between:0,65535'],
        ]);
    }
}
