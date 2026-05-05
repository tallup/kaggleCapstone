/**
 * URL-safe slug for facility subdomain (lowercase, hyphens).
 */
export function slugifyFacilitySubdomain(name) {
    if (!name || typeof name !== 'string') {
        return '';
    }
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 63);
}

/**
 * Full URL for staff to open this facility on the current deployment host.
 */
export function getFacilityPortalUrlPreview(subdomain) {
    if (typeof window === 'undefined') {
        return '';
    }
    const s = String(subdomain || '').trim().toLowerCase();
    if (!s) {
        return '';
    }
    const { protocol, hostname } = window.location;
    return `${protocol}//${s}.${hostname}`;
}
