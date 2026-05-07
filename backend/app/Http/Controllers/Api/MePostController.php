<?php

namespace App\Http\Controllers\Api;

use App\Enums\PostStatus;
use App\Enums\PostType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMePostRequest;
use App\Http\Requests\StorePostMediaRequest;
use App\Http\Requests\UpdateMePostRequest;
use App\Http\Resources\PostMediaResource;
use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Models\PostMedia;
use App\Models\Tag;
use App\Services\FileUploadService;
use App\Services\HtmlSanitizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MePostController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService,
        private readonly HtmlSanitizer $sanitizer,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $posts = Post::query()
            ->where('user_id', $request->user()->id)
            ->with(['author', 'categories', 'tags', 'media'])
            ->withCount('comments')
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => PostResource::collection($posts),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ],
        ]);
    }

    public function storeMedia(StorePostMediaRequest $request): JsonResponse
    {
        $file = $request->file('file');
        abort_unless($file instanceof UploadedFile, 422, 'Archivo invalido.');

        $upload = $this->uploadService->upload($file, 'posts/media');
        $type = str_starts_with((string) $upload['mime_type'], 'video/') ? 'video' : 'image';

        $media = PostMedia::create([
            'user_id' => $request->user()->id,
            'url' => $upload['url'],
            'path' => $upload['path'],
            'mime_type' => $upload['mime_type'],
            'size_bytes' => $upload['size_bytes'],
            'type' => $type,
            'alt' => $request->string('alt')->toString() ?: null,
        ]);

        return response()->json([
            'data' => new PostMediaResource($media),
            'message' => 'Archivo subido.',
        ], 201);
    }

    public function store(StoreMePostRequest $request): JsonResponse
    {
        $data = $request->validated();

        $post = DB::transaction(function () use ($data, $request): Post {
            $body = $this->sanitizeBody($data['body']);

            $post = Post::create([
                'user_id' => $request->user()->id,
                'type' => PostType::Experience,
                'title' => $data['title'],
                'slug' => $this->uniqueSlug($data['title']),
                'excerpt' => $data['excerpt'] ?? $this->sanitizer->plainText($body, 180),
                'summary' => $data['summary'] ?? $this->sanitizer->plainText($body, 360),
                'body' => $body,
                'featured_image' => $data['featured_image'] ?? null,
                'status' => PostStatus::Published,
                'published_at' => now(),
                'visit_date' => $data['visit_date'] ?? null,
                'travel_style' => $data['travel_style'] ?? null,
                'meta_title' => $data['title'],
                'meta_description' => $data['summary'] ?? $data['excerpt'] ?? $this->sanitizer->plainText($body, 155),
            ]);

            $this->syncTaxonomy($post, $data);
            $media = $this->syncMedia($post, $data, $request->user()->id);
            $this->applyCover($post, $data, $media);

            return $post;
        });

        return response()->json([
            'data' => new PostResource($post->fresh()->load(['author', 'categories', 'tags', 'media'])),
            'message' => 'Blog publicado.',
        ], 201);
    }

    public function update(UpdateMePostRequest $request, Post $post): JsonResponse
    {
        $this->ensureOwnsPost($request, $post);
        $data = $request->validated();

        $post = DB::transaction(function () use ($data, $post, $request): Post {
            $payload = Arr::only($data, [
                'title',
                'excerpt',
                'summary',
                'featured_image',
                'visit_date',
                'travel_style',
            ]);

            if (array_key_exists('body', $data)) {
                $payload['body'] = $this->sanitizeBody($data['body']);
                $payload['meta_description'] = $data['summary']
                    ?? $data['excerpt']
                    ?? $this->sanitizer->plainText($payload['body'], 155);
            }

            if (array_key_exists('title', $data)) {
                $payload['meta_title'] = $data['title'];
            }

            $payload['status'] = PostStatus::Published;
            $payload['published_at'] = $post->published_at ?? now();

            $post->update($payload);
            $this->syncTaxonomy($post, $data);

            $media = array_key_exists('media_ids', $data) || array_key_exists('cover_media_id', $data)
                ? $this->syncMedia($post, $data, $request->user()->id)
                : $post->media;

            $this->applyCover($post, $data, $media);

            return $post;
        });

        return response()->json([
            'data' => new PostResource($post->fresh()->load(['author', 'categories', 'tags', 'media'])),
            'message' => 'Blog actualizado.',
        ]);
    }

    public function destroy(Request $request, Post $post): JsonResponse
    {
        $this->ensureOwnsPost($request, $post);

        $post->load('media');
        $post->media->each(fn (PostMedia $media) => $this->deleteMediaFile($media));
        $post->delete();

        return response()->json([
            'message' => 'Blog eliminado.',
        ]);
    }

    private function ensureOwnsPost(Request $request, Post $post): void
    {
        abort_unless((int) $post->user_id === (int) $request->user()->id, 403, 'No puedes administrar este blog.');
    }

    private function sanitizeBody(string $body): string
    {
        $sanitized = $this->sanitizer->sanitize($body);

        if ($this->sanitizer->plainText($sanitized, 10000) === '') {
            throw ValidationException::withMessages([
                'body' => ['El contenido no puede quedar vacio.'],
            ]);
        }

        return $sanitized;
    }

    private function uniqueSlug(string $title, ?Post $ignore = null): string
    {
        $base = Str::slug($title) ?: 'experiencia';
        $slug = $base;
        $counter = 2;

        while (Post::query()
            ->where('slug', $slug)
            ->when($ignore, fn ($query) => $query->whereKeyNot($ignore->id))
            ->exists()) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }

        return $slug;
    }

    private function syncTaxonomy(Post $post, array $data): void
    {
        if (array_key_exists('category_ids', $data)) {
            $post->categories()->sync($data['category_ids'] ?? []);
        }

        if (! array_key_exists('tag_ids', $data) && ! array_key_exists('tag_names', $data)) {
            return;
        }

        $tagIds = collect($data['tag_ids'] ?? []);

        $nameIds = collect($data['tag_names'] ?? [])
            ->map(fn (string $name) => trim($name))
            ->filter()
            ->unique(fn (string $name) => Str::lower($name))
            ->map(function (string $name): int {
                $slug = Str::slug($name);

                if ($slug === '') {
                    return 0;
                }

                return Tag::firstOrCreate(
                    ['slug' => $slug],
                    ['name' => Str::headline($name)],
                )->id;
            })
            ->filter();

        $post->tags()->sync($tagIds->merge($nameIds)->unique()->values()->all());
    }

    private function syncMedia(Post $post, array $data, int $userId): Collection
    {
        $mediaIds = collect($data['media_ids'] ?? []);

        if (! empty($data['cover_media_id'])) {
            $mediaIds->push((int) $data['cover_media_id']);
        }

        $mediaIds = $mediaIds->unique()->values();

        if ($mediaIds->count() > 20) {
            throw ValidationException::withMessages([
                'media_ids' => ['Cada blog puede tener hasta 20 archivos multimedia.'],
            ]);
        }

        $media = PostMedia::query()
            ->where('user_id', $userId)
            ->whereIn('id', $mediaIds)
            ->where(function ($query) use ($post) {
                $query->whereNull('post_id')
                    ->orWhere('post_id', $post->id);
            })
            ->get();

        if ($media->count() !== $mediaIds->count()) {
            throw ValidationException::withMessages([
                'media_ids' => ['Uno o mas archivos no pertenecen a tu cuenta.'],
            ]);
        }

        PostMedia::query()
            ->where('post_id', $post->id)
            ->where('user_id', $userId)
            ->when($mediaIds->isNotEmpty(), fn ($query) => $query->whereNotIn('id', $mediaIds))
            ->update(['post_id' => null, 'sort_order' => 0]);

        $mediaIds->each(function (int $id, int $index) use ($post): void {
            PostMedia::query()
                ->whereKey($id)
                ->update([
                    'post_id' => $post->id,
                    'sort_order' => $index,
                ]);
        });

        $post->update(['media_count' => $mediaIds->count()]);

        return PostMedia::query()
            ->whereIn('id', $mediaIds)
            ->orderBy('sort_order')
            ->get();
    }

    private function applyCover(Post $post, array $data, Collection $media): void
    {
        if (! array_key_exists('cover_media_id', $data) && $post->featured_image) {
            return;
        }

        $cover = ! empty($data['cover_media_id'])
            ? $media->firstWhere('id', (int) $data['cover_media_id'])
            : $media->firstWhere('type', 'image');

        if (! $cover instanceof PostMedia) {
            return;
        }

        $post->update([
            'featured_image' => $cover->url,
            'cover_image_path' => $cover->path,
        ]);
    }

    private function deleteMediaFile(PostMedia $media): void
    {
        if ($media->path) {
            $this->uploadService->delete($media->path);
        }
    }
}
