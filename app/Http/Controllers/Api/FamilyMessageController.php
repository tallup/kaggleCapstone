<?php

namespace App\Http\Controllers\Api;

use App\Events\FamilyMessageSent;
use App\Models\FamilyMessage;
use App\Models\Resident;
use App\Models\ResidentContact;
use App\Models\Scopes\FacilityScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FamilyMessageController extends BaseApiController
{
    /**
     * List messages for a resident (thread). Family users see only their linked residents; staff see any resident in facility.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $residentId = $request->get('resident_id');
        if (! $residentId) {
            return response()->json(['message' => 'resident_id is required.'], 422);
        }

        if ($user->isFamily()) {
            $allowed = ResidentContact::where('user_id', $user->id)->where('resident_id', $residentId)->exists();
            if (! $allowed) {
                return response()->json(['message' => 'Unauthorized.'], 403);
            }
        } else {
            $resident = Resident::find($residentId);
            if (! $resident || ! $this->checkBranchAccess($resident)) {
                return response()->json(['message' => 'Resident not found.'], 404);
            }
        }

        $messages = FamilyMessage::where('resident_id', $residentId)
            ->orderBy('created_at')
            ->limit(200)
            ->get()
            ->map(function ($m) {
                return $this->formatMessage($m);
            });

        return response()->json(['data' => $messages]);
    }

    /**
     * List threads (residents with recent messages) for current user.
     * Family: any resident they're linked to that has at least one message (from staff or family).
     */
    public function threads(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->isFamily()) {
            $residentIds = ResidentContact::where('user_id', $user->id)->pluck('resident_id')->unique()->values();
            $messages = FamilyMessage::whereIn('resident_id', $residentIds)
                ->orderByDesc('created_at')
                ->get()
                ->unique('resident_id')
                ->take(20);
        } else {
            $messages = FamilyMessage::orderByDesc('created_at')
                ->limit(50)
                ->get()
                ->unique('resident_id')
                ->take(20);
        }

        $residentIds = $messages->pluck('resident_id')->unique()->filter()->values();
        $residents = Resident::withoutGlobalScope(FacilityScope::class)
            ->whereIn('id', $residentIds)
            ->get()
            ->keyBy('id');
        $threads = $messages->map(function ($m) use ($residents) {
            $resident = $residents->get($m->resident_id);

            return [
                'resident_id' => $m->resident_id,
                'resident_name' => $resident?->name ?? 'Resident',
                'last_message_at' => $m->created_at?->toIso8601String(),
            ];
        })->values();

        return response()->json(['data' => $threads]);
    }

    /**
     * Send a message.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'resident_id' => 'required|exists:residents,id',
            'body' => 'required|string|max:5000',
            'recipient_type' => 'nullable|in:staff,family',
            'recipient_id' => 'nullable|integer',
        ]);

        $residentId = $validated['resident_id'];
        $body = $validated['body'];

        if ($user->isFamily()) {
            $contact = ResidentContact::where('user_id', $user->id)->where('resident_id', $residentId)->first();
            if (! $contact) {
                return response()->json(['message' => 'Unauthorized.'], 403);
            }
            $msg = FamilyMessage::create([
                'resident_id' => $residentId,
                'sender_type' => FamilyMessage::SENDER_FAMILY,
                'sender_id' => $contact->id,
                'recipient_type' => 'staff',
                'recipient_id' => null,
                'body' => $body,
            ]);
            $formatted = $this->formatMessage($msg->fresh());
            broadcast(new FamilyMessageSent((int) $residentId, $formatted))->toOthers();

            return response()->json($formatted, 201);
        }

        $resident = Resident::find($residentId);
        if (! $resident || ! $this->checkBranchAccess($resident)) {
            return response()->json(['message' => 'Resident not found.'], 404);
        }
        $recipientType = $validated['recipient_type'] ?? 'family';
        $recipientId = $validated['recipient_id'] ?? null;
        $msg = FamilyMessage::create([
            'resident_id' => $residentId,
            'sender_type' => FamilyMessage::SENDER_STAFF,
            'sender_id' => $user->id,
            'recipient_type' => $recipientType,
            'recipient_id' => $recipientId,
            'body' => $body,
        ]);
        $formatted = $this->formatMessage($msg->fresh());
        broadcast(new FamilyMessageSent((int) $residentId, $formatted))->toOthers();

        return response()->json($formatted, 201);
    }

    /**
     * Mark a message as read.
     */
    public function markRead(Request $request, $id): JsonResponse
    {
        $user = $request->user();
        $msg = FamilyMessage::findOrFail($id);

        if ($user->isFamily()) {
            $contactIds = ResidentContact::where('user_id', $user->id)->pluck('id');
            $allowed = $contactIds->contains($msg->sender_id) || $contactIds->contains($msg->recipient_id);
            if (! $allowed) {
                return response()->json(['message' => 'Unauthorized.'], 403);
            }
        } else {
            if ($msg->resident_id) {
                $resident = Resident::find($msg->resident_id);
                if (! $resident || ! $this->checkBranchAccess($resident)) {
                    return response()->json(['message' => 'Unauthorized.'], 403);
                }
            }
        }

        $msg->update(['read_at' => now()]);

        return response()->json($this->formatMessage($msg->fresh()));
    }

    private function formatMessage(FamilyMessage $m): array
    {
        $senderName = null;
        if ($m->sender_type === 'staff') {
            $u = \App\Models\User::find($m->sender_id);
            $senderName = $u?->name ?? 'Staff';
        } else {
            $c = ResidentContact::find($m->sender_id);
            $senderName = $c?->name ?? 'Family';
        }

        return [
            'id' => $m->id,
            'resident_id' => $m->resident_id,
            'sender_type' => $m->sender_type,
            'sender_id' => $m->sender_id,
            'sender_name' => $senderName,
            'recipient_type' => $m->recipient_type,
            'recipient_id' => $m->recipient_id,
            'body' => $m->body,
            'read_at' => $m->read_at?->toIso8601String(),
            'created_at' => $m->created_at?->toIso8601String(),
        ];
    }
}
