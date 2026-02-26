<?php

namespace App\Http\Controllers\Api;

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
            ->with(['amenities', 'media'])
            ->withCount('cabins')
            ->orderBy('sort_order')
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
            ->with(['amenities', 'media'])
            ->withCount('cabins')
            ->firstOrFail();

        return response()->json([
            'data' => new CabinTypeResource($cabinType),
        ]);
    }
}
