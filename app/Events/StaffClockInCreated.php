<?php

namespace App\Events;

use App\Models\StaffClockIn;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StaffClockInCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public StaffClockIn $clockIn;
    public string $action; // 'clock_in' | 'clock_out'

    public function __construct(StaffClockIn $clockIn, string $action = 'clock_in')
    {
        $this->clockIn = $clockIn->load(['staff', 'branch', 'facility']);
        $this->action  = $action;
    }

    public function broadcastOn(): array
    {
        $channels = [];

        if ($this->clockIn->facility_id) {
            $channels[] = new Channel('facility.' . $this->clockIn->facility_id);
        }

        if ($this->clockIn->branch_id) {
            $channels[] = new Channel('branch.' . $this->clockIn->branch_id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'staff.clock.' . $this->action;
    }

    public function broadcastWith(): array
    {
        $staff = $this->clockIn->staff;
        $name  = $staff ? trim(($staff->first_name ?? '') . ' ' . ($staff->last_name ?? '')) : 'Unknown';

        return [
            'id'           => $this->clockIn->id,
            'staff_id'     => $this->clockIn->staff_id,
            'branch_id'    => $this->clockIn->branch_id,
            'facility_id'  => $this->clockIn->facility_id,
            'action'       => $this->action,
            'clock_in_at'  => $this->clockIn->clock_in_at?->toIso8601String(),
            'clock_out_at' => $this->clockIn->clock_out_at?->toIso8601String(),
            'total_hours'  => $this->clockIn->total_hours,
            'staff' => [
                'id'   => $staff?->id,
                'name' => $name,
                'role' => $staff?->role,
            ],
            'branch' => $this->clockIn->branch ? [
                'id'   => $this->clockIn->branch->id,
                'name' => $this->clockIn->branch->name,
            ] : null,
        ];
    }
}
