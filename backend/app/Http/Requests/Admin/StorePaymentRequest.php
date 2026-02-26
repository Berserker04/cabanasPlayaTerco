<?php

namespace App\Http\Requests\Admin;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'guest_group_id'  => ['nullable', 'exists:guest_groups,id'],
            'reservation_id'  => ['required', 'exists:reservations,id'],
            'amount'          => ['required', 'numeric', 'min:0.01'],
            'method'          => ['required', Rule::enum(PaymentMethod::class)],
            'status'          => ['sometimes', Rule::enum(PaymentStatus::class)],
            'reference'       => ['nullable', 'string', 'max:255'],
            'payment_date'    => ['required', 'date'],
            'notes'           => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'reservation_id.required' => 'La reserva es obligatoria.',
            'amount.required'         => 'El monto es obligatorio.',
            'amount.min'              => 'El monto debe ser mayor a cero.',
            'method.required'         => 'El método de pago es obligatorio.',
            'payment_date.required'   => 'La fecha de pago es obligatoria.',
        ];
    }
}
