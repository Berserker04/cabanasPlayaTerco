<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreCabinMediaRequest;
use App\Http\Requests\Admin\UpdateCabinMediaRequest;
use App\Http\Resources\CabinMediaResource;
use App\Models\Cabin;
use App\Models\CabinMedia;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;

class CabinMediaController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService
    ) {}

    public function store(StoreCabinMediaRequest $request): JsonResponse
    {
        $cabin = Cabin::findOrFail($request->integer('cabin_id'));
        $files = $request->file('files');
        $files = is_array($files) ? $files : [$request->file('file')];
        $baseSortOrder = $request->integer('sort_order', 0);

        $mediaItems = collect($files)
            ->filter(fn ($file) => $file instanceof UploadedFile)
            ->values()
            ->map(function (UploadedFile $file, int $index) use ($request, $cabin, $baseSortOrder): CabinMedia {
                $upload = $this->uploadService->upload($file, 'cabins/media');
                $type = $request->type ?: (str_starts_with((string) $upload['mime_type'], 'video/') ? 'video' : 'image');

                return CabinMedia::create([
                    'cabin_id'      => $cabin->id,
                    'cabin_type_id' => $cabin->cabin_type_id,
                    'url'           => $upload['url'],
                    'path'          => $upload['path'],
                    'alt'           => $request->alt,
                    'type'          => $type,
                    'mime_type'     => $upload['mime_type'],
                    'size_bytes'    => $upload['size_bytes'],
                    'sort_order'    => $baseSortOrder + $index,
                ]);
            });

        if ($mediaItems->count() === 1 && ! $request->hasFile('files')) {
            return response()->json([
                'data'    => new CabinMediaResource($mediaItems->first()->load('cabin')),
                'message' => 'Archivo subido.',
            ], 201);
        }

        $mediaItems->each->load('cabin');

        return response()->json([
            'data'    => CabinMediaResource::collection($mediaItems)->resolve(),
            'message' => 'Archivos subidos.',
        ], 201);
    }

    public function update(UpdateCabinMediaRequest $request, CabinMedia $cabinMedia): JsonResponse
    {
        $cabinMedia->update($request->validated());

        return response()->json([
            'data'    => new CabinMediaResource($cabinMedia->fresh()->load('cabin')),
            'message' => 'Archivo actualizado.',
        ]);
    }

    public function destroy(CabinMedia $cabinMedia): JsonResponse
    {
        if ($cabinMedia->path) {
            $this->uploadService->delete($cabinMedia->path);
        }

        $cabinMedia->delete();

        return response()->json([
            'message' => 'Archivo eliminado.',
        ]);
    }
}
