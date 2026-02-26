<?php

namespace App\Http\Requests\Admin;

use App\Enums\CabinStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCabinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'cabin_type_id' => ['sometimes', 'exists:cabin_types,id'],
            'name'          => ['sometimes', 'string', 'max:255'],
            'code'          => ['sometimes', 'string', 'max:50', Rule::unique('cabins')->ignore($this->route('cabin'))],
            'status'        => ['sometimes', Rule::enum(CabinStatus::class)],
            'floor'         => ['nullable', 'integer'],
            'notes'         => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'code.unique' => 'Este código ya está en uso.',
        ];
    }
}
