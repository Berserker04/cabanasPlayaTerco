<?php

namespace App\Http\Requests\Admin;

use App\Enums\DocumentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGuestGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'titular_name'            => ['sometimes', 'string', 'max:255'],
            'titular_email'           => ['nullable', 'email'],
            'titular_phone'           => ['nullable', 'string', 'max:20'],
            'titular_document_number' => ['nullable', 'string', 'max:50'],
            'titular_document_type'   => ['nullable', Rule::enum(DocumentType::class)],
            'city_of_origin'          => ['nullable', 'string', 'max:255'],
            'notes'                   => ['nullable', 'string'],
        ];
    }
}
