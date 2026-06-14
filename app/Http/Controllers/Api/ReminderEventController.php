<?php

namespace App\Http\Controllers\Api;

use App\Models\ReminderEvent;
use App\Models\Resident;
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
            'event' => $event->fresh('reminder'),
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

        $event = ReminderEvent::with(['reminder.user'])->where('id', $id)->firstOrFail();
        $reminder = $event->reminder;

        if ($user->role !== 'super_admin' && $user->facility_id) {
            if ($reminder->facility_id && (int) $reminder->facility_id !== (int) $user->facility_id) {
                abort(403, 'You do not have access to this reminder.');
            }
            // Reminders with null facility_id are visible across the facility (see ReminderController).
        }

        if ((int) $reminder->user_id === (int) $user->id) {
            return $event;
        }

        if (($reminder->metadata['type'] ?? '') === 'prn_followup' && isset($reminder->metadata['resident_id'])) {
            $resident = Resident::with('branch')->find($reminder->metadata['resident_id']);
            if ($resident && $this->userCanAccessResidentForPrnFollowup($user, $resident)) {
                return $event;
            }
        }

        abort(403, 'You do not have access to this reminder.');
    }

    private function userCanAccessResidentForPrnFollowup(object $user, Resident $resident): bool
    {
        if ($this->isCaregiver($user)) {
            $caregiverBranchId = (int) ($user->assigned_branch_id ?? 0);

            return $caregiverBranchId > 0 && (int) $resident->branch_id === $caregiverBranchId;
        }

        if ($user->role === 'super_admin') {
            return true;
        }

        if ($user->facility_id && $resident->branch) {
            return (int) $resident->branch->facility_id === (int) $user->facility_id;
        }

        return false;
    }
}
