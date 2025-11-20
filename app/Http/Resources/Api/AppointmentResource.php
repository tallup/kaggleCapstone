<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AppointmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'appointment_date' => $this->appointment_date?->format('Y-m-d'),
            'appointment_time' => $this->appointment_time,
            'type' => $this->type,
            'description' => $this->description,
            'status' => $this->status,
            'resident' => new ResidentResource($this->whenLoaded('resident')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}


