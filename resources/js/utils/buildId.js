const STORAGE_KEY = 'app_build_manifest_mtime';

/**
 * After a deploy, the HTML shell gets a new __APP_BUILD_ID__ (manifest mtime).
 * If sessionStorage still has the old id, the main bundle can reference deleted
 * chunk URLs — reload once after clearing SW + Cache API so the next paint
 * uses the new app-*.js and chunk hashes.
 */
export function reconcileAppBuildId() {
    if (typeof window === 'undefined') {
        return false;
    }
    const id = window.__APP_BUILD_ID__;
    if (!id) {
        return false;
    }
    try {
        const prev = sessionStorage.getItem(STORAGE_KEY);
        if (prev && prev !== id) {
            sessionStorage.setItem(STORAGE_KEY, id);
            sessionStorage.removeItem('module_reload_attempted');
            if ('caches' in window) {
                caches.keys().then((names) => names.forEach((n) => caches.delete(n)));
            }
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((regs) =>
                    regs.forEach((r) => r.unregister())
                );
            }
            window.location.reload();
            return true;
        }
        sessionStorage.setItem(STORAGE_KEY, id);
    } catch {
        /* ignore private mode / quota */
    }
    return false;
}
