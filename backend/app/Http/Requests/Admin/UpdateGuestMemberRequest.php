<?php

namespace App\Http\Requests\Admin;

use App\Enums\DocumentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateGuestMemberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'full_name'       => ['sometimes', 'string', 'max:255'],
            'document_number' => ['nullable', 'string', 'max:50'],
            'document_type'   => ['nullable', Rule::enum(DocumentType::class)],
            'age'             => ['nullable', 'integer', 'min:0', 'max:150'],
            'is_minor'        => ['boolean'],
        ];
    }
}
