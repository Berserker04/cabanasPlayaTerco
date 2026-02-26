<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\CommentResource;
use App\Http\Resources\PostResource;
use App\Http\Resources\TagResource;
use App\Models\Category;
use App\Models\Post;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $posts = Post::query()
            ->published()
            ->with(['author', 'categories', 'tags'])
            ->withCount('comments')
            ->when($request->category, fn ($q, $cat) => $q->whereHas('categories', fn ($cq) => $cq->where('slug', $cat)))
            ->when($request->tag, fn ($q, $tag) => $q->whereHas('tags', fn ($tq) => $tq->where('slug', $tag)))
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->latest('published_at')
            ->paginate(12);

        return response()->json([
            'data' => PostResource::collection($posts),
            'meta' => [
                'current_page' => $posts->currentPage(),
                'per_page'     => $posts->perPage(),
                'total'        => $posts->total(),
            ],
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $post = Post::query()
            ->where('slug', $slug)
            ->published()
            ->with(['author', 'categories', 'tags', 'comments' => fn ($q) => $q->approved()->with('user', 'replies')])
            ->firstOrFail();

        return response()->json([
            'data' => new PostResource($post),
        ]);
    }

    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->withCount('posts')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => CategoryResource::collection($categories),
        ]);
    }

    public function tags(): JsonResponse
    {
        $tags = Tag::query()
            ->withCount('posts')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => TagResource::collection($tags),
        ]);
    }

    public function storeComment(Post $post, StoreCommentRequest $request): JsonResponse
    {
        $comment = $post->comments()->create([
            'user_id'     => $request->user()->id,
            'author_name' => $request->user()->name,
            'body'        => $request->body,
            'parent_id'   => $request->parent_id,
            'status'      => 'pending',
        ]);

        return response()->json([
            'data'    => new CommentResource($comment->load('user')),
            'message' => 'Comentario enviado. Será revisado antes de publicarse.',
        ], 201);
    }
}
