<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateAvailabilityBlockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'check_in'       => ['sometimes', 'date'],
            'check_out'      => ['sometimes', 'date', 'after:check_in'],
            'reason'         => ['sometimes', 'string', 'max:255'],
            'notes'          => ['nullable', 'string'],
            'applies_to_all' => ['boolean'],
            'cabin_ids'      => ['nullable', 'array'],
            'cabin_ids.*'    => ['integer', 'distinct', 'exists:cabins,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $block = $this->route('availability_block');
            $appliesToAll = $this->has('applies_to_all')
                ? $this->boolean('applies_to_all')
                : (bool) $block?->applies_to_all;
            $cabinIds = $this->has('cabin_ids')
                ? $this->input('cabin_ids', [])
                : $block?->cabins()->pluck('cabins.id')->all() ?? [];

            if (! $appliesToAll && count($cabinIds) === 0) {
                $validator->errors()->add('cabin_ids', 'Selecciona cabanas o aplica el bloqueo a todas.');
            }
        });
    }
}
