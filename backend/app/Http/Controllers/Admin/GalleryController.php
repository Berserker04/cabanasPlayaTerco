<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreGalleryItemRequest;
use App\Http\Requests\Admin\UpdateGalleryItemRequest;
use App\Http\Resources\GalleryItemResource;
use App\Models\GalleryAlbum;
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
        $perPage = min($request->integer('per_page', 60), 100);

        $items = GalleryItem::query()
            ->with(['album', 'uploader'])
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->category))
            ->when($request->filled('map_point'), fn ($query) => $query->where('map_point', $request->map_point))
            ->when($request->filled('album_id'), fn ($query) => $query->where('gallery_album_id', $request->integer('album_id')))
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->type))
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('featured'), fn ($query) => $query->where('is_featured', $request->boolean('featured')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search) {
                    $query->where('alt', 'like', "%{$search}%")
                        ->orWhere('caption', 'like', "%{$search}%")
                        ->orWhereHas('album', fn ($albumQuery) => $albumQuery->where('title', 'like', "%{$search}%"));
                });
            })
            ->orderBy('sort_order')
            ->orderByDesc('is_featured')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'data' => GalleryItemResource::collection($items),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page'    => $items->lastPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
            ],
        ]);
    }

    public function store(StoreGalleryItemRequest $request): JsonResponse
    {
        $upload = $this->uploadService->uploadWithThumbnail($request->file('file'), 'gallery');

        $item = GalleryItem::create([
            'gallery_album_id' => $request->filled('gallery_album_id') ? $request->integer('gallery_album_id') : null,
            'map_point'        => $request->map_point,
            'url'              => $upload['url'],
            'path'             => $upload['path'],
            'thumbnail_url'    => $upload['thumbnail_url'],
            'thumbnail_path'   => $upload['thumbnail_path'],
            'alt'              => $request->alt,
            'caption'          => $request->caption,
            'category'         => $request->category,
            'type'             => str_starts_with((string) $upload['mime_type'], 'video/') ? 'video' : 'image',
            'mime_type'        => $upload['mime_type'],
            'size_bytes'       => $upload['size_bytes'],
            'sort_order'       => $request->integer('sort_order', 0),
            'is_featured'      => $request->boolean('is_featured'),
            'is_active'        => $request->boolean('is_active', true),
            'uploaded_by'      => $request->user()->id,
        ]);

        GalleryAlbum::query()
            ->whereKey($item->gallery_album_id)
            ->whereNull('cover_gallery_item_id')
            ->update(['cover_gallery_item_id' => $item->id]);

        return response()->json([
            'data'    => new GalleryItemResource($item->load(['album', 'uploader'])),
            'message' => 'Elemento de galeria subido.',
        ], 201);
    }

    public function update(UpdateGalleryItemRequest $request, GalleryItem $galleryItem): JsonResponse
    {
        $oldAlbumId = $galleryItem->gallery_album_id;

        $galleryItem->update($request->validated());

        if ($oldAlbumId && $oldAlbumId !== $galleryItem->gallery_album_id) {
            GalleryAlbum::query()
                ->whereKey($oldAlbumId)
                ->where('cover_gallery_item_id', $galleryItem->id)
                ->update(['cover_gallery_item_id' => null]);
        }

        GalleryAlbum::query()
            ->whereKey($galleryItem->gallery_album_id)
            ->whereNull('cover_gallery_item_id')
            ->update(['cover_gallery_item_id' => $galleryItem->id]);

        return response()->json([
            'data'    => new GalleryItemResource($galleryItem->fresh()->load(['album', 'uploader'])),
            'message' => 'Elemento de galeria actualizado.',
        ]);
    }

    public function destroy(GalleryItem $galleryItem): JsonResponse
    {
        $this->deleteStoredFiles($galleryItem);
        $galleryItem->delete();

        return response()->json([
            'message' => 'Elemento de galeria eliminado.',
        ]);
    }

    private function deleteStoredFiles(GalleryItem $galleryItem): void
    {
        if ($galleryItem->path) {
            $this->uploadService->delete($galleryItem->path);
        }

        if ($galleryItem->thumbnail_path && $galleryItem->thumbnail_path !== $galleryItem->path) {
            $this->uploadService->delete($galleryItem->thumbnail_path);
        }
    }
}
