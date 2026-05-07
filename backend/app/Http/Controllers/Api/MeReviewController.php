<?php

namespace App\Http\Controllers\Api;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReviewMediaRequest;
use App\Http\Requests\UpdateOwnReviewRequest;
use App\Http\Resources\ReviewMediaResource;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use App\Models\ReviewMedia;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MeReviewController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService
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
            ...$this->pendingModerationFields(),
        ]);

        return response()->json([
            'data' => new ReviewResource($review->fresh()->load(['author', 'media'])),
            'message' => 'Resena actualizada. Volvera a revision antes de publicarse.',
        ]);
    }

    public function destroy(Request $request, Review $review): JsonResponse
    {
        $this->ensureOwnsReview($request, $review);

        $review->load('media');
        $review->media->each(fn (ReviewMedia $media) => $this->deleteMediaFile($media));
        $review->delete();

        return response()->json([
            'message' => 'Resena eliminada.',
        ]);
    }

    public function storeMedia(StoreReviewMediaRequest $request, Review $review): JsonResponse
    {
        $this->ensureOwnsReview($request, $review);

        $files = $request->file('images', []);
        $files = is_array($files) ? $files : [];
        $currentCount = $review->media()->count();

        if ($currentCount + count($files) > 3) {
            throw ValidationException::withMessages([
                'images' => ['Solo puedes tener hasta 3 fotos por resena.'],
            ]);
        }

        $mediaItems = DB::transaction(function () use ($files, $review, $currentCount) {
            $mediaItems = collect($files)
                ->filter(fn ($file) => $file instanceof UploadedFile)
                ->values()
                ->map(function (UploadedFile $file, int $index) use ($review, $currentCount): ReviewMedia {
                    $upload = $this->uploadService->upload($file, 'reviews/media');

                    return ReviewMedia::create([
                        'review_id' => $review->id,
                        'url' => $upload['url'],
                        'path' => $upload['path'],
                        'alt' => $review->title ?: 'Foto de resena',
                        'mime_type' => $upload['mime_type'],
                        'size_bytes' => $upload['size_bytes'],
                        'sort_order' => $currentCount + $index,
                    ]);
                });

            $review->update($this->pendingModerationFields());

            return $mediaItems;
        });

        return response()->json([
            'data' => ReviewMediaResource::collection($mediaItems)->resolve(),
            'message' => 'Fotos agregadas. La resena volvera a revision.',
        ], 201);
    }

    public function destroyMedia(Request $request, Review $review, ReviewMedia $media): JsonResponse
    {
        $this->ensureOwnsReview($request, $review);

        abort_unless((int) $media->review_id === (int) $review->id, 404);

        $this->deleteMediaFile($media);
        $media->delete();
        $review->update($this->pendingModerationFields());

        return response()->json([
            'message' => 'Foto eliminada. La resena volvera a revision.',
        ]);
    }

    private function ensureOwnsReview(Request $request, Review $review): void
    {
        abort_unless((int) $review->user_id === (int) $request->user()->id, 403, 'No puedes administrar esta resena.');
    }

    private function pendingModerationFields(): array
    {
        return [
            'status' => ReviewStatus::Pending,
            'approved_at' => null,
            'approved_by' => null,
            'admin_response' => null,
            'responded_at' => null,
            'responded_by' => null,
        ];
    }

    private function deleteMediaFile(ReviewMedia $media): void
    {
        if ($media->path) {
            $this->uploadService->delete($media->path);
        }
    }
}
