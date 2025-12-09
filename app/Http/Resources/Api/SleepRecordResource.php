<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SleepRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sleep_date' => $this->sleep_date?->format('Y-m-d'),
            'sleep_time' => $this->sleep_time,
            'wake_time' => $this->wake_time,
            'total_sleep_hours' => $this->total_sleep_hours,
            'resident' => new ResidentResource($this->whenLoaded('resident')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}




























