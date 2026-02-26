<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreGalleryItemRequest;
use App\Http\Requests\Admin\UpdateGalleryItemRequest;
use App\Http\Resources\GalleryItemResource;
use App\Models\GalleryItem;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GalleryController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $items = GalleryItem::query()
            ->with('uploader')
            ->when($request->category, fn ($q, $cat) => $q->where('category', $cat))
            ->orderBy('sort_order')
            ->paginate(24);

        return response()->json([
            'data' => GalleryItemResource::collection($items),
            'meta' => [
                'current_page' => $items->currentPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
            ],
        ]);
    }

    public function store(StoreGalleryItemRequest $request): JsonResponse
    {
        $upload = $this->uploadService->uploadWithThumbnail($request->file('file'), 'gallery');

        $item = GalleryItem::create([
            'url'           => $upload['url'],
            'thumbnail_url' => $upload['thumbnail_url'],
            'alt'           => $request->alt,
            'caption'       => $request->caption,
            'category'      => $request->category,
            'type'          => str_starts_with($upload['mime_type'], 'video/') ? 'video' : 'image',
            'sort_order'    => $request->sort_order ?? 0,
            'is_featured'   => $request->boolean('is_featured'),
            'uploaded_by'   => $request->user()->id,
        ]);

        return response()->json([
            'data'    => new GalleryItemResource($item),
            'message' => 'Elemento de galería subido.',
        ], 201);
    }

    public function update(UpdateGalleryItemRequest $request, GalleryItem $galleryItem): JsonResponse
    {
        $galleryItem->update($request->validated());

        return response()->json([
            'data'    => new GalleryItemResource($galleryItem->fresh()),
            'message' => 'Elemento de galería actualizado.',
        ]);
    }

    public function destroy(GalleryItem $galleryItem): JsonResponse
    {
        $galleryItem->delete();

        return response()->json([
            'message' => 'Elemento de galería eliminado.',
        ]);
    }
}
