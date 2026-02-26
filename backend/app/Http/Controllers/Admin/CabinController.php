<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCabinRequest;
use App\Http\Requests\Admin\UpdateCabinRequest;
use App\Http\Resources\CabinResource;
use App\Models\Cabin;
use Illuminate\Http\JsonResponse;

class CabinController extends Controller
{
    public function index(): JsonResponse
    {
        $cabins = Cabin::query()
            ->with('type')
            ->orderBy('name')
            ->paginate(30);

        return response()->json([
            'data' => CabinResource::collection($cabins),
            'meta' => [
                'current_page' => $cabins->currentPage(),
                'per_page'     => $cabins->perPage(),
                'total'        => $cabins->total(),
            ],
        ]);
    }

    public function store(StoreCabinRequest $request): JsonResponse
    {
        $cabin = Cabin::create($request->validated());

        return response()->json([
            'data'    => new CabinResource($cabin->load('type')),
            'message' => 'Cabaña creada.',
        ], 201);
    }

    public function update(UpdateCabinRequest $request, Cabin $cabin): JsonResponse
    {
        $cabin->update($request->validated());

        return response()->json([
            'data'    => new CabinResource($cabin->fresh()->load('type')),
            'message' => 'Cabaña actualizada.',
        ]);
    }

    public function destroy(Cabin $cabin): JsonResponse
    {
        $cabin->delete();

        return response()->json([
            'message' => 'Cabaña eliminada.',
        ]);
    }
}
