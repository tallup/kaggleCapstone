/**
 * Recover from stale hashed chunks after a deploy. Use a normal top-level
 * reload so the browser performs a document navigation. Avoid appending query
 * params (e.g. ?_chunk=) — that can cause multiple full navigations in quick
 * succession during chunk-retry + error-boundary recovery and has been reported
 * to trigger Chrome saving the route name as a small downloaded file instead
 * of rendering HTML.
 *
 * Fresh Vite asset URLs depend on the SPA shell not being cached forever; the
 * server sets Cache-Control on the react-app view (see SecurityHeaders).
 */
export function hardReloadWithCacheBust() {
    window.location.reload();
}
