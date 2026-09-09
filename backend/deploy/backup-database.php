<?php

// Only invoked over SSH, outside the public document root.
use Illuminate\Contracts\Console\Kernel;
use Symfony\Component\Process\Process;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$db = config('database.connections.mysql');
$destination = $argv[1] ?? throw new RuntimeException('A backup destination is required.');
$credentials = tempnam(sys_get_temp_dir(), 'terco-mysql-');
chmod($credentials, 0600);
$quote = static fn (string $value): string => '"'.str_replace(
    ['\\', '"', "\n", "\r"], ['\\\\', '\\"', '\\n', '\\r'], $value,
).'"';
$file = null;

try {
    file_put_contents($credentials, "[client]\n".implode("\n", [
        'host='.$quote((string) $db['host']),
        'port='.(int) $db['port'],
        'user='.$quote((string) $db['username']),
        'password='.$quote((string) $db['password']),
    ])."\n");
    $file = gzopen($destination, 'wb6');
    if ($file === false) {
        throw new RuntimeException('Cannot open database backup.');
    }
    chmod($destination, 0600);
    $process = new Process([
        'mysqldump', '--defaults-extra-file='.$credentials,
        '--single-transaction', '--skip-lock-tables', '--no-tablespaces',
        '--default-character-set=utf8mb4', (string) $db['database'],
    ]);
    $process->setTimeout(300);
    $process->run(static function (string $type, string $buffer) use ($file): void {
        if ($type === Process::OUT) {
            if (gzwrite($file, $buffer) === false) {
                throw new RuntimeException('Cannot write database backup.');
            }
        }
    });
    if (! $process->isSuccessful()) {
        throw new RuntimeException('Database backup failed; deployment was stopped.');
    }
    echo "Database backup saved.\n";
} finally {
    if (is_resource($file)) {
        gzclose($file);
    }
    unlink($credentials);
}
