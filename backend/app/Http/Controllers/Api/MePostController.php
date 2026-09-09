<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMePostRequest;
use App\Http\Requests\StorePostMediaRequest;
use App\Http\Requests\UpdateMePostRequest;
use App\Http\Resources\PostMediaResource;
use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Models\PostMedia;
use App\Services\FileUploadService;
use App\Services\PostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;

class MePostController extends Controller
{
    public function __construct(private readonly FileUploadService $uploads, private readonly PostService $posts) {}

    public function index(Request $request): JsonResponse
    {
        $posts = Post::query()->where('user_id', $request->user()->id)
            ->with(['author', 'categories', 'tags', 'media'])->withCount('comments')
            ->when($request->status, fn ($query, $status) => $query->where('status', $status))
            ->when($request->search, fn ($query, $search) => $query->where(fn ($query) => $query
                ->where('title', 'like', "%{$search}%")->orWhere('summary', 'like', "%{$search}%")))
            ->latest('updated_at')->orderByDesc('id')->paginate(max(1, min($request->integer('per_page', 12), 50)));

        return response()->json(['data' => PostResource::collection($posts), 'meta' => [
            'current_page' => $posts->currentPage(), 'last_page' => $posts->lastPage(),
            'per_page' => $posts->perPage(), 'total' => $posts->total(),
        ]]);
    }

    public function show(Request $request, Post $post): JsonResponse
    {
        $this->ensureOwnsPost($request, $post);

        return response()->json(['data' => new PostResource($post->load(['author', 'categories', 'tags', 'media'])->loadCount('comments'))]);
    }

    public function storeMedia(StorePostMediaRequest $request): JsonResponse
    {
        $file = $request->file('file');
        abort_unless($file instanceof UploadedFile, 422, 'Archivo inválido.');
        $upload = $this->uploads->upload($file, 'posts/media');
        $media = PostMedia::create([
            'user_id' => $request->user()->id,
            'url' => $upload['url'], 'path' => $upload['path'],
            'mime_type' => $upload['mime_type'], 'size_bytes' => $upload['size_bytes'],
            'type' => str_starts_with((string) $upload['mime_type'], 'video/') ? 'video' : 'image',
            'alt' => $request->string('alt')->toString() ?: null,
        ]);

        return response()->json(['data' => new PostMediaResource($media), 'message' => 'Archivo subido.'], 201);
    }

    public function destroyMedia(Request $request, PostMedia $postMedia): JsonResponse
    {
        $this->posts->discardUpload($postMedia, $request->user()->id);

        return response()->json(['message' => 'Carga descartada.']);
    }

    public function store(StoreMePostRequest $request): JsonResponse
    {
        $post = $this->posts->save($request->validated(), $request->user());

        return response()->json(['data' => new PostResource($post),
            'message' => $post->status->value === 'draft' ? 'Borrador guardado.' : 'Blog publicado.'], 201);
    }

    public function update(UpdateMePostRequest $request, Post $post): JsonResponse
    {
        $this->ensureOwnsPost($request, $post);
        $post = $this->posts->save($request->validated(), $request->user(), $post);

        return response()->json(['data' => new PostResource($post), 'message' => 'Cambios guardados.']);
    }

    public function destroy(Request $request, Post $post): JsonResponse
    {
        $this->ensureOwnsPost($request, $post);
        $this->posts->delete($post);

        return response()->json(['message' => 'Blog y comentarios eliminados.']);
    }

    private function ensureOwnsPost(Request $request, Post $post): void
    {
        abort_unless((int) $post->user_id === (int) $request->user()->id, 403, 'No puedes administrar este blog.');
    }
}
