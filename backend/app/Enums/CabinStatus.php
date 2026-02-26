<?php

namespace App\Enums;

enum CabinStatus: string
{
    case Available = 'available';
    case Occupied = 'occupied';
    case Maintenance = 'maintenance';
    case Inactive = 'inactive';

    public function label(): string
    {
        return match($this) {
            self::Available => 'Disponible',
            self::Occupied => 'Ocupada',
            self::Maintenance => 'En mantenimiento',
            self::Inactive => 'Inactiva',
        };
    }
}
