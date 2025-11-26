<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VitalSignResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'measurement_date' => $this->measurement_date?->format('Y-m-d'),
            'systolic' => $this->systolic,
            'diastolic' => $this->diastolic,
            'temperature' => $this->temperature,
            'pulse' => $this->pulse,
            'oxygen_saturation' => $this->oxygen_saturation,
            'status' => $this->status,
            'resident' => new ResidentResource($this->whenLoaded('resident')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}









