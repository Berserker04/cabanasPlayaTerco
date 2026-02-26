<?php

namespace App\Enums;

enum GalleryCategory: string
{
    case Cabins = 'cabins';
    case Beach = 'beach';
    case Nature = 'nature';
    case Food = 'food';
    case Activities = 'activities';
    case Events = 'events';
    case General = 'general';

    public function label(): string
    {
        return match($this) {
            self::Cabins => 'Cabañas',
            self::Beach => 'Playa',
            self::Nature => 'Naturaleza',
            self::Food => 'Gastronomía',
            self::Activities => 'Actividades',
            self::Events => 'Eventos',
            self::General => 'General',
        };
    }
}
