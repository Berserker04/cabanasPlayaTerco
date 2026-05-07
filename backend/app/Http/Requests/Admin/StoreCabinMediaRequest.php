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
            'cabin_id'   => ['required', 'exists:cabins,id'],
            'file'       => ['nullable', 'required_without:files', ...$this->mediaFileRule(mimes: 'jpg,jpeg,png,webp,mp4,webm,mov')],
            'files'      => ['nullable', 'required_without:file', 'array', 'max:20'],
            'files.*'    => $this->mediaFileRule(mimes: 'jpg,jpeg,png,webp,mp4,webm,mov'),
            'alt'        => ['nullable', 'string', 'max:255'],
            'type'       => ['nullable', 'string', 'in:image,video'],
            'sort_order' => ['integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $files = $this->file('files', []);
            $files = is_array($files) ? $files : [];

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
            'file.mimes'        => 'Solo se permiten imagenes JPG, PNG, WebP o videos MP4, WebM y MOV.',
            'files.*.mimes'     => 'Solo se permiten imagenes JPG, PNG, WebP o videos MP4, WebM y MOV.',
            'file.max'          => 'Cada video no puede superar los 150 MB.',
            'files.*.max'       => 'Cada video no puede superar los 150 MB.',
        ];
    }
}
