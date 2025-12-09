<?php

namespace App\Http\Middleware;

use App\Models\Facility;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

class SetFacilityContext
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();
        $facility = null;

        // Super admins don't have facility context restrictions
        if ($user && $user->role === 'super_admin') {
            // For super admins, prioritize path-based facility ID extraction
            // This ensures when editing a facility, that facility's branding is used
            $facilityId = $this->extractFacilityIdFromPath($request);
            if ($facilityId) {
                $facility = Cache::remember("facility.{$facilityId}", 3600, function () use ($facilityId) {
                    return Facility::find($facilityId);
                });
            }
            
            // If no facility found from path, check subdomain
            if (!$facility) {
                $subdomain = $this->extractSubdomain($request);
                if ($subdomain) {
                    $facility = Cache::remember("facility.subdomain.{$subdomain}", 3600, function () use ($subdomain) {
                        return Facility::where('subdomain', $subdomain)->first();
                    });
                }
            }
        } elseif ($user) {
            // Try to get facility from subdomain first
            $subdomain = $this->extractSubdomain($request);
            if ($subdomain) {
                $facility = Cache::remember("facility.subdomain.{$subdomain}", 3600, function () use ($subdomain) {
                    return Facility::where('subdomain', $subdomain)->first();
                });
                
                // Verify user belongs to this facility
                if ($facility && $user->facility_id !== $facility->id) {
                    abort(403, 'You do not have access to this facility.');
                }
            } else {
                // Use user's facility_id for path-based routing (cache the relationship)
                if ($user->facility_id) {
                    $facility = Cache::remember("facility.{$user->facility_id}", 3600, function () use ($user) {
                        return $user->facility;
                    });
                }
            }
        }

        // Set facility in request and app container
        if ($facility) {
            $request->merge(['facility' => $facility]);
            app()->instance('facility', $facility);
        }

        return $next($request);
    }

    /**
     * Extract subdomain from request
     */
    private function extractSubdomain(Request $request): ?string
    {
        $host = $request->getHost();
        $parts = explode('.', $host);
        
        // If we have more than 2 parts, the first is likely the subdomain
        // e.g., evergreen.yourapp.com -> evergreen
        if (count($parts) > 2) {
            return $parts[0];
        }

        return null;
    }

    /**
     * Extract facility ID from URL path
     * Matches patterns like:
     * - /super-admin/facilities/10/edit
     * - /admin/facilities/10/edit
     * - /facilities/10/edit
     * - /facilities/10
     */
    private function extractFacilityIdFromPath(Request $request): ?int
    {
        $path = $request->path();
        
        // Match any path containing /facilities/{id}
        // This handles: /admin/facilities/{id}, /super-admin/facilities/{id}, /facilities/{id}
        if (preg_match('/facilities\/(\d+)/', $path, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }
}
