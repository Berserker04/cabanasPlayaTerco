<?php

namespace App\Enums;

enum LeadSource: string
{
    case Website = 'website';
    case Whatsapp = 'whatsapp';
    case Phone = 'phone';
    case Instagram = 'instagram';
    case Facebook = 'facebook';
    case Referral = 'referral';
    case WalkIn = 'walk_in';
    case Other = 'other';

    public function label(): string
    {
        return match($this) {
            self::Website => 'Sitio web',
            self::Whatsapp => 'WhatsApp',
            self::Phone => 'Teléfono',
            self::Instagram => 'Instagram',
            self::Facebook => 'Facebook',
            self::Referral => 'Referido',
            self::WalkIn => 'Visita directa',
            self::Other => 'Otro',
        };
    }
}
