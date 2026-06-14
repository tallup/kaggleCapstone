<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ResidentContact;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class FamilyInviteController extends Controller
{
    /**
     * Validate invite token and return contact/resident info (for signup form).
     */
    public function show(Request $request, string $token): JsonResponse
    {
        $contact = ResidentContact::with('resident')
            ->where('invite_token', $token)
            ->first();

        if (! $contact) {
            return response()->json(['message' => 'Invalid or expired invite link.'], 404);
        }
        if (! $contact->isInviteValid()) {
            return response()->json(['message' => 'This invite link has expired.'], 410);
        }

        return response()->json([
            'contact_name' => $contact->name,
            'contact_email' => $contact->email,
            'resident_name' => $contact->resident?->name,
            'resident_id' => $contact->resident_id,
        ]);
    }

    /**
     * Accept invite: register (or link existing user) and link contact to user.
     */
    public function accept(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'invite_token' => 'required|string',
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $contact = ResidentContact::with('resident.branch')->where('invite_token', $validated['invite_token'])->first();
        if (! $contact) {
            throw ValidationException::withMessages(['invite_token' => ['Invalid invite link.']]);
        }
        if (! $contact->isInviteValid()) {
            throw ValidationException::withMessages(['invite_token' => ['This invite link has expired.']]);
        }

        $email = $validated['email'];
        $user = User::where('email', $email)->first();

        $facilityIdFromResident = $contact->resident->branch?->facility_id ?? null;

        if ($user) {
            if ($user->isFamily() && $user->residentContacts()->where('resident_id', $contact->resident_id)->exists()) {
                throw ValidationException::withMessages(['email' => ['This account is already linked to this resident.']]);
            }
            // Link existing user (must be family or we assign family role)
            $user->assignRole('family');
            if (! $user->role || $user->role === '') {
                $user->update(['role' => 'family']);
            }
            // Align facility with the resident's home so FacilityScope matches staff data (T-logs, medications).
            if ($facilityIdFromResident) {
                $user->update(['facility_id' => $facilityIdFromResident]);
            }
        } else {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $email,
                'password' => $validated['password'],
                'role' => 'family',
                'facility_id' => $facilityIdFromResident,
                'is_active' => true,
            ]);
            $user->assignRole('family');
        }

        $contact->user_id = $user->id;
        $contact->invite_token = null;
        $contact->invite_expires_at = null;
        $contact->save();

        $token = $user->createToken('family-portal')->plainTextToken;

        return response()->json([
            'message' => 'Account linked successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }
}
