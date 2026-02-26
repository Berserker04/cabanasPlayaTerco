<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use Illuminate\Http\JsonResponse;

class ReviewController extends Controller
{
    public function index(): JsonResponse
    {
        $reviews = Review::query()
            ->approved()
            ->with('media')
            ->latest()
            ->paginate(15);

        return response()->json([
            'data' => ReviewResource::collection($reviews),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'per_page'     => $reviews->perPage(),
                'total'        => $reviews->total(),
            ],
        ]);
    }

    public function latest(): JsonResponse
    {
        $reviews = Review::query()
            ->approved()
            ->with('media')
            ->latest()
            ->take(3)
            ->get();

        return response()->json([
            'data' => ReviewResource::collection($reviews),
        ]);
    }

    public function store(StoreReviewRequest $request): JsonResponse
    {
        $review = Review::create($request->validated());

        return response()->json([
            'data'    => new ReviewResource($review),
            'message' => 'Reseña enviada. Será revisada antes de publicarse.',
        ], 201);
    }
}
