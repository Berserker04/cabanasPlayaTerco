<?php

namespace App\Http\Requests\Admin;

use App\Enums\CabinStatus;
use App\Models\Cabin;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreCabinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'cabin_type_id'     => ['nullable', 'exists:cabin_types,id'],
            'name'              => ['required', 'string', 'max:255'],
            'code'              => ['nullable', 'string', 'max:50', 'unique:cabins,code'],
            'status'            => ['sometimes', Rule::enum(CabinStatus::class)],
            'floor'             => ['nullable', 'integer'],
            'notes'             => ['nullable', 'string'],
            'cover_image'       => ['nullable', 'string', 'max:2048'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'description'       => ['nullable', 'string'],
            'guest_capacity'    => ['required', 'integer', 'min:1', 'max:50'],
            'min_guests'        => ['nullable', 'integer', 'min:1', 'max:50'],
            'max_guests'        => ['required', 'integer', 'min:1', 'max:50'],
            'beds_count'        => ['required', 'integer', 'min:0', 'max:50'],
            'bathrooms_count'   => ['required', 'integer', 'min:0', 'max:50'],
            'map_slot'          => [
                'required',
                'string',
                Rule::in(self::mapSlots()),
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (! $this->boolean('is_active', true)) {
                        return;
                    }

                    if (Cabin::where('map_slot', $value)->where('is_active', true)->exists()) {
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
            $min = (int) $this->input('min_guests', 1);
            $comfortable = (int) $this->input('guest_capacity');
            $max = (int) $this->input('max_guests');

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
            'name.required'           => 'El nombre es obligatorio.',
            'code.unique'             => 'Este codigo ya esta en uso.',
            'guest_capacity.required' => 'La capacidad comoda es obligatoria.',
            'max_guests.required'     => 'La capacidad maxima es obligatoria.',
            'map_slot.required'       => 'La ubicacion en el mapa es obligatoria.',
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
