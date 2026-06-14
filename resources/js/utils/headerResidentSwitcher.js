/**
 * Hub path prefixes and URL helpers for the header resident switcher.
 * Keep RESIDENT_* and CLINICAL_* in sync with sidebar active state in Layout.jsx.
 */

/** Prefixes for Residents hub routes (excludes /residents hub index — handled separately). */
export const RESIDENT_HUB_PREFIXES = [
    '/my-residents',
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
    '/appointments',
    '/assessments',
    '/charts',
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

export function isClinicalSectionForSwitcher(pathname) {
    if (pathname === '/clinical') return true;
    return CLINICAL_HUB_PREFIXES.some(p => pathnameMatchesPrefix(pathname, p));
}

/**
 * Whether the compact resident avatar strip should appear in the app header.
 * Clinical hub index (/clinical) keeps cards-only overview without the strip.
 */
export function shouldShowHeaderResidentSwitcher(pathname) {
    if (!pathname) return false;
    if (pathname === '/clinical') {
        return false;
    }
    return isResidentsHubPathForSwitcher(pathname) || isClinicalSectionForSwitcher(pathname);
}

const RE_MY_RESIDENTS = /^\/my-residents\/([^/]+)/;

/**
 * Path after /my-residents/:residentId (e.g. "/medications/list", or "" on the resident hub index).
 */
export function getMyResidentsPathSuffix(pathname) {
    if (!pathname || !pathname.startsWith('/my-residents/')) return '';
    const rest = pathname.replace(/^\/my-residents\/[^/]+/, '');
    return rest || '';
}
const RE_RESIDENTS_DETAIL = /^\/residents\/([^/]+)\/detail/;
const RE_CHARTS_RESIDENT = /^\/charts\/resident\/([^/]+)/;
const RE_APPT_CREATE = /^\/appointments\/create\/([^/]+)/;

/** Query key for cross-tab resident scope in the Residents hub (Synkwise-style switcher). */
export const RESIDENT_CONTEXT_QUERY_KEY = 'residentId';

/**
 * Compare query strings without treating key order as a change.
 * React Router / the browser may serialize ?a=1&b=2 vs ?b=2&a=1; string compare would loop on setSearchParams.
 */
export function urlSearchParamsShallowEqual(a, b) {
    const toSp = (x) => {
        if (x instanceof URLSearchParams) return x;
        const s = x == null ? '' : String(x);
        return new URLSearchParams(s.startsWith('?') ? s.slice(1) : s);
    };
    const aa = toSp(a);
    const bb = toSp(b);
    if (aa.toString() === bb.toString()) return true;
    const keys = new Set([...aa.keys(), ...bb.keys()]);
    for (const k of keys) {
        if (aa.get(k) !== bb.get(k)) return false;
    }
    return true;
}

/**
 * Active resident: `residentId` or `resident_id` query wins; else id embedded in path.
 */
export function parseResidentContextId(search, pathname) {
    const sp = new URLSearchParams(search?.startsWith('?') ? search.slice(1) : search || '');
    // Canonical query key first (matches header switcher), then legacy aliases.
    const q = sp.get(RESIDENT_CONTEXT_QUERY_KEY) || sp.get('resident_id') || sp.get('resident');
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
 * Residents hub: stay on the current screen shape. On `/my-residents/:id`, switch via path (preserve e.g. `tab`);
 * on list/overview routes, scope with `residentId` in the query string.
 * @returns {{ pathname: string, search: string }}
 */
export function buildResidentsSectionResidentNavigateTo(pathname, search, newResidentId) {
    const id = String(newResidentId);
    const sp = new URLSearchParams(search?.startsWith('?') ? search.slice(1) : search || '');

    // Resident hub profile: stay on /my-residents/:id (preserve tab= etc.), not the card grid with ?residentId=
    if (pathname.match(RE_MY_RESIDENTS)) {
        sp.delete(RESIDENT_CONTEXT_QUERY_KEY);
        sp.delete('resident_id');
        sp.delete('resident');
        const hubSearch = sp.toString() ? `?${sp.toString()}` : '';
        const suffix = getMyResidentsPathSuffix(pathname);
        return { pathname: `/my-residents/${id}${suffix}`, search: hubSearch };
    }

    sp.set(RESIDENT_CONTEXT_QUERY_KEY, id);
    sp.delete('resident');
    sp.delete('resident_id');
    const searchStr = sp.toString() ? `?${sp.toString()}` : '';
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
 * Clinical hub list routes: keep the same pathname and swap resident via ?residentId= (not /my-residents/...).
 */
function buildClinicalListHrefWithResident(pathname, search, newResidentId) {
    const id = String(newResidentId);
    if (!pathname) return null;

    const pathOk =
        pathname === '/medication-history'
        || pathname === '/vitals'
        || pathname === '/view-vitals'
        || pathname === '/sleep'
        || pathname === '/sleep-patterns'
        || pathname.startsWith('/sleep-patterns/')
        || pathname === '/medication-deliveries'
        || pathname.startsWith('/medication-deliveries/')
        || pathname === '/assessments'
        || pathname === '/appointments'
        || pathname.startsWith('/appointments/dashboard')
        || (pathname.startsWith('/medications') && !/^\/medications\/residents\/[^/]+/.test(pathname));

    if (!pathOk) return null;

    const sp = new URLSearchParams(search?.startsWith('?') ? search.slice(1) : search || '');
    sp.set(RESIDENT_CONTEXT_QUERY_KEY, id);
    sp.delete('resident');
    sp.delete('resident_id');
    const qs = sp.toString();
    return `${pathname}${qs ? `?${qs}` : ''}`;
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
        const suffix = getMyResidentsPathSuffix(pathname);
        return `/my-residents/${id}${suffix}${search || ''}`;
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

    const clinicalList = buildClinicalListHrefWithResident(pathname, search, id);
    if (clinicalList) return clinicalList;

    const tab = defaultTabForPathWhenSwitchingToHub(pathname);
    if (tab === 'medications') {
        return `/my-residents/${id}/medications/list`;
    }
    if (tab) {
        return `/my-residents/${id}?tab=${encodeURIComponent(tab)}`;
    }
    return `/my-residents/${id}`;
}
