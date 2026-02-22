import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api, { setupProactiveRefresh } from '../services/api';
import { 
    LayoutDashboard, 
    Calendar, 
    Building2, 
    Users, 
    FileText, 
    Bell,
    Monitor,
    RefreshCw,
    Maximize2,
    User,
    LogOut,
    Heart,
    Pill,
    Moon,
    ClipboardList,
    Settings,
    ChevronDown,
    ChevronRight,
    Menu,
    X,
    CalendarClock,
    Sparkles,
    Command,
    ShoppingCart,
    Truck,
    Flame,
    ShieldCheck,
    Clock,
    Shield,
    DollarSign,
    AlertTriangle,
    UserCheck,
    ArrowRightFromLine,
    ArrowLeftToLine,
    UserPlus,
    BarChart3
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

const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', children: null },
    { name: 'My Residents', icon: Users, path: '/my-residents', children: null },
    { name: 'Assessments', icon: ClipboardList, path: '/assessments', children: null },
    { name: 'Appointment', icon: Calendar, path: '/appointments/dashboard', children: null },
    { 
        name: 'Vitals', 
        icon: Heart, 
        path: '/vitals', 
        children: [
            { name: 'Vitals', path: '/vitals' },
            { name: 'View Vitals', path: '/view-vitals' },
        ]
    },
    { 
        name: 'Medication', 
        icon: Pill, 
        path: '/medications', 
        children: [
            { name: 'Medications', path: '/medications' },
            { name: 'Medication Deliveries', path: '/medication-deliveries' },
            { name: 'Medication Report', path: '/medications/report' },
        ]
    },
    { 
        name: 'Sleep', 
        icon: Moon, 
        path: '/sleep', 
        children: [
            { name: 'Sleep Records', path: '/sleep' },
            { name: 'Sleep Pattern', path: '/sleep-patterns' },
        ]
    },
    { 
        name: 'Housekeeping', 
        icon: Sparkles, 
        path: '/housekeeping', 
        children: [
            { name: 'Dashboard', path: '/housekeeping/dashboard' },
            { name: 'Checklist', path: '/housekeeping' },
            { name: 'Schedule Builder', path: '/housekeeping/schedule' },
        ]
    },
    { name: 'Grocery Status', icon: ShoppingCart, path: '/grocery-status', children: null },
    { name: 'Fire Drills', icon: Flame, path: '/fire-drills', children: null },
    { name: 'Incidents', icon: AlertTriangle, path: '/incidents', children: null },
    { name: 'T-Logs', icon: FileText, path: '/t-logs', children: null },
    { 
        name: 'Check-In/Out', 
        icon: UserCheck, 
        path: '/check-in-dashboard', 
        children: [
            { name: 'Dashboard', path: '/check-in-dashboard' },
            { name: 'Staff Clock-In/Out', path: '/staff/clock' },
            { name: 'View All Clock-Ins', path: '/staff/clock-ins' },
            { name: 'Resident Sign-Outs', path: '/residents/sign-out' },
            { name: 'Visitors', path: '/visitors' },
        ]
    },
    { 
        name: 'Pharmacy', 
        icon: Building2, 
        path: '/pharmacy/dashboard', 
        children: [
            { name: 'Dashboard', path: '/pharmacy/dashboard' },
            { name: 'Suppliers', path: '/pharmacy/suppliers' },
            { name: 'Inventory', path: '/pharmacy/inventory' },
            { name: 'Orders', path: '/pharmacy/orders' },
        ]
    },
    { 
        name: 'Billing', 
        icon: DollarSign, 
        path: '/billing/expense-categories', 
        children: [
            { name: 'Expense Categories', path: '/billing/expense-categories' },
            { name: 'Expenses', path: '/billing/expenses' },
            { name: 'Invoices', path: '/billing/invoices' },
            { name: 'Reports', path: '/billing/reports' },
        ]
    },
    { name: 'Reports', icon: FileText, path: '/reports', children: null },
    { name: 'Charts', icon: ClipboardList, path: '/administration/behavior-charts', children: null },
    { 
        name: 'Administration', 
        icon: Settings, 
        path: '/administration', 
        children: [
            { name: 'Residents', path: '/administration/residents' },
            // Facilities removed - only super admins can access
            { name: 'Branches', path: '/administration/branches' },
            { name: 'Email Notifications', path: '/administration/email-settings' },
            { name: 'Vital Ranges', path: '/administration/vital-ranges' },
            { name: 'Leave Requests', path: '/administration/leave-requests' },
            { name: 'Roles & Permissions', path: '/administration/roles' },
            { name: 'Users', path: '/administration/users' },
            { name: 'Drugs', path: '/administration/drugs' },
            { name: 'Behavior Category Charts', path: '/administration/chart-data' },
            { name: 'Inactive Records', path: '/administration/deactivated' },
            { name: 'Employee Documents', path: '/administration/employee-documents' },
            { name: 'Activity Logs', path: '/administration/activity-logs' },
        ]
    },
];

