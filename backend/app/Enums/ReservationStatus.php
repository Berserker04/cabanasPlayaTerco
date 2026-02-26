<?php

namespace App\Enums;

enum ReservationStatus: string
{
    case Pending = 'pending';
    case Confirmed = 'confirmed';
    case CheckedIn = 'checked_in';
    case CheckedOut = 'checked_out';
    case Cancelled = 'cancelled';
    case NoShow = 'no_show';

    public function label(): string
    {
        return match($this) {
            self::Pending => 'Pendiente',
            self::Confirmed => 'Confirmada',
            self::CheckedIn => 'Registrado',
            self::CheckedOut => 'Finalizada',
            self::Cancelled => 'Cancelada',
            self::NoShow => 'No se presentó',
        };
    }
}
