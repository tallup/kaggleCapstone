<?php

namespace App\Events;

use App\Models\Fax;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FaxReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Fax $fax;

    public function __construct(Fax $fax)
    {
        $this->fax = $fax->loadMissing(['contact', 'resident', 'fromNumber']);
    }

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [];
        if ($this->fax->facility_id) {
            $channels[] = new Channel('facility.'.$this->fax->facility_id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'fax.received';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return FaxBroadcastPayload::build($this->fax);
    }
}
