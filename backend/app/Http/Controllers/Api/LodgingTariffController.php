<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\LodgingTariffResource;
use App\Models\LodgingTariff;
use Illuminate\Http\JsonResponse;

class LodgingTariffController extends Controller
{
    public function index(): JsonResponse
    {
        $tariffs = LodgingTariff::query()
            ->active()
            ->orderBy('sort_order')
            ->orderBy('title')
            ->get();

        return response()->json([
            'data' => LodgingTariffResource::collection($tariffs),
        ]);
    }
}
