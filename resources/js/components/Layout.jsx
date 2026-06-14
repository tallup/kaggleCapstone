import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { setupProactiveRefresh, clearStoredAuth, getStoredAuthToken } from '../services/api';
import { 
    LayoutDashboard, 
    Building2, 
    Users, 
    FileText, 
    Bell,
    Monitor,
    RefreshCw,
    Maximize2,
    User,
    LogOut,
    Settings,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    Command,
    Clock,
    Shield,
    ArrowRightFromLine,
    ArrowLeftToLine,
    UserPlus,
    Stethoscope,
    Wrench,
    Briefcase,
    UsersRound,
} from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import ReminderPanel from './ReminderPanel';
import { useToastContext } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import CommandPalette from './ui/CommandPalette';
import PageTransition from './PageTransition';
import PWAInstallPrompt from './PWAInstallPrompt';
import OfflineIndicator from './OfflineIndicator';
import RealtimeIndicator from './RealtimeIndicator';
import DropdownMenu, { DropdownMenuItem, DropdownMenuSeparator } from './ui/radix/DropdownMenu';
import Tooltip from './ui/Tooltip';
import PageBackButton from './ui/PageBackButton';
import HeaderResidentSwitcher from './HeaderResidentSwitcher';
import {
    RESIDENT_HUB_PREFIXES,
    RESIDENT_LEGACY_DETAIL,
    CLINICAL_HUB_PREFIXES,
    shouldShowHeaderResidentSwitcher,
} from '../utils/headerResidentSwitcher';
import { filterNavigationByModuleAccess } from '../utils/moduleAccess';
import { filterNavigationByPermissionAccess } from '../utils/permissionAccess';
import {
    PACIFIC_TIMEZONE_ID,
    setPacificServerTime,
    formatPacificTime,
    formatPacificDate,
    getTimezoneDisplayParts,
} from '../utils/pacificTime';
import logger from '../utils/logger';
import { useUserNotifications, useFacilityUpdates } from '../hooks/useRealtimeUpdates';
import { reconnectEcho } from '../services/echo';
import { currentUserQueryOptions, clearFacilityBrandingStash } from '../queries/currentUser';

// Isolated clock component — prevents 1-second re-renders from propagating to the entire Layout tree
function LiveClock({ serverTime, timezoneOffset }) {
    const [time, setTime] = useState('');

    useEffect(() => {
        if (serverTime) {
            setPacificServerTime(serverTime, timezoneOffset);
        }
    }, [serverTime, timezoneOffset]);

    useEffect(() => {
        const update = () => setTime(formatPacificTime());
        update();
        const id = window.setInterval(update, 1000);
        return () => window.clearInterval(id);
    }, [serverTime]);

    return <span className="text-xs font-semibold text-gray-800 tabular-nums">{time}</span>;
}

const superAdminNavigation = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/super-admin/dashboard', children: null },
    { name: 'Facility Registrations', icon: Clock, path: '/super-admin/facility-registrations', children: null },
    { name: 'Facilities', icon: Building2, path: '/super-admin/facilities', children: null },
    { name: 'Permissions', icon: Shield, path: '/super-admin/permissions', children: null },
    { name: 'Settings', icon: Settings, path: '/super-admin/settings', children: null },
];

const HUB_SECTION = 'Hubs';

const OPERATIONS_HUB_PREFIXES = ['/housekeeping', '/grocery-status', '/fire-drills', '/incidents', '/leave-requests'];
const MANAGEMENT_HUB_PREFIXES = ['/pharmacy', '/billing', '/check-in-dashboard', '/staff', '/visitors', '/residents/sign-out', '/residents/sign-outs', '/document-library', '/fax'];
const ORGANIZATION_HUB_PREFIXES = ['/organization'];
const TEAM_HUB_PREFIXES = ['/team'];
const SYSTEM_HUB_PREFIXES = ['/administration'];

