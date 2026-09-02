<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AmenityResource;
use App\Models\Amenity;
use Illuminate\Http\JsonResponse;

class AmenityController extends Controller
{
    public function index(): JsonResponse
    {
        $amenities = Amenity::query()
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => AmenityResource::collection($amenities),
        ]);
    }
}
