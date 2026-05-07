<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesMediaUploadSizes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StorePostMediaRequest extends FormRequest
{
    use ValidatesMediaUploadSizes;

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', ...$this->mediaFileRule(mimes: 'jpg,jpeg,png,webp,mp4,mov,webm')],
            'alt' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $this->validateMediaUploadSizes($validator, [
                'file' => $this->file('file'),
            ]);
        });
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Selecciona un archivo.',
            'file.mimes' => 'Solo se permiten imagenes JPG, PNG, WebP o videos MP4, MOV y WebM.',
            'file.max' => 'Cada video no puede superar los 150 MB.',
        ];
    }
}
