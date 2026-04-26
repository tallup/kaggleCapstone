<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ResidentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'first_name' => $this->first_name,
            'middle_names' => $this->middle_names,
            'last_name' => $this->last_name,
            'date_of_birth' => $this->date_of_birth?->format('Y-m-d'),
            'gender' => $this->gender,
            'phone' => $this->phone,
            'room' => $this->room,
            'room_number' => $this->room_number,
            'branch_id' => $this->branch_id,
            'branch' => new BranchResource($this->whenLoaded('branch')),
            'admission_date' => $this->admission_date?->format('Y-m-d'),
            'discharge_date' => $this->discharge_date?->format('Y-m-d'),
            'emergency_contact_name' => $this->emergency_contact_name,
            'emergency_contact_phone' => $this->emergency_contact_phone,
            'diagnosis' => $this->diagnosis,
            'allergies' => $this->allergies,
            'medical_conditions' => $this->medical_conditions,
            'code_status' => $this->code_status,
            'primary_language' => $this->primary_language,
            'language' => $this->primary_language,
            'diet' => $this->dietary_restrictions,
            'dietary_restrictions' => $this->dietary_restrictions,
            'pharmacy_name' => $this->pharmacy_name,
            'pharmacy' => $this->pharmacy_name
                ? ['name' => $this->pharmacy_name]
                : null,
            'general_medication_instructions' => $this->general_medication_instructions,
            'physician_name' => $this->physician_name,
            'medicare_number' => $this->medicare_number,
            'primary_care_doctor' => $this->primary_care_doctor,
            'pep_or_doctor' => $this->pep_or_doctor,
            'care_plan' => $this->care_plan,
            'special_instructions' => $this->special_instructions,
            'notes' => $this->notes,
            'status' => $this->status,
            'is_active' => $this->is_active,
            'lifecycle_status' => $this->lifecycle_status ?? ($this->is_active ? 'active' : 'discharged'),
            'lifecycle_status_changed_at' => $this->lifecycle_status_changed_at?->toISOString(),
            'temporary_status' => $this->temporary_status,
            'temporary_status_started_at' => $this->temporary_status_started_at?->toISOString(),
            'temporary_status_note' => $this->temporary_status_note,
            'discharge_reason' => $this->discharge_reason,
            'discharge_destination' => $this->discharge_destination,
            'discharge_notes' => $this->discharge_notes,
            'profile_image' => $this->profile_image,
            'profile_image_url' => $this->profile_image_url,
            'appointments' => AppointmentResource::collection($this->whenLoaded('appointments')),
            'vital_signs' => VitalSignResource::collection($this->whenLoaded('vitalSigns')),
            'sleep_records' => SleepRecordResource::collection($this->whenLoaded('sleepRecords')),
            'sleep_patterns' => SleepPatternResource::collection($this->whenLoaded('sleepPatterns')),
            'medications' => $this->whenLoaded('medicationOrders', function() {
                return $this->medicationOrders->map(function($medication) {
                    return [
                        'id' => $medication->id,
                        'name' => $medication->name,
                        'instructions' => $medication->instructions,
                        'quantity' => $medication->quantity,
                        'start_date' => $medication->start_date?->format('Y-m-d'),
                        'end_date' => $medication->end_date?->format('Y-m-d'),
                        'prescription_date' => $medication->prescription_date?->format('Y-m-d'),
                        'is_active' => $medication->is_active,
                        'time_1' => $medication->time_1,
                        'time_2' => $medication->time_2,
                        'time_3' => $medication->time_3,
                        'time_4' => $medication->time_4,
                        'notes' => $medication->notes,
                        'drug' => $medication->drug ? [
                            'id' => $medication->drug->id,
                            'name' => $medication->drug->name,
                        ] : null,
                    ];
                });
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}


