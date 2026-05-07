<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesMediaUploadSizes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreReviewMediaRequest extends FormRequest
{
    use ValidatesMediaUploadSizes;

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'images' => ['required', 'array', 'max:3'],
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
            'images.required' => 'Selecciona al menos una foto.',
            'images.max' => 'Solo puedes subir hasta 3 fotos por resena.',
            'images.*.mimes' => 'Solo se permiten imagenes JPG, PNG o WebP.',
            'images.*.max' => 'Cada imagen no puede superar los 10 MB.',
        ];
    }
}
