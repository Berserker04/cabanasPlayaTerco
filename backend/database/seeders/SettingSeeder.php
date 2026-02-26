<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // General
            ['key' => 'site_name',        'value' => 'Cabañas Playa Terco',                          'group' => 'general',      'type' => 'string'],
            ['key' => 'site_description', 'value' => 'Cabañas frente al mar en Playa Terco, Chocó',  'group' => 'general',      'type' => 'string'],

            // Reservations
            ['key' => 'check_in_time',    'value' => '14:00', 'group' => 'reservations', 'type' => 'string'],
            ['key' => 'check_out_time',   'value' => '12:00', 'group' => 'reservations', 'type' => 'string'],
            ['key' => 'min_stay_nights',  'value' => '1',     'group' => 'reservations', 'type' => 'integer'],
            ['key' => 'max_stay_nights',  'value' => '30',    'group' => 'reservations', 'type' => 'integer'],

            // Contact
            ['key' => 'whatsapp_number',  'value' => '', 'group' => 'contact', 'type' => 'string'],
            ['key' => 'phone_number',     'value' => '', 'group' => 'contact', 'type' => 'string'],
            ['key' => 'email',            'value' => 'info@cabanasplayaterco.com', 'group' => 'contact', 'type' => 'string'],
            ['key' => 'google_maps_url',  'value' => '', 'group' => 'contact', 'type' => 'string'],

            // Social
            ['key' => 'instagram_url',    'value' => '', 'group' => 'social', 'type' => 'string'],
            ['key' => 'facebook_url',     'value' => '', 'group' => 'social', 'type' => 'string'],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
