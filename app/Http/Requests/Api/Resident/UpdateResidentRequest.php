<?php

namespace App\Http\Requests\Api\Resident;

use Illuminate\Foundation\Http\FormRequest;

class UpdateResidentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'middle_names' => 'nullable|string|max:255',
            'date_of_birth' => 'sometimes|required|date',
            'gender' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'room' => 'nullable|string|max:50',
            'room_number' => 'nullable|string|max:50',
            'branch_id' => 'sometimes|exists:branches,id',
            'admission_date' => 'sometimes|required|date',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:50',
            'diagnosis' => 'nullable|string',
            'allergies' => 'nullable',
            'medical_conditions' => 'nullable',
            'physician_name' => 'nullable|string|max:255',
            'medicare_number' => 'nullable|string|max:255',
            'primary_care_doctor' => 'nullable|string|max:255',
            'status' => 'nullable|string|max:50',
            'is_active' => 'nullable|boolean',
            'profile_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Convert is_active from FormData string to boolean if present
        if ($this->has('is_active')) {
            $this->merge(['is_active' => filter_var($this->is_active, FILTER_VALIDATE_BOOLEAN)]);
        }
    }
}


