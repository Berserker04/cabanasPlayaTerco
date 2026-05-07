<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreLodgingTariffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'title'        => ['required', 'string', 'max:255'],
            'price_cop'    => ['required', 'numeric', 'min:0'],
            'unit_label'   => ['required', 'string', 'max:100'],
            'description'  => ['nullable', 'string'],
            'includes'     => ['nullable', 'array'],
            'includes.*'   => ['string', 'max:255'],
            'excludes'     => ['nullable', 'array'],
            'excludes.*'   => ['string', 'max:255'],
            'public_notes' => ['nullable', 'string'],
            'is_active'    => ['boolean'],
            'sort_order'   => ['integer', 'min:0'],
        ];
    }
}
