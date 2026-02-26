<?php

namespace App\Enums;

enum StaffRole: string
{
    case Manager = 'manager';
    case Receptionist = 'receptionist';
    case Cleaner = 'cleaner';
    case Cook = 'cook';
    case Maintenance = 'maintenance';
    case Security = 'security';
    case Guide = 'guide';
    case Other = 'other';

    public function label(): string
    {
        return match($this) {
            self::Manager => 'Administrador',
            self::Receptionist => 'Recepcionista',
            self::Cleaner => 'Aseo',
            self::Cook => 'Cocinero(a)',
            self::Maintenance => 'Mantenimiento',
            self::Security => 'Seguridad',
            self::Guide => 'Guía',
            self::Other => 'Otro',
        };
    }
}
