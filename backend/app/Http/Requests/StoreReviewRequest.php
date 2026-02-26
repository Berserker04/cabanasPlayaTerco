<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'reservation_id' => ['nullable', 'exists:reservations,id'],
            'author_name'    => ['required', 'string', 'max:255'],
            'author_email'   => ['required', 'email'],
            'rating'         => ['required', 'integer', 'min:1', 'max:5'],
            'title'          => ['required', 'string', 'max:255'],
            'body'           => ['required', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'author_name.required'  => 'El nombre es obligatorio.',
            'author_email.required' => 'El correo electrónico es obligatorio.',
            'rating.required'       => 'La calificación es obligatoria.',
            'rating.min'            => 'La calificación mínima es 1.',
            'rating.max'            => 'La calificación máxima es 5.',
            'title.required'        => 'El título es obligatorio.',
            'body.required'         => 'El comentario es obligatorio.',
        ];
    }
}
