<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesMediaUploadSizes;
use App\Models\Review;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreReviewRequest extends FormRequest
{
    use ValidatesMediaUploadSizes;

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'reservation_id' => ['nullable', 'exists:reservations,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string', 'min:20', 'max:5000'],
            'images' => ['nullable', 'array', 'max:'.Review::MAX_IMAGES],
            'images.*' => $this->mediaFileRule(maxKilobytes: 10240, mimes: 'jpg,jpeg,png,webp'),
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $files = $this->file('images', []);
            $files = is_array($files) ? $files : [];

            $this->validateMediaUploadSizes(
                $validator,
                collect($files)
                    ->mapWithKeys(fn ($file, int $index) => ["images.{$index}" => $file])
                    ->all(),
            );
        });
    }

    public function messages(): array
    {
        return [
            'rating.required' => 'La calificación es obligatoria.',
            'rating.min' => 'La calificación mínima es 1.',
            'rating.max' => 'La calificación máxima es 5.',
            'body.required' => 'El comentario es obligatorio.',
            'body.min' => 'La reseña debe tener al menos 20 caracteres.',
            'images.max' => 'Solo puedes subir hasta 3 fotos por reseña.',
            'images.*.mimes' => 'Solo se permiten imágenes JPG, PNG o WebP.',
            'images.*.max' => 'Cada imagen no puede superar los 10 MB.',
        ];
    }
}
