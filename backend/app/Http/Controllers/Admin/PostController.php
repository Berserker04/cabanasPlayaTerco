<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePostRequest;
use App\Http\Requests\Admin\UpdatePostRequest;
use App\Http\Resources\PostResource;
use App\Models\Post;
use App\Services\PostService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function __construct(private readonly PostService $posts) {}

    public function index(Request $request): JsonResponse
    {
        $posts = Post::query()->with(['author', 'categories', 'tags', 'media'])->withCount('comments')
            ->when($request->status, fn ($query, $status) => $query->where('status', $status))
            ->when($request->type, fn ($query, $type) => $query->where('type', $type))
            ->when($request->search, fn ($query, $search) => $query->where(fn ($query) => $query
                ->where('title', 'like', "%{$search}%")->orWhere('summary', 'like', "%{$search}%")
                ->orWhere('body', 'like', "%{$search}%")->orWhereHas('author', fn ($author) => $author->where('name', 'like', "%{$search}%"))))
            ->latest('updated_at')->orderByDesc('id')->paginate(max(1, min($request->integer('per_page', 20), 100)));

        return response()->json(['data' => PostResource::collection($posts), 'meta' => [
            'current_page' => $posts->currentPage(), 'last_page' => $posts->lastPage(),
            'per_page' => $posts->perPage(), 'total' => $posts->total(),
        ]]);
    }

    public function show(Post $post): JsonResponse
    {
        return response()->json(['data' => new PostResource($post->load(['author', 'categories', 'tags', 'media'])->loadCount('comments'))]);
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $post = $this->posts->save($request->validated(), $request->user(), admin: true);

        return response()->json(['data' => new PostResource($post), 'message' => 'Publicación guardada.'], 201);
    }

    public function update(UpdatePostRequest $request, Post $post): JsonResponse
    {
        $post = $this->posts->save($request->validated(), $request->user(), $post, true);

        return response()->json(['data' => new PostResource($post), 'message' => 'Cambios guardados.']);
    }

    public function destroy(Post $post): JsonResponse
    {
        $this->posts->delete($post);

        return response()->json(['message' => 'Publicación y comentarios eliminados.']);
    }
}
