<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case Transfer = 'transfer';
    case Nequi = 'nequi';
    case Daviplata = 'daviplata';
    case CreditCard = 'credit_card';
    case Other = 'other';

    public function label(): string
    {
        return match($this) {
            self::Cash => 'Efectivo',
            self::Transfer => 'Transferencia',
            self::Nequi => 'Nequi',
            self::Daviplata => 'Daviplata',
            self::CreditCard => 'Tarjeta de crédito',
            self::Other => 'Otro',
        };
    }
}
