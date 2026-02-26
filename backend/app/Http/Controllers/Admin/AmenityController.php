<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAmenityRequest;
use App\Http\Resources\AmenityResource;
use App\Models\Amenity;
use Illuminate\Http\JsonResponse;

class AmenityController extends Controller
{
    public function index(): JsonResponse
    {
        $amenities = Amenity::query()->orderBy('category')->orderBy('name')->get();

        return response()->json([
            'data' => AmenityResource::collection($amenities),
        ]);
    }

    public function store(StoreAmenityRequest $request): JsonResponse
    {
        $amenity = Amenity::create($request->validated());

        return response()->json([
            'data'    => new AmenityResource($amenity),
            'message' => 'Amenidad creada.',
        ], 201);
    }

    public function destroy(Amenity $amenity): JsonResponse
    {
        $amenity->cabinTypes()->detach();
        $amenity->delete();

        return response()->json([
            'message' => 'Amenidad eliminada.',
        ]);
    }
}
