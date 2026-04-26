<?php

namespace App\Http\Requests\Api\Resident;

use App\Models\Resident;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateResidentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $statusType = $this->input('status_type');
        $statusRules = ['nullable', 'string'];

        if ($statusType === 'lifecycle') {
            $statusRules = ['required', 'string', Rule::in(Resident::LIFECYCLE_STATUSES)];
        } elseif ($statusType === 'temporary') {
            $statusRules = ['nullable', 'string', Rule::in(Resident::TEMPORARY_STATUSES)];
        }

        return [
            'status_type' => ['required', 'string', Rule::in(['temporary', 'lifecycle'])],
            'status' => $statusRules,
            'effective_at' => ['nullable', 'date'],
            'details' => ['nullable', 'array'],
            'temporary_status_note' => ['nullable', 'string'],
            'discharge_date' => [
                Rule::requiredIf($statusType === 'lifecycle' && in_array($this->input('status'), ['discharged', 'transferred', 'deceased'], true)),
                'nullable',
                'date',
            ],
            'discharge_reason' => [
                Rule::requiredIf($statusType === 'lifecycle' && in_array($this->input('status'), ['discharged', 'transferred', 'deceased'], true)),
                'nullable',
                'string',
                'max:255',
            ],
            'discharge_destination' => ['nullable', 'string', 'max:255'],
            'discharge_notes' => ['nullable', 'string'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if (!$this->has('status_type') && $this->has('lifecycle_status')) {
            $this->merge([
                'status_type' => 'lifecycle',
                'status' => $this->input('lifecycle_status'),
            ]);
        }

        if (!$this->has('status_type') && $this->has('temporary_status')) {
            $this->merge([
                'status_type' => 'temporary',
                'status' => $this->input('temporary_status'),
            ]);
        }
    }
}
