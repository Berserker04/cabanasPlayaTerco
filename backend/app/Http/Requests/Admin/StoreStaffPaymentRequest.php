<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreStaffPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isAdmin();
    }

    public function rules(): array
    {
        return [
            'amount'       => ['required', 'numeric', 'min:0.01'],
            'concept'      => ['required', 'string', 'max:255'],
            'payment_date' => ['required', 'date'],
            'method'       => ['nullable', 'string', 'max:50'],
            'reference'    => ['nullable', 'string', 'max:255'],
            'notes'        => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'amount.required'       => 'El monto es obligatorio.',
            'amount.min'            => 'El monto debe ser mayor a cero.',
            'concept.required'      => 'El concepto es obligatorio.',
            'payment_date.required' => 'La fecha de pago es obligatoria.',
        ];
    }
}
