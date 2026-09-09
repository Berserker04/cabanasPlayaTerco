<?php

namespace App\Http\Requests\Admin;

use App\Enums\CabinStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

abstract class CabinRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    public function rules(): array
    {
        $cabin = $this->route('cabin');
        $presence = $cabin ? 'sometimes' : 'required';

        return [
            'cabin_type_id' => ['nullable', 'exists:cabin_types,id'],
            'name' => [$presence, 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('cabins')->ignore($cabin)],
            'code' => ['nullable', 'string', 'max:50', Rule::unique('cabins')->ignore($cabin)],
            'status' => ['sometimes', Rule::enum(CabinStatus::class)],
            'floor' => ['nullable', 'integer', 'between:0,65535'],
            'notes' => ['nullable', 'string'],
            'cover_image' => ['nullable', 'string', 'max:2048'],
            'short_description' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string'],
            'min_guests' => ['sometimes', 'integer', 'between:1,50'],
            'guest_capacity' => [$presence, 'integer', 'between:1,50'],
            'max_guests' => [$presence, 'integer', 'between:1,50'],
            'beds_count' => [$presence, 'integer', 'between:0,50'],
            'bathrooms_count' => [$presence, 'integer', 'between:0,50'],
            'map_slot' => [$presence, 'required', 'string', 'exists:cabin_map_points,key', Rule::unique('cabins', 'map_slot')->ignore($cabin)],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'between:0,65535'],
            'amenity_ids' => ['missing'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $cabin = $this->route('cabin');
            $min = (int) $this->input('min_guests', $cabin?->min_guests ?? 1);
            $comfortable = (int) $this->input('guest_capacity', $cabin?->guest_capacity ?? 1);
            $max = (int) $this->input('max_guests', $cabin?->max_guests ?? 1);
            if ($min > $max) {
                $validator->errors()->add('max_guests', 'La capacidad máxima debe ser mayor o igual a la mínima.');
            }
            if ($comfortable < $min || $comfortable > $max) {
                $validator->errors()->add('guest_capacity', 'La capacidad cómoda debe estar entre la mínima y la máxima.');
            }
        });
    }

    protected function prepareForValidation(): void
    {
        $values = [];
        foreach (['name', 'slug', 'code', 'short_description', 'description', 'notes'] as $field) {
            if ($this->has($field) && is_string($this->input($field))) {
                $values[$field] = trim($this->input($field));
            }
        }
        $this->merge($values);
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre es obligatorio.',
            'map_slot.required' => 'Selecciona una ubicación en el mapa.',
            'map_slot.exists' => 'El punto del mapa ya no existe. Selecciona otro.',
            'map_slot.unique' => 'Este punto está reservado para otra cabaña, aunque esté oculta o eliminada.',
            'code.unique' => 'Este código ya está en uso.',
            'slug.unique' => 'Este enlace ya está en uso, incluso por una cabaña eliminada.',
            'floor.between' => 'El piso debe estar entre 0 y 65535.',
        ];
    }
}
