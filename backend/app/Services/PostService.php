<?php

namespace App\Services;

use App\Enums\PostStatus;
use App\Enums\PostType;
use App\Models\Post;
use App\Models\PostMedia;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class PostService
{
    public function __construct(private readonly HtmlSanitizer $sanitizer, private readonly FileUploadService $uploads) {}

    public function save(array $data, User $actor, ?Post $post = null, bool $admin = false): Post
    {
        return DB::transaction(function () use ($data, $actor, $post, $admin): Post {
            $creating = $post === null;
            if ($post) {
                $post = Post::query()->lockForUpdate()->findOrFail($post->id);
            }
            $status = PostStatus::from($data['status'] ?? $post?->status?->value ?? ($admin ? 'draft' : 'published'));
            if (! $admin && (($post?->status === PostStatus::Archived && $status !== PostStatus::Archived)
                || ($post?->status !== PostStatus::Archived && $status === PostStatus::Archived))) {
                throw ValidationException::withMessages(['status' => ['Solo administración puede archivar o reactivar esta publicación.']]);
            }
            $title = trim($data['title'] ?? $post?->title ?? '');
            $body = $this->sanitizer->sanitize(array_key_exists('body', $data) ? ($data['body'] ?? '') : ($post?->body ?? ''));
            $errors = [];
            if (mb_strlen($title) < ($status === PostStatus::Published ? 5 : 1)) {
                $errors['title'] = [$status === PostStatus::Published ? 'El título debe tener al menos 5 caracteres para publicar.' : 'Escribe un título para guardar el borrador.'];
            }
            if ($status === PostStatus::Published && mb_strlen($this->sanitizer->plainText($body, 10000)) < 20) {
                $errors['body'] = ['El contenido debe tener al menos 20 caracteres de texto para publicar.'];
            }
            if ($errors) {
                throw ValidationException::withMessages($errors);
            }
            $payload = Arr::only($data, ['excerpt', 'summary', 'featured_image', 'visit_date', 'travel_style']);
            if ($admin) {
                $payload += Arr::only($data, ['type', 'meta_title', 'meta_description']);
            }
            $payload = array_merge($payload, [
                'title' => $title, 'body' => $body, 'status' => $status,
                'published_at' => $post?->published_at ?? ($status === PostStatus::Published ? now() : null),
            ]);
            foreach (['excerpt' => 180, 'summary' => 360] as $field => $limit) {
                if (! $post || (array_key_exists($field, $data) && ! $data[$field])) {
                    $payload[$field] = $data[$field] ?? $this->sanitizer->plainText($body, $limit);
                }
            }
            if (! $admin || ! $post) {
                $payload['meta_title'] = $data['meta_title'] ?? $title;
                $payload['meta_description'] = $data['meta_description'] ?? $this->sanitizer->plainText($data['summary'] ?? $data['excerpt'] ?? $body, 155);
            }
            if ($post) {
                $post->update($payload);
            } else {
                $post = Post::create($payload + [
                    'user_id' => $actor->id,
                    'type' => $admin ? ($data['type'] ?? PostType::Article) : PostType::Experience,
                    'slug' => $this->uniqueSlug($data['slug'] ?? $title),
                ]);
            }
            $this->syncTaxonomy($post, $data);
            $this->syncMedia($post, $data, $actor->id, $creating);

            return $post->fresh()->load(['author', 'categories', 'tags', 'media'])->loadCount('comments');
        });
    }

    private function uniqueSlug(string $title): string
    {
        $base = Str::limit(Str::slug($title) ?: 'experiencia', 230, '');
        $slug = $base;
        $counter = 2;
        // Soft-deleted records still participate in the database unique constraint.
        while (Post::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.$counter++;
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
        $ids = collect($data['tag_ids'] ?? []);
        foreach (collect($data['tag_names'] ?? [])->map(fn ($name) => trim($name))->filter()->unique(fn ($name) => Str::lower($name)) as $name) {
            if ($slug = Str::slug($name)) {
                $ids->push(Tag::firstOrCreate(['slug' => $slug], ['name' => $name])->id);
            }
        }
        $post->tags()->sync($ids->unique()->values()->all());
    }

    private function syncMedia(Post $post, array $data, int $actorId, bool $creating): void
    {
        $previous = $post->media()->get();
        $ids = collect($data['media_ids'] ?? $previous->modelKeys());
        if (! empty($data['cover_media_id'])) {
            $ids->push((int) $data['cover_media_id']);
        }
        $ids = $ids->unique()->values();
        $media = PostMedia::query()->whereIn('id', $ids)->where(function ($query) use ($post, $actorId): void {
            $query->where('post_id', $post->id)->orWhere(fn ($query) => $query->whereNull('post_id')->where('user_id', $actorId));
        })->lockForUpdate()->get();
        if ($ids->count() > 20 || $media->count() !== $ids->count()) {
            throw ValidationException::withMessages(['media_ids' => ['Selecciona hasta 20 archivos propios o ya vinculados a este blog.']]);
        }
        if (! empty($data['cover_media_id']) && $media->firstWhere('id', (int) $data['cover_media_id'])?->type !== 'image') {
            throw ValidationException::withMessages(['cover_media_id' => ['La portada debe ser una imagen.']]);
        }
        $removed = $previous->whereNotIn('id', $ids->all());
        // A client must remove body references before detaching managed files.
        foreach ($removed as $item) {
            if ($this->bodyReferences($post->body, $item->url)) {
                throw ValidationException::withMessages(['media_ids' => ['Quita también del contenido los archivos que quieres retirar.']]);
            }
        }
        foreach ($ids as $index => $id) {
            $item = $media->firstWhere('id', $id);
            $item->update([
                'post_id' => $post->id, 'sort_order' => $index,
                'alt' => array_key_exists($id, $data['media_alt'] ?? []) ? $data['media_alt'][$id] : $item->alt,
            ]);
        }
        $coverChanges = [];
        if (array_key_exists('cover_media_id', $data)) {
            $cover = $media->firstWhere('id', (int) $data['cover_media_id']);
            $coverChanges = ['featured_image' => $cover?->url, 'cover_image_path' => $cover?->path];
        } elseif ($removed->contains('url', $post->featured_image)) {
            $coverChanges = ['featured_image' => null, 'cover_image_path' => null];
        } elseif (array_key_exists('featured_image', $data)) {
            $coverChanges = ['cover_image_path' => $media->firstWhere('url', $data['featured_image'])?->path];
        } elseif ($creating && ! $post->featured_image && ! array_key_exists('featured_image', $data)) {
            $cover = $media->firstWhere('type', 'image');
            $coverChanges = ['featured_image' => $cover?->url, 'cover_image_path' => $cover?->path];
        }
        $post->update($coverChanges + ['media_count' => $ids->count()]);
        PostMedia::whereIn('id', $removed->modelKeys())->update(['post_id' => null, 'sort_order' => 0]);
        DB::afterCommit(function () use ($removed): void {
            $removed->each(fn (PostMedia $item) => $this->cleanUnusedMedia($item));
        });
    }

    private function bodyReferences(string $body, string $url): bool
    {
        return str_contains(rawurldecode(html_entity_decode($body, ENT_QUOTES | ENT_HTML5, 'UTF-8')), rawurldecode($url));
    }

    public function delete(Post $post): void
    {
        DB::transaction(function () use ($post): void {
            $post = Post::query()->lockForUpdate()->findOrFail($post->id);
            $media = $post->media()->get();
            $post->comments()->delete();
            $post->delete();
            PostMedia::whereIn('id', $media->modelKeys())->update(['post_id' => null]);
            DB::afterCommit(function () use ($media): void {
                $media->each(fn (PostMedia $item) => $this->cleanUnusedMedia($item));
            });
        });
    }

    public function discardUpload(PostMedia $media, int $actorId): void
    {
        DB::transaction(function () use ($media, $actorId): void {
            $media = PostMedia::query()->lockForUpdate()->findOrFail($media->id);
            abort_unless((int) $media->user_id === $actorId, 403);
            abort_unless($media->post_id === null, 409, 'El archivo ya está vinculado a una publicación.');
            $this->cleanUnusedMedia($media, true);
        });
    }

    private function cleanUnusedMedia(PostMedia $media, bool $reportFailure = false): void
    {
        // Never turn a successful save into an error because storage cleanup failed.
        try {
            DB::transaction(function () use ($media): void {
                $fresh = PostMedia::query()->lockForUpdate()->find($media->id);
                if (! $fresh || $fresh->post_id !== null) {
                    return;
                }
                // HTMLPurifier percent-encodes Unicode paths; compare decoded references.
                $filename = basename(parse_url($media->url, PHP_URL_PATH) ?: $media->url);
                $referenced = Post::query()->where('featured_image', 'like', '%'.$filename.'%')
                    ->orWhere('body', 'like', '%'.$filename.'%')
                    ->cursor()->contains(fn (Post $post) => $this->bodyReferences($post->body, $media->url)
                        || rawurldecode($post->featured_image ?? '') === rawurldecode($media->url));
                $sharedPath = $media->path && PostMedia::where('path', $media->path)->whereKeyNot($media->id)->exists();
                if ($referenced || $sharedPath) {
                    return;
                }
                if ($media->path && ! $this->uploads->delete($media->path)) {
                    throw new \RuntimeException('No se pudo retirar el archivo del almacenamiento.');
                }
                $fresh->delete();
            });
        } catch (Throwable $exception) {
            report($exception);
            if ($reportFailure) {
                abort(503, 'No pudimos retirar el archivo. Intenta de nuevo.');
            }
        }
    }
}
