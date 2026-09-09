<?php

namespace App\Services;

use App\Models\Review;
use App\Models\ReviewMedia;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class ReviewMediaService
{
    public function __construct(private readonly FileUploadService $uploads) {}

    /** @param array<int, UploadedFile> $files */
    public function create(array $attributes, array $files): Review
    {
        return $this->persist(null, $attributes, $files)['review'];
    }

    /** @return Collection<int, ReviewMedia> */
    public function add(Review $review, array $files): Collection
    {
        return $this->persist($review, [], $files)['media'];
    }

    /** @return array{review: Review, media: Collection<int, ReviewMedia>} */
    private function persist(?Review $existing, array $attributes, array $files): array
    {
        $newPaths = [];

        try {
            return DB::transaction(function () use ($existing, $attributes, $files, &$newPaths): array {
                // Serialize additions on the parent, including when it has no media yet.
                $review = $existing
                    ? Review::query()->lockForUpdate()->findOrFail($existing->id)
                    : Review::create($attributes);

                if ($review->media()->count() + count($files) > Review::MAX_IMAGES) {
                    throw ValidationException::withMessages(['images' => ['Solo puedes tener hasta 3 fotos por reseña.']]);
                }

                $nextOrder = ((int) ($review->media()->max('sort_order') ?? -1)) + 1;
                $media = collect();
                foreach (array_values($files) as $index => $file) {
                    $upload = $this->uploads->upload($file, 'reviews/media');
                    $newPaths[] = $upload['path'];
                    $media->push($review->media()->create([
                        'url' => $upload['url'],
                        'path' => $upload['path'],
                        'alt' => $review->title ?: 'Foto de la reseña',
                        'mime_type' => $upload['mime_type'],
                        'size_bytes' => $upload['size_bytes'],
                        'sort_order' => $nextOrder + $index,
                    ]));
                }

                if ($existing) {
                    $review->touch();
                }

                return ['review' => $review, 'media' => $media];
            });
        } catch (Throwable $exception) {
            // Database rollbacks cannot undo object-storage writes.
            foreach ($newPaths as $path) {
                try {
                    if (! $this->uploads->delete($path)) {
                        report(new \RuntimeException('No se pudo retirar una foto de una carga de reseña fallida: '.$path));
                    }
                } catch (Throwable $cleanupException) {
                    report($cleanupException);
                }
            }
            throw $exception;
        }
    }
}
