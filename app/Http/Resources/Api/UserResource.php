<?php

namespace App\Http\Resources\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'email' => $this->email,
            'role' => $this->role,
            'position' => $this->position,
            'is_active' => $this->is_active,
            'profile_image_url' => $this->profile_image_url,
            'assigned_branch' => new BranchResource($this->whenLoaded('assignedBranch')),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}





