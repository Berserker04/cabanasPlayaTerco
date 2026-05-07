<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCommentRequest;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\CommentResource;
use App\Http\Resources\PostResource;
use App\Http\Resources\TagResource;
use App\Models\Category;
use App\Models\Comment;
use App\Models\Post;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PostController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $perPage = min($request->integer('per_page', 12), 48);

        $posts = Post::query()
            ->published()
            ->with(['author', 'categories', 'tags', 'media'])
            ->withCount(['comments' => fn ($query) => $query->approved()])
            ->when($request->type, fn ($query, $type) => $query->where('type', $type))
            ->when($request->category, fn ($query, $category) => $query->whereHas('categories', fn ($categoryQuery) => $categoryQuery->where('slug', $category)))
            ->when($request->tag, fn ($query, $tag) => $query->whereHas('tags', fn ($tagQuery) => $tagQuery->where('slug', $tag)))
            ->when($request->search, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('title', 'like', "%{$search}%")
                        ->orWhere('excerpt', 'like', "%{$search}%")
                        ->orWhere('summary', 'like', "%{$search}%")
                        ->orWhere('body', 'like', "%{$search}%");
                });
            })
            ->latest('published_at')
            ->paginate($perPage);

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

    public function show(string $slug): JsonResponse
    {
        $post = Post::query()
            ->where('slug', $slug)
            ->published()
            ->with([
                'author',
                'categories',
                'tags',
                'media',
                'comments' => fn ($query) => $query
                    ->approved()
                    ->whereNull('parent_id')
                    ->with(['user', 'replies' => fn ($reply) => $reply->approved()->with('user')])
                    ->oldest(),
            ])
            ->firstOrFail();

        return response()->json([
            'data' => new PostResource($post),
        ]);
    }

    public function categories(): JsonResponse
    {
        $categories = Category::query()
            ->withCount(['posts' => fn ($query) => $query->published()])
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'data' => CategoryResource::collection($categories),
        ]);
    }

    public function tags(): JsonResponse
    {
        $tags = Tag::query()
            ->withCount(['posts' => fn ($query) => $query->published()])
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => TagResource::collection($tags),
        ]);
    }

    public function storeComment(Post $post, StoreCommentRequest $request): JsonResponse
    {
        abort_unless($post->status->value === 'published', 404);

        if ($request->parent_id) {
            $parentExists = Comment::query()
                ->whereKey($request->parent_id)
                ->where('commentable_type', Post::class)
                ->where('commentable_id', $post->id)
                ->exists();

            if (! $parentExists) {
                throw ValidationException::withMessages([
                    'parent_id' => ['El comentario padre no pertenece a este blog.'],
                ]);
            }
        }

        $comment = $post->comments()->create([
            'user_id' => $request->user()->id,
            'author_name' => $request->user()->name,
            'body' => $request->body,
            'parent_id' => $request->parent_id,
            'status' => 'approved',
        ]);

        return response()->json([
            'data' => new CommentResource($comment->load('user')),
            'message' => 'Comentario publicado.',
        ], 201);
    }
}
