<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\GalleryAlbumResource;
use App\Models\GalleryAlbum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GalleryAlbumController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $albums = GalleryAlbum::query()
            ->with('coverItem')
            ->withCount([
                'activeItems as items_count',
                'activeItems',
                'activeItems as images_count' => fn ($query) => $query->where('type', 'image'),
                'activeItems as videos_count' => fn ($query) => $query->where('type', 'video'),
            ])
            ->active()
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->category))
            ->when($request->filled('featured'), fn ($query) => $query->where('is_featured', $request->boolean('featured')))
            ->orderByDesc('is_featured')
            ->orderBy('sort_order')
            ->orderBy('title')
            ->get();

        return response()->json([
            'data' => GalleryAlbumResource::collection($albums),
        ]);
    }

    public function show(GalleryAlbum $galleryAlbum): JsonResponse
    {
        abort_unless($galleryAlbum->is_active, 404);

        $galleryAlbum->load([
            'coverItem',
            'activeItems' => fn ($query) => $query
                ->orderBy('sort_order')
                ->orderByDesc('is_featured')
                ->orderByDesc('created_at'),
        ])->loadCount([
            'activeItems as items_count',
            'activeItems',
            'activeItems as images_count' => fn ($query) => $query->where('type', 'image'),
            'activeItems as videos_count' => fn ($query) => $query->where('type', 'video'),
        ]);

        return response()->json([
            'data' => new GalleryAlbumResource($galleryAlbum),
        ]);
    }
}
