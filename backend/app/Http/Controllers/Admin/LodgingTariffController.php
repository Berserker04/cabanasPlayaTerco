<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreLodgingTariffRequest;
use App\Http\Requests\Admin\UpdateLodgingTariffRequest;
use App\Http\Resources\LodgingTariffResource;
use App\Models\LodgingTariff;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LodgingTariffController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tariffs = LodgingTariff::query()
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search) {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('public_notes', 'like', "%{$search}%");
                });
            })
            ->orderBy('sort_order')
            ->orderBy('title')
            ->paginate(20);

        return response()->json([
            'data' => LodgingTariffResource::collection($tariffs),
            'meta' => [
                'current_page' => $tariffs->currentPage(),
                'last_page'    => $tariffs->lastPage(),
                'per_page'     => $tariffs->perPage(),
                'total'        => $tariffs->total(),
            ],
        ]);
    }

    public function store(StoreLodgingTariffRequest $request): JsonResponse
    {
        $tariff = LodgingTariff::create($request->validated());

        return response()->json([
            'data'    => new LodgingTariffResource($tariff),
            'message' => 'Tarifa creada.',
        ], 201);
    }

    public function update(UpdateLodgingTariffRequest $request, LodgingTariff $lodgingTariff): JsonResponse
    {
        $lodgingTariff->update($request->validated());

        return response()->json([
            'data'    => new LodgingTariffResource($lodgingTariff->fresh()),
            'message' => 'Tarifa actualizada.',
        ]);
    }

    public function destroy(LodgingTariff $lodgingTariff): JsonResponse
    {
        $lodgingTariff->delete();

        return response()->json([
            'message' => 'Tarifa eliminada.',
        ]);
    }
}
