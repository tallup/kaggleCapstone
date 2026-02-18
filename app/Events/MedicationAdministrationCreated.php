<?php

namespace App\Events;

use App\Models\MedicationAdministration;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MedicationAdministrationCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $administration;

    /**
     * Create a new event instance.
     */
    public function __construct(MedicationAdministration $administration)
    {
        $this->administration = $administration->load([
            'medication.drug',
            'resident',
            'branch',
            'administeredBy',
        ]);
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        $channels = [];

        // Broadcast to facility
        if ($this->administration->branch?->facility_id) {
            $channels[] = new Channel('facility.' . $this->administration->branch->facility_id);
        }

        // Broadcast to branch
        if ($this->administration->branch_id) {
            $channels[] = new Channel('branch.' . $this->administration->branch_id);
        }

        // Broadcast to resident-specific channel
        if ($this->administration->resident_id) {
            $channels[] = new Channel('resident.' . $this->administration->resident_id);
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'medication.administration.created';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->administration->id,
            'medication_id' => $this->administration->medication_id,
            'resident_id' => $this->administration->resident_id,
            'branch_id' => $this->administration->branch_id,
            'administered_by' => $this->administration->administered_by,
            'administered_at' => $this->administration->administered_at?->toIso8601String(),
            'status' => $this->administration->status,
            'dosage_given' => $this->administration->dosage_given,
            'medication' => [
                'id' => $this->administration->medication->id,
                'name' => $this->administration->medication->drug?->name ?? $this->administration->medication->name,
            ],
            'resident' => [
                'id' => $this->administration->resident->id,
                'name' => trim(($this->administration->resident->first_name ?? '') . ' ' . ($this->administration->resident->last_name ?? '')),
            ],
            'administered_by_user' => $this->administration->administeredBy ? [
                'id' => $this->administration->administeredBy->id,
                'name' => trim(($this->administration->administeredBy->first_name ?? '') . ' ' . ($this->administration->administeredBy->last_name ?? '')),
            ] : null,
            'created_at' => $this->administration->created_at->toIso8601String(),
        ];
    }
}
