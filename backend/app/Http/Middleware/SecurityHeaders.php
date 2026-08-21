<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**Apply security hardening headers to all HTTP responses.
 *
 * Per Security.md §A12 (HTTPS, CORS & Security Headers):
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: deny (or SAMEORIGIN when embedding is required)
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy: restrict unnecessary browser features
 * - Strict-Transport-Security: only when APP_ENV is production (HTTPS)
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');

        // HSTS only meaningful over HTTPS; enable in production.
        if (app()->environment('production')) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }
}
