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
    public function upload(UploadedFile $file, string $directory = 'uploads'): array
    {
        $disk = config('filesystems.default', 'local');
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
     * Upload with thumbnail generation for images.
     */
    public function uploadWithThumbnail(UploadedFile $file, string $directory = 'gallery'): array
    {
        $result = $this->upload($file, $directory);

        // Thumbnail URL is the same for now — can integrate Intervention Image later
        $result['thumbnail_url'] = $result['url'];

        return $result;
    }

    /**
     * Delete a file from storage.
     */
    public function delete(string $path): bool
    {
        $disk = config('filesystems.default', 'local');

        return Storage::disk($disk)->delete($path);
    }
}
