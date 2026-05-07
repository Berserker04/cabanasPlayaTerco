<?php

namespace App\Http\Controllers\Api;

use App\Enums\CabinStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\CabinTypeResource;
use App\Models\CabinType;
use Illuminate\Http\JsonResponse;

class CabinController extends Controller
{
    public function index(): JsonResponse
    {
        $cabinTypes = CabinType::query()
            ->active()
            ->with([
                'amenities',
                'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            ])
            ->withCount([
                'cabins',
                'cabins as available_cabins_count' => fn ($query) => $query->where('status', CabinStatus::Available->value),
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => CabinTypeResource::collection($cabinTypes),
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $cabinType = CabinType::query()
            ->where('slug', $slug)
            ->active()
            ->with([
                'amenities',
                'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            ])
            ->withCount([
                'cabins',
                'cabins as available_cabins_count' => fn ($query) => $query->where('status', CabinStatus::Available->value),
            ])
            ->firstOrFail();

        return response()->json([
            'data' => new CabinTypeResource($cabinType),
        ]);
    }
}
