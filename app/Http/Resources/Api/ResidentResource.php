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
            'physician_name' => $this->physician_name,
            'medicare_number' => $this->medicare_number,
            'primary_care_doctor' => $this->primary_care_doctor,
            'status' => $this->status,
            'is_active' => $this->is_active,
            'profile_image' => $this->profile_image,
            'profile_image_url' => $this->profile_image_url,
            'appointments' => AppointmentResource::collection($this->whenLoaded('appointments')),
            'vital_signs' => VitalSignResource::collection($this->whenLoaded('vitalSigns')),
            'sleep_records' => SleepRecordResource::collection($this->whenLoaded('sleepRecords')),
            'sleep_patterns' => SleepPatternResource::collection($this->whenLoaded('sleepPatterns')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}


