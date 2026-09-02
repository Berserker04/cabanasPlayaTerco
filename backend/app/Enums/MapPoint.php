<?php

namespace App\Enums;

enum MapPoint: string
{
    case Kiosco = 'kiosco';
    case CocinaComedor = 'cocina_comedor';

    public function label(): string
    {
        return match ($this) {
            self::Kiosco => 'Kiosco',
            self::CocinaComedor => 'Cocina y Comedor',
        };
    }
}
