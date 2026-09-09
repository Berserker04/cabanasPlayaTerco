<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Concerns\ValidatesMediaUploadSizes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreCabinMediaRequest extends FormRequest
{
    use ValidatesMediaUploadSizes;

    public function authorize(): bool
    {
        return $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return [
            'cabin_id' => ['required', \Illuminate\Validation\Rule::exists('cabins', 'id')->whereNull('deleted_at')],
            'file' => ['nullable', 'required_without:files', ...$this->mediaFileRule(mimes: 'jpg,jpeg,png,webp,mp4,webm,mov')],
            'files' => ['nullable', 'required_without:file', 'array', 'max:20'],
            'files.*' => $this->mediaFileRule(mimes: 'jpg,jpeg,png,webp,mp4,webm,mov'),
            'alt' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'in:image,video'],
            'sort_order' => ['integer', 'between:0,65535'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $files = $this->file('files', []);
            $files = is_array($files) ? $files : [];
            if ($this->integer('sort_order') + max(0, count($files) - 1) > 65535) {
                $validator->errors()->add('sort_order', 'El orden del último archivo no puede superar 65535.');
            }

            foreach ([...$files, $this->file('file')] as $file) {
                if (! $file instanceof \Illuminate\Http\UploadedFile) {
                    continue;
                }
                $type = str_starts_with((string) $file->getMimeType(), 'video/') ? 'video' : 'image';
                if ($this->filled('type') && $this->input('type') !== $type) {
                    $validator->errors()->add('type', 'El tipo debe coincidir con el contenido real del archivo.');
                }
            }

            $this->validateMediaUploadSizes($validator, [
                'file' => $this->file('file'),
                ...collect($files)
                    ->mapWithKeys(fn ($file, int $index) => ["files.{$index}" => $file])
                    ->all(),
            ]);
        });
    }

    public function messages(): array
    {
        return [
            'cabin_id.required' => 'La cabaña es obligatoria.',
            'file.required_without' => 'Selecciona al menos un archivo.',
            'files.required_without' => 'Selecciona al menos un archivo.',
            'file.mimes' => 'Solo se permiten imagenes JPG, PNG, WebP o videos MP4, WebM y MOV.',
            'files.*.mimes' => 'Solo se permiten imagenes JPG, PNG, WebP o videos MP4, WebM y MOV.',
            'file.max' => 'Cada video no puede superar los 150 MB.',
            'files.*.max' => 'Cada video no puede superar los 150 MB.',
        ];
    }
}
