<?php

namespace App\Http\Requests\Admin;

use App\Enums\CabinStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCabinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'cabin_type_id' => ['required', 'exists:cabin_types,id'],
            'name'          => ['required', 'string', 'max:255'],
            'code'          => ['required', 'string', 'max:50', 'unique:cabins,code'],
            'status'        => ['sometimes', Rule::enum(CabinStatus::class)],
            'floor'         => ['nullable', 'integer'],
            'notes'         => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'cabin_type_id.required' => 'El tipo de cabaña es obligatorio.',
            'name.required'          => 'El nombre es obligatorio.',
            'code.required'          => 'El código es obligatorio.',
            'code.unique'            => 'Este código ya está en uso.',
        ];
    }
}
