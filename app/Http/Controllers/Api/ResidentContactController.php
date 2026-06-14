<?php

namespace App\Http\Controllers\Api;

use App\Mail\FamilyPortalInviteMail;
use App\Models\ResidentContact;
use App\Models\Resident;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class ResidentContactController extends BaseApiController
{
    private function ensureStaff(Request $request): ?JsonResponse
    {
        $user = $request->user();
        if (!$user || $user->isFamily()) {
            return response()->json(['message' => 'Only staff can manage resident contacts.'], 403);
        }
        return null;
    }

    public function index(Request $request): JsonResponse
    {
        if ($err = $this->ensureStaff($request)) {
            return $err;
        }
        $query = ResidentContact::with(['resident', 'user']);

        if ($request->filled('resident_id')) {
            $resident = Resident::find($request->get('resident_id'));
            if (!$resident || !$this->checkBranchAccess($resident)) {
                return $this->error('Resident not found.', 404);
            }
            $query->where('resident_id', $request->get('resident_id'));
        } else {
            // List all contacts for residents in user's facility (via resident->branch)
            $this->applyFacilityFilterToResidentContacts($query, $request->user());
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 20)));
        $items = $query->orderBy('name')->paginate($perPage);

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'resident_id' => 'required|exists:residents,id',
            'name' => 'required|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:50',
            'relation' => 'nullable|string|max:100',
        ]);

        $resident = Resident::with('branch')->findOrFail($validated['resident_id']);
        if (!$this->checkBranchAccess($resident)) {
            return $this->error('Resident not found.', 404);
        }

        $contact = ResidentContact::create($validated);
        return response()->json($contact->load(['resident', 'user']), 201);
    }

    public function show(Request $request, $id): JsonResponse
    {
        if ($err = $this->ensureStaff($request)) {
            return $err;
        }
        $contact = ResidentContact::with(['resident.branch', 'user'])->findOrFail($id);
        if (!$this->checkBranchAccess($contact->resident)) {
            return $this->error('Contact not found.', 404);
        }
        return response()->json($contact);
    }

    public function update(Request $request, $id): JsonResponse
    {
        if ($err = $this->ensureStaff($request)) {
            return $err;
        }
        $contact = ResidentContact::with('resident')->findOrFail($id);
        if (!$this->checkBranchAccess($contact->resident)) {
            return $this->error('Contact not found.', 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string|max:50',
            'relation' => 'nullable|string|max:100',
        ]);

        $contact->update($validated);
        return response()->json($contact->load(['resident', 'user']));
    }

    public function destroy(Request $request, $id): JsonResponse
    {
        if ($err = $this->ensureStaff($request)) {
            return $err;
        }
        $contact = ResidentContact::with('resident')->findOrFail($id);
        if (!$this->checkBranchAccess($contact->resident)) {
            return $this->error('Contact not found.', 404);
        }
        $contact->delete();
        return response()->json(['message' => 'Contact deleted']);
    }

    public function sendInvite(Request $request, $id): JsonResponse
    {
        if ($err = $this->ensureStaff($request)) {
            return $err;
        }
        $contact = ResidentContact::with(['resident.branch', 'resident.branch.facility'])->findOrFail($id);
        if (!$this->checkBranchAccess($contact->resident)) {
            return $this->error('Contact not found.', 404);
        }

        if (!$contact->email) {
            return $this->error('Contact has no email address.', 422);
        }

        $contact->invite_token = Str::random(64);
        $contact->invite_expires_at = now()->addDays(7);
        $contact->save();

        $baseUrl = config('app.frontend_url', $request->getSchemeAndHttpHost());
        $inviteLink = rtrim($baseUrl, '/') . '/portal/accept-invite?token=' . $contact->invite_token;

        Mail::to($contact->email)->send(new FamilyPortalInviteMail($contact, $inviteLink));

        return response()->json([
            'message' => 'Invite sent to ' . $contact->email,
            'invite_link' => $inviteLink,
            'expires_at' => $contact->invite_expires_at->toIso8601String(),
        ]);
    }

    private function applyFacilityFilterToResidentContacts($query, $user): void
    {
        if ($user && $user->role === 'super_admin') {
            return;
        }
        $facilityId = $user->facility_id ?? null;
        if ($facilityId) {
            $query->whereHas('resident.branch', function ($q) use ($facilityId) {
                $q->where('facility_id', $facilityId);
            });
        }
    }
}
