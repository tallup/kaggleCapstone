<?php

namespace App\Events;

use App\Models\Incident;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class IncidentCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $incident;

    /**
     * Create a new event instance.
     */
    public function __construct(Incident $incident)
    {
        $this->incident = $incident->load([
            'resident',
            'branch',
            'reportedBy',
        ]);
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        $channels = [];

        // Broadcast to facility
        if ($this->incident->branch?->facility_id) {
            $channels[] = new Channel('facility.' . $this->incident->branch->facility_id);
        }

        // Broadcast to branch
        if ($this->incident->branch_id) {
            $channels[] = new Channel('branch.' . $this->incident->branch_id);
        }

        // Broadcast to resident-specific channel
        if ($this->incident->resident_id) {
            $channels[] = new Channel('resident.' . $this->incident->resident_id);
        }

        return $channels;
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'incident.created';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->incident->id,
            'resident_id' => $this->incident->resident_id,
            'branch_id' => $this->incident->branch_id,
            'incident_type' => $this->incident->incident_type,
            'severity' => $this->incident->severity,
            'priority' => $this->incident->priority,
            'status' => $this->incident->status,
            'description' => $this->incident->description,
            'occurred_at' => $this->incident->occurred_at?->toIso8601String(),
            'resident' => [
                'id' => $this->incident->resident->id,
                'name' => trim(($this->incident->resident->first_name ?? '') . ' ' . ($this->incident->resident->last_name ?? '')),
            ],
            'reported_by_user' => $this->incident->reportedBy ? [
                'id' => $this->incident->reportedBy->id,
                'name' => trim(($this->incident->reportedBy->first_name ?? '') . ' ' . ($this->incident->reportedBy->last_name ?? '')),
            ] : null,
            'created_at' => $this->incident->created_at->toIso8601String(),
        ];
    }
}
