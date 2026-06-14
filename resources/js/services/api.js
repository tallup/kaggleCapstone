import axios from 'axios';
import { reconnectEcho } from './echo';

const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
});

const TOKEN_EXPIRY_MINUTES = 240;
const REFRESH_BUFFER_MINUTES = 10;

const getStoredAuthToken = () => {
    const candidates = [
        localStorage.getItem('auth_token'),
        localStorage.getItem('token'),
        localStorage.getItem('access_token'),
    ];

    const token = candidates.find((value) =>
        typeof value === 'string' &&
        value.trim() !== '' &&
        value !== 'null' &&
        value !== 'undefined'
    );

    return token || null;
};

const storeAuthToken = (token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('access_token', token);
    localStorage.setItem('token_issued_at', new Date().toISOString());
};

const clearStoredAuth = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_role');
    localStorage.removeItem('token_issued_at');
    sessionStorage.removeItem('token_validated_at');
};

const isPublicPath = (path) => {
    const publicPrefixes = [
        '/', '/login', '/forgot-password', '/reset-password',
        '/portal/accept-invite',
        '/staff/clock-in', '/features', '/pricing', '/modules',
        '/security', '/about', '/contact', '/support',
        '/privacy-policy', '/terms-of-service', '/hipaa-compliance', '/cookie-policy',
    ];

    return publicPrefixes.some((prefix) => {
        if (prefix === '/') return path === '/';
        return path === prefix || path.startsWith(prefix + '/');
    });
};

let isRefreshing = false;
let refreshSubscribers = [];

const onRefreshed = (newToken) => {
    refreshSubscribers.forEach((cb) => cb(newToken));
    refreshSubscribers = [];
};

const addRefreshSubscriber = (callback) => {
    refreshSubscribers.push(callback);
};

api.interceptors.request.use((config) => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (token) {
        config.headers['X-CSRF-TOKEN'] = token;
    }
    
    const authToken = getStoredAuthToken();
    const path = typeof config.url === 'string' ? config.url : '';
    // Never attach Bearer to auth endpoints — stale tokens after logout caused 401/500 confusion
    const skipBearer =
        /(^|\/)(login|forgot-password|reset-password)(\/|$|\?)/.test(path) ||
        path === 'login' ||
        path.startsWith('login?');
    if (authToken && !skipBearer) {
        config.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401) {
            const currentPath = window.location.pathname;

            if (isPublicPath(currentPath)) {
                return Promise.reject(error);
            }

            if (originalRequest.url === '/token/refresh' || originalRequest._retry) {
                clearStoredAuth();
                sessionStorage.setItem('session_expired', '1');
                if (!sessionStorage.getItem('redirecting_to_login')) {
                    sessionStorage.setItem('redirecting_to_login', 'true');
                    setTimeout(() => {
                        sessionStorage.removeItem('redirecting_to_login');
                        if (!isPublicPath(window.location.pathname)) {
                            window.location.href = '/login?reason=session-expired';
                        }
                    }, 100);
                }
                return Promise.reject(error);
            }

            if (isRefreshing) {
                return new Promise((resolve) => {
                    addRefreshSubscriber((newToken) => {
                        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                        originalRequest._retry = true;
                        resolve(api(originalRequest));
                    });
                });
            }

            isRefreshing = true;
            originalRequest._retry = true;

            try {
                const response = await axios.post('/api/v1/token/refresh', {}, {
                    headers: {
                        'Authorization': `Bearer ${getStoredAuthToken()}`,
                        'Accept': 'application/json',
                    },
                    withCredentials: true,
                });

                const newToken = response.data.token;
                storeAuthToken(newToken);
                reconnectEcho();
                isRefreshing = false;
                onRefreshed(newToken);

                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                refreshSubscribers = [];
                clearStoredAuth();
                sessionStorage.setItem('session_expired', '1');
                if (!sessionStorage.getItem('redirecting_to_login')) {
                    sessionStorage.setItem('redirecting_to_login', 'true');
                    setTimeout(() => {
                        sessionStorage.removeItem('redirecting_to_login');
                        if (!isPublicPath(window.location.pathname)) {
                            window.location.href = '/login?reason=session-expired';
                        }
                    }, 100);
                }
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export const setupProactiveRefresh = () => {
    const INTERVAL_MS = (TOKEN_EXPIRY_MINUTES - REFRESH_BUFFER_MINUTES) * 60 * 1000;

    const tryRefresh = async () => {
        const issuedAt = localStorage.getItem('token_issued_at');
        if (!issuedAt || !getStoredAuthToken()) return;

        const elapsed = Date.now() - new Date(issuedAt).getTime();
        if (elapsed < INTERVAL_MS) return;

        try {
            const response = await api.post('/token/refresh');
            storeAuthToken(response.data.token);
            reconnectEcho();
        } catch {
            // Refresh failed; the 401 interceptor will handle it on the next real request
        }
    };

    const intervalId = setInterval(tryRefresh, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
};

export { getStoredAuthToken, storeAuthToken, clearStoredAuth };
export default api;
