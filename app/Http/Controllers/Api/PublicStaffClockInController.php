<?php

namespace App\Http\Controllers\Api;

use App\Events\StaffClockInCreated;
use App\Http\Controllers\Controller;
use App\Models\StaffClockIn;
use App\Models\User;
use App\Services\LocationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class PublicStaffClockInController extends Controller
{
    protected LocationService $locationService;

    public function __construct(LocationService $locationService)
    {
        $this->locationService = $locationService;
    }

    /**
     * Verify employee identity for public clock-in
     */
    public function verifyEmployee(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_identifier' => 'required|string', // Email or employee ID
            'clock_pin' => 'nullable|string|max:10',
        ]);

        // Rate limiting
        $key = 'public-clock-in:' . $request->ip() . ':' . $validated['employee_identifier'];
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'message' => 'Too many attempts. Please try again later.',
            ], 429);
        }

        RateLimiter::hit($key, 3600); // 1 hour

        // Find user by email
        $user = User::where('email', $validated['employee_identifier'])
            ->where('is_active', true)
            ->first();

        // If not found by email, could search by employee ID if such field exists
        if (!$user) {
            return response()->json([
                'message' => 'Employee not found',
            ], 404);
        }

        // Verify PIN if set
        if ($user->clock_pin) {
            if (empty($validated['clock_pin'])) {
                return response()->json([
                    'message' => 'PIN required',
                    'requires_pin' => true,
                ], 422);
            }

            if (!$user->verifyClockPin($validated['clock_pin'])) {
                Log::warning('Public clock-in PIN verification failed', [
                    'user_id' => $user->id,
                    'ip' => $request->ip(),
                ]);
                
                return response()->json([
                    'message' => 'Invalid PIN',
                ], 422);
            }
        }

        // Return employee info (limited)
        return response()->json([
            'employee_id' => $user->id,
            'name' => $user->name,
            'employee_identifier' => $validated['employee_identifier'],
            'has_pin' => !empty($user->clock_pin),
        ]);
    }

    /**
     * Public clock-in (no authentication required)
     */
    public function clockIn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_identifier' => 'required|string',
            'clock_pin' => 'nullable|string|max:10',
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Rate limiting
        $key = 'public-clock-in:' . $request->ip() . ':' . $validated['employee_identifier'];
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'message' => 'Too many attempts. Please try again later.',
            ], 429);
        }

        RateLimiter::hit($key, 3600);

        // Find and verify employee
        $user = User::where('email', $validated['employee_identifier'])
            ->where('is_active', true)
            ->first();

        if (!$user) {
            return response()->json([
                'message' => 'Employee not found',
            ], 404);
        }

        // Verify PIN if set
        if ($user->clock_pin && !$user->verifyClockPin($validated['clock_pin'] ?? null)) {
            Log::warning('Public clock-in failed - invalid PIN', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
            ]);
            
            return response()->json([
                'message' => 'Invalid PIN',
            ], 422);
        }

        // Check if already clocked in
        if ($user->hasActiveClockIn()) {
            return response()->json([
                'message' => 'You are already clocked in',
                'clock_in' => $user->activeClockIn,
            ], 422);
        }

        // Validate location - MANDATORY
        $locationError = $this->locationService->validateCheckInLocation(
            $user,
            $validated['latitude'],
            $validated['longitude']
        );

        if ($locationError) {
            Log::warning('Public clock-in blocked - location validation failed', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
                'error' => $locationError['error'] ?? 'unknown',
            ]);
            
            return response()->json($locationError, 422);
        }

        // Create clock-in record
        $clockIn = StaffClockIn::create([
            'staff_id' => $user->id,
            'branch_id' => $user->assigned_branch_id,
            'facility_id' => $user->facility_id,
            'clock_in_at' => now(),
            'clock_in_latitude' => $validated['latitude'],
            'clock_in_longitude' => $validated['longitude'],
            'notes' => $validated['notes'] ?? null,
            'is_active' => true,
            'clock_method' => 'public',
            'employee_identifier' => $validated['employee_identifier'],
        ]);

        Log::info('Public clock-in successful', [
            'user_id' => $user->id,
            'clock_in_id' => $clockIn->id,
            'ip' => $request->ip(),
        ]);

        event(new StaffClockInCreated($clockIn, 'clock_in'));

        return response()->json([
            'message' => 'Successfully clocked in',
            'clock_in' => $clockIn->load(['staff', 'branch', 'facility']),
        ], 201);
    }

    /**
     * Public clock-out (no authentication required)
     */
    public function clockOut(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'employee_identifier' => 'required|string',
            'clock_pin' => 'nullable|string|max:10',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'notes' => 'nullable|string|max:1000',
        ]);

        // Rate limiting
        $key = 'public-clock-out:' . $request->ip() . ':' . $validated['employee_identifier'];
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return response()->json([
                'message' => 'Too many attempts. Please try again later.',
            ], 429);
        }

        RateLimiter::hit($key, 3600);

        // Find and verify employee
        $user = User::where('email', $validated['employee_identifier'])
            ->where('is_active', true)
            ->first();

        if (!$user) {
            return response()->json([
                'message' => 'Employee not found',
            ], 404);
        }

        // Verify PIN if set
        if ($user->clock_pin && !$user->verifyClockPin($validated['clock_pin'] ?? null)) {
            Log::warning('Public clock-out failed - invalid PIN', [
                'user_id' => $user->id,
                'ip' => $request->ip(),
            ]);
            
            return response()->json([
                'message' => 'Invalid PIN',
            ], 422);
        }

        $activeClockIn = $user->activeClockIn;

        if (!$activeClockIn) {
            return response()->json([
                'message' => 'You are not currently clocked in',
            ], 422);
        }

        // Clock out
        $activeClockIn->clockOut(
            $validated['latitude'] ?? null,
            $validated['longitude'] ?? null
        );

        if (isset($validated['notes'])) {
            $activeClockIn->notes = ($activeClockIn->notes ? $activeClockIn->notes . "\n" : '') . $validated['notes'];
            $activeClockIn->save();
        }

        Log::info('Public clock-out successful', [
            'user_id' => $user->id,
            'clock_in_id' => $activeClockIn->id,
            'ip' => $request->ip(),
        ]);

        event(new StaffClockInCreated($activeClockIn->fresh(), 'clock_out'));

        return response()->json([
            'message' => 'Successfully clocked out',
            'clock_in' => $activeClockIn->fresh()->load(['staff', 'branch', 'facility']),
        ]);
    }
}

