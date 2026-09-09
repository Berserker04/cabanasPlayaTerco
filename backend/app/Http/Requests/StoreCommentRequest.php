<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'min:3', 'max:2000'],
            'parent_id' => ['nullable', 'exists:comments,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'El comentario es obligatorio.',
            'body.min' => 'El comentario debe tener al menos 3 caracteres.',
            'body.max' => 'El comentario no puede superar los 2000 caracteres.',
        ];
    }
}
