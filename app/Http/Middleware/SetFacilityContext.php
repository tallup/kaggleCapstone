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
            }
            
            // If no facility found from subdomain (or no subdomain), try user's facility_id then branch.
            // Apex domains (e.g. homelogic360.net) have no subdomain — this path is normal, not an error.
            if (!$facility) {
                if ($user->facility_id) {
                    $facility = Cache::remember("facility.{$user->facility_id}", 3600, function () use ($user) {
                        return $user->facility;
                    });
                } elseif ($user->assigned_branch_id) {
                    $facility = Cache::remember("facility.branch.{$user->assigned_branch_id}", 3600, function () use ($user) {
                        $branch = \App\Models\Branch::find($user->assigned_branch_id);
                        return $branch ? $branch->facility : null;
                    });
                }

                if (!$facility && $user->role !== 'super_admin') {
                    \Illuminate\Support\Facades\Log::warning('SetFacilityContext: Could not resolve facility for user', [
                        'user_id' => $user->id,
                        'facility_id' => $user->facility_id,
                        'assigned_branch_id' => $user->assigned_branch_id,
                    ]);
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
        $host = strtolower($request->getHost());
        $base = config('app.facility_base_domain');
        $candidate = null;

        if (is_string($base) && $base !== '') {
            $base = strtolower($base);
            if ($host !== $base && str_ends_with($host, '.'.$base)) {
                $candidate = substr($host, 0, -strlen('.'.$base));
            }
        }

        if ($candidate === null) {
            $parts = explode('.', $host);
            if (count($parts) > 2) {
                $candidate = $parts[0];
            }
        }

        if ($candidate === null || $candidate === '') {
            return null;
        }

        if (str_contains($candidate, '.')) {
            return null;
        }

        $reserved = ['www', 'app', 'api', 'admin', 'mail', 'ftp', 'cdn', 'static'];
        if (in_array($candidate, $reserved, true)) {
            return null;
        }

        return $candidate;
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
