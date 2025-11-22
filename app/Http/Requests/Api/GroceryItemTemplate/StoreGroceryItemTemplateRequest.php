<?php

namespace App\Http\Requests\Api\GroceryItemTemplate;

use Illuminate\Foundation\Http\FormRequest;

class StoreGroceryItemTemplateRequest extends FormRequest
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
            'branch_id' => 'required|exists:branches,id',
            'name' => 'required|string|max:255',
            'items_list' => 'required|string',
            'category' => 'nullable|string|max:255',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'created_by' => auth()->id(),
        ]);
    }
}





