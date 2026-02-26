<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePostRequest;
use App\Http\Requests\Admin\UpdatePostRequest;
use App\Http\Resources\PostResource;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $posts = Post::query()
            ->with(['author', 'categories', 'tags'])
            ->withCount('comments')
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => PostResource::collection($posts),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'per_page'     => $posts->perPage(),
                'total'        => $posts->total(),
            ],
        ]);
    }

    public function store(StorePostRequest $request): JsonResponse
    {
        $post = Post::create([
            ...$request->safe()->except('category_ids', 'tag_ids'),
            'user_id' => $request->user()->id,
        ]);

        if ($request->has('category_ids')) {
            $post->categories()->sync($request->category_ids);
        }

        if ($request->has('tag_ids')) {
            $post->tags()->sync($request->tag_ids);
        }

        return response()->json([
            'data'    => new PostResource($post->load('author', 'categories', 'tags')),
            'message' => 'Artículo creado.',
        ], 201);
    }

    public function update(UpdatePostRequest $request, Post $post): JsonResponse
    {
        $post->update($request->safe()->except('category_ids', 'tag_ids'));

        if ($request->has('category_ids')) {
            $post->categories()->sync($request->category_ids);
        }

        if ($request->has('tag_ids')) {
            $post->tags()->sync($request->tag_ids);
        }

        return response()->json([
            'data'    => new PostResource($post->fresh()->load('author', 'categories', 'tags')),
            'message' => 'Artículo actualizado.',
        ]);
    }

    public function destroy(Post $post): JsonResponse
    {
        $post->delete();

        return response()->json([
            'message' => 'Artículo eliminado.',
        ]);
    }
}
