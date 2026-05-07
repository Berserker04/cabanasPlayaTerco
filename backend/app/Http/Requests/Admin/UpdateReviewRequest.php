<?php

namespace App\Http\Requests\Admin;

use App\Enums\ReviewStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(ReviewStatus::class)],
            'admin_response' => ['nullable', 'string', 'max:2000'],
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'El estado es obligatorio.',
        ];
    }
}
