import React, { useState, useEffect } from 'react';
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
    X
} from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

const navigation = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', children: null },
    { name: 'Assessments', icon: ClipboardList, path: '/assessments', children: null },
    { name: 'Appointment', icon: Calendar, path: '/appointments', children: null },
    { name: 'Vitals', icon: Heart, path: '/vitals', children: null },
    { name: 'Medication', icon: Pill, path: '/medications', children: null },
    { name: 'Sleep', icon: Moon, path: '/sleep', children: null },
    { 
        name: 'Reports', 
        icon: FileText, 
        path: '/reports', 
        children: [
            { name: 'Chart Reports', path: '/reports/charts' },
            { name: 'Resident Charts', path: '/reports/resident-charts' },
            { name: 'Vitals Charts', path: '/reports/vitals-charts' },
            { name: 'Vitals Reports', path: '/reports/vitals-reports' },
            { name: 'Assessment Charts', path: '/reports/assessment-charts' },
            { name: 'Appointments Charts', path: '/reports/appointments-charts' },
            { name: 'Vitals History', path: '/reports/vitals-history' },
            { name: 'Sleep Charts', path: '/reports/sleep-charts' },
            { name: 'Staff Charts', path: '/reports/staff-charts' },
        ]
    },
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
            { name: 'Employee Documents', path: '/administration/employee-documents' },
        ]
    },
];

export default function Layout() {
    const location = useLocation();
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState({});
    const [currentUser, setCurrentUser] = useState(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Fetch current user data
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/user');
                setCurrentUser(response.data);
            } catch (err) {
                console.error('Failed to fetch current user:', err);
            }
        };
        fetchUser();
    }, []);

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
            <aside className={`fixed md:relative inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
                mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
            } w-64 bg-slate-800 text-white flex flex-col`}>
                {/* Mobile close button */}
                <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="md:hidden absolute top-4 right-4 text-white hover:text-gray-300"
                >
                    <X className="w-6 h-6" />
                </button>
                {/* Logo */}
                <div className="p-6 border-b border-slate-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-[#2D5016] rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                            <img 
                                src="/images/logo.jpeg" 
                                alt="Evergreen Oasis Care Home"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                }}
                            />
                            <div className="w-full h-full bg-[#2D5016] rounded-full flex items-center justify-center hidden">
                                <span className="text-white font-bold text-xl">E</span>
                            </div>
                        </div>
                        <div>
                            <span className="text-xl font-semibold text-white">Evergreen Oasis</span>
                            <p className="text-xs text-gray-300">Care Home</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navigation.map((item) => {
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
                                                isActive
                                                    ? 'bg-[#2D5016] text-white shadow-md'
                                                    : 'text-gray-300 hover:bg-slate-700 hover:text-white'
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
                                                                isChildActive
                                                                    ? 'bg-slate-700 text-white'
                                                                    : 'text-gray-400 hover:bg-slate-700 hover:text-white'
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
                                            isActive
                                                ? 'bg-[#2D5016] text-white shadow-md'
                                                : 'text-gray-300 hover:bg-slate-700 hover:text-white'
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
                        <h1 className="text-lg md:text-xl font-semibold text-gray-900">Healthcare Management System</h1>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4">
                        <NotificationDropdown />
                        <div className="relative">
                            <button
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
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                    <Link
                                        to="/profile"
                                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
                                        Profile
                                    </Link>
                                    <button
                                        onClick={async () => {
                                            try {
                                                // Call logout API
                                                await api.post('/logout');
                                            } catch (err) {
                                                console.error('Logout error:', err);
                                            } finally {
                                                // Clear local storage and redirect
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
                            )}
                        </div>
                    </div>
                </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6">
                        <Outlet />
                    </main>
            </div>
        </div>
    );
}

