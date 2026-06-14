<?php

namespace App\Events;

use App\Models\Shift;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ShiftDeleted
{
    use Dispatchable, SerializesModels;

    public Shift $shift;

    public function __construct(Shift $shift)
    {
        $this->shift = $shift;
    }
}
