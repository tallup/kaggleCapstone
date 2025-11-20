<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ActivityLogService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::attempt($credentials)) {
            /** @var \App\Models\User $user */
            $user = Auth::user();

            if (!$user?->is_active) {
                // Immediately end the session and block login for inactive accounts
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return response()->json([
                    'message' => 'This account has been deactivated. Please contact an administrator.',
                ], 403);
            }

            $token = $user->createToken('api-token')->plainTextToken;
            
            // Regenerate session to prevent session fixation attacks
            $request->session()->regenerate();

            // Log login
            ActivityLogService::login($user, [
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'user' => $this->transformUser($user),
                'token' => $token,
            ]);
        }

        return response()->json([
            'message' => 'Invalid credentials',
        ], 401);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Log logout before deleting tokens
        if ($user) {
            ActivityLogService::logout($user, [
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        }
        
        $request->user()->tokens()->delete();

        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($this->transformUser($request->user()));
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        // Verify current password
        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect',
            ], 422);
        }

        // Update password
        $user->password = Hash::make($validated['password']);
        $user->save();

        return response()->json([
            'message' => 'Password changed successfully',
        ]);
    }

    /**
     * Attach application timezone metadata to the user payload.
     */
    protected function transformUser(?\App\Models\User $user): array
    {
        if (!$user) {
            return [];
        }

        // Make sure commonly-used relationships are available in the API payload.
        // This includes the user's assigned branch and its facility so that
        // frontend pages (e.g. profile, housekeeping, medications) can safely
        // reference `user.assigned_branch` without needing extra API calls.
        $user->loadMissing([
            'assignedBranch.facility',
            'facility',
        ]);

        $appTimezone = config('app.timezone', 'UTC');
        $now = Carbon::now($appTimezone);

        $payload = $user->toArray();
        $payload['app_timezone'] = $appTimezone;
        $payload['app_timezone_abbr'] = $now->format('T');
        $payload['app_timezone_offset'] = $now->format('P');
        $payload['app_current_time'] = $now->toIso8601String();
        
        // Include facility branding if available
        if ($user->facility) {
            $payload['facility_branding'] = $user->facility->branding;
        } elseif ($user->assignedBranch && $user->assignedBranch->facility) {
            $payload['facility_branding'] = $user->assignedBranch->facility->branding;
        } else {
            // Default branding for super admin / HomeLogic360
            $payload['facility_branding'] = [
                'name' => 'HomeLogic360',
                'logo' => asset('images/logonew.png'),
                'primary_color' => '#1E3A5F', // Dark blue from logo
                'secondary_color' => '#86EFAC', // Light green from logo
                'accent_color' => '#FFFFFF', // White from logo
            ];
        }

        return $payload;
    }
}

