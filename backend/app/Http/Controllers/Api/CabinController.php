<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicCabinResource;
use App\Models\Cabin;
use Illuminate\Http\JsonResponse;

class CabinController extends Controller
{
    public function index(): JsonResponse
    {
        $cabins = Cabin::query()
            ->visible()
            ->with([
                'mapPoint',
                'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
            ])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => PublicCabinResource::collection($cabins),
        ]);
    }

    public function show(Cabin $cabin): JsonResponse
    {
        abort_if(! $cabin->is_active || $cabin->status->value === 'inactive', 404);

        $cabin->load([
            'mapPoint',
            'media' => fn ($query) => $query->orderBy('sort_order')->orderBy('id'),
        ]);

        return response()->json([
            'data' => new PublicCabinResource($cabin),
        ]);
    }
}