const superAdminNavigation = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/super-admin/dashboard', children: null },
    { name: 'Facility Registrations', icon: Clock, path: '/super-admin/facility-registrations', children: null },
    { name: 'Facilities', icon: Building2, path: '/super-admin/facilities', children: null },
    { name: 'Permissions', icon: Shield, path: '/super-admin/permissions', children: null },
    { name: 'Settings', icon: Settings, path: '/super-admin/settings', children: null },
];

const caregiverNavigation = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', children: null },
    { name: 'My Residents', icon: Users, path: '/my-residents', children: null },
    { name: 'Medication Log', icon: Pill, path: '/medications/residents', children: null },
    { name: 'Medication History', icon: ClipboardList, path: '/medication-history', children: null },
    { 
        name: 'Vitals', 
        icon: Heart, 
        path: '/vitals', 
        children: [
            { name: 'Vitals', path: '/vitals' },
            { name: 'View Vitals', path: '/view-vitals' },
        ]
    },
    { 
        name: 'Sleep', 
        icon: Moon, 
        path: '/sleep', 
        children: [
            { name: 'Sleep Records', path: '/sleep' },
            { name: 'Sleep Pattern', path: '/sleep-patterns' },
        ]
    },
    { name: 'Housekeeping', icon: Sparkles, path: '/housekeeping', children: null },
    { name: 'Grocery Status', icon: ShoppingCart, path: '/grocery-status', children: null },
    { name: 'Fire Drills', icon: Flame, path: '/fire-drills', children: null },
    { name: 'Incidents', icon: AlertTriangle, path: '/incidents', children: null },
    { name: 'T-Logs', icon: FileText, path: '/t-logs', children: null },
    { name: 'Appointments', icon: Calendar, path: '/appointments', children: null },
    { name: 'Behavior Charts', icon: BarChart3, path: '/charts', children: null },
    { name: 'Leave Requests', icon: CalendarClock, path: '/leave-requests', children: null },
];