/**
 * Caregivers: care-focused nav. NO Management hub (pharmacy, billing, admin).
 * Can still do: dashboard, their residents, clinical tasks, operations, reports.
 */
const caregiverNavigation = [
    { name: 'Dashboard',  icon: LayoutDashboard, path: '/dashboard',    children: null, section: 'Home' },
    { name: 'Residents',  icon: Users,           path: '/my-residents', children: null, section: HUB_SECTION, activePathPrefixes: RESIDENT_HUB_PREFIXES, activePathRegex: RESIDENT_LEGACY_DETAIL },
    { name: 'Clinical',   icon: Stethoscope,     path: '/clinical',     children: null, section: HUB_SECTION, activePathPrefixes: CLINICAL_HUB_PREFIXES },
    { name: 'Operations', icon: Wrench,          path: '/operations',   children: null, section: HUB_SECTION, activePathPrefixes: OPERATIONS_HUB_PREFIXES },
    { name: 'Reports',    icon: FileText,        path: '/reports',      children: null, section: HUB_SECTION },
];

/**
 * Facility staff (administrator / admin / nurse etc): full hub access including
 * Management plus Organization, Team & compliance, and System configuration hubs.
 */
const facilityStaffHubNavigation = [
    { name: 'Dashboard',          icon: LayoutDashboard, path: '/dashboard',      children: null, section: 'Home' },
    { name: 'Residents',          icon: Users,           path: '/my-residents',   children: null, section: HUB_SECTION, activePathPrefixes: RESIDENT_HUB_PREFIXES, activePathRegex: RESIDENT_LEGACY_DETAIL },
    { name: 'Clinical',           icon: Stethoscope,     path: '/clinical',       children: null, section: HUB_SECTION, activePathPrefixes: CLINICAL_HUB_PREFIXES },
    { name: 'Operations',         icon: Wrench,          path: '/operations',     children: null, section: HUB_SECTION, activePathPrefixes: OPERATIONS_HUB_PREFIXES },
    { name: 'Management',         icon: Briefcase,       path: '/management',     children: null, section: HUB_SECTION, activePathPrefixes: MANAGEMENT_HUB_PREFIXES },
    { name: 'Organization',       icon: Building2,      path: '/organization',   children: null, section: HUB_SECTION, activePathPrefixes: ORGANIZATION_HUB_PREFIXES },
    { name: 'Team & compliance', icon: UsersRound,      path: '/team',            children: null, section: HUB_SECTION, activePathPrefixes: TEAM_HUB_PREFIXES },
    { name: 'System',             icon: Settings,        path: '/administration', children: null, section: HUB_SECTION, activePathPrefixes: SYSTEM_HUB_PREFIXES },
    { name: 'Reports',            icon: FileText,        path: '/reports',        children: null, section: HUB_SECTION },
];

