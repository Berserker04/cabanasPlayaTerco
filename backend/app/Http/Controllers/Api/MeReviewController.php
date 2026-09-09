<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReviewMediaRequest;
use App\Http\Requests\UpdateOwnReviewRequest;
use App\Http\Resources\ReviewMediaResource;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use App\Models\ReviewMedia;
use App\Services\FileUploadService;
use App\Services\ReviewMediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeReviewController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService,
        private readonly ReviewMediaService $mediaService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $reviews = Review::query()
            ->where('user_id', $request->user()->id)
            ->with(['media', 'author', 'responder'])
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => ReviewResource::collection($reviews),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }

    public function update(UpdateOwnReviewRequest $request, Review $review): JsonResponse
    {
        $this->ensureOwnsReview($request, $review);

        $review->update([
            'author_name' => $request->user()->name,
            'author_email' => $request->user()->email,
            'rating' => $request->integer('rating'),
            'title' => $request->string('title')->toString() ?: null,
            'body' => $request->string('body')->toString(),
        ]);

        return response()->json([
            'data' => new ReviewResource($review->fresh()->load(['author', 'media'])),
            'message' => 'Reseña actualizada.',
        ]);
    }

    public function destroy(Request $request, Review $review): JsonResponse
    {
        $this->ensureOwnsReview($request, $review);

        $review->load('media');
        $review->media->each(fn (ReviewMedia $media) => $this->deleteMediaFile($media));
        $review->delete();

        return response()->json([
            'message' => 'Reseña eliminada.',
        ]);
    }

    public function storeMedia(StoreReviewMediaRequest $request, Review $review): JsonResponse
    {
        $this->ensureOwnsReview($request, $review);

        $files = $request->file('images', []);
        $files = is_array($files) ? $files : [];
        $mediaItems = $this->mediaService->add($review, $files);

        return response()->json([
            'data' => ReviewMediaResource::collection($mediaItems)->resolve(),
            'message' => 'Fotos agregadas.',
        ], 201);
    }

    public function destroyMedia(Request $request, Review $review, ReviewMedia $media): JsonResponse
    {
        $this->ensureOwnsReview($request, $review);

        abort_unless((int) $media->review_id === (int) $review->id, 404);

        $this->deleteMediaFile($media);
        $media->delete();
        $review->touch();

        return response()->json([
            'message' => 'Foto eliminada.',
        ]);
    }

    private function ensureOwnsReview(Request $request, Review $review): void
    {
        abort_unless((int) $review->user_id === (int) $request->user()->id, 403, 'No puedes administrar esta reseña.');
    }

    private function deleteMediaFile(ReviewMedia $media): void
    {
        if ($media->path) {
            $this->uploadService->delete($media->path);
        }
    }
}
