<?php

namespace App\Http\Controllers\Api;

use App\Models\ReminderEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReminderEventController extends BaseApiController
{
    public function acknowledge(Request $request, int $id): JsonResponse
    {
        $event = $this->findEventForUser($request, $id);

        $event->update([
            'status' => 'acknowledged',
            'acknowledged_at' => now(),
        ]);

        return response()->json([
            'message' => 'Reminder acknowledged',
            'event' => $event,
        ]);
    }

    public function snooze(Request $request, int $id): JsonResponse
    {
        $event = $this->findEventForUser($request, $id);
        $data = $request->validate([
            'minutes' => ['required', 'integer', 'min:5', 'max:1440'],
        ]);

        $event->update([
            'status' => 'snoozed',
            'snoozed_until' => now()->addMinutes($data['minutes']),
        ]);

        return response()->json([
            'message' => 'Reminder snoozed',
            'event' => $event,
        ]);
    }

    private function findEventForUser(Request $request, int $id): ReminderEvent
    {
        $user = $request->user();

        $event = ReminderEvent::with('reminder')
            ->where('id', $id)
            ->whereHas('reminder', function ($q) use ($user) {
                $q->where('user_id', $user->id);

                if ($user->role !== 'super_admin' && $user->facility_id) {
                    $q->where(function ($sub) use ($user) {
                        $sub->whereNull('facility_id')->orWhere('facility_id', $user->facility_id);
                    });
                }
            })
            ->firstOrFail();

        return $event;
    }
}