export default function Layout() {
    const location = useLocation();
    const [expandedMenus, setExpandedMenus] = useState({});
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebar-collapsed') === 'true'; }
        catch { return false; }
    });

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
            return next;
        });
    };
    const toast = useToastContext();

    // Fetch current user — shares cache + staleTime with ThemeWrapper (see queries/currentUser.js)
    const {
        data: currentUserData,
        isLoading: isLoadingUserData,
        isFetching: isFetchingUserData,
        refetch: refetchCurrentUser,
    } = useQuery(currentUserQueryOptions);

    const nullUserRecoveryRef = useRef(false);

    // If GET /user cached `null` from an unauthenticated visit, we can have a valid token but no user
    // until we refetch (login clears this cache; this covers any other token edge cases).
    useEffect(() => {
        if (!getStoredAuthToken()) {
            nullUserRecoveryRef.current = false;
            return;
        }
        if (currentUserData != null) {
            nullUserRecoveryRef.current = false;
            return;
        }
        if (nullUserRecoveryRef.current) return;
        if (isLoadingUserData || isFetchingUserData) return;
        nullUserRecoveryRef.current = true;
        refetchCurrentUser();
    }, [currentUserData, isLoadingUserData, isFetchingUserData, refetchCurrentUser]);

    // Update local state when query data changes
    useEffect(() => {
        if (currentUserData) {
            setCurrentUser(currentUserData);
            setPacificServerTime(currentUserData?.app_current_time, currentUserData?.app_timezone_offset);
            // Re-connect Echo once we have the auth token (ensures auth header is fresh)
            reconnectEcho();
        } else {
            setCurrentUser(null);
        }
        setIsLoadingUser(isLoadingUserData);
    }, [currentUserData, isLoadingUserData]);

    // Real-time: push notifications to this user
    useUserNotifications(currentUserData?.id, { showToast: true });

    // Real-time: facility-wide events that should refresh dashboard counters
    useFacilityUpdates(
        currentUserData?.facility_id,
        ['medication.administration.created', 'vital.sign.created', 'incident.created'],
        {
            queryKeys: [['dashboard-stats']],
            invalidateQueries: true,
        }
    );

    // User menu is now handled by Radix DropdownMenu - no need for manual click outside handling

    useEffect(() => {
        const cleanup = setupProactiveRefresh();
        return cleanup;
    }, []);

    // Handle automatic logout after inactivity
    useEffect(() => {
        const INACTIVITY_LIMIT = 4 * 60 * 60 * 1000; // 4 hours
        let inactivityTimeout = null;
        let isLoggingOut = false;

        const performLogout = async () => {
            if (isLoggingOut) {
                return;
            }
            isLoggingOut = true;

            try {
                await api.post('/logout');
            } catch (err) {
                logger.error('Automatic logout error:', err);
            } finally {
                clearStoredAuth();
                clearFacilityBrandingStash();
                sessionStorage.setItem('session_expired', '1');
                window.location.href = '/login?reason=session-expired';
            }
        };

        const resetInactivityTimer = () => {
            if (isLoggingOut) {
                return;
            }

            if (inactivityTimeout) {
                clearTimeout(inactivityTimeout);
            }

            inactivityTimeout = window.setTimeout(() => {
                performLogout();
            }, INACTIVITY_LIMIT);
        };

        const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

        // Throttle: only reset timer at most once per 30 seconds (timeout is 4 hours)
        let lastActivity = 0;
        const activityHandler = () => {
            const now = Date.now();
            if (now - lastActivity < 30000) return;
            lastActivity = now;
            resetInactivityTimer();
        };

        activityEvents.forEach((event) => window.addEventListener(event, activityHandler, { passive: true }));
        resetInactivityTimer();

        return () => {
            if (inactivityTimeout) {
                clearTimeout(inactivityTimeout);
            }
            activityEvents.forEach((event) => window.removeEventListener(event, activityHandler));
        };
    }, []);

    const isCaregiver = React.useMemo(() => {
        if (!currentUser) {
            return false;
        }

        const truthyHints = [
            currentUser.is_caregiver,
            currentUser.isCaregiver,
            currentUser.caregiver,
            currentUser.is_care_giver,
        ];

        const isTruthy = (value) => {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value === 1;
            if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase();
                return ['1', 'true', 'yes', 'y', 'caregiver', 'care_giver'].includes(normalized);
            }
            return false;
        };

        if (truthyHints.some(isTruthy)) {
            return true;
        }

        const candidates = [];
        const addCandidate = (value) => {
            if (value !== null && value !== undefined) {
                candidates.push(String(value));
            }
        };

        addCandidate(currentUser.role);
        addCandidate(currentUser.position);
        addCandidate(currentUser.primary_role);
        addCandidate(currentUser.job_title);

        const roles = currentUser.roles;
        if (Array.isArray(roles)) {
            roles.forEach((roleItem) => {
                if (typeof roleItem === 'string') {
                    addCandidate(roleItem);
                } else if (roleItem?.name) {
                    addCandidate(roleItem.name);
                }
            });
        } else if (roles?.data && Array.isArray(roles.data)) {
            roles.data.forEach((roleItem) => {
                if (typeof roleItem === 'string') {
                    addCandidate(roleItem);
                } else if (roleItem?.name) {
                    addCandidate(roleItem.name);
                }
            });
        }

        return candidates.some((value) => {
            const lower = value.toLowerCase().trim();
            if (!lower) return false;
            const normalized = lower.replace(/[\s_-]/g, '');
            return normalized === 'caregiver' || (lower.includes('care') && lower.includes('giver'));
        });
    }, [currentUser]);

    // Command palette keyboard shortcut (Cmd+K or Ctrl+K) — available for all roles
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const isSuperAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        
        // Check direct role property
        const role = String(currentUser.role || '').toLowerCase().trim();
        if (role === 'super_admin' || role === 'superadmin' || role === 'super admin') {
            return true;
        }
        
        // Check roles array
        if (currentUser.roles) {
            const roles = Array.isArray(currentUser.roles) ? currentUser.roles : (currentUser.roles.data || []);
            const hasSuperAdminRole = roles.some(r => {
                const roleName = String(typeof r === 'string' ? r : (r?.name || '')).toLowerCase().trim();
                return roleName === 'super_admin' || roleName === 'superadmin' || roleName === 'super admin';
            });
            if (hasSuperAdminRole) {
                return true;
            }
        }
        
        return false;
    }, [currentUser]);

    const navigationItems = React.useMemo(() => {
        // If user is not loaded yet, return empty array (will show loading spinner)
        if (!currentUser) {
            return [];
        }

        let items;
        // Super admin gets their own navigation menu
        if (isSuperAdmin) {
            items = [...superAdminNavigation]; // Create a copy to avoid mutations
        } else if (isCaregiver) {
            items = [...caregiverNavigation];
        } else {
            items = [...facilityStaffHubNavigation];
        }

        // Filter navigation items based on module access and permissions (except for super admins)
        // Super admins see everything, no filtering needed
        if (!isSuperAdmin) {
            // First filter by module access
            // Ensure enabled_modules is an array
            const enabledModules = Array.isArray(currentUser?.enabled_modules) 
                ? currentUser.enabled_modules 
                : [];
            if (enabledModules.length > 0) {
                items = filterNavigationByModuleAccess(
                    items,
                    enabledModules,
                    isSuperAdmin
                );
            }
            
            // Then filter by permissions
            // Ensure permissions is an array
            const permissions = Array.isArray(currentUser?.permissions) 
                ? currentUser.permissions 
                : [];
            if (permissions.length > 0) {
                items = filterNavigationByPermissionAccess(
                    items,
                    permissions,
                    isSuperAdmin
                );
            }
        }

        // Ensure we always return an array (fallback to role-appropriate navigation if filtering removed everything)
        if (!items || items.length === 0) {
            if (isSuperAdmin) return superAdminNavigation;
            if (isCaregiver) return caregiverNavigation;
            return facilityStaffHubNavigation;
        }
        return items;
    }, [isCaregiver, isSuperAdmin, currentUser, currentUser?.enabled_modules, currentUser?.permissions]);

    const appTimezoneLabel = React.useMemo(() => {
        const timeZone = PACIFIC_TIMEZONE_ID;
        const { shortName, offset } = getTimezoneDisplayParts(timeZone);
        const parts = [shortName, offset].filter(Boolean);
        if (parts.length > 0) {
            return `${parts.join(' ')} · ${timeZone}`;
        }
        return timeZone;
    }, [currentUser?.app_current_time]);

    const leaveRequestsPath = isCaregiver ? '/leave-requests' : '/team/leave-requests';
    const tLogsPath = '/t-logs';

    // Get theme from ThemeProvider (CSS variables are automatically set)
    const theme = useTheme();
    const facilityBranding = React.useMemo(() => {
        // Super admins always use HomeLogic360 branding, never facility branding
        if (isSuperAdmin) {
            return {
                name: 'HomeLogic360',
                logo: '/images/logonew.png',
                primary_color: '#1E3A5F',
                secondary_color: '#86EFAC',
                accent_color: '#FFFFFF',
            };
        }
        
        // For regular users, use theme from ThemeProvider or user's facility branding
        if (theme.theme.name && theme.theme.name !== 'HomeLogic360') {
            return {
                name: theme.theme.name,
                logo: theme.theme.logo || '/images/logonew.png',
                primary_color: theme.theme.primary_color || '#1E3A5F',
                secondary_color: theme.theme.secondary_color || '#86EFAC',
                accent_color: theme.theme.accent_color || '#FFFFFF',
            };
        }
        
        // Fallback to user's facility branding
        if (currentUser?.facility_branding) {
            return {
                name: currentUser.facility_branding.name || 'HomeLogic360',
                logo: currentUser.facility_branding.logo || '/images/logonew.png',
                primary_color: currentUser.facility_branding.primary_color || '#1E3A5F',
                secondary_color: currentUser.facility_branding.secondary_color || '#86EFAC',
                accent_color: currentUser.facility_branding.accent_color || '#FFFFFF',
            };
        }
        
        // Default
        return {
            name: 'HomeLogic360',
            logo: '/images/logonew.png',
            primary_color: '#1E3A5F',
            secondary_color: '#86EFAC',
            accent_color: '#FFFFFF',
        };
    }, [theme.theme, currentUser?.facility_branding, isSuperAdmin]);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Mobile menu backdrop */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-transparent z-40 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                ></div>
            )}
            
            {/* Sidebar */}
            <aside
                className={`fixed md:relative inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out
                    ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    ${sidebarCollapsed ? 'w-16' : 'w-64'}
                    bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] flex flex-col`}
                aria-label="Main sidebar"
            >
                {/* Mobile close button */}
                <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="md:hidden absolute top-4 right-4 text-[var(--theme-text-on-primary)] hover:text-gray-300 cursor-pointer"
                    aria-label="Close menu"
                >
                    <X className="w-6 h-6" strokeWidth={2.5} />
                </button>

                {/* Logo / branding header */}
                <div className={`border-b border-[var(--theme-primary-light)] flex items-center overflow-hidden
                    ${sidebarCollapsed ? 'justify-center py-2.5 px-2' : 'py-2.5 px-3 gap-2.5'}`}
                >
                    {/* Logo circle */}
                    <div className="w-9 h-9 flex-shrink-0 rounded-full bg-[var(--theme-primary)] flex items-center justify-center shadow-lg overflow-hidden ring-2 ring-white/20">
                        <img
                            src={facilityBranding.logo}
                            alt={facilityBranding.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                        />
                        <div className="w-full h-full bg-[var(--theme-primary)] rounded-full items-center justify-center hidden">
                            <span className="text-[var(--theme-text-on-primary)] font-bold text-base">
                                {facilityBranding.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* Name — hidden when collapsed */}
                    {!sidebarCollapsed && (
                        <div className="flex-1 min-w-0">
                            <span className="text-base font-bold text-[var(--theme-text-on-primary)] truncate block leading-tight">
                                {facilityBranding.name.split(' ')[0]}
                            </span>
                            <p className="text-[11px] text-[var(--theme-text-on-primary)] opacity-70 truncate">
                                {facilityBranding.name.split(' ').length > 1
                                    ? facilityBranding.name.split(' ').slice(1).join(' ')
                                    : 'Care Home'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col px-2 py-1.5 overflow-y-auto min-h-0" aria-label="Main navigation">
                    {isLoadingUser ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-text-on-primary)]" aria-label="Loading navigation" />
                        </div>
                    ) : navigationItems.length === 0 ? (
                        <div className={`text-center py-8 text-[var(--theme-text-on-primary)] text-sm opacity-75 ${sidebarCollapsed ? 'hidden' : ''}`}>
                            No navigation items available
                        </div>
                    ) : !isSuperAdmin ? (
                        <CaregiverNav
                            items={navigationItems}
                            location={location}
                            expandedMenus={expandedMenus}
                            setExpandedMenus={setExpandedMenus}
                            onLinkClick={() => setMobileMenuOpen(false)}
                            collapsed={sidebarCollapsed}
                        />
                    ) : (
                        <div className="flex flex-col w-full gap-0.5">
                            {navigationItems.map((item) => (
                                <NavItem
                                    key={item.name}
                                    item={item}
                                    location={location}
                                    expandedMenus={expandedMenus}
                                    setExpandedMenus={setExpandedMenus}
                                    navigationItems={navigationItems}
                                    onLinkClick={() => setMobileMenuOpen(false)}
                                    collapsed={sidebarCollapsed}
                                />
                            ))}
                        </div>
                    )}
                </nav>

                {/* Collapse toggle button — pinned to sidebar bottom */}
                <div className="border-t border-[var(--theme-primary-light)] p-1.5">
                    <Tooltip content={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} position="right">
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            className={`w-full flex items-center rounded-lg px-2 py-2 text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-light)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50
                                ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}
                        >
                            {sidebarCollapsed
                                ? <ArrowRightFromLine className="w-4 h-4 flex-shrink-0" strokeWidth={2.25} aria-hidden="true" />
                                : <>
                                    <ArrowLeftToLine className="w-4 h-4 flex-shrink-0" strokeWidth={2.25} aria-hidden="true" />
                                    <span className="text-sm font-medium">Collapse</span>
                                  </>
                            }
                        </button>
                    </Tooltip>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
                {/* Top Bar */}
                <header className="bg-white border-b border-gray-200 px-2 md:px-4 py-1 md:py-1.5 flex items-center justify-between gap-1.5 sm:gap-2 shadow-sm min-h-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden text-gray-700 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] rounded p-0.5"
                            aria-label="Open menu"
                        >
                            <Menu className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />
                        </button>
                        <PageBackButton />
                        {/* Facility context indicator */}
                        <Link
                            to="/profile"
                            className="group flex items-center gap-1.5 min-w-0 rounded-lg px-1 py-0.5 -mx-1 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
                            aria-label={`Active facility: ${facilityBranding.name}. Go to profile settings.`}
                        >
                            <div className="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden border border-gray-200 bg-[var(--theme-primary)] hidden sm:flex items-center justify-center">
                                <img
                                    src={facilityBranding.logo}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={e => { e.target.style.display = 'none'; }}
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 leading-none hidden sm:block">
                                    Active Facility
                                </p>
                                <h1 className="text-sm sm:text-base font-semibold text-[var(--theme-primary)] truncate max-w-[140px] sm:max-w-xs">
                                    {facilityBranding.name}
                                </h1>
                            </div>
                        </Link>
                    </div>
                    {!isSuperAdmin && shouldShowHeaderResidentSwitcher(location.pathname) ? (
                        <HeaderResidentSwitcher
                            currentUser={currentUserData}
                            userLoading={isLoadingUserData}
                        />
                    ) : null}
                    <div className="flex items-center space-x-1 md:space-x-2 shrink-0">
                        <LiveClock serverTime={currentUser?.app_current_time} timezoneOffset={currentUser?.app_timezone_offset} />
                        {/* Hide search, notifications, and calendar for super admin */}
                        {currentUser?.role !== 'super_admin' && (
                            <>
                                <Tooltip content="Search (⌘K)" position="bottom">
                                    <button
                                        type="button"
                                        onClick={() => setCommandPaletteOpen(true)}
                                        className="hidden md:flex items-center space-x-1.5 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors border border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
                                        aria-label="Open search"
                                    >
                                        <Command className="w-4 h-4" aria-hidden="true" />
                                        <span className="hidden lg:inline">Search</span>
                                        <kbd className="hidden lg:inline px-1.5 py-0.5 text-xs bg-gray-100 rounded">⌘K</kbd>
                                    </button>
                                </Tooltip>
                                <NotificationDropdown />
                                <ReminderPanel />
                                <Tooltip content="T-Logs" position="bottom">
                                    <Link
                                        to={tLogsPath}
                                        className="p-1.5 rounded-full hover:bg-gray-100 transition-colors relative inline-flex"
                                        aria-label="T-Logs"
                                    >
                                        <FileText className="w-4 h-4 text-gray-700" strokeWidth={2.25} />
                                    </Link>
                                </Tooltip>
                            </>
                        )}
                        <Tooltip content="Account menu" position="bottom">
                            <DropdownMenu
                                trigger={
                                    <button
                                        type="button"
                                        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                                        aria-label="Open account menu"
                                    >
                                        {currentUser?.profile_image_url ? (
                                            <img
                                                src={currentUser.profile_image_url}
                                                alt={currentUser.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <User className="w-4 h-4 text-gray-600" strokeWidth={2.25} />
                                        )}
                                    </button>
                                }
                                align="end"
                            >
                                <DropdownMenuItem asChild>
                                    <Link to="/profile" className="flex items-center">
                                        <User className="w-4 h-4 mr-2" />
                                        Profile
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={async () => {
                                        try {
                                            await api.post('/logout');
                                        } catch (err) {
                                            logger.error('Logout error:', err);
                                        } finally {
                                            clearStoredAuth();
                                            clearFacilityBrandingStash();
                                            window.location.href = '/login';
                                        }
                                    }}
                                >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenu>
                        </Tooltip>
                    </div>
                </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
                        <PageTransition>
                            <Outlet />
                        </PageTransition>
                    </main>
            </div>
            
            {/* Command Palette */}
            <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} isCaregiver={isCaregiver} />

            
            {/* PWA Install Prompt */}
            <PWAInstallPrompt />
            
            {/* Offline Indicator */}
            <OfflineIndicator />
            
            {/* Real-time Connection Indicator */}
            <RealtimeIndicator />
        </div>
    );
}

// ─── Shared NavItem (used by both flat admin nav and caregiver grouped nav) ───

function getItemActiveState(item, location, navigationItems) {
    const hasChildren = item.children && item.children.length > 0;
    if (hasChildren) {
        return item.children.some(
            child => location.pathname === child.path || location.pathname.startsWith(child.path + '/')
        );
    }
    const pathname = location.pathname;
    const primaryMatch = pathname === item.path || pathname.startsWith(item.path + '/');
    const prefixes = item.activePathPrefixes || [];
    const prefixMatch = prefixes.some(
        p => pathname === p || pathname.startsWith(p + '/')
    );
    const regexMatch = item.activePathRegex?.test?.(pathname) ?? false;
    let isActive = primaryMatch || prefixMatch || regexMatch;
    if (isActive && primaryMatch && pathname !== item.path) {
        const hasMoreSpecific = (navigationItems || []).some(
            other => other.path !== item.path &&
                other.path.startsWith(item.path + '/') &&
                pathname.startsWith(other.path)
        );
        if (hasMoreSpecific) isActive = false;
    }
    return isActive;
}

function NavItem({ item, location, expandedMenus, setExpandedMenus, navigationItems, onLinkClick, collapsed = false }) {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isActive = getItemActiveState(item, location, navigationItems);
    const isExpanded = !collapsed && (expandedMenus[item.name] ?? (isActive && hasChildren));

    const activeClass = 'bg-white shadow-sm text-[var(--theme-text-on-white)]';
    const inactiveClass = 'text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-light)]';

    // ── Collapsed: icon-only with tooltip ──────────────────────────────────────
    if (collapsed) {
        // For items with children, navigate to the parent path (first child's path) directly
        const targetPath = hasChildren ? (item.children[0]?.path ?? item.path) : item.path;
        return (
            <Tooltip content={item.name} position="right">
                <Link
                    to={targetPath}
                    onClick={onLinkClick}
                    aria-label={item.name}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center justify-center w-full min-h-[2.5rem] py-2 rounded-lg transition-colors ${isActive ? activeClass : inactiveClass}`}
                >
                    <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2.25} aria-hidden="true" />
                </Link>
            </Tooltip>
        );
    }

    // ── Expanded: full label ───────────────────────────────────────────────────
    if (hasChildren) {
        return (
            <div className="w-full min-w-0">
                <button
                    type="button"
                    onClick={() => setExpandedMenus({ ...expandedMenus, [item.name]: !isExpanded })}
                    aria-expanded={isExpanded}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm ${isActive ? activeClass : inactiveClass}`}
                >
                    <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2.25} aria-hidden="true" />
                        <span className="font-medium">{item.name}</span>
                    </div>
                    {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 opacity-70" strokeWidth={2.5} aria-hidden="true" />
                        : <ChevronRight className="w-3.5 h-3.5 opacity-70" strokeWidth={2.5} aria-hidden="true" />
                    }
                </button>
                {isExpanded && (
                    <div className="ml-7 mt-1 space-y-0.5 border-l border-white/20 pl-3">
                        {item.children.map(child => {
                            const isChildActive = location.pathname === child.path || location.pathname.startsWith(child.path + '/');
                            return (
                                <Link
                                    key={child.path}
                                    to={child.path}
                                    onClick={onLinkClick}
                                    className={`block px-3 py-2 rounded-lg transition-colors text-sm ${isChildActive ? activeClass : inactiveClass}`}
                                >
                                    {child.name}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            to={item.path}
            onClick={onLinkClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm w-full ${isActive ? activeClass : inactiveClass}`}
            aria-current={isActive ? 'page' : undefined}
        >
            <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={2.25} aria-hidden="true" />
            <span className="font-medium">{item.name}</span>
        </Link>
    );
}

