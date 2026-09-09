<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Concerns\ValidatesPost;
use Illuminate\Foundation\Http\FormRequest;

class StorePostRequest extends FormRequest
{
    use ValidatesPost;

    public function authorize(): bool
    {
        return (bool) $this->user()?->isStaff();
    }

    public function rules(): array
    {
        return $this->postRules(true, true);
    }
}
