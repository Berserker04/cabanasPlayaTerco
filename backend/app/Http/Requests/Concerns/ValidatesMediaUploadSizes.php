<?php

namespace App\Http\Requests\Concerns;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\Validator;

trait ValidatesMediaUploadSizes
{
    protected function mediaFileRule(int $maxKilobytes = 153600, string $mimes = 'jpg,jpeg,png,webp,mp4,mov'): array
    {
        return ['file', "mimes:{$mimes}", "max:{$maxKilobytes}"];
    }

    protected function validateMediaUploadSizes(Validator $validator, array $files): void
    {
        foreach ($files as $attribute => $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $mimeType = (string) $file->getMimeType();
            $maxKilobytes = str_starts_with($mimeType, 'video/') ? 153600 : 10240;

            if (($file->getSize() / 1024) <= $maxKilobytes) {
                continue;
            }

            $validator->errors()->add(
                $attribute,
                str_starts_with($mimeType, 'video/')
                    ? 'Cada video no puede superar los 150 MB.'
                    : 'Cada imagen no puede superar los 10 MB.',
            );
        }
    }
}
