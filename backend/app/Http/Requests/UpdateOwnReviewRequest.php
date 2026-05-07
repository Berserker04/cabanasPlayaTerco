<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOwnReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string', 'min:20', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'rating.required' => 'La calificacion es obligatoria.',
            'rating.min' => 'La calificacion minima es 1.',
            'rating.max' => 'La calificacion maxima es 5.',
            'body.required' => 'El comentario es obligatorio.',
            'body.min' => 'La resena debe tener al menos 20 caracteres.',
        ];
    }
}
