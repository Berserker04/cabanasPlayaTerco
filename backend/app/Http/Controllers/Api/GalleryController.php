<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\GalleryItemResource;
use App\Models\GalleryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GalleryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->integer('per_page', 24), 60);
        $album = $request->input('album', $request->input('album_slug'));

        $items = GalleryItem::query()
            ->with(['album'])
            ->active()
            ->where(function ($query) {
                $query->whereNull('gallery_album_id')
                    ->orWhereHas('album', fn ($albumQuery) => $albumQuery->active());
            })
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->category))
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->type))
            ->when($request->filled('featured'), fn ($query) => $query->where('is_featured', $request->boolean('featured')))
            ->when($album, function ($query, $album) {
                if (is_numeric($album)) {
                    $query->where('gallery_album_id', (int) $album);

                    return;
                }

                $query->whereHas('album', fn ($albumQuery) => $albumQuery->where('slug', $album));
            }, function ($query) {
                $query->whereNull('gallery_album_id');
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
}
