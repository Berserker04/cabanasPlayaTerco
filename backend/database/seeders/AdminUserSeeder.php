<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@cabanasplayaterco.com'],
            [
                'name'              => 'Admin',
                'password'          => bcrypt('password'),
                'email_verified_at' => now(),
            ],
        );

        $adminRole = Role::where('name', 'admin')->first();

        if ($adminRole && ! $admin->roles()->where('role_id', $adminRole->id)->exists()) {
            $admin->roles()->attach($adminRole);
        }
    }
}
