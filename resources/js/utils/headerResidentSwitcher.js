/**
 * Hub path prefixes and URL helpers for the header resident switcher.
 * Keep RESIDENT_* and CLINICAL_* in sync with sidebar active state in Layout.jsx.
 */

/** Prefixes for Residents hub routes (excludes /residents hub index — handled separately). */
export const RESIDENT_HUB_PREFIXES = [
    '/my-residents',
    '/assessments',
    '/appointments',
    '/charts',
    '/t-logs',
];

/** Legacy: /residents/:id/detail (does not match /residents/sign-out). */
export const RESIDENT_LEGACY_DETAIL = /^\/residents\/[^/]+\/detail(?:\/|$)/;

/** Prefixes for Clinical hub (excludes /clinical index — handled separately). */
export const CLINICAL_HUB_PREFIXES = [
    '/vitals',
    '/view-vitals',
    '/medication-history',
    '/sleep',
    '/sleep-patterns',
    '/medications',
    '/medication-deliveries',
];

const RESIDENTS_MANAGEMENT_PATH_PREFIXES = ['/residents/sign-out', '/residents/sign-outs'];

function pathnameMatchesPrefix(pathname, prefix) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** True when pathname is in the Residents sidebar hub (not Clinical). */
export function isResidentsHubPathForSwitcher(pathname) {
    if (pathname === '/residents') return true;
    if (RESIDENTS_MANAGEMENT_PATH_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
        return false;
    }
    if (pathname.startsWith('/residents/')) return true;
    return RESIDENT_HUB_PREFIXES.some(p => pathnameMatchesPrefix(pathname, p));
}

function isClinicalSectionForSwitcher(pathname) {
    if (pathname === '/clinical') return true;
    return CLINICAL_HUB_PREFIXES.some(p => pathnameMatchesPrefix(pathname, p));
}

/**
 * Whether the compact resident avatar strip should appear in the app header.
 */
export function shouldShowHeaderResidentSwitcher(pathname) {
    if (!pathname) return false;
    return isResidentsHubPathForSwitcher(pathname) || isClinicalSectionForSwitcher(pathname);
}

const RE_MY_RESIDENTS = /^\/my-residents\/([^/]+)/;
const RE_RESIDENTS_DETAIL = /^\/residents\/([^/]+)\/detail/;
const RE_CHARTS_RESIDENT = /^\/charts\/resident\/([^/]+)/;
const RE_APPT_CREATE = /^\/appointments\/create\/([^/]+)/;

/** Query key for cross-tab resident scope in the Residents hub (Synkwise-style switcher). */
export const RESIDENT_CONTEXT_QUERY_KEY = 'residentId';

/**
 * Active resident: `residentId` or `resident_id` query wins; else id embedded in path.
 */
export function parseResidentContextId(search, pathname) {
    const sp = new URLSearchParams(search?.startsWith('?') ? search.slice(1) : search || '');
    const q = sp.get(RESIDENT_CONTEXT_QUERY_KEY) || sp.get('resident_id');
    if (q) return String(q);
    return parseResidentIdFromPath(pathname);
}

/**
 * Carry `residentId` onto another path (section tab links, hub tiles).
 */
export function buildPathWithPreservedResident(basePath, currentSearch) {
    const sp = new URLSearchParams(currentSearch?.startsWith('?') ? currentSearch.slice(1) : currentSearch || '');
    const rid = sp.get(RESIDENT_CONTEXT_QUERY_KEY);
    if (!rid) return basePath;
    const n = new URLSearchParams();
    n.set(RESIDENT_CONTEXT_QUERY_KEY, rid);
    return `${basePath}?${n.toString()}`;
}

/** Search string with residentId removed (leading `?` or empty). */
export function clearResidentFromSearch(currentSearch) {
    const sp = new URLSearchParams(currentSearch?.startsWith('?') ? currentSearch.slice(1) : currentSearch || '');
    sp.delete(RESIDENT_CONTEXT_QUERY_KEY);
    const s = sp.toString();
    return s ? `?${s}` : '';
}

/**
 * Residents hub: stay on current screen shape; set scope via `residentId` (no jump to /my-residents/:id).
 * @returns {{ pathname: string, search: string }}
 */
export function buildResidentsSectionResidentNavigateTo(pathname, search, newResidentId) {
    const id = String(newResidentId);
    const sp = new URLSearchParams(search?.startsWith('?') ? search.slice(1) : search || '');
    sp.set(RESIDENT_CONTEXT_QUERY_KEY, id);
    const searchStr = sp.toString() ? `?${sp.toString()}` : '';

    if (pathname.match(RE_MY_RESIDENTS)) {
        return { pathname: '/my-residents', search: searchStr };
    }
    if (pathname.match(RE_CHARTS_RESIDENT)) {
        return { pathname: `/charts/resident/${id}`, search: searchStr };
    }
    if (pathname === '/charts') {
        return { pathname: `/charts/resident/${id}`, search: searchStr };
    }
    if (pathname.match(RE_APPT_CREATE)) {
        return { pathname: `/appointments/create/${id}`, search: searchStr };
    }
    if (pathname.match(RE_RESIDENTS_DETAIL)) {
        return { pathname: `/residents/${id}/detail`, search: searchStr };
    }

    return { pathname, search: searchStr };
}

/**
 * Resident id from URL when the current route is scoped to one resident, else null.
 */
export function parseResidentIdFromPath(pathname) {
    if (!pathname) return null;
    let m = pathname.match(RE_MY_RESIDENTS);
    if (m) return m[1];
    m = pathname.match(RE_RESIDENTS_DETAIL);
    if (m) return m[1];
    m = pathname.match(RE_CHARTS_RESIDENT);
    if (m) return m[1];
    m = pathname.match(RE_APPT_CREATE);
    if (m) return m[1];
    return null;
}

function defaultTabForPathWhenSwitchingToHub(pathname) {
    if (!pathname) return null;
    if (pathname.startsWith('/medications') || pathname.startsWith('/medication-history') || pathname.startsWith('/medication-deliveries')) {
        return 'medications';
    }
    if (pathname.startsWith('/vitals') || pathname.startsWith('/view-vitals')) {
        return 'vitals';
    }
    return null;
}

/**
 * Target path + query when choosing a resident from the header strip.
 * @param {string} pathname
 * @param {string} search - location.search including leading ?
 * @param {string} newResidentId
 * @returns {string}
 */
export function buildSwitchHref(pathname, search, newResidentId) {
    const id = String(newResidentId);

    if (pathname.match(RE_MY_RESIDENTS)) {
        return `/my-residents/${id}${search || ''}`;
    }
    if (pathname.match(RE_RESIDENTS_DETAIL)) {
        return `/residents/${id}/detail${search || ''}`;
    }
    if (pathname.match(RE_CHARTS_RESIDENT)) {
        return `/charts/resident/${id}${search || ''}`;
    }
    if (pathname.match(RE_APPT_CREATE)) {
        return `/appointments/create/${id}${search || ''}`;
    }

    const tab = defaultTabForPathWhenSwitchingToHub(pathname);
    if (tab) {
        return `/my-residents/${id}?tab=${encodeURIComponent(tab)}`;
    }
    return `/my-residents/${id}`;
}
