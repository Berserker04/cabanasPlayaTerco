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
            'alt' => ['nullable', 'string', 'max:255'],
            'type' => ['sometimes', \Illuminate\Validation\Rule::in([$this->route('cabinMedia')?->type])],
            'sort_order' => ['sometimes', 'integer', 'between:0,65535'],
        ];
    }
}
