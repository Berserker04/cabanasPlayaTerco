<?php

// Local-only browser QA router. Never serves the application's configured database
// or sends external notifications. Start explicitly with php -S 127.0.0.1:8052.
use App\Models\Lead;
use App\Services\PushNotificationService;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$kernel = $app->make(Kernel::class);
$kernel->bootstrap();
$database = realpath(config('database.connections.sqlite.database'));
$testDirectory = realpath(storage_path('framework/testing'));
if (PHP_SAPI !== 'cli-server' || ! $app->environment('testing') || config('database.default') !== 'sqlite' || ! $database || ! $testDirectory || ! str_starts_with($database, $testDirectory.DIRECTORY_SEPARATOR)) {
    http_response_code(403);
    exit('Only an isolated SQLite testing database is permitted.');
}
Http::fake();
Mail::fake();
$app->instance(PushNotificationService::class, new class extends PushNotificationService
{
    public function notifyStaffOfNewLead(Lead $lead): void {}
});
if (($_SERVER['HTTP_X_QA_MAIL_FAILURE'] ?? '') === '1') {
    Mail::shouldReceive('to')->andThrow(new RuntimeException('Simulated notification failure'));
}
$request = Request::capture();
$response = $kernel->handle($request);
$response->headers->set('X-QA-Isolated', 'sqlite-notifications-faked');
$response->send();
$kernel->terminate($request, $response);
