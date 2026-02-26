<?php

namespace App\Http\Requests\Admin;

use App\Enums\DocumentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGuestGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'reservation_id'           => ['required', 'exists:reservations,id'],
            'titular_name'             => ['required', 'string', 'max:255'],
            'titular_email'            => ['nullable', 'email'],
            'titular_phone'            => ['nullable', 'string', 'max:20'],
            'titular_document_number'  => ['nullable', 'string', 'max:50'],
            'titular_document_type'    => ['nullable', Rule::enum(DocumentType::class)],
            'city_of_origin'           => ['nullable', 'string', 'max:255'],
            'notes'                    => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'reservation_id.required' => 'La reserva es obligatoria.',
            'titular_name.required'   => 'El nombre del titular es obligatorio.',
        ];
    }
}