export default function Layout() {
    const location = useLocation();
    // Removed userMenuOpen state - now handled by Radix DropdownMenu
    const [expandedMenus, setExpandedMenus] = useState({});
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [appClock, setAppClock] = useState({ time: '', date: '' });
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const toast = useToastContext();

    // Fetch current user data using React Query for better cache management
    const { data: currentUserData, isLoading: isLoadingUserData } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            try {
                const response = await api.get('/user');
                return response.data;
            } catch (err) {
                logger.error('Failed to fetch current user:', err);

                // If auth is no longer valid (common after idle timeout), force a clean logout.
                if (err?.response?.status === 401) {
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('user_name');
                    localStorage.removeItem('user_role');
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
        },
        staleTime: 0, // Always fetch fresh data
        retry: 1,
    });

    // Update local state when query data changes
    useEffect(() => {
        if (currentUserData) {
            setCurrentUser(currentUserData);
            setPacificServerTime(currentUserData?.app_current_time, currentUserData?.app_timezone_offset);
        }
        setIsLoadingUser(isLoadingUserData);
    }, [currentUserData, isLoadingUserData]);

    // User menu is now handled by Radix DropdownMenu - no need for manual click outside handling

    useEffect(() => {
        if (currentUser?.app_current_time) {
            setPacificServerTime(currentUser.app_current_time, currentUser.app_timezone_offset);
        }
    }, [currentUser?.app_current_time]);

    useEffect(() => {
        const updateClock = () => {
            setAppClock({
                time: formatPacificTime(),
                date: formatPacificDate(),
            });
        };

        updateClock();
        const interval = window.setInterval(updateClock, 1000);
        return () => window.clearInterval(interval);
    }, [currentUser?.app_current_time]);

    useEffect(() => {
        const cleanup = setupProactiveRefresh();
        return cleanup;
    }, []);

    // Handle automatic logout after inactivity
    useEffect(() => {
        const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
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
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_name');
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

        const activityHandler = () => {
            resetInactivityTimer();
        };

        activityEvents.forEach((event) => window.addEventListener(event, activityHandler));
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

    // Command palette keyboard shortcut (Cmd+K or Ctrl+K) - disabled for caregivers
    useEffect(() => {
        if (isCaregiver) return; // Don't enable keyboard shortcut for caregivers
        
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCaregiver]);

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
            items = [...navigation];
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

        // Ensure we always return an array (fallback to default navigation if something went wrong)
        return items && items.length > 0 ? items : (isSuperAdmin ? superAdminNavigation : navigation);
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

    const leaveRequestsPath = isCaregiver ? '/leave-requests' : '/administration/leave-requests';
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
                className={`fixed md:relative inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                } w-64 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] flex flex-col`}
            >
                {/* Mobile close button */}
                <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="md:hidden absolute top-4 right-4 text-[var(--theme-text-on-primary)] hover:text-gray-300"
                >
                    <X className="w-6 h-6" />
                </button>
                {/* Logo */}
                <div 
                    className="p-6 border-b border-[var(--theme-primary-light)]"
                >
                    <div className="flex items-center space-x-3">
                        <div 
                            className="w-12 h-12 bg-[var(--theme-primary)] rounded-full flex items-center justify-center shadow-lg overflow-hidden"
                        >
                            <img 
                                src={facilityBranding.logo} 
                                alt={facilityBranding.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                }}
                            />
                            <div 
                                className="w-full h-full bg-[var(--theme-primary)] rounded-full flex items-center justify-center hidden"
                            >
                                <span className="text-[var(--theme-text-on-primary)] font-bold text-xl">
                                    {facilityBranding.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div>
                            <span className="text-xl font-semibold text-[var(--theme-text-on-primary)]">
                                {facilityBranding.name.split(' ')[0]}
                            </span>
                            <p className="text-xs text-[var(--theme-text-on-primary)] opacity-80">
                                {facilityBranding.name.split(' ').length > 1 ?
                                    facilityBranding.name.split(' ').slice(1).join(' ') :
                                    'Care Home'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {isLoadingUser ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-text-on-primary)]"></div>
                        </div>
                    ) : navigationItems.length === 0 ? (
                        <div className="text-center py-8 text-[var(--theme-text-on-primary)] text-sm opacity-75">
                            No navigation items available
                        </div>
                    ) : (
                        navigationItems.map((item) => {
                        const Icon = item.icon;
                        const hasChildren = item.children && item.children.length > 0;
                        
                        // For parent items with children, only mark active if a child is active
                        // For items without children, check exact match or path starts with
                        let isActive;
                        if (hasChildren) {
                            // Parent is active only if a child is active
                            isActive = item.children.some(child => 
                                location.pathname === child.path || 
                                location.pathname.startsWith(child.path + '/')
                            );
                        } else {
                            // For items without children, check exact match or starts with path + '/'
                            // But exclude cases where a more specific path exists
                            isActive = location.pathname === item.path || 
                                location.pathname.startsWith(item.path + '/');
                            
                            // If this path is a prefix of another navigation item's path, don't mark active
                            // unless we're on the exact path
                            if (isActive && location.pathname !== item.path) {
                                const hasMoreSpecificMatch = navigationItems.some(otherItem => 
                                    otherItem.path !== item.path &&
                                    otherItem.path.startsWith(item.path + '/') &&
                                    location.pathname.startsWith(otherItem.path)
                                );
                                if (hasMoreSpecificMatch) {
                                    isActive = false;
                                }
                            }
                        }
                        
                        const isExpanded = expandedMenus[item.name] ?? (isActive && hasChildren);
                        
                        return (
                            <div key={item.name}>
                                {hasChildren ? (
                                    <div>
                                        <button
                                            onClick={() => setExpandedMenus({...expandedMenus, [item.name]: !isExpanded})}
                                            className={`w-full flex items-center justify-between space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                                isActive ? 'bg-white shadow-md text-[var(--theme-text-on-white)]' : 'text-[var(--theme-text-on-primary)] hover:text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-light)]'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <Icon className="w-5 h-5" />
                                                <span>{item.name}</span>
                                            </div>
                                            {isExpanded ? (
                                                <ChevronDown className="w-4 h-4" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4" />
                                            )}
                                        </button>
                                        {isExpanded && (
                                            <div className="ml-8 mt-2 space-y-1">
                                                {item.children.map((child) => {
                                                    const isChildActive = location.pathname === child.path || location.pathname.startsWith(child.path + '/');
                                                    return (
                                                        <Link
                                                            key={child.path}
                                                            to={child.path}
                                                            onClick={() => setMobileMenuOpen(false)}
                                                                className={`block px-4 py-2 rounded-lg transition-colors text-sm ${
                                                                    isChildActive ? 'bg-white shadow-md text-[var(--theme-text-on-white)]' : 'text-[var(--theme-text-on-primary)] hover:text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-light)]'
                                                                }`}
                                                        >
                                                            {child.name}
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Link
                                        to={item.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                            isActive ? 'bg-white shadow-md text-[var(--theme-text-on-white)]' : 'text-[var(--theme-text-on-primary)] hover:text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-light)]'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.name}</span>
                                    </Link>
                                )}
                            </div>
                        );
                    })
                    )}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden md:ml-0">
                {/* Top Bar */}
                <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between shadow-sm">
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="md:hidden text-gray-700 hover:text-gray-900"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-lg md:text-xl font-semibold text-[var(--theme-primary)]">
                                {facilityBranding.name}
                            </h1>
                            {/* Mobile time/date hidden per request */}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4">
                        <span className="text-sm font-semibold text-gray-800">{appClock.time}</span>
                        {/* Hide search, notifications, and calendar for super admin */}
                        {currentUser?.role !== 'super_admin' && (
                            <>
                                {!isCaregiver && (
                                    <button
                                        onClick={() => setCommandPaletteOpen(true)}
                                        className="hidden md:flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
                                        title="Open command palette (Cmd+K)"
                                    >
                                        <Command className="w-4 h-4" />
                                        <span className="hidden lg:inline">Search</span>
                                        <kbd className="hidden lg:inline px-1.5 py-0.5 text-xs bg-gray-200 rounded">⌘K</kbd>
                                    </button>
                                )}
                                <NotificationDropdown />
                                <ReminderPanel />
                                <Link
                                    to={tLogsPath}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
                                    title="T-Logs"
                                >
                                    <FileText className="w-5 h-5 text-gray-700" />
                                </Link>
                            </>
                        )}
                        <DropdownMenu
                            trigger={
                                <button className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]">
                                    {currentUser?.profile_image_url ? (
                                        <img
                                            src={currentUser.profile_image_url}
                                            alt={currentUser.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User className="w-6 h-6 text-gray-600" />
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
                                        localStorage.removeItem('auth_token');
                                        localStorage.removeItem('user_name');
                                        window.location.href = '/login';
                                    }
                                }}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenu>
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
            <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
            
            {/* PWA Install Prompt */}
            <PWAInstallPrompt />
            
            {/* Offline Indicator */}
            <OfflineIndicator />
            
            {/* Real-time Connection Indicator */}
            <RealtimeIndicator />
        </div>
    );
}



