<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCabinMediaRequest;
use App\Http\Resources\CabinMediaResource;
use App\Models\CabinMedia;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;

class CabinMediaController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService
    ) {}

    public function store(StoreCabinMediaRequest $request): JsonResponse
    {
        $upload = $this->uploadService->upload($request->file('file'), 'cabins');

        $media = CabinMedia::create([
            'cabin_type_id' => $request->cabin_type_id,
            'url'           => $upload['url'],
            'alt'           => $request->alt,
            'type'          => $request->type ?? 'image',
            'sort_order'    => $request->sort_order ?? 0,
        ]);

        return response()->json([
            'data'    => new CabinMediaResource($media),
            'message' => 'Imagen subida.',
        ], 201);
    }

    public function destroy(CabinMedia $cabinMedia): JsonResponse
    {
        $cabinMedia->delete();

        return response()->json([
            'message' => 'Imagen eliminada.',
        ]);
    }
}
