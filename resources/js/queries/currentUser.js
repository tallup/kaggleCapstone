import api, { clearStoredAuth } from '../services/api';
import logger from '../utils/logger';

/** Shared React Query key for GET /api/v1/user */
export const CURRENT_USER_QUERY_KEY = ['current-user'];

/** 3 minutes — balances freshness with fewer round-trips than staleTime: 0 */
export const CURRENT_USER_STALE_MS = 3 * 60 * 1000;

/**
 * Call after storing a new auth token. While on /login (or other public routes), GET /user
 * caches `null` with a fresh stale window; without clearing that, React Query will not refetch
 * after login and the sidebar shows "No navigation items available" until a full refresh.
 */
export function clearCachedCurrentUser(queryClient) {
    queryClient.removeQueries({ queryKey: CURRENT_USER_QUERY_KEY });
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
        return response.data;
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
