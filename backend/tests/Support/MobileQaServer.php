<?php

// Explicit, isolated Android QA harness. Never selects the configured application DB.
// php tests/Support/MobileQaServer.php seed
// php -d upload_max_filesize=160M -d post_max_size=170M -S 127.0.0.1:8011 tests/Support/MobileQaServer.php
use App\Models\AvailabilityBlock;
use App\Models\Cabin;
use App\Models\CabinType;
use App\Models\DeviceToken;
use App\Models\GalleryAlbum;
use App\Models\GalleryItem;
use App\Models\Lead;
use App\Models\Post;
use App\Models\Reservation;
use App\Models\Review;
use App\Models\Role;
use App\Models\User;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

if (! in_array(PHP_SAPI, ['cli', 'cli-server'], true)) {
    http_response_code(403);
    exit;
}
putenv('APP_ENV=testing');
require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
$root = storage_path('framework/testing/mobile-admin');
if (! is_dir($root)) {
    mkdir($root, 0700, true);
}
$root = realpath($root);
$database = $root.DIRECTORY_SEPARATOR.'qa.sqlite';
if (! is_file($database)) {
    touch($database);
}
config([
    'app.env' => 'testing', 'app.url' => 'http://127.0.0.1:8000',
    'database.default' => 'sqlite', 'database.connections.sqlite.database' => $database,
    'database.connections.sqlite.foreign_key_constraints' => true,
    'cache.default' => 'array', 'session.driver' => 'array', 'queue.default' => 'database',
    'mail.default' => 'array',
    'cors.allowed_origins' => ['http://localhost:4052', 'http://127.0.0.1:4052'],
    'filesystems.default' => 'mobile_qa', 'filesystems.uploads_disk' => 'mobile_qa',
    'filesystems.disks.mobile_qa' => ['driver' => 'local', 'root' => $root.'/media', 'url' => 'http://127.0.0.1:8000/qa-media', 'visibility' => 'public', 'throw' => true],
]);
DB::purge('sqlite');
Mail::fake();
if (PHP_SAPI === 'cli') {
    $action = $argv[1] ?? 'status';
    if ($action === 'seed') {
        if (filesize($database) > 0) {
            exit("QA database already exists. Reuse its fixtures.\n");
        }
        Artisan::call('migrate', ['--force' => true]);
        Artisan::call('db:seed', ['--class' => Database\Seeders\RoleSeeder::class, '--force' => true]);
        foreach (['admin', 'staff', 'viewer', 'user'] as $role) {
            $user = User::factory()->create(['name' => ucfirst($role).' Mobile QA', 'email' => $role.'.mobile.qa@example.test', 'password' => Hash::make('MobileQa-2026!'), 'phone' => '+573001234567']);
            $user->roles()->attach(Role::where('name', $role)->firstOrFail());
            $users[$role] = $user;
        }
        $backup = User::factory()->create(['name' => 'Administrador respaldo QA', 'email' => 'backup.mobile.qa@example.test']);
        $backup->roles()->attach(Role::where('name', 'admin')->firstOrFail());
        $type = CabinType::create(['name' => 'Familiar QA', 'slug' => 'familiar-qa', 'base_price' => 100000, 'max_guests' => 8, 'bedrooms' => 1, 'bathrooms' => 1, 'is_active' => true]);
        for ($i = 1; $i <= 5; $i++) {
            $cabins[$i] = Cabin::create(['cabin_type_id' => $type->id, 'name' => 'Cabaña QA '.$i, 'slug' => 'cabana-qa-'.$i, 'code' => 'QA'.$i, 'status' => 'available', 'min_guests' => 1, 'max_guests' => 8, 'guest_capacity' => 8, 'beds_count' => 3, 'bathrooms_count' => 1, 'map_slot' => 'cabana_'.$i, 'is_active' => true, 'sort_order' => $i]);
        }
        $today = now('America/Bogota')->startOfDay();
        foreach ([
            ['Salida QA', 'checked_in', -2, 0, [2]],
            ['Llegada QA', 'confirmed', 0, 2, [2]],
            ['Grupo varias cabañas QA', 'confirmed', -1, 2, [3, 4]],
            ['Cotización vigente QA', 'pending', 0, 1, [1]],
            ['Cotización vencida QA', 'expired', 0, 1, [1]],
        ] as [$name, $status, $from, $to, $ids]) {
            $record = Reservation::create(['cabin_id' => $cabins[$ids[0]]->id, 'leader_name' => $name, 'leader_phone' => '+573001234567', 'guests_count' => 4, 'check_in' => $today->copy()->addDays($from)->toDateString(), 'check_out' => $today->copy()->addDays($to)->toDateString(), 'status' => $status, 'source' => 'phone', 'notes' => 'Campo original QA', 'total_price' => 123456, 'expires_at' => $status === 'pending' ? now()->addHours(20) : null]);
            $record->cabins()->sync(array_map(fn ($i) => $cabins[$i]->id, $ids));
        }
        $block = AvailabilityBlock::create(['check_in' => $today->toDateString(), 'check_out' => $today->copy()->addDays(2)->toDateString(), 'reason' => 'Mantenimiento QA', 'notes' => 'Bloqueo de prueba', 'applies_to_all' => false]);
        $block->cabins()->sync([$cabins[5]->id]);
        if (! is_dir($root.'/media')) {
            mkdir($root.'/media', 0700, true);
        }
        copy(__DIR__.'/../../../mobile/assets/branding/auth_sunset.jpg', $root.'/media/playa-qa.jpg');
        $mediaUrl = 'http://127.0.0.1:8000/qa-media/playa-qa.jpg';
        for ($i = 1; $i <= 23; $i++) {
            $review = Review::create(['author_name' => 'Turista QA '.$i, 'author_email' => 'qa'.$i.'@example.test', 'title' => 'Reseña QA '.$i, 'body' => str_repeat('Disfrutamos la playa y la tranquilidad de las cabañas. ', 6), 'rating' => 5, 'status' => $i % 2 ? 'approved' : 'pending']);
            if ($i === 23) {
                $review->media()->create(['url' => $mediaUrl, 'path' => 'playa-qa.jpg', 'mime_type' => 'image/jpeg', 'size_bytes' => filesize($root.'/media/playa-qa.jpg'), 'sort_order' => 0]);
            }
            $post = Post::create(['user_id' => $users['admin']->id, 'type' => $i % 2 ? 'article' : 'experience', 'title' => 'Publicación QA '.$i, 'slug' => 'publicacion-qa-'.$i, 'body' => '<h2>Una visita a Playa Terco</h2><p>Texto <strong>formateado</strong> para comprobar la lectura móvil.</p><img src="'.$mediaUrl.'"><p>'.str_repeat('El paisaje y el descanso acompañan la estadía. ', 12).'</p>', 'summary' => 'Una visita de prueba al Pacífico', 'featured_image' => $mediaUrl, 'status' => 'published', 'published_at' => now()]);
            $post->comments()->create(['author_name' => 'Comentario QA '.$i, 'author_email' => 'comentario@example.test', 'body' => 'Una pregunta sobre esta experiencia de prueba.', 'status' => 'pending']);
            Lead::create(['name' => 'Solicitud QA '.$i, 'email' => 'qa'.$i.'@example.test', 'phone' => '+573001234567', 'message' => 'Deseo cotizar una estadía familiar en Playa Terco.', 'source' => 'website', 'status' => $i > 20 ? 'new' : 'contacted', 'check_in' => $today->copy()->addDays(5)->toDateString(), 'check_out' => $today->copy()->addDays(8)->toDateString(), 'guests_count' => 4]);
        }
        $album = GalleryAlbum::create(['title' => 'Álbum QA', 'slug' => 'album-qa', 'category' => 'general', 'is_active' => true]);
        GalleryItem::create(['url' => $mediaUrl, 'path' => 'playa-qa.jpg', 'caption' => 'Atardecer QA', 'alt' => 'Atardecer en Playa Terco', 'category' => 'general', 'type' => 'image', 'mime_type' => 'image/jpeg', 'size_bytes' => filesize($root.'/media/playa-qa.jpg'), 'is_active' => true, 'gallery_album_id' => $album->id]);
        echo "Isolated mobile QA fixtures created.\n";
    } elseif ($action === 'queue') {
        Artisan::call('queue:work', ['connection' => 'database', '--queue' => 'push', '--stop-when-empty' => true, '--tries' => 3, '--timeout' => 25]);
        echo Artisan::output();
    } elseif ($action === 'status') {
        echo json_encode(['leads' => Lead::count(), 'new' => Lead::where('status', 'new')->count(), 'devices' => DeviceToken::eligibleRecipient()->count(), 'jobs' => DB::table('jobs')->count(), 'failed_jobs' => DB::table('failed_jobs')->count(), 'gallery' => GalleryItem::count()], JSON_PRETTY_PRINT)."\n";
    } else {
        exit("Unknown QA action.\n");
    }
    exit;
}
$request = Request::capture();
$app->instance('request', $request);
if (str_starts_with($request->path(), 'qa-media/')) {
    $file = realpath($root.'/media/'.substr($request->path(), strlen('qa-media/')));
    if (! $file || ! str_starts_with($file, $root.DIRECTORY_SEPARATOR.'media'.DIRECTORY_SEPARATOR)) {
        http_response_code(404);
        exit;
    }
    response()->file($file)->prepare($request)->send();
    exit;
}
$response = $kernel->handle($request);
$response->headers->set('X-QA-Isolated', 'mobile-sqlite-mail-faked');
$response->send();
$kernel->terminate($request, $response);
