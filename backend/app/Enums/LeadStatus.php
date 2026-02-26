<?php

namespace App\Enums;

enum LeadStatus: string
{
    case New = 'new';
    case Contacted = 'contacted';
    case Quoted = 'quoted';
    case Converted = 'converted';
    case Lost = 'lost';

    public function label(): string
    {
        return match($this) {
            self::New => 'Nuevo',
            self::Contacted => 'Contactado',
            self::Quoted => 'Cotizado',
            self::Converted => 'Convertido',
            self::Lost => 'Perdido',
        };
    }
}
