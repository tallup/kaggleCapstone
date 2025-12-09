<?php

namespace App\Http\Middleware;

use App\Constants\UserRoles;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureBranchAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        if (UserRoles::isCaregiverRole($user->role)) {
            if (!$user->assigned_branch_id) {
                return response()->json([
                    'message' => 'No branch assigned. Please contact administrator.',
                ], 403);
            }
        }

        return $next($request);
    }
}




























