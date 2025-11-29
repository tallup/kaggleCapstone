<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\ResidentSignOut;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ResidentSignOutController extends Controller
{
    /**
     * Sign out a resident
     */
    public function signOut(Request $request, $residentId): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $resident = Resident::findOrFail($residentId);

        // Check if resident is already signed out
        $activeSignOut = ResidentSignOut::where('resident_id', $residentId)
            ->where('is_active', true)
            ->first();

        if ($activeSignOut) {
            return response()->json([
                'message' => 'Resident is already signed out',
                'sign_out' => $activeSignOut,
            ], 422);
        }

        $validated = $request->validate([
            'destination' => 'nullable|string|max:255',
            'purpose' => 'nullable|string|max:1000',
            'accompanied_by' => 'nullable|string|max:255',
            'expected_return_at' => 'nullable|date|after:now',
            'emergency_contact_notified' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        $signOut = ResidentSignOut::create([
            'resident_id' => $resident->id,
            'branch_id' => $resident->branch_id,
            'facility_id' => $resident->branch->facility_id ?? null,
            'sign_out_at' => now(),
            'destination' => $validated['destination'] ?? null,
            'purpose' => $validated['purpose'] ?? null,
            'accompanied_by' => $validated['accompanied_by'] ?? null,
            'expected_return_at' => $validated['expected_return_at'] ? Carbon::parse($validated['expected_return_at']) : null,
            'emergency_contact_notified' => $validated['emergency_contact_notified'] ?? false,
            'notes' => $validated['notes'] ?? null,
            'is_active' => true,
            'created_by' => $user->id,
        ]);

        return response()->json([
            'message' => 'Resident signed out successfully',
            'sign_out' => $signOut->load(['resident', 'branch', 'createdBy']),
        ], 201);
    }

    /**
     * Sign in a resident
     */
    public function signIn(Request $request, $residentId): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $resident = Resident::findOrFail($residentId);

        $activeSignOut = ResidentSignOut::where('resident_id', $residentId)
            ->where('is_active', true)
            ->first();

        if (!$activeSignOut) {
            return response()->json([
                'message' => 'Resident is not currently signed out',
            ], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $activeSignOut->signIn($user, $validated['notes'] ?? null);

        return response()->json([
            'message' => 'Resident signed in successfully',
            'sign_out' => $activeSignOut->fresh()->load(['resident', 'branch', 'createdBy', 'signedInBy']),
        ]);
    }

    /**
     * List sign-outs for a resident
     */
    public function index(Request $request, $residentId): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $resident = Resident::findOrFail($residentId);

        $query = ResidentSignOut::with(['resident', 'branch', 'createdBy', 'signedInBy'])
            ->where('resident_id', $residentId);

        // Filter by date range
        if ($request->filled('start_date')) {
            $query->whereDate('sign_out_at', '>=', $request->get('start_date'));
        }

        if ($request->filled('end_date')) {
            $query->whereDate('sign_out_at', '<=', $request->get('end_date'));
        }

        // Filter by status
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 50)));
        $signOuts = $query->orderBy('sign_out_at', 'desc')->paginate($perPage);

        return response()->json($signOuts);
    }

    /**
     * Get all active sign-outs
     */
    public function active(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = ResidentSignOut::with(['resident', 'branch', 'createdBy'])
            ->where('is_active', true);

        // Apply branch filter for caregivers
        if ($user->isCaregiver() && $user->assigned_branch_id) {
            $query->where('branch_id', $user->assigned_branch_id);
        } elseif ($request->filled('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 50)));
        $signOuts = $query->orderBy('sign_out_at', 'asc')->paginate($perPage);

        return response()->json($signOuts);
    }

    /**
     * Get overdue sign-outs
     */
    public function overdue(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = ResidentSignOut::overdue()
            ->with(['resident', 'branch', 'createdBy']);

        // Apply branch filter for caregivers
        if ($user->isCaregiver() && $user->assigned_branch_id) {
            $query->where('branch_id', $user->assigned_branch_id);
        } elseif ($request->filled('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        $perPage = min(100, max(1, (int) $request->get('per_page', 50)));
        $signOuts = $query->orderBy('expected_return_at', 'asc')->paginate($perPage);

        return response()->json($signOuts);
    }

    /**
     * Get all resident sign-out history (for admins to generate reports)
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        // Only admins can access history
        $isAdmin = $user->role === 'super_admin' || $user->role === 'administrator' || $user->hasRole('administrator');
        
        if (!$isAdmin) {
            return response()->json(['message' => 'Unauthorized. Admin access required.'], 403);
        }

        $query = ResidentSignOut::with(['resident', 'branch', 'createdBy', 'signedInBy']);

        // Apply facility filtering for non-super admins
        if ($user->role !== 'super_admin' && $user->facility_id) {
            $query->where('facility_id', $user->facility_id);
        }

        // Filter by resident
        if ($request->filled('resident_id')) {
            $query->where('resident_id', $request->get('resident_id'));
        }

        // Filter by branch
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->get('branch_id'));
        }

        // Filter by date range
        if ($request->filled('start_date')) {
            $query->whereDate('sign_out_at', '>=', $request->get('start_date'));
        }

        if ($request->filled('end_date')) {
            $query->whereDate('sign_out_at', '<=', $request->get('end_date'));
        }

        // Filter by status
        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Search by resident name
        if ($request->filled('search')) {
            $search = $request->get('search');
            $query->whereHas('resident', function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }

        $perPage = min(500, max(1, (int) $request->get('per_page', 100)));
        $signOuts = $query->orderBy('sign_out_at', 'desc')->paginate($perPage);

        return response()->json($signOuts);
    }
}

