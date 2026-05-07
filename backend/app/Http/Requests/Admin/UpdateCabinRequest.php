<?php

namespace App\Http\Requests\Admin;

use App\Enums\CabinStatus;
use App\Models\Cabin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateCabinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        $cabin = $this->route('cabin');

        return [
            'cabin_type_id'     => ['sometimes', 'nullable', 'exists:cabin_types,id'],
            'name'              => ['sometimes', 'string', 'max:255'],
            'slug'              => ['sometimes', 'string', 'max:255', Rule::unique('cabins')->ignore($cabin)],
            'code'              => ['sometimes', 'nullable', 'string', 'max:50', Rule::unique('cabins')->ignore($cabin)],
            'status'            => ['sometimes', Rule::enum(CabinStatus::class)],
            'floor'             => ['nullable', 'integer'],
            'notes'             => ['nullable', 'string'],
            'cover_image'       => ['nullable', 'string', 'max:2048'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'description'       => ['nullable', 'string'],
            'guest_capacity'    => ['sometimes', 'integer', 'min:1', 'max:50'],
            'min_guests'        => ['sometimes', 'integer', 'min:1', 'max:50'],
            'max_guests'        => ['sometimes', 'integer', 'min:1', 'max:50'],
            'beds_count'        => ['sometimes', 'integer', 'min:0', 'max:50'],
            'bathrooms_count'   => ['sometimes', 'integer', 'min:0', 'max:50'],
            'map_slot'          => [
                'sometimes',
                'string',
                Rule::in(self::mapSlots()),
                function (string $attribute, mixed $value, \Closure $fail) use ($cabin): void {
                    $isActive = $this->has('is_active') ? $this->boolean('is_active') : (bool) $cabin?->is_active;

                    if (! $isActive) {
                        return;
                    }

                    $exists = Cabin::where('map_slot', $value)
                        ->where('is_active', true)
                        ->whereKeyNot($cabin?->id)
                        ->exists();

                    if ($exists) {
                        $fail('Este punto del mapa ya esta asignado a otra cabaña activa.');
                    }
                },
            ],
            'is_active'         => ['boolean'],
            'sort_order'        => ['integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $cabin = $this->route('cabin');
            $min = (int) $this->input('min_guests', $cabin?->min_guests ?? 1);
            $comfortable = (int) $this->input('guest_capacity', $cabin?->guest_capacity ?? $min);
            $max = (int) $this->input('max_guests', $cabin?->max_guests ?? $comfortable);

            if ($min > $max) {
                $validator->errors()->add('max_guests', 'La capacidad maxima debe ser mayor o igual a la minima.');
            }

            if ($comfortable < $min || $comfortable > $max) {
                $validator->errors()->add('guest_capacity', 'La capacidad comoda debe estar entre la minima y la maxima.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'slug.unique' => 'Este slug ya esta en uso.',
            'code.unique' => 'Este codigo ya esta en uso.',
        ];
    }

    private static function mapSlots(): array
    {
        return [
            'cabana_1',
            'cabana_2',
            'cabana_3',
            'cabana_4',
            'cabana_5',
            'cabana_6',
            'cabana_7',
            'cabana_8',
        ];
    }
}
