<?php

namespace App\Http\Controllers\Admin;

use App\Enums\CabinStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCabinTypeRequest;
use App\Http\Requests\Admin\UpdateCabinTypeRequest;
use App\Http\Resources\CabinTypeResource;
use App\Models\CabinType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CabinTypeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cabinTypes = CabinType::query()
            ->with([
                'amenities',
                'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            ])
            ->withCount([
                'cabins',
                'cabins as available_cabins_count' => fn ($query) => $query->where('status', CabinStatus::Available->value),
            ])
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(20);

        return response()->json([
            'data' => CabinTypeResource::collection($cabinTypes),
            'meta' => [
                'current_page' => $cabinTypes->currentPage(),
                'last_page'    => $cabinTypes->lastPage(),
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

        $cabinType = $this->loadForResponse($cabinType);

        return response()->json([
            'data'    => new CabinTypeResource($cabinType),
            'message' => 'Tipo de cabaña creado.',
        ], 201);
    }

    public function update(UpdateCabinTypeRequest $request, CabinType $cabinType): JsonResponse
    {
        $cabinType->update($request->safe()->except('amenity_ids'));

        if ($request->has('amenity_ids')) {
            $cabinType->amenities()->sync($request->amenity_ids);
        }

        $cabinType = $this->loadForResponse($cabinType->fresh());

        return response()->json([
            'data'    => new CabinTypeResource($cabinType),
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

    private function loadForResponse(CabinType $cabinType): CabinType
    {
        return $cabinType
            ->load([
                'amenities',
                'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            ])
            ->loadCount([
                'cabins',
                'cabins as available_cabins_count' => fn ($query) => $query->where('status', CabinStatus::Available->value),
            ]);
    }
}
