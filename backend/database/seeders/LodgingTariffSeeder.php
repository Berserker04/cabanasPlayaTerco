<?php

namespace Database\Seeders;

use App\Models\LodgingTariff;
use Illuminate\Database\Seeder;

class LodgingTariffSeeder extends Seeder
{
    public function run(): void
    {
        LodgingTariff::updateOrCreate(
            ['title' => 'Hospedaje por noche'],
            [
                'price_cop'    => 180000,
                'unit_label'   => 'por persona / noche',
                'description'  => 'Tarifa base de alojamiento en Cabañas Playa Terco. La cotizacion final se confirma por WhatsApp segun fechas, grupo y disponibilidad.',
                'includes'     => ['Hospedaje en cabaña', 'Uso de zonas comunes', 'Acceso a playa', 'Orientacion para llegada'],
                'excludes'     => ['Transporte hasta Nuqui', 'Alimentacion no pactada', 'Actividades externas'],
                'public_notes' => 'Las tarifas pueden variar por temporada. Escribenos para confirmar tu plan.',
                'is_active'    => true,
                'sort_order'   => 1,
            ],
        );
    }
}
