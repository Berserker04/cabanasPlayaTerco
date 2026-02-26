<?php

namespace App\Http\Requests\Admin;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'amount'       => ['sometimes', 'numeric', 'min:0.01'],
            'method'       => ['sometimes', Rule::enum(PaymentMethod::class)],
            'status'       => ['sometimes', Rule::enum(PaymentStatus::class)],
            'reference'    => ['nullable', 'string', 'max:255'],
            'payment_date' => ['sometimes', 'date'],
            'notes'        => ['nullable', 'string'],
        ];
    }
}
