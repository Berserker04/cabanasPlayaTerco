<?php

namespace App\Http\Controllers\Api;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use App\Services\ReviewMediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function __construct(
        private readonly ReviewMediaService $mediaService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min($request->integer('per_page', 9), 30));

        $reviews = Review::query()
            ->approved()
            ->with(['author', 'media', 'responder'])
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'data' => ReviewResource::collection($reviews),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                ...$this->publicStats(),
            ],
        ]);
    }

    public function latest(): JsonResponse
    {
        $reviews = Review::query()
            ->approved()
            ->with(['author', 'media', 'responder'])
            ->latest()
            ->take(3)
            ->get();

        return response()->json([
            'data' => ReviewResource::collection($reviews),
        ]);
    }

    public function store(StoreReviewRequest $request): JsonResponse
    {
        $user = $request->user();

        $review = $this->mediaService->create([
            'user_id' => $user->id,
            'reservation_id' => $request->validated('reservation_id'),
            'author_name' => $user->name,
            'author_email' => $user->email,
            'rating' => $request->integer('rating'),
            'title' => $request->string('title')->toString() ?: null,
            'body' => $request->string('body')->toString(),
            'status' => ReviewStatus::Approved,
            'approved_at' => now(),
        ], $request->file('images', []));

        return response()->json([
            'data' => new ReviewResource($review->load(['author', 'media'])),
            'message' => 'Reseña publicada. Gracias por compartir tu experiencia.',
        ], 201);
    }

    private function publicStats(): array
    {
        $counts = Review::query()
            ->approved()
            ->selectRaw('rating, COUNT(*) as total')
            ->groupBy('rating')
            ->pluck('total', 'rating');

        return [
            'average_rating' => round((float) (Review::query()->approved()->avg('rating') ?? 0), 1),
            'rating_counts' => collect(range(1, 5))
                ->mapWithKeys(fn (int $rating) => [(string) $rating => (int) ($counts[$rating] ?? 0)])
                ->all(),
        ];
    }
}
