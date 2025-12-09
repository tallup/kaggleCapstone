<?php

namespace App\Http\Requests\Api\GroceryItemTemplate;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGroceryItemTemplateRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization can be added later if needed
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'branch_id' => 'sometimes|exists:branches,id',
            'name' => 'sometimes|string|max:255',
            'items_list' => 'sometimes|string',
            'category' => 'nullable|string|max:255',
        ];
    }
}




























