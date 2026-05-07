<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCabinRequest;
use App\Http\Requests\Admin\UpdateCabinRequest;
use App\Http\Resources\CabinResource;
use App\Models\Cabin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CabinController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $cabins = Cabin::query()
            ->with('type')
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('notes', 'like', "%{$search}%");
                });
            })
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('cabin_type_id'), fn ($query) => $query->where('cabin_type_id', $request->integer('cabin_type_id')))
            ->orderBy('name')
            ->paginate(30);

        return response()->json([
            'data' => CabinResource::collection($cabins),
            'meta' => [
                'current_page' => $cabins->currentPage(),
                'last_page'    => $cabins->lastPage(),
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
            'message' => 'Cabana creada.',
        ], 201);
    }

    public function update(UpdateCabinRequest $request, Cabin $cabin): JsonResponse
    {
        $cabin->update($request->validated());

        return response()->json([
            'data'    => new CabinResource($cabin->fresh()->load('type')),
            'message' => 'Cabana actualizada.',
        ]);
    }

    public function destroy(Cabin $cabin): JsonResponse
    {
        $cabin->delete();

        return response()->json([
            'message' => 'Cabana eliminada.',
        ]);
    }
}
