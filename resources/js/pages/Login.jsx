import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ClipboardList, Clock, Home } from 'lucide-react';
import { toast } from 'sonner';
import api, { storeAuthToken } from '../services/api';
import { clearCachedCurrentUser, currentUserQueryOptions, persistFacilityBranding } from '../queries/currentUser';
import { dashboardStatsQueryOptions } from '../queries/dashboardStats';
import { applyThemeCssVariables } from '../hooks/useThemeVariables';
import { useAnimateOnMount } from '../hooks/useAnimateOnMount';
import { slideInLeft, slideInRight, fadeIn, shake, shouldAnimate } from '../utils/animationPresets';
import { getUserLocation, formatDistance } from '../utils/location';
import logger from '../utils/logger';

export default function Login() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [errorDebug, setErrorDebug] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const brandPanelRef = useAnimateOnMount('slideUp', { delay: 0, duration: 600 });
    const formRef = useAnimateOnMount('slideUp', { delay: 200, duration: 600 });
    const errorRef = useRef(null);

    // If user landed on /login with an invite token (e.g. bad redirect), send them to accept-invite
    const [searchParams] = useSearchParams();
    React.useEffect(() => {
        const inviteToken = searchParams.get('token');
        if (location.pathname === '/login' && inviteToken) {
            navigate('/portal/accept-invite?token=' + encodeURIComponent(inviteToken), { replace: true });
        }
    }, [location.pathname, searchParams, navigate]);

    // Redirect if already logged in (but validate token first)
    // Only do this if we're actually on the login page
    // Use a ref to track if component is mounted to prevent redirects after unmount
    const isMountedRef = React.useRef(true);
    
    React.useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);
    
    React.useEffect(() => {
        // Don't run redirect-if-logged-in if we're about to redirect to accept-invite
        if (searchParams.get('token')) return;
        // Only run if we're on the login page and component is still mounted
        if (location.pathname !== '/login' || !isMountedRef.current) return;
        
        const token = localStorage.getItem('auth_token');
        if (token && isMountedRef.current) {
            // Small delay to ensure any previous redirects have completed
            const timeoutId = setTimeout(() => {
                // Triple-check: still on login page, component still mounted, and path hasn't changed
                if (window.location.pathname === '/login' && isMountedRef.current && location.pathname === '/login') {
                    // Validate token by making a quick API call
                    api.get('/user')
                        .then((res) => {
                            if (window.location.pathname === '/login' && isMountedRef.current) {
                                const role = res.data?.role ?? '';
                                navigate(role === 'family' ? '/portal' : '/dashboard', { replace: true });
                            }
                        })
                        .catch((err) => {
                            // Token is invalid, clear it and stay on login page
                            // Only clear if still on login page and component is mounted
                            if (window.location.pathname === '/login' && isMountedRef.current) {
                                localStorage.removeItem('auth_token');
                                localStorage.removeItem('token');
                                localStorage.removeItem('access_token');
                                localStorage.removeItem('user_name');
                                localStorage.removeItem('user_role');
                            }
                            // Don't show error if it's a 401 (expected when token is invalid)
                            if (err.response?.status !== 401) {
                                logger.error('Token validation failed:', err);
                            }
                        });
                }
            }, 100);
            
            return () => clearTimeout(timeoutId);
        }
    }, [navigate, location.pathname]);

    // Request user location on component mount (non-blocking)
    useEffect(() => {
        const requestLocation = async () => {
            setLocationLoading(true);
            try {
                const location = await Promise.race([
                    getUserLocation({
                        timeout: 5000,
                        maximumAge: 60000,
                        enableHighAccuracy: false,
                    }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Location timeout')), 5000)
                    )
                ]);
                if (location) {
                    setUserLocation(location);
                }
            } catch (err) {
                // Silently fail - backend will use IP fallback
                logger.warn('Failed to get user location:', err);
            } finally {
                setLocationLoading(false);
            }
        };

        requestLocation();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const reason = params.get('reason');
        const fromSessionFlag = sessionStorage.getItem('session_expired') === '1';

        if (reason === 'session-expired' || fromSessionFlag) {
            toast.info('Your session expired due to inactivity. Please sign in again.', {
                duration: 3500,
            });
            sessionStorage.removeItem('session_expired');

            if (reason === 'session-expired') {
                params.delete('reason');
                const query = params.toString();
                const nextUrl = query ? `/login?${query}` : '/login';
                window.history.replaceState({}, '', nextUrl);
            }
        }
    }, [location.search]);

    // Animate error message
    useEffect(() => {
        if (error && errorRef.current && shouldAnimate()) {
            shake(errorRef.current, { duration: 500 });
        }
    }, [error]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setErrorDebug(null);
        setLoading(true);

        try {
            // Prepare login payload with location if available
            const loginData = {
                email,
                password,
            };

            // Include location coordinates if available (backend will use IP fallback if not provided)
            if (userLocation) {
                loginData.latitude = userLocation.latitude;
                loginData.longitude = userLocation.longitude;
            }

            const response = await api.post('/login', loginData);

            const token =
                response.data?.token ||
                response.data?.access_token ||
                response.data?.data?.token ||
                null;

            if (token) {
                storeAuthToken(token);
                clearCachedCurrentUser(queryClient);

                // Use facility_branding from the login response to seed the theme BEFORE the
                // in-flight GET /user resolves. Without this, ThemeWrapper's stash fallback
                // returns null during the in-flight window and applies the default HomeLogic360
                // palette (dark blue #1E3A5F), which then races React's render/commit and can
                // remain visible on the dashboard's first paint until a manual refresh.
                const loginUser = response.data?.user;
                const loginBranding =
                    loginUser && loginUser.role !== 'super_admin' && loginUser.facility_branding
                        ? loginUser.facility_branding
                        : null;
                if (loginBranding) {
                    persistFacilityBranding(loginBranding);
                    applyThemeCssVariables(loginBranding);
                }

                // Must fetch GET /user here — do not setQueryData from the login payload alone.
                // Seeding the cache makes prefetchQuery/fetchQuery skip the network request while
                // data looks "fresh", so facility_branding / theme never updates until a full reload.
                const user = await queryClient.fetchQuery(currentUserQueryOptions);
                const effectiveUser = user ?? response.data.user;
                if (effectiveUser) {
                    localStorage.setItem('user_name', effectiveUser.name || effectiveUser.email);
                    localStorage.setItem('user_role', effectiveUser.role || '');
                }
                const role = effectiveUser?.role ?? '';
                // Defer navigation one macrotask so ThemeWrapper/ThemeProvider re-render with the cached user
                // and useLayoutEffect applies facility CSS variables before the dashboard first paints.
                await new Promise((resolve) => setTimeout(resolve, 0));
                if (role === 'family') {
                    navigate('/portal');
                } else {
                    try {
                        await queryClient.prefetchQuery(dashboardStatsQueryOptions);
                    } catch (prefetchErr) {
                        logger.warn('Post-login dashboard prefetch failed:', prefetchErr);
                    }
                    navigate('/dashboard');
                }
            }
        } catch (err) {
            // Handle location-based errors with distance information
            let errorMessage = err.response?.data?.message || 'Invalid credentials. Please try again.';
            if (err.response?.status === 500 && errorMessage === 'An error occurred') {
                errorMessage = 'Sign-in could not complete. Please try again.';
            }
            const distance = err.response?.data?.distance;
            const debug = err.response?.data?.debug;
            if (debug && typeof debug === 'object') {
                setErrorDebug(debug);
            }

            if (distance !== undefined && distance !== null) {
                // Format the error message to include distance if available
                setError(errorMessage);
            } else {
                setError(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-login min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 py-8 sm:py-10 overflow-x-hidden overflow-y-auto">
            <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 min-h-0 flex items-center">
                <div className="w-full grid lg:grid-cols-2 gap-6 items-center">
                    {/* Brand / Welcome Panel - Compact with High Contrast */}
                    <div 
                        ref={brandPanelRef}
                        className="hidden lg:flex flex-col items-center justify-center p-8 rounded-2xl shadow-2xl" 
                        style={{ background: `linear-gradient(135deg, #1e40af, #2563eb, #3b82f6)` }}
                    >
                        <div className="text-center space-y-6">
                            <a
                                href="/"
                                className="flex flex-col items-center space-y-4 hover:opacity-90 transition-opacity cursor-pointer group no-underline"
                            >
                                <div className="h-16 w-16 rounded-full shadow-xl ring-4 ring-white/30 overflow-hidden bg-white/20 backdrop-blur-sm group-hover:ring-white/50 transition-all">
                                    <img
                                        src="/images/logonew.png"
                                        alt="HomeLogic360"
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                </div>
                                <div>
                                    <p className="uppercase tracking-[0.3em] text-xs font-bold text-white/90 mb-2">
                                        HomeLogic360
                                    </p>
                                    <h1 className="text-2xl font-bold leading-tight text-white drop-shadow-lg">
                                        AFH Management System
                                    </h1>
                                </div>
                            </a>
                            <a
                                href="/"
                                className="text-xs text-white/90 font-medium hover:text-white underline"
                            >
                                Click here to return to welcome page
                            </a>
                            <p className="text-white text-sm leading-relaxed max-w-sm font-medium drop-shadow">
                                Streamline resident care, staff communication, and critical operations in one secure platform.
                            </p>
                            <div className="flex flex-col gap-3 text-sm">
                                <div className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-white/20">
                                    <ShieldCheck className="h-5 w-5 text-white" />
                                    <span className="text-white font-semibold">Enterprise Security</span>
                                </div>
                                <div className="flex items-center justify-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-white/20">
                                    <ClipboardList className="h-5 w-5 text-white" />
                                    <span className="text-white font-semibold">Centralized Operations</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Authentication Panel - Compact with High Contrast */}
                    <div className="flex items-center justify-center w-full">
                        <div ref={formRef} className="w-full max-w-md space-y-5">
                            {/* Back to home */}
                            <div className="auth-back-to-welcome flex justify-center mb-1">
                                <a
                                    href="/"
                                    className="auth-back-link inline-flex items-center gap-2 text-sm font-semibold bg-white/0 !text-slate-900 hover:!text-blue-800 underline-offset-2 hover:underline"
                                >
                                    <Home className="w-4 h-4 shrink-0 !text-slate-800" aria-hidden="true" />
                                    <span>Back to Welcome Page</span>
                                </a>
                            </div>

                            {/* Quick Clock-In Button - Compact */}
                            <button
                                onClick={() => window.location.href = '/staff/clock-in'}
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                <Clock className="w-4 h-4" />
                                <span>Quick Clock-In (No Login Required)</span>
                            </button>

                            <div className="text-center space-y-2 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-md border border-gray-200">
                                <p className="text-xs uppercase tracking-[0.3em] text-blue-700 font-bold">Welcome back</p>
                                <h2 className="text-2xl font-bold text-gray-900">Sign in to HomeLogic360</h2>
                            </div>

                            <div className="auth-login-card bg-white border-2 border-gray-300 rounded-xl shadow-xl p-6 space-y-4">
                                {error && (
                                    <div ref={errorRef} className="p-3 bg-red-100 border-2 border-red-400 rounded-lg space-y-2">
                                        <p className="text-sm font-semibold text-red-900">{error}</p>
                                        {errorDebug && (
                                            <pre className="text-xs text-red-950/90 whitespace-pre-wrap break-words max-h-40 overflow-auto bg-red-50/80 border border-red-200 rounded p-2 font-mono">
                                                {errorDebug.message && `[${errorDebug.message}]\n`}
                                                {errorDebug.file && `${errorDebug.file}`}
                                                {errorDebug.line != null && `:${errorDebug.line}`}
                                            </pre>
                                        )}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                                            Email Address
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-5 w-5 text-gray-500" />
                                            </div>
                                            <input
                                                id="email"
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                autoComplete="email"
                                                className="block w-full pl-11 pr-3 py-3 text-sm border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder:text-gray-500 bg-white text-gray-900 font-medium"
                                                placeholder="your-email@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                                            Password
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Lock className="h-5 w-5 text-gray-500" />
                                            </div>
                                            <input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                autoComplete="current-password"
                                                className="block w-full pl-11 pr-11 py-3 text-sm border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-all placeholder:text-gray-500 bg-white text-gray-900 font-medium"
                                                placeholder="Enter your password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((prev) => !prev)}
                                                className="absolute inset-y-0 right-3 flex items-center text-blue-700 hover:text-blue-800 transition-colors font-semibold"
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-5 w-5" />
                                                ) : (
                                                    <Eye className="h-5 w-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end -mt-0.5">
                                        <Link
                                            to="/forgot-password"
                                            className="text-sm font-semibold text-blue-800 hover:text-blue-900 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                                        >
                                            Forgot your password?
                                        </Link>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading || locationLoading}
                                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm"
                                    >
                                        {loading ? 'Signing in...' : locationLoading ? 'Getting location...' : 'Sign In'}
                                    </button>
                                </form>

                                <div className="pt-4 border-t-2 border-gray-300">
                                    <p className="auth-login-help text-sm text-gray-800 text-center font-medium">
                                        Need help?{' '}
                                        <a
                                            href="mailto:support@homelogic360.com"
                                            className="font-bold text-blue-800 hover:text-blue-900 hover:underline transition-colors"
                                        >
                                            Contact support
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
