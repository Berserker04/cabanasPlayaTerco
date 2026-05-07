<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Comment;
use App\Models\Post;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $comments = Comment::query()
            ->with(['user', 'commentable'])
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->post_id, fn ($q, $postId) => $q
                ->where('commentable_type', Post::class)
                ->where('commentable_id', $postId))
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => CommentResource::collection($comments),
            'meta' => [
                'current_page' => $comments->currentPage(),
                'per_page'     => $comments->perPage(),
                'total'        => $comments->total(),
            ],
        ]);
    }

    public function update(UpdateCommentRequest $request, Comment $comment): JsonResponse
    {
        $comment->update($request->validated());

        return response()->json([
            'data'    => new CommentResource($comment->fresh()->load('user')),
            'message' => 'Comentario actualizado.',
        ]);
    }

    public function destroy(Comment $comment): JsonResponse
    {
        $comment->delete();

        return response()->json([
            'message' => 'Comentario eliminado.',
        ]);
    }
}
