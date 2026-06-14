<?php

namespace App\Http\Requests\Api\Resident;

use App\Models\Resident;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'discharge_date' => 'nullable|date',
            'discharge_reason' => 'nullable|string|max:255',
            'discharge_destination' => 'nullable|string|max:255',
            'discharge_notes' => 'nullable|string',
            'lifecycle_status' => ['nullable', 'string', Rule::in(Resident::LIFECYCLE_STATUSES)],
            'temporary_status' => ['nullable', 'string', Rule::in(Resident::TEMPORARY_STATUSES)],
            'temporary_status_started_at' => 'nullable|date',
            'temporary_status_note' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string|max:255',
            'emergency_contact_phone' => 'nullable|string|max:50',
            'diagnosis' => 'nullable|string',
            'allergies' => 'nullable',
            'medical_conditions' => 'nullable',
            'dietary_restrictions' => 'nullable|string',
            'code_status' => 'nullable|string|max:100',
            'primary_language' => 'nullable|string|max:100',
            'pharmacy_name' => 'nullable|string|max:255',
            'general_medication_instructions' => 'nullable|string',
            'physician_name' => 'nullable|string|max:255',
            'medicare_number' => 'nullable|string|max:255',
            'primary_care_doctor' => 'nullable|string|max:255',
            'care_plan' => 'nullable|string',
            'special_instructions' => 'nullable|string',
            'notes' => 'nullable|string',
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





