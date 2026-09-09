<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreAvailabilityBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'check_in' => ['required', 'date'],
            'check_out' => ['required', 'date', 'after:check_in'],
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'applies_to_all' => ['boolean'],
            'cabin_ids' => ['nullable', 'array'],
            'cabin_ids.*' => ['integer', 'distinct', \Illuminate\Validation\Rule::exists('cabins', 'id')->whereNull('deleted_at')],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->boolean('applies_to_all') && count($this->input('cabin_ids', [])) === 0) {
                $validator->errors()->add('cabin_ids', 'Selecciona cabanas o aplica el bloqueo a todas.');
            }
        });
    }
}
