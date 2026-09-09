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
            'check_in' => ['sometimes', 'date'],
            'check_out' => ['sometimes', 'date'],
            'reason' => ['sometimes', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'applies_to_all' => ['boolean'],
            'cabin_ids' => ['nullable', 'array'],
            'cabin_ids.*' => ['integer', 'distinct', 'exists:cabins,id'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $block = $this->route('availability_block');
            if ($validator->errors()->isNotEmpty() || ! $block) {
                return;
            }
            $existingIds = $block->cabins()->pluck('cabins.id');
            $newIds = collect($this->input('cabin_ids') ?? [])->diff($existingIds);
            if (\App\Models\Cabin::onlyTrashed()->whereIn('id', $newIds)->exists()) {
                $validator->errors()->add('cabin_ids', 'No puedes añadir una cabaña eliminada a un bloqueo.');
            }
            $checkIn = $this->input('check_in', $block->check_in->format('Y-m-d'));
            $checkOut = $this->input('check_out', $block->check_out->format('Y-m-d'));
            if ($checkOut <= $checkIn) {
                $validator->errors()->add('check_out', 'La salida debe ser posterior a la llegada.');
            }
            $appliesToAll = $this->has('applies_to_all')
                ? $this->boolean('applies_to_all')
                : (bool) $block?->applies_to_all;
            $cabinIds = $this->has('cabin_ids')
                ? ($this->input('cabin_ids') ?? [])
                : $block?->cabins()->pluck('cabins.id')->all() ?? [];

            if (! $appliesToAll && count($cabinIds) === 0) {
                $validator->errors()->add('cabin_ids', 'Selecciona cabanas o aplica el bloqueo a todas.');
            }
        });
    }
}
