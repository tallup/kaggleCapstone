<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

        if ($request->secure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains'
            );
        }

        // SPA shell (backup if routes ever return view() without spa_response headers).
        // BinaryFileResponse (e.g. backup downloads) has no getOriginalContent(); avoid fatal error.
        if (method_exists($response, 'getOriginalContent')) {
            $original = $response->getOriginalContent();
            if ($original instanceof \Illuminate\Contracts\View\View && $original->name() === 'react-app') {
                $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
                $response->headers->set('Pragma', 'no-cache');
            }
        }

        return $response;
    }
}
