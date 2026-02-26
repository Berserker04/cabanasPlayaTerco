<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Refunded = 'refunded';
    case Partial = 'partial';

    public function label(): string
    {
        return match($this) {
            self::Pending => 'Pendiente',
            self::Completed => 'Completado',
            self::Refunded => 'Reembolsado',
            self::Partial => 'Parcial',
        };
    }
}
