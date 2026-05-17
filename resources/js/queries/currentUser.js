import api, { clearStoredAuth } from '../services/api';
import logger from '../utils/logger';

/** Shared React Query key for GET /api/v1/user */
export const CURRENT_USER_QUERY_KEY = ['current-user'];

/**
 * Last facility branding (session) — read synchronously in ThemeWrapper while GET /user is in flight
 * so the first paint is not the default HomeLogic theme. Cleared on logout and before a new login.
 */
export const FACILITY_BRANDING_SESSION_KEY = 'hl360_facility_branding_v1';

/** 3 minutes — balances freshness with fewer round-trips than staleTime: 0 */
export const CURRENT_USER_STALE_MS = 3 * 60 * 1000;

/**
 * Call after storing a new auth token. While on /login (or other public routes), GET /user
 * caches `null` with a fresh stale window; without clearing that, React Query will not refetch
 * after login and the sidebar shows "No navigation items available" until a full refresh.
 *
 * After login, use `queryClient.fetchQuery(currentUserQueryOptions)` — not `setQueryData` from
 * the login JSON — so the next request always runs GET /user; otherwise React Query can skip
 * the network (cache looks fresh) and facility branding / theme stay wrong until reload.
 *
 * Note: this no longer touches the facility branding sessionStorage stash. Stash lifecycle is
 * owned by login (writes via `persistFacilityBranding`) and logout (`clearFacilityBrandingStash`)
 * so the in-flight window between cache clear and the new /user response can still render with
 * the correct facility theme instead of flashing the default HomeLogic palette.
 */
export function clearCachedCurrentUser(queryClient) {
    queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
}

/**
 * Write a facility branding object into sessionStorage so ThemeWrapper's stash fallback can
 * render with the correct colors while GET /user is in flight (e.g. immediately after login).
 */
export function persistFacilityBranding(branding) {
    if (!branding || typeof branding !== 'object') return;
    try {
        sessionStorage.setItem(FACILITY_BRANDING_SESSION_KEY, JSON.stringify(branding));
    } catch (e) {
        /* ignore */
    }
}

/**
 * Remove any stashed facility branding. Called on explicit logout so the next user does not
 * briefly see the previous facility's theme.
 */
export function clearFacilityBrandingStash() {
    try {
        sessionStorage.removeItem(FACILITY_BRANDING_SESSION_KEY);
    } catch (e) {
        /* ignore */
    }
}

function persistFacilityBrandingFromUserPayload(data) {
    if (!data) return;
    if (data.role === 'super_admin') {
        clearFacilityBrandingStash();
        return;
    }
    if (data.facility_branding && typeof data.facility_branding === 'object') {
        persistFacilityBranding(data.facility_branding);
    }
}

function isPublicAppPath(pathname) {
    if (!pathname) return false;
    const publicPrefixes = [
        '/', '/login', '/forgot-password', '/reset-password',
        '/portal/accept-invite',
        '/staff/clock-in', '/features', '/pricing', '/modules',
        '/security', '/about', '/contact', '/support',
        '/privacy-policy', '/terms-of-service', '/hipaa-compliance', '/cookie-policy',
        '/blog', '/register-facility', '/facility-setup', '/documentation',
    ];
    return publicPrefixes.some((prefix) => {
        if (prefix === '/') return pathname === '/';
        return pathname === prefix || pathname.startsWith(`${prefix}/`);
    });
}

/**
 * Single implementation for ThemeWrapper + Layout: shared cache, consistent staleTime.
 * 401 on protected routes triggers session cleanup + redirect; on public routes returns null.
 */
export async function fetchCurrentUserUnified() {
    try {
        const response = await api.get('/user');
        const data = response.data;
        persistFacilityBrandingFromUserPayload(data);
        return data;
    } catch (err) {
        if (err?.response?.status === 401) {
            if (!isPublicAppPath(window.location.pathname)) {
                clearStoredAuth();
                sessionStorage.setItem('session_expired', '1');
                if (!sessionStorage.getItem('redirecting_to_login')) {
                    sessionStorage.setItem('redirecting_to_login', 'true');
                    setTimeout(() => {
                        sessionStorage.removeItem('redirecting_to_login');
                        window.location.href = '/login?reason=session-expired';
                    }, 50);
                }
            }
            return null;
        }
        logger.error('Failed to fetch current user:', err);
        return null;
    }
}

export const currentUserQueryOptions = {
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: fetchCurrentUserUnified,
    staleTime: CURRENT_USER_STALE_MS,
    retry: 1,
};
