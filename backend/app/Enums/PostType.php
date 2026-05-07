<?php

namespace App\Enums;

enum PostType: string
{
    case Article = 'article';
    case Experience = 'experience';

    public function label(): string
    {
        return match ($this) {
            self::Article => 'Articulo',
            self::Experience => 'Experiencia',
        };
    }
}