// ─── Caregiver nav with section dividers ──────────────────────────────────────

function CaregiverNav({ items, location, expandedMenus, setExpandedMenus, onLinkClick, collapsed = false }) {
    const sections = React.useMemo(() => {
        const result = [];
        let current = null;
        for (const item of items) {
            const section = item.section || 'Other';
            if (section !== current) {
                current = section;
                result.push({ section, items: [] });
            }
            result[result.length - 1].items.push(item);
        }
        return result;
    }, [items]);

    return (
        <div className={`flex flex-col w-full ${collapsed ? 'gap-1' : 'gap-3'}`}>
            {sections.map(({ section, items: sectionItems }) => (
                <div key={section} className="flex flex-col w-full min-w-0">
                    {/* Section label — hidden for "Home", hub grouping, and when sidebar is collapsed */}
                    {section !== 'Home' && section !== HUB_SECTION && !collapsed && (
                        <div className="px-3 pb-1 w-full">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 select-none">
                                {section}
                            </span>
                        </div>
                    )}
                    {/* Subtle divider between sections in collapsed mode */}
                    {section !== 'Home' && collapsed && (
                        <div className="border-t border-white/10 my-0.5 w-full shrink-0" aria-hidden="true" />
                    )}
                    <div className="flex flex-col w-full gap-0.5">
                        {sectionItems.map(item => (
                            <NavItem
                                key={item.name}
                                item={item}
                                location={location}
                                expandedMenus={expandedMenus}
                                setExpandedMenus={setExpandedMenus}
                                navigationItems={items}
                                onLinkClick={onLinkClick}
                                collapsed={collapsed}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
