<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesPost;
use Illuminate\Foundation\Http\FormRequest;

class UpdateMePostRequest extends FormRequest
{
    use ValidatesPost;

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return $this->postRules(false);
    }
}
