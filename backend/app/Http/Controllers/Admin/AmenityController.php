<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAmenityRequest;
use App\Http\Requests\Admin\UpdateAmenityRequest;
use App\Http\Resources\AmenityResource;
use App\Models\Amenity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AmenityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $amenities = Amenity::query()
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('category', 'like', "%{$search}%");
                });
            })
            ->orderBy('category')
            ->orderBy('name')
            ->get();

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

    public function update(UpdateAmenityRequest $request, Amenity $amenity): JsonResponse
    {
        $amenity->update($request->validated());

        return response()->json([
            'data'    => new AmenityResource($amenity->fresh()),
            'message' => 'Amenidad actualizada.',
        ]);
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
