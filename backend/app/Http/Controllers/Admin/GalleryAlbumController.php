<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreGalleryAlbumRequest;
use App\Http\Requests\Admin\UpdateGalleryAlbumRequest;
use App\Http\Resources\GalleryAlbumResource;
use App\Models\GalleryAlbum;
use App\Models\GalleryItem;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Throwable;

class GalleryAlbumController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService
    ) {}

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
        $uploadedPaths = [];

        try {
            $album = DB::transaction(function () use ($request, &$uploadedPaths): GalleryAlbum {
                $album = GalleryAlbum::create(Arr::except($request->validated(), [
                    'files',
                    'file_captions',
                    'file_alts',
                    'cover_index',
                ]));

                $files = $request->file('files', []);
                $files = is_array($files) ? $files : [];
                $captions = $request->input('file_captions', []);
                $alts = $request->input('file_alts', []);
                $createdItems = collect();

                foreach ($files as $index => $file) {
                    if (! $file instanceof UploadedFile) {
                        continue;
                    }

                    $upload = $this->uploadService->uploadWithThumbnail($file, 'gallery');
                    $uploadedPaths[] = $upload['path'];

                    if ($upload['thumbnail_path'] && $upload['thumbnail_path'] !== $upload['path']) {
                        $uploadedPaths[] = $upload['thumbnail_path'];
                    }

                    $createdItems->push(GalleryItem::create([
                        'gallery_album_id' => $album->id,
                        'url'              => $upload['url'],
                        'path'             => $upload['path'],
                        'thumbnail_url'    => $upload['thumbnail_url'],
                        'thumbnail_path'   => $upload['thumbnail_path'],
                        'alt'              => $alts[$index] ?? null,
                        'caption'          => $captions[$index] ?? null,
                        'category'         => $album->category,
                        'type'             => str_starts_with((string) $upload['mime_type'], 'video/') ? 'video' : 'image',
                        'mime_type'        => $upload['mime_type'],
                        'size_bytes'       => $upload['size_bytes'],
                        'sort_order'       => $index,
                        'is_featured'      => $album->is_featured && $index === 0,
                        'is_active'        => $album->is_active,
                        'uploaded_by'      => $request->user()->id,
                    ]));
                }

                if ($createdItems->isNotEmpty()) {
                    $coverIndex = $request->integer('cover_index', 0);
                    $album->update([
                        'cover_gallery_item_id' => $createdItems->get($coverIndex)?->id ?? $createdItems->first()->id,
                    ]);
                }

                return $album->fresh();
            });
        } catch (Throwable $exception) {
            foreach ($uploadedPaths as $path) {
                $this->uploadService->delete($path);
            }

            throw $exception;
        }

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
