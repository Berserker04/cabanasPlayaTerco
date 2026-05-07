<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreGalleryAlbumRequest;
use App\Http\Requests\Admin\UpdateGalleryAlbumRequest;
use App\Http\Resources\GalleryAlbumResource;
use App\Models\GalleryAlbum;
use App\Models\GalleryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GalleryAlbumController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $albums = GalleryAlbum::query()
            ->with('coverItem')
            ->withCount(['items', 'activeItems', 'images', 'videos'])
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->category))
            ->when($request->filled('is_active'), fn ($query) => $query->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('featured'), fn ($query) => $query->where('is_featured', $request->boolean('featured')))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search) {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('slug', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('is_featured')
            ->orderBy('sort_order')
            ->orderBy('title')
            ->get();

        return response()->json([
            'data' => GalleryAlbumResource::collection($albums),
        ]);
    }

    public function store(StoreGalleryAlbumRequest $request): JsonResponse
    {
        $album = GalleryAlbum::create($request->validated());

        return response()->json([
            'data'    => new GalleryAlbumResource($this->loadForResponse($album)),
            'message' => 'Album de galeria creado.',
        ], 201);
    }

    public function show(GalleryAlbum $galleryAlbum): JsonResponse
    {
        return response()->json([
            'data' => new GalleryAlbumResource($this->loadForResponse($galleryAlbum)),
        ]);
    }

    public function update(UpdateGalleryAlbumRequest $request, GalleryAlbum $galleryAlbum): JsonResponse
    {
        $payload = $request->validated();

        if (! empty($payload['cover_gallery_item_id'])) {
            abort_if(
                GalleryItem::query()
                    ->whereKey($payload['cover_gallery_item_id'])
                    ->where('gallery_album_id', $galleryAlbum->id)
                    ->doesntExist(),
                422,
                'La portada debe pertenecer al album seleccionado.'
            );
        }

        $galleryAlbum->update($payload);

        return response()->json([
            'data'    => new GalleryAlbumResource($this->loadForResponse($galleryAlbum->fresh())),
            'message' => 'Album de galeria actualizado.',
        ]);
    }

    public function destroy(GalleryAlbum $galleryAlbum): JsonResponse
    {
        $galleryAlbum->delete();

        return response()->json([
            'message' => 'Album de galeria eliminado.',
        ]);
    }

    private function loadForResponse(GalleryAlbum $galleryAlbum): GalleryAlbum
    {
        return $galleryAlbum
            ->load('coverItem')
            ->loadCount(['items', 'activeItems', 'images', 'videos']);
    }
}
