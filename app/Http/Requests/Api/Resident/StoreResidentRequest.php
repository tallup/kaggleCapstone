<?php

namespace App\Http\Requests\Api\Resident;

use Illuminate\Foundation\Http\FormRequest;

class StoreResidentRequest extends FormRequest
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
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'middle_names' => 'nullable|string|max:255',
            'date_of_birth' => 'required|date',
            'gender' => 'nullable|string|max:50',
            'phone' => 'nullable|string|max:50',
            'room' => 'nullable|string|max:50',
            'room_number' => 'nullable|string|max:50',
            'branch_id' => 'required|exists:branches,id',
            'admission_date' => 'required|date',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:50',
            'diagnosis' => 'nullable|string',
            'allergies' => 'nullable|string',
            'medical_conditions' => 'nullable|string',
            'dietary_restrictions' => 'nullable|string',
            'code_status' => 'nullable|string|max:100',
            'primary_language' => 'nullable|string|max:100',
            'pharmacy_name' => 'nullable|string|max:255',
            'general_medication_instructions' => 'nullable|string',
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

        // Auto-generate name if not provided
        if (!$this->has('name') && $this->has('first_name') && $this->has('last_name')) {
            $parts = array_filter([
                $this->input('first_name'),
                $this->input('middle_names'),
                $this->input('last_name')
            ]);
            $this->merge(['name' => implode(' ', $parts)]);
        }

        // Don't convert allergies and medical_conditions here - let validation accept strings
        // The controller will handle the conversion to arrays for storage
    }
}

























