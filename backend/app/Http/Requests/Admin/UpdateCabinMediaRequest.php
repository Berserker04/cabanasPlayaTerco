<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCabinMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'alt'        => ['nullable', 'string', 'max:255'],
            'type'       => ['sometimes', 'string', 'in:image,video'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
