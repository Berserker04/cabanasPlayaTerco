<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['name' => 'admin',  'display_name' => 'Administrador',  'description' => 'Acceso total al sistema'],
            ['name' => 'staff',  'display_name' => 'Personal',       'description' => 'Gestión operativa de cabañas y reservas'],
            ['name' => 'viewer', 'display_name' => 'Visualizador',   'description' => 'Solo lectura de información'],
            ['name' => 'user',   'display_name' => 'Usuario',        'description' => 'Usuario registrado del sitio'],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(['name' => $role['name']], $role);
        }
    }
}
