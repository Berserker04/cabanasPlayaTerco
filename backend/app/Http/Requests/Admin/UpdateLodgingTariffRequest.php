<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLodgingTariffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'price_cop' => ['sometimes', 'required', 'numeric', 'min:0', 'max:9999999999.99'],
            'unit_label' => ['sometimes', 'required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'includes' => ['nullable', 'array'],
            'includes.*' => ['string', 'max:255'],
            'excludes' => ['nullable', 'array'],
            'excludes.*' => ['string', 'max:255'],
            'public_notes' => ['nullable', 'string'],
            'is_active' => ['boolean'],
            'sort_order' => ['integer', 'between:0,65535'],
        ];
    }
}
