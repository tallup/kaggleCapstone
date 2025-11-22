<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SleepPatternResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'month' => $this->month,
            'year' => $this->year,
            'total_sleep_hours' => $this->total_sleep_hours,
            'avg_sleep_hours' => $this->avg_sleep_hours,
            'resident' => new ResidentResource($this->whenLoaded('resident')),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}





