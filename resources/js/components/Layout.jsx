import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import api from '../services/api';
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
    Clock
} from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { useToastContext } from '../contexts/ToastContext';
import CommandPalette from './ui/CommandPalette';
import {
    PACIFIC_TIMEZONE_ID,
    setPacificServerTime,
    formatPacificTime,
    formatPacificDate,
    getTimezoneDisplayParts,
} from '../utils/pacificTime';

const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', children: null },
    { name: 'Assessments', icon: ClipboardList, path: '/assessments', children: null },
    { name: 'Appointment', icon: Calendar, path: '/appointments', children: null },
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
    { 
        name: 'Pharmacy', 
        icon: Building2, 
        path: '/pharmacy/suppliers', 
        children: [
            { name: 'Suppliers', path: '/pharmacy/suppliers' },
            { name: 'Inventory', path: '/pharmacy/inventory' },
            { name: 'Orders', path: '/pharmacy/orders' },
        ]
    },
    { name: 'Reports', icon: FileText, path: '/reports', children: null },
    { 
        name: 'Administration', 
        icon: Settings, 
        path: '/administration', 
        children: [
            { name: 'Residents', path: '/administration/residents' },
            { name: 'Facilities', path: '/administration/facilities' },
            { name: 'Branches', path: '/administration/branches' },
            { name: 'Vital Ranges', path: '/administration/vital-ranges' },
            { name: 'Leave Requests', path: '/administration/leave-requests' },
            { name: 'Roles & Permissions', path: '/administration/roles' },
            { name: 'Users', path: '/administration/users' },
            { name: 'Drugs', path: '/administration/drugs' },
            { name: 'Inactive Records', path: '/administration/deactivated' },
            { name: 'Employee Documents', path: '/administration/employee-documents' },
            { name: 'Activity Logs', path: '/administration/activity-logs' },
        ]
    },
];

const superAdminNavigation = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/super-admin/dashboard', children: null },
    { 
        name: 'Super Admin', 
        icon: ShieldCheck, 
        path: '/super-admin', 
        children: [
            { name: 'Dashboard', path: '/super-admin/dashboard' },
            { name: 'Facility Registrations', path: '/super-admin/facility-registrations' },
            { name: 'Facilities', path: '/super-admin/facilities' },
        ]
    },
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
    { name: 'Appointments', icon: Calendar, path: '/appointments', children: null },
    { name: 'Leave Requests', icon: CalendarClock, path: '/leave-requests', children: null },
];

