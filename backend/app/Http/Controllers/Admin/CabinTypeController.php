<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCabinTypeRequest;
use App\Http\Requests\Admin\UpdateCabinTypeRequest;
use App\Http\Resources\CabinTypeResource;
use App\Models\CabinType;
use Illuminate\Http\JsonResponse;

class CabinTypeController extends Controller
{
    public function index(): JsonResponse
    {
        $cabinTypes = CabinType::query()
            ->with(['amenities', 'media'])
            ->withCount('cabins')
            ->orderBy('sort_order')
            ->paginate(20);

        return response()->json([
            'data' => CabinTypeResource::collection($cabinTypes),
            'meta' => [
                'current_page' => $cabinTypes->currentPage(),
                'per_page'     => $cabinTypes->perPage(),
                'total'        => $cabinTypes->total(),
            ],
        ]);
    }

    public function store(StoreCabinTypeRequest $request): JsonResponse
    {
        $cabinType = CabinType::create($request->safe()->except('amenity_ids'));

        if ($request->has('amenity_ids')) {
            $cabinType->amenities()->sync($request->amenity_ids);
        }

        return response()->json([
            'data'    => new CabinTypeResource($cabinType->load('amenities')),
            'message' => 'Tipo de cabaña creado.',
        ], 201);
    }

    public function update(UpdateCabinTypeRequest $request, CabinType $cabinType): JsonResponse
    {
        $cabinType->update($request->safe()->except('amenity_ids'));

        if ($request->has('amenity_ids')) {
            $cabinType->amenities()->sync($request->amenity_ids);
        }

        return response()->json([
            'data'    => new CabinTypeResource($cabinType->fresh()->load('amenities', 'media')),
            'message' => 'Tipo de cabaña actualizado.',
        ]);
    }

    public function destroy(CabinType $cabinType): JsonResponse
    {
        $cabinType->delete();

        return response()->json([
            'message' => 'Tipo de cabaña eliminado.',
        ]);
    }
}
