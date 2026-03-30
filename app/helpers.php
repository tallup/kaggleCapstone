<?php

declare(strict_types=1);

use Illuminate\Http\Response;

if (! function_exists('spa_response')) {
    /**
     * Single-page app shell: must not be cached by browsers or edge CDNs, or users
     * keep an old @vite manifest and request deleted chunk files after deploys.
     *
     * Defined here (autoloaded) — not in routes/web.php — so php artisan route:cache works.
     */
    function spa_response(): Response
    {
        return response()
            ->view('react-app')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }
}
