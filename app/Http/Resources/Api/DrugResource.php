<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DrugResource extends JsonResource
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
            'generic_name' => $this->generic_name,
            'description' => $this->description,
            'dosage_form' => $this->dosage_form,
            'strength' => $this->strength,
            'indications' => $this->indications,
            'contraindications' => $this->contraindications,
            'side_effects' => $this->side_effects,
            'storage_instructions' => $this->storage_instructions,
            'is_active' => $this->is_active,
            'display_name' => $this->display_name,
            'full_description' => $this->full_description,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
































