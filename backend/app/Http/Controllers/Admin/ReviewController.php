<?php

namespace App\Http\Controllers\Admin;

use App\Enums\ReviewStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateReviewRequest;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use App\Models\ReviewMedia;
use App\Services\FileUploadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function __construct(
        private readonly FileUploadService $uploadService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min($request->integer('per_page', 20), 100));

        $reviews = Review::query()
            ->with(['media', 'author', 'responder'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->status))
            ->when($request->filled('search'), function ($query) use ($request) {
                $search = $request->string('search')->toString();

                $query->where(function ($query) use ($search) {
                    $query->where('author_name', 'like', "%{$search}%")
                        ->orWhere('author_email', 'like', "%{$search}%")
                        ->orWhere('title', 'like', "%{$search}%")
                        ->orWhere('body', 'like', "%{$search}%");
                });
            })
            ->latest()
            ->paginate($perPage);

        return response()->json([
            'data' => ReviewResource::collection($reviews),
            'meta' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
                'average_rating' => round((float) (Review::query()->avg('rating') ?? 0), 1),
                'status_counts' => $this->statusCounts(),
            ],
        ]);
    }

    public function update(UpdateReviewRequest $request, Review $review): JsonResponse
    {
        $data = $request->validated();
        $status = ReviewStatus::from($data['status']);
        $adminResponse = trim((string) (array_key_exists('admin_response', $data)
            ? $data['admin_response']
            : $review->admin_response));

        $payload = [
            'status' => $status,
            'admin_response' => $adminResponse !== '' ? $adminResponse : null,
        ];

        if ($adminResponse !== (string) $review->admin_response || $adminResponse === '') {
            $payload['responded_at'] = $adminResponse !== '' ? now() : null;
            $payload['responded_by'] = $adminResponse !== '' ? $request->user()->id : null;
        }

        if ($status === ReviewStatus::Approved) {
            $payload['approved_at'] = $review->approved_at ?? now();
            $payload['approved_by'] = $review->approved_by ?? $request->user()->id;
        } else {
            $payload['approved_at'] = null;
            $payload['approved_by'] = null;
        }

        $review->update($payload);

        return response()->json([
            'data' => new ReviewResource($review->fresh()->load(['media', 'author', 'responder'])),
            'message' => 'Reseña actualizada.',
        ]);
    }

    public function destroy(Review $review): JsonResponse
    {
        $review->load('media');
        $review->media->each(fn (ReviewMedia $media) => $this->deleteMediaFile($media));
        $review->delete();

        return response()->json([
            'message' => 'Reseña eliminada.',
        ]);
    }

    private function statusCounts(): array
    {
        $counts = Review::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'pending' => (int) ($counts[ReviewStatus::Pending->value] ?? 0),
            'approved' => (int) ($counts[ReviewStatus::Approved->value] ?? 0),
            'rejected' => (int) ($counts[ReviewStatus::Rejected->value] ?? 0),
        ];
    }

    private function deleteMediaFile(ReviewMedia $media): void
    {
        if ($media->path) {
            $this->uploadService->delete($media->path);
        }
    }
}
