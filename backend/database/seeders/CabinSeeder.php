<?php

namespace Database\Seeders;

use App\Enums\CabinStatus;
use App\Models\Cabin;
use App\Models\CabinType;
use Illuminate\Database\Seeder;

class CabinSeeder extends Seeder
{
    public function run(): void
    {
        $cabins = [
            'Cabaña Familiar' => [
                ['code' => 'CAB-F01', 'name' => 'Familiar 1'],
                ['code' => 'CAB-F02', 'name' => 'Familiar 2'],
                ['code' => 'CAB-F03', 'name' => 'Familiar 3'],
            ],
            'Cabaña Romántica' => [
                ['code' => 'CAB-R01', 'name' => 'Romántica 1'],
                ['code' => 'CAB-R02', 'name' => 'Romántica 2'],
                ['code' => 'CAB-R03', 'name' => 'Romántica 3'],
                ['code' => 'CAB-R04', 'name' => 'Romántica 4'],
            ],
            'Cabaña Aventurera' => [
                ['code' => 'CAB-A01', 'name' => 'Aventurera 1'],
                ['code' => 'CAB-A02', 'name' => 'Aventurera 2'],
                ['code' => 'CAB-A03', 'name' => 'Aventurera 3'],
            ],
            'Suite Terco' => [
                ['code' => 'CAB-S01', 'name' => 'Suite Terco 1'],
                ['code' => 'CAB-S02', 'name' => 'Suite Terco 2'],
            ],
        ];

        foreach ($cabins as $typeName => $units) {
            $cabinType = CabinType::where('name', $typeName)->first();

            if (! $cabinType) {
                continue;
            }

            foreach ($units as $unit) {
                Cabin::updateOrCreate(
                    ['code' => $unit['code']],
                    [
                        'cabin_type_id' => $cabinType->id,
                        'name'          => $unit['name'],
                        'status'        => CabinStatus::Available,
                    ],
                );
            }
        }
    }
}
