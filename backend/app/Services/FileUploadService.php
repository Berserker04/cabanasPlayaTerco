<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class FileUploadService
{
    /**
     * Upload a file to the configured disk.
     */
    public function upload(UploadedFile $file, string $directory = 'uploads', ?string $disk = null): array
    {
        $disk ??= config('filesystems.uploads_disk', config('filesystems.default', 's3'));
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $this->ensureDiskIsConfigured($disk);

        try {
            $path = $file->storeAs($directory, $filename, [
                'disk' => $disk,
                'visibility' => 'public',
            ]);
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                'file' => 'No pudimos subir el archivo a DigitalOcean Spaces. Revisa las credenciales, bucket y endpoint.',
            ]);
        }

        if (! is_string($path) || $path === '') {
            throw ValidationException::withMessages([
                'file' => 'No pudimos subir el archivo a DigitalOcean Spaces. Revisa las credenciales, bucket y endpoint.',
            ]);
        }

        return [
            'url'           => Storage::disk($disk)->url($path),
            'path'          => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type'     => $file->getMimeType(),
            'size_bytes'    => $file->getSize(),
        ];
    }

    /**
     * Upload with thumbnail metadata for images.
     */
    public function uploadWithThumbnail(UploadedFile $file, string $directory = 'gallery', ?string $disk = null): array
    {
        $result = $this->upload($file, $directory, $disk);
        $isImage = str_starts_with((string) $result['mime_type'], 'image/');

        $result['thumbnail_url'] = $isImage ? $result['url'] : null;
        $result['thumbnail_path'] = $isImage ? $result['path'] : null;

        return $result;
    }

    /**
     * Delete a file from storage.
     */
    public function delete(string $path, ?string $disk = null): bool
    {
        $disk ??= config('filesystems.uploads_disk', config('filesystems.default', 's3'));

        return Storage::disk($disk)->delete($path);
    }

    private function ensureDiskIsConfigured(string $disk): void
    {
        if (Config::get("filesystems.disks.{$disk}.driver") !== 's3') {
            return;
        }

        $required = [
            'key' => 'DO_SPACES_KEY',
            'secret' => 'DO_SPACES_SECRET',
            'region' => 'DO_SPACES_REGION',
            'bucket' => 'DO_SPACES_BUCKET',
            'endpoint' => 'DO_SPACES_ENDPOINT',
        ];

        foreach ($required as $configKey => $envName) {
            $value = Config::get("filesystems.disks.{$disk}.{$configKey}");

            if (is_string($value) && trim($value) !== '') {
                continue;
            }

            throw ValidationException::withMessages([
                'file' => "Falta configurar {$envName} para subir archivos a DigitalOcean Spaces.",
            ]);
        }

        $bucket = (string) Config::get("filesystems.disks.{$disk}.bucket");

        if (! preg_match('/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/', $bucket)) {
            throw ValidationException::withMessages([
                'file' => 'El bucket de DigitalOcean Spaces debe usar solo minusculas, numeros, puntos o guiones.',
            ]);
        }
    }
}
