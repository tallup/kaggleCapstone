<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\ResidentSignOut;
use App\Models\Notification;
use App\Models\User;
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
            'branch_id' => 'nullable|integer|exists:branches,id',
            'destination' => 'nullable|string|max:255',
            'purpose' => 'nullable|string|max:1000',
            'accompanied_by' => 'nullable|string|max:255',
            'expected_return_at' => 'nullable|date|after:now',
            'emergency_contact_notified' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Use provided branch_id if user is an administrator, otherwise use resident's branch
        $isAdmin = in_array($user->role, ['super_admin', 'administrator', 'admin']);
        $branchId = null;
        $facilityId = null;

        if ($isAdmin && isset($validated['branch_id'])) {
            // Administrator selected a branch - use it
            $branchId = $validated['branch_id'];
            $branch = \App\Models\Branch::find($branchId);
            $facilityId = $branch?->facility_id ?? null;
        } else {
            // Use resident's branch
            $branchId = $resident->branch_id;
            $facilityId = $resident->branch->facility_id ?? null;
        }

        $signOut = ResidentSignOut::create([
            'resident_id' => $resident->id,
            'branch_id' => $branchId,
            'facility_id' => $facilityId,
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

        $signOut->load(['resident', 'branch', 'createdBy']);

        // Create notifications for admins
        $this->notifyResidentSignOut($signOut);

        return response()->json([
            'message' => 'Resident signed out successfully',
            'sign_out' => $signOut,
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

        $activeSignOut->load(['resident', 'branch', 'createdBy', 'signedInBy']);

        // Create notifications for admins
        $this->notifyResidentSignIn($activeSignOut);

        return response()->json([
            'message' => 'Resident signed in successfully',
            'sign_out' => $activeSignOut,
        ]);
    }

    /**
     * Notify admins about resident sign-out
     */
    private function notifyResidentSignOut(ResidentSignOut $signOut): void
    {
        $signOut->load(['resident', 'branch', 'createdBy']);
        
        // Get admins and facility admins
        $users = User::where(function($query) use ($signOut) {
            $query->whereIn('role', ['super_admin', 'administrator', 'admin', 'manager']);
            
            // Filter by facility if applicable
            if ($signOut->facility_id) {
                $query->where(function($q) use ($signOut) {
                    $q->where('facility_id', $signOut->facility_id)
                      ->orWhereNull('facility_id'); // Super admins
                });
            }
        })
        ->where('is_active', true)
        ->get();

        $residentName = $signOut->resident?->name ?? 'Unknown Resident';
        $branchName = $signOut->branch?->name ?? 'Unknown Branch';
        $destination = $signOut->destination ?? 'Unknown destination';
        $time = Carbon::parse($signOut->sign_out_at)->format('g:i A');
        $expectedReturn = $signOut->expected_return_at 
            ? Carbon::parse($signOut->expected_return_at)->format('M d, Y g:i A')
            : 'Not specified';

        foreach ($users as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'resident_sign_out',
                'title' => 'Resident Signed Out',
                'message' => "{$residentName} signed out from {$branchName} at {$time}. Destination: {$destination}. Expected return: {$expectedReturn}",
                'icon' => 'user-x',
                'icon_color' => 'text-orange-600',
                'action_url' => '/check-in-dashboard',
                'metadata' => [
                    'sign_out_id' => $signOut->id,
                    'resident_id' => $signOut->resident_id,
                    'branch_id' => $signOut->branch_id,
                    'facility_id' => $signOut->facility_id,
                ],
            ]);
        }

        // Send email notifications
        $notificationService = app(\App\Services\NotificationService::class);
        $notificationService->sendResidentSignOutEmail($signOut, $users, 'signed_out');
    }

    /**
     * Notify admins about resident sign-in
     */
    private function notifyResidentSignIn(ResidentSignOut $signOut): void
    {
        $signOut->load(['resident', 'branch', 'createdBy', 'signedInBy']);
        
        // Get admins and facility admins
        $users = User::where(function($query) use ($signOut) {
            $query->whereIn('role', ['super_admin', 'administrator', 'admin', 'manager']);
            
            // Filter by facility if applicable
            if ($signOut->facility_id) {
                $query->where(function($q) use ($signOut) {
                    $q->where('facility_id', $signOut->facility_id)
                      ->orWhereNull('facility_id'); // Super admins
                });
            }
        })
        ->where('is_active', true)
        ->get();

        $residentName = $signOut->resident?->name ?? 'Unknown Resident';
        $branchName = $signOut->branch?->name ?? 'Unknown Branch';
        $time = Carbon::parse($signOut->sign_in_at)->format('g:i A');
        
        // Calculate duration
        $duration = 'N/A';
        if ($signOut->sign_out_at && $signOut->sign_in_at) {
            $hours = Carbon::parse($signOut->sign_out_at)->diffInHours(Carbon::parse($signOut->sign_in_at));
            $minutes = Carbon::parse($signOut->sign_out_at)->diffInMinutes(Carbon::parse($signOut->sign_in_at)) % 60;
            $duration = $hours > 0 ? "{$hours}h {$minutes}m" : "{$minutes}m";
        }

        foreach ($users as $admin) {
            Notification::create([
                'user_id' => $admin->id,
                'type' => 'resident_sign_in',
                'title' => 'Resident Signed In',
                'message' => "{$residentName} signed in at {$branchName} at {$time} (Duration: {$duration})",
                'icon' => 'user-check',
                'icon_color' => 'text-green-600',
                'action_url' => '/check-in-dashboard',
                'metadata' => [
                    'sign_out_id' => $signOut->id,
                    'resident_id' => $signOut->resident_id,
                    'branch_id' => $signOut->branch_id,
                    'facility_id' => $signOut->facility_id,
                ],
            ]);
        }

        // Send email notifications
        $notificationService = app(\App\Services\NotificationService::class);
        $notificationService->sendResidentSignOutEmail($signOut, $users, 'returned');
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

        // Apply facility filtering for non-super admins
        if ($user->role !== 'super_admin' && $user->facility_id) {
            $query->where('facility_id', $user->facility_id);
        }

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

        // Apply facility filtering for non-super admins
        if ($user->role !== 'super_admin' && $user->facility_id) {
            $query->where('facility_id', $user->facility_id);
        }

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
     * Get all resident sign-out history (for all users, filtered by access level)
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = ResidentSignOut::with(['resident', 'branch', 'createdBy', 'signedInBy']);

        // Apply access level filtering
        $isAdmin = $user->role === 'super_admin' || $user->isAnyAdmin();
        
        if ($user->isCaregiver() && $user->assigned_branch_id) {
            // Caregivers can only see sign-outs from their assigned branch
            $query->where('branch_id', $user->assigned_branch_id);
        } elseif (!$isAdmin && $user->facility_id) {
            // Non-admin users see only their facility's sign-outs
            $query->where('facility_id', $user->facility_id);
        } elseif ($isAdmin && $user->role !== 'super_admin' && $user->facility_id) {
            // Facility admins see only their facility's sign-outs
            $query->where('facility_id', $user->facility_id);
        }
        // Super admins see all sign-outs (no filter)

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
