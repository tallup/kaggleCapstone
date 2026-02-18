<?php

namespace App\Events;

use App\Models\VitalSign;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VitalSignCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $vitalSign;

    /**
     * Create a new event instance.
     */
    public function __construct(VitalSign $vitalSign)
    {
        $this->vitalSign = $vitalSign->load([
            'resident',
            'branch',
            'takenBy',
        ]);
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        $channels = [];

        // Broadcast to facility
        if ($this->vitalSign->branch?->facility_id) {
            $channels[] = new Channel('facility.' . $this->vitalSign->branch->facility_id);
        }

        // Broadcast to branch
        if ($this->vitalSign->branch_id) {
            $channels[] = new Channel('branch.' . $this->vitalSign->branch_id);
        }

        // Broadcast to resident-specific channel
        if ($this->vitalSign->resident_id) {
            $channels[] = new Channel('resident.' . $this->vitalSign->resident_id);
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'vital.sign.created';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->vitalSign->id,
            'resident_id' => $this->vitalSign->resident_id,
            'branch_id' => $this->vitalSign->branch_id,
            'taken_by' => $this->vitalSign->taken_by,
            'measurement_date' => $this->vitalSign->measurement_date?->toIso8601String(),
            'status' => $this->vitalSign->status,
            'systolic' => $this->vitalSign->systolic,
            'diastolic' => $this->vitalSign->diastolic,
            'temperature' => $this->vitalSign->temperature,
            'pulse' => $this->vitalSign->pulse,
            'oxygen_saturation' => $this->vitalSign->oxygen_saturation,
            'pain_level' => $this->vitalSign->pain_level,
            'resident' => [
                'id' => $this->vitalSign->resident->id,
                'name' => trim(($this->vitalSign->resident->first_name ?? '') . ' ' . ($this->vitalSign->resident->last_name ?? '')),
            ],
            'taken_by_user' => $this->vitalSign->takenBy ? [
                'id' => $this->vitalSign->takenBy->id,
                'name' => trim(($this->vitalSign->takenBy->first_name ?? '') . ' ' . ($this->vitalSign->takenBy->last_name ?? '')),
            ] : null,
            'created_at' => $this->vitalSign->created_at->toIso8601String(),
        ];
    }
}