export default function Layout() {
    const location = useLocation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);
    const userButtonRef = useRef(null);
    const [expandedMenus, setExpandedMenus] = useState({});
    const [currentUser, setCurrentUser] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [appClock, setAppClock] = useState({ time: '', date: '' });
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const toast = useToastContext();

    // Fetch current user data
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/user');
                setCurrentUser(response.data);
                setPacificServerTime(response.data?.app_current_time, response.data?.app_timezone_offset);
            } catch (err) {
                console.error('Failed to fetch current user:', err);
            }
        };
        fetchUser();
    }, []);

    // Close user menu on outside click (robust against z-index/stacking contexts)
    useEffect(() => {
        if (!userMenuOpen) {
            return;
        }
        const handleClickOutside = (event) => {
            const menuEl = userMenuRef.current;
            const buttonEl = userButtonRef.current;
            if (!menuEl || !buttonEl) {
                return;
            }
            if (
                !menuEl.contains(event.target) &&
                !buttonEl.contains(event.target)
            ) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [userMenuOpen]);

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
                console.error('Automatic logout error:', err);
            } finally {
                localStorage.removeItem('auth_token');
                localStorage.removeItem('user_name');
                window.location.href = '/app/login';
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
        return currentUser.role === 'super_admin' || 
               currentUser.role === 'Super Admin' ||
               (currentUser.roles && Array.isArray(currentUser.roles) && 
                currentUser.roles.some(r => (typeof r === 'string' ? r : r.name) === 'super_admin'));
    }, [currentUser]);

    const navigationItems = React.useMemo(() => {
        if (isSuperAdmin) {
            return superAdminNavigation;
        }
        if (isCaregiver) {
            return caregiverNavigation;
        }
        return navigation;
    }, [isCaregiver, isSuperAdmin]);

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

    // Get facility branding with defaults - CSS variables are set by ThemeProvider
    const facilityBranding = React.useMemo(() => {
        return {
            name: currentUser?.facility_branding?.name || 'HomeLogic360',
            logo: currentUser?.facility_branding?.logo || '/images/logonew.png',
            primary_color: currentUser?.facility_branding?.primary_color || '#1E3A5F', // Dark blue from logo
            secondary_color: currentUser?.facility_branding?.secondary_color || '#86EFAC', // Light green from logo
            accent_color: currentUser?.facility_branding?.accent_color || '#FFFFFF', // White from logo
        };
    }, [currentUser?.facility_branding]);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Mobile menu backdrop */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
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
                            <p className="text-xs text-gray-300">
                                {facilityBranding.name.split(' ').length > 1 ?
                                    facilityBranding.name.split(' ').slice(1).join(' ') :
                                    'Care Home'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navigationItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || 
                            location.pathname.startsWith(item.path + '/') ||
                            (item.children && item.children.some(child => location.pathname === child.path || location.pathname.startsWith(child.path + '/')));
                        const hasChildren = item.children && item.children.length > 0;
                        const isExpanded = expandedMenus[item.name] ?? (isActive && hasChildren);
                        
                        return (
                            <div key={item.name}>
                                {hasChildren ? (
                                    <div>
                                        <button
                                            onClick={() => setExpandedMenus({...expandedMenus, [item.name]: !isExpanded})}
                                            className={`w-full flex items-center justify-between space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                                isActive ? 'bg-white shadow-md text-[var(--theme-primary)]' : 'text-[var(--theme-text-on-primary)] hover:text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-light)]'
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
                                                                    isChildActive ? 'bg-white shadow-md text-[var(--theme-primary)]' : 'text-[var(--theme-text-on-primary)] hover:text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-light)]'
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
                                            isActive ? 'bg-white shadow-md text-[var(--theme-primary)]' : 'text-[var(--theme-text-on-primary)] hover:text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-light)]'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span>{item.name}</span>
                                    </Link>
                                )}
                            </div>
                        );
                    })}
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
                            {appClock.time && (
                                <span className="md:hidden text-xs text-gray-500">
                                    {appClock.time} • {appTimezoneLabel}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4">
                        {appClock.time && (
                            <div className="hidden md:flex flex-col items-end text-sm text-gray-600 mr-2">
                                <span className="font-semibold">{appClock.time}</span>
                                <span className="text-xs text-gray-500">
                                    {appClock.date}
                                    {appTimezoneLabel ? ` • ${appTimezoneLabel}` : ''}
                                </span>
                            </div>
                        )}
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
                                <Link
                                    to={leaveRequestsPath}
                                    className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
                                    title="Leave Requests"
                                >
                                    <CalendarClock className="w-5 h-5 text-gray-700" />
                                </Link>
                            </>
                        )}
                        <div className="relative">
                            <button
                                ref={userButtonRef}
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center overflow-hidden"
                            >
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
                            {userMenuOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-40" 
                                        onClick={() => setUserMenuOpen(false)}
                                    ></div>
                                    <div ref={userMenuRef} className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                        <Link
                                            to="/profile"
                                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                        >
                                            Profile
                                        </Link>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await api.post('/logout');
                                                } catch (err) {
                                                    console.error('Logout error:', err);
                                                } finally {
                                                    localStorage.removeItem('auth_token');
                                                    localStorage.removeItem('user_name');
                                                    window.location.href = '/app/login';
                                                }
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            <span>Sign out</span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
                        <Outlet />
                    </main>
            </div>
            
            {/* Command Palette */}
            <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
        </div>
    );
}

