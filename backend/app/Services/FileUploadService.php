<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileUploadService
{
    /**
     * Upload a file to the configured disk.
     */
    public function upload(UploadedFile $file, string $directory = 'uploads', ?string $disk = null): array
    {
        $disk ??= config('filesystems.default', 'local');
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs($directory, $filename, $disk);

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
        $disk ??= config('filesystems.default', 'local');

        return Storage::disk($disk)->delete($path);
    }
}
