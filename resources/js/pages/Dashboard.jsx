import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Line, Chart } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    Filler
} from 'chart.js';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { hexToRgb, addOpacity } from '../utils/colorUtils';
import { 
    Users, Calendar, Activity, UserCheck, ClipboardList, AlertCircle, 
    TrendingUp, Clock, CheckCircle, FileText, Heart, Pill, Moon,
    ArrowRight, Sparkles, MoreVertical, Flame, Zap, BarChart3,
    Building2, Stethoscope, TrendingDown, ArrowUp, ArrowDown,
    ShoppingCart, DollarSign, Bed, Sparkles as SparklesIcon, AlertTriangle
} from 'lucide-react';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';
import MiniCalendar from '../components/ui/MiniCalendar';
import { useStaggerAnimation } from '../hooks/useStaggerAnimation';
import { countUp, shouldAnimate } from '../utils/animationPresets';
import { useRef } from 'react';
import Select from '../components/ui/radix/Select';
import Tooltip from '../components/ui/Tooltip';
import ScrollReveal from '../components/ui/ScrollReveal';
// New dashboard components
import StatCard from '../components/dashboard/StatCard';
import ActionableItemsSection from '../components/dashboard/ActionableItemsSection';
import MobileDashboard from '../components/dashboard/MobileDashboard';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    ChartTooltip,
    Legend,
    Filler
);

export default function Dashboard() {
    const navigate = useNavigate();
    
    // Fetch current user
    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            try {
                const response = await api.get('/user');
                return response.data;
            } catch (err) {
                console.error('Failed to fetch current user:', err);
                return null;
            }
        },
    });

    // Redirect super admins to super admin dashboard
    useEffect(() => {
        if (currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'Super Admin')) {
            navigate('/super-admin/dashboard', { replace: true });
        }
    }, [currentUser, navigate]);
    
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            try {
                const response = await api.get('/dashboard/stats');
                console.log('Dashboard stats response:', response.data);
                if (response.data && response.data.data) {
                    return response.data.data;
                }
                return response.data;
            } catch (err) {
                console.error('Dashboard API error:', err);
                console.error('Error details:', err.response?.data);
                // Return null to show error state instead of zeros
                return null;
            }
        },
        retry: 1,
        refetchInterval: 60000, // Poll every 60 seconds for real-time updates
        refetchIntervalInBackground: false, // Don't poll in background to save resources
    });

    // Fetch daily activities for calendar (last 30 days)
    const { data: dailyActivities } = useQuery({
        queryKey: ['dashboard-daily-activities'],
        queryFn: async () => {
            try {
                const response = await api.get('/dashboard/daily-activities', {
                    params: {
                        days: 30,
                    }
                });
                return response.data;
            } catch (err) {
                console.error('Daily activities API error:', err);
                return { data: [] };
            }
        },
        retry: false,
        refetchInterval: 120000, // Poll every 2 minutes
        refetchIntervalInBackground: false,
    });

    // Determine user type early
    const isCaregiver = stats?.user_type === 'caregiver';

    // Fetch trends data for admin users
    const { data: trendsData } = useQuery({
        queryKey: ['dashboard-trends'],
        queryFn: async () => {
            try {
                const response = await api.get('/charts/residents');
                return response.data;
            } catch (err) {
                console.error('Trends API error:', err);
                return null;
            }
        },
        retry: false,
        enabled: !isCaregiver && !isLoading, // Only fetch for admins after stats load
        refetchInterval: 180000, // Poll every 3 minutes
        refetchIntervalInBackground: false,
    });

    // Fetch module statistics for admin users
    const { data: moduleStats } = useQuery({
        queryKey: ['dashboard-module-stats'],
        queryFn: async () => {
            try {
                const [assessmentsRes, sleepRes, housekeepingRes, incidentsRes, groceryRes, pharmacyRes, billingRes] = await Promise.all([
                    api.get('/assessments?per_page=1').catch(() => ({ data: { meta: { total: 0 } } })),
                    api.get('/sleep?per_page=1').catch(() => ({ data: { meta: { total: 0 } } })),
                    api.get('/cleaning/tasks?per_page=1').catch(() => ({ data: { meta: { total: 0 } } })),
                    api.get('/incidents?per_page=1').catch(() => ({ data: { meta: { total: 0 } } })),
                    api.get('/grocery-status?per_page=1').catch(() => ({ data: { meta: { total: 0 } } })),
                    api.get('/pharmacy/inventory?per_page=1').catch(() => ({ data: { meta: { total: 0 } } })),
                    api.get('/billing/expenses?per_page=1').catch(() => ({ data: { meta: { total: 0 } } })),
                ]);
                
                return {
                    assessments: assessmentsRes.data?.meta?.total || assessmentsRes.data?.total || 0,
                    sleep: sleepRes.data?.meta?.total || sleepRes.data?.total || 0,
                    housekeeping: housekeepingRes.data?.meta?.total || housekeepingRes.data?.total || 0,
                    incidents: incidentsRes.data?.meta?.total || incidentsRes.data?.total || 0,
                    grocery: groceryRes.data?.meta?.total || groceryRes.data?.total || 0,
                    pharmacy: pharmacyRes.data?.meta?.total || pharmacyRes.data?.total || 0,
                    billing: billingRes.data?.meta?.total || billingRes.data?.total || 0,
                };
            } catch (err) {
                console.error('Module stats API error:', err);
                return {
                    assessments: 0,
                    sleep: 0,
                    housekeeping: 0,
                    incidents: 0,
                    grocery: 0,
                    pharmacy: 0,
                    billing: 0,
                };
            }
        },
        retry: false,
        enabled: !isCaregiver && !isLoading,
        refetchInterval: 300000, // Poll every 5 minutes
        refetchIntervalInBackground: false,
    });

    // Fetch upcoming fire drills
    const { data: upcomingFireDrills } = useQuery({
        queryKey: ['upcoming-fire-drills'],
        queryFn: async () => {
            try {
                const response = await api.get('/fire-drills', {
                    params: {
                        upcoming: 'true',
                        status: 'scheduled',
                        per_page: 5,
                    }
                });
                return response.data;
            } catch (err) {
                console.error('Fire drills API error:', err);
                return { data: [] };
            }
        },
        retry: false,
    });

    // Process daily activities for mini calendar
    const calendarData = useMemo(() => {
        if (!dailyActivities?.data) return [];

        return dailyActivities.data.map(day => ({
            date: day.date,
            indicators: [
                ...(day.appointments_count > 0 ? [{
                    type: 'appointments',
                    color: 'bg-blue-500',
                    count: day.appointments_count,
                }] : []),
                ...(day.medications_due > 0 ? [{
                    type: 'medications',
                    color: 'bg-purple-500',
                    count: day.medications_due,
                }] : []),
                ...(day.vitals_recorded > 0 ? [{
                    type: 'vitals',
                    color: 'bg-green-500',
                    count: day.vitals_recorded,
                }] : []),
            ],
            count: (day.appointments_count || 0) + (day.medications_due || 0) + (day.vitals_recorded || 0),
        }));
    }, [dailyActivities]);

    const handleCalendarDateSelect = (dateStr) => {
        // Navigate to relevant page based on what's available that day
        const dayData = calendarData.find(d => d.date === dateStr);
        if (dayData) {
            if (dayData.indicators.some(i => i.type === 'appointments')) {
                navigate('/appointments');
            } else if (dayData.indicators.some(i => i.type === 'vitals')) {
                navigate('/vitals');
            } else if (dayData.indicators.some(i => i.type === 'medications')) {
                navigate('/medications');
            }
        }
    };

    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';
    
    // Define stat cards based on user type with gradients and modern styling
    // Ensure values are numbers
    const statCards = isCaregiver ? [
        {
            title: 'My Residents',
            value: Number(stats?.assigned_residents ?? 0),
            icon: Users,
            gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Assigned to me',
            link: '/administration/residents',
            trend: 'positive'
        },
        {
            title: "Today's Appointments",
            value: Number(stats?.todays_appointments ?? 0),
            icon: Calendar,
            gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Scheduled meetings',
            link: '/appointments',
            trend: 'positive'
        },
        {
            title: 'Pending Assessments',
            value: Number(stats?.pending_assessments ?? 0),
            icon: ClipboardList,
            gradient: 'from-[var(--theme-secondary)] to-[var(--theme-secondary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-secondary)]',
            description: 'Awaiting completion',
            link: '/assessments',
            trend: (stats?.pending_assessments ?? 0) > 0 ? 'warning' : 'positive'
        },
        {
            title: 'Vitals Recorded',
            value: Number(stats?.today_vitals ?? 0),
            icon: Activity,
            gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Today',
            link: '/vitals',
            trend: 'positive'
        },
        {
            title: 'Leave Requests',
            value: Number(stats?.pending_leave_requests ?? 0),
            icon: AlertCircle,
            gradient: 'from-[var(--theme-secondary)] to-[var(--theme-secondary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-secondary)]',
            description: 'Pending approval',
            link: '/administration/leave-requests',
            trend: (stats?.pending_leave_requests ?? 0) > 0 ? 'warning' : 'positive'
        },
        {
            title: 'Weekly Appointments',
            value: Number(stats?.week_appointments ?? 0),
            icon: Calendar,
            gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Next 7 days',
            link: '/appointments',
            trend: 'positive'
        },
    ] : [
        {
            title: 'Total Residents',
            value: Number(stats?.total_residents ?? 0),
            icon: Users,
            gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            link: '/administration/residents',
            description: 'Active residents',
            trend: 'positive',
        },
        {
            title: 'Last 30 Days Appointments',
            value: Number(stats?.last_30_appointments ?? 0),
            icon: Calendar,
            gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            link: '/appointments',
            description: 'Scheduled in last 30 days',
            trend: 'positive',
        },
        {
            title: 'Last 30 Days Vitals',
            value: Number(stats?.last_30_vitals ?? 0),
            icon: Activity,
            gradient: 'from-[var(--theme-secondary)] to-[var(--theme-secondary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-secondary)]',
            link: '/vitals',
            description: 'Recorded in last 30 days',
            trend: 'positive',
        },
        {
            title: 'Total Staff',
            value: Number(stats?.total_staff ?? 0),
            icon: UserCheck,
            gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            link: '/administration/users',
            description: 'Active staff',
            trend: 'positive',
        },
        {
            title: 'Active Medications',
            value: Number(stats?.active_medications ?? 0),
            icon: Pill,
            gradient: 'from-[var(--theme-secondary)] to-[var(--theme-secondary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-secondary)]',
            link: '/medications',
            description: 'Current prescriptions',
            trend: 'positive',
        },
        {
            title: 'Pending Assessments',
            value: Number(stats?.pending_assessments ?? 0),
            icon: ClipboardList,
            gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            link: '/assessments',
            description: 'Awaiting completion',
            trend: (stats?.pending_assessments ?? 0) > 0 ? 'warning' : 'positive',
        },
    ];

    // Build actionable items from stats
    const actionableItems = useMemo(() => {
        const items = [];
        
        // Pending assessments
        if (stats?.pending_assessments > 0) {
            items.push({
                id: 'pending-assessments',
                type: 'assessment',
                title: `${stats.pending_assessments} Pending Assessment${stats.pending_assessments > 1 ? 's' : ''}`,
                description: 'Requires your attention',
                priority: stats.pending_assessments > 5 ? 'urgent' : 'soon',
                link: '/assessments',
                metadata: { count: stats.pending_assessments },
            });
        }

        // Today's appointments
        const todayAppts = isCaregiver ? stats?.todays_appointments : stats?.today_appointments;
        if (todayAppts > 0) {
            items.push({
                id: 'today-appointments',
                type: 'appointment',
                title: `${todayAppts} Appointment${todayAppts > 1 ? 's' : ''} Today`,
                description: 'Scheduled for today',
                priority: 'soon',
                link: '/appointments',
                metadata: { count: todayAppts, date: new Date().toLocaleDateString() },
            });
        }

        // Upcoming fire drills (from upcomingFireDrills)
        if (upcomingFireDrills?.data && upcomingFireDrills.data.length > 0) {
            const todayDrills = upcomingFireDrills.data.filter(drill => {
                if (!drill.scheduled_date) return false;
                try {
                    const drillDate = new Date(drill.scheduled_date);
                    if (isNaN(drillDate.getTime())) return false;
                    return drillDate.toDateString() === new Date().toDateString();
                } catch (error) {
                    return false;
                }
            });
            if (todayDrills.length > 0) {
                items.push({
                    id: 'today-fire-drills',
                    type: 'fire_drill',
                    title: `${todayDrills.length} Fire Drill${todayDrills.length > 1 ? 's' : ''} Today`,
                    description: todayDrills[0].branch?.name || 'Scheduled for today',
                    priority: 'urgent',
                    link: '/fire-drills',
                    metadata: { count: todayDrills.length },
                });
            }
        }

        // Medication reminders
        if (stats?.medication_reminders && stats.medication_reminders.length > 0) {
            const dueToday = stats.medication_reminders.filter(m => {
                if (!m.due_at && !m.scheduled_for) return false;
                try {
                    const dueDate = new Date(m.due_at || m.scheduled_for);
                    if (isNaN(dueDate.getTime())) return false;
                    return dueDate.toDateString() === new Date().toDateString();
                } catch (error) {
                    return false;
                }
            });
            if (dueToday.length > 0) {
                items.push({
                    id: 'medication-reminders',
                    type: 'medication',
                    title: `${dueToday.length} Medication${dueToday.length > 1 ? 's' : ''} Due Today`,
                    description: 'Requires administration',
                    priority: 'urgent',
                    link: '/medications',
                    metadata: { count: dueToday.length },
                });
            }
        }

        // Pending leave requests (for admins)
        if (!isCaregiver && stats?.pending_leave_requests > 0) {
            items.push({
                id: 'pending-leave-requests',
                type: 'leave_request',
                title: `${stats.pending_leave_requests} Leave Request${stats.pending_leave_requests > 1 ? 's' : ''} Pending`,
                description: 'Awaiting approval',
                priority: 'info',
                link: '/administration/leave-requests',
                metadata: { count: stats.pending_leave_requests },
            });
        }

        return items.sort((a, b) => {
            const priorityOrder = { urgent: 0, soon: 1, info: 2 };
            return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        });
    }, [stats, isCaregiver, upcomingFireDrills]);

    // Build upcoming tasks
    const upcomingTasks = useMemo(() => {
        const tasks = [];
        
        // Today's appointments
        const todayAppts = isCaregiver ? stats?.todays_appointments : stats?.today_appointments;
        if (todayAppts > 0) {
            tasks.push({
                id: 'task-appointments',
                type: 'appointment',
                title: `${todayAppts} Appointment${todayAppts > 1 ? 's' : ''}`,
                time: new Date().toISOString(),
                link: '/appointments',
            });
        }

        // Upcoming fire drills
        if (upcomingFireDrills?.data && upcomingFireDrills.data.length > 0) {
            upcomingFireDrills.data.slice(0, 3).forEach(drill => {
                if (!drill.scheduled_date) return;
                try {
                    const timeStr = drill.scheduled_time || '10:00:00';
                    const dateStr = drill.scheduled_date instanceof Date 
                        ? drill.scheduled_date.toISOString().split('T')[0]
                        : drill.scheduled_date;
                    const drillDateTime = new Date(`${dateStr}T${timeStr}`);
                    if (isNaN(drillDateTime.getTime())) {
                        console.warn('Invalid fire drill date:', drill);
                        return;
                    }
                    tasks.push({
                        id: `fire-drill-${drill.id}`,
                        type: 'fire_drill',
                        title: `Fire Drill: ${drill.branch?.name || 'Unknown'}`,
                        time: drillDateTime.toISOString(),
                        link: '/fire-drills',
                    });
                } catch (error) {
                    console.error('Error processing fire drill task:', error, drill);
                }
            });
        }

        return tasks.sort((a, b) => {
            if (!a.time || !b.time) return 0;
            try {
                const dateA = new Date(a.time);
                const dateB = new Date(b.time);
                if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
                return dateA - dateB;
            } catch (error) {
                return 0;
            }
        });
    }, [stats, isCaregiver, upcomingFireDrills]);

    // Build alerts
    const alerts = useMemo(() => {
        const alertList = [];
        
        if (stats?.facility_context_missing) {
            alertList.push({
                id: 'facility-context-missing',
                severity: 'warning',
                title: 'Facility Context Missing',
                message: 'Dashboard stats may be incomplete. Please contact support.',
            });
        }

        return alertList;
    }, [stats]);

    // Detect mobile view
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Mobile view
    if (isMobile && !isLoading) {
        return (
            <MobileDashboard
                greeting={greeting}
                userName={currentUser?.first_name || currentUser?.name || 'User'}
                statCards={statCards}
                actionableItems={actionableItems}
                isCaregiver={isCaregiver}
                onStatClick={(card) => card.link && navigate(card.link)}
                onItemClick={(item) => item.link && navigate(item.link)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <div className="space-y-6">
                {error && (
                    <div className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 p-4">
                        <div className="flex items-center space-x-3">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <p className="text-amber-800 text-sm">
                                Note: API connection failed. Showing default values. Please check authentication.
                            </p>
                        </div>
                    </div>
                )}

                {!isLoading && stats && stats.facility_context_missing && (
                    <div className="bg-yellow-50 rounded-xl shadow-sm border-l-4 border-yellow-500 p-4">
                        <div className="flex items-center space-x-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <div>
                                <p className="text-yellow-800 text-sm font-medium">
                                    Facility context missing
                                </p>
                                <p className="text-yellow-700 text-xs mt-1">
                                    Dashboard stats may be incomplete. Please ensure your user account has a facility assigned.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                {isLoading && (
                    <DashboardSkeleton />
                )}
                
                {!isLoading && (
                    <>
                        {/* Minimal Welcome Header */}
                        <div className="bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-xl shadow-sm p-6 text-white">
                            <h1 className="text-2xl font-bold mb-1">
                                {greeting}, {currentUser?.first_name || currentUser?.name || 'User'} 👋
                            </h1>
                            <p className="text-white/90 text-sm">
                                {isCaregiver ? 'Welcome to your Care Dashboard' : 'Managing care with compassion and excellence'}
                            </p>
                        </div>

                        {/* Actionable Items Section - Most Important, Show First */}
                        {actionableItems.length > 0 && (
                            <ActionableItemsSection 
                                items={actionableItems}
                                onItemClick={(item) => item.link && navigate(item.link)}
                            />
                        )}

                        {/* Key Stat Cards - Primary Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {statCards.map((card, index) => (
                                <StatCard
                                    key={index}
                                    {...card}
                                    onClick={() => card.link && navigate(card.link)}
                                />
                            ))}
                        </div>

                        {/* Upcoming Fire Drills Widget - Important Safety Item */}
                        {upcomingFireDrills?.data && upcomingFireDrills.data.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Flame className="w-5 h-5 text-orange-600" />
                                                <h2 className="text-lg font-bold text-[var(--theme-primary)]">Upcoming Fire Drills</h2>
                                            </div>
                                            <button
                                                onClick={() => navigate('/fire-drills')}
                                                className="text-xs text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] hover:underline transition-colors"
                                            >
                                                View All
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="space-y-3">
                                            {upcomingFireDrills.data.slice(0, 5).map((drill) => {
                                                if (!drill.scheduled_date) return null;
                                                let drillDate;
                                                try {
                                                    drillDate = new Date(drill.scheduled_date);
                                                    if (isNaN(drillDate.getTime())) return null;
                                                } catch (error) {
                                                    console.error('Invalid drill date:', drill);
                                                    return null;
                                                }
                                                const today = new Date();
                                                today.setHours(0, 0, 0, 0);
                                                const tomorrow = new Date(today);
                                                tomorrow.setDate(tomorrow.getDate() + 1);
                                                const isToday = drillDate.toDateString() === today.toDateString();
                                                const isTomorrow = drillDate.toDateString() === tomorrow.toDateString();
                                                
                                                let urgencyColor = 'text-gray-600';
                                                let urgencyBg = 'bg-gray-50';
                                                let urgencyText = '';
                                                
                                                if (isToday) {
                                                    urgencyColor = 'text-red-600';
                                                    urgencyBg = 'bg-red-50';
                                                    urgencyText = 'Today';
                                                } else if (isTomorrow) {
                                                    urgencyColor = 'text-orange-600';
                                                    urgencyBg = 'bg-orange-50';
                                                    urgencyText = 'Tomorrow';
                                                } else {
                                                    const daysUntil = Math.ceil((drillDate - today) / (1000 * 60 * 60 * 24));
                                                    urgencyText = `${daysUntil} days`;
                                                }

                                                let timeStr = 'TBD';
                                                if (drill.scheduled_time) {
                                                    try {
                                                        const timeDate = new Date(`2000-01-01T${drill.scheduled_time}`);
                                                        if (!isNaN(timeDate.getTime())) {
                                                            timeStr = timeDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                                                        }
                                                    } catch (error) {
                                                        console.error('Error formatting drill time:', error);
                                                    }
                                                }

                                                return (
                                                    <div 
                                                        key={drill.id} 
                                                        className={`flex items-center justify-between p-3 ${urgencyBg} rounded-xl hover:opacity-90 transition-colors cursor-pointer`}
                                                        onClick={() => navigate('/fire-drills')}
                                                    >
                                                        <div className="flex items-center space-x-3 flex-1">
                                                            <div className={`w-10 h-10 ${urgencyBg} border-2 ${urgencyColor.replace('text-', 'border-')} rounded-full flex items-center justify-center flex-shrink-0`}>
                                                                <Flame className={`w-5 h-5 ${urgencyColor}`} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                                    {drill.branch?.name || 'Unknown Branch'}
                                                                </p>
                                                                <p className="text-xs text-gray-600">
                                                                    {drillDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {timeStr}
                                                                </p>
                                                                <span className={`text-xs font-medium ${urgencyColor}`}>
                                                                    {urgencyText}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <ArrowRight className="w-4 h-4 text-gray-400" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                        )}

                        {/* Trends Chart for Admins - Analytics Section */}
                        {!isCaregiver && trendsData && (
                            <TrendsChartWidget data={trendsData} />
                        )}

                        {/* Resident Vitals Trend Chart - Only for Caregivers */}
                        {isCaregiver && stats?.resident_list && stats.resident_list.length > 0 && (
                            <ResidentVitalsTrendSection 
                                residents={stats.resident_list}
                                defaultTrend={stats.resident_vitals_trend}
                            />
                        )}

                        {/* Modules Overview for Admins - Navigation Section */}
                        {!isCaregiver && (
                            <ModulesOverview 
                                stats={stats}
                                moduleStats={moduleStats}
                                navigate={navigate}
                            />
                        )}

                        {/* Key Insights Section - Moved from Sidebar */}
                        {!isCaregiver && stats && (
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-[var(--theme-primary)]" />
                                        <h2 className="text-lg font-bold text-[var(--theme-primary)]">Key Insights</h2>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Performance metrics and analytics</p>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
                                            <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Occupancy Rate</p>
                                                <p className="text-lg font-semibold text-gray-900">
                                                    {(stats.occupancy_rate ?? 0).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
                                            <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                                                <ClipboardList className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Compliance Score</p>
                                                <p className="text-lg font-semibold text-gray-900">
                                                    {(stats.compliance_score ?? 0).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
                                            <div className="bg-purple-50 text-purple-600 p-2 rounded-lg">
                                                <Pill className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Medication Adherence</p>
                                                <p className="text-lg font-semibold text-gray-900">
                                                    {(stats.medication_adherence_rate ?? 0).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
                                            <div className="bg-orange-50 text-orange-600 p-2 rounded-lg">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Avg Response Time</p>
                                                <p className="text-lg font-semibold text-gray-900">
                                                    {(stats.average_incident_response_time ?? 0).toFixed(1)} hrs
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
                                            <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                                                <UserCheck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Staff Count</p>
                                                <p className="text-lg font-semibold text-gray-900">
                                                    {stats.staff_utilization ?? 0}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// Resident Vitals Trend Section Component
const ResidentVitalsTrendSection = ({ residents, defaultTrend }) => {
    const [selectedResident, setSelectedResident] = useState(residents[0]?.id || null);
    const [vitalsData, setVitalsData] = useState(defaultTrend);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (residents[0]?.id) {
            setSelectedResident(residents[0].id);
            setVitalsData(defaultTrend);
        }
    }, [residents, defaultTrend]);

    const handleResidentChange = async (residentId) => {
        setSelectedResident(residentId);
        setIsLoading(true);
        try {
            const response = await api.get(`/dashboard/resident-vitals/${residentId}`);
            setVitalsData(response.data);
        } catch (err) {
            console.error('Failed to fetch vitals trend:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-[var(--theme-primary)]">Resident Vitals Trend</h2>
                <div className="flex items-center">
                    {isLoading && (
                        <div className="inline-flex items-center mr-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--theme-primary)]"></div>
                        </div>
                    )}
                    <Select
                        value={selectedResident?.toString() || ''}
                        onValueChange={(value) => handleResidentChange(value)}
                        placeholder="Select resident..."
                        options={residents.map((resident) => ({
                            value: resident.id.toString(),
                            label: resident.name,
                        }))}
                        className="w-48"
                    />
                </div>
            </div>
            <div className="p-6">
                <ResidentVitalsChart data={vitalsData} />
            </div>
        </div>
    );
}

// Resident Vitals Chart Component
function ResidentVitalsChart({ data }) {
    const { primary, secondary } = useTheme();
    const primaryRgb = hexToRgb(primary || '#25603E');
    const tooltipBg = primaryRgb ? `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.9)` : 'rgba(37, 96, 62, 0.9)';
    
    const chartData = {
        labels: data?.map(item => item.day) || [],
        datasets: [
            {
                label: 'Diastolic BP',
                data: data?.map(item => item.diastolic_bp) || [],
                borderColor: '#66BB6A', // Green
                backgroundColor: 'rgba(102, 187, 106, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#66BB6A',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                yAxisID: 'y',
            },
            {
                label: 'Heart Rate',
                data: data?.map(item => item.heart_rate) || [],
                borderColor: '#FFB74D', // Orange
                backgroundColor: 'rgba(255, 183, 77, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#FFB74D',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                yAxisID: 'y',
            },
            {
                label: 'Systolic BP',
                data: data?.map(item => item.systolic_bp) || [],
                borderColor: '#9575CD', // Purple
                backgroundColor: 'rgba(149, 117, 205, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#9575CD',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                yAxisID: 'y',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 12,
                        weight: '500',
                    },
                    color: primary || '#25603E',
                },
            },
            tooltip: {
                backgroundColor: tooltipBg,
                padding: 12,
                titleFont: {
                    size: 13,
                    weight: '600',
                },
                bodyFont: {
                    size: 12,
                },
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y}`;
                    }
                }
            },
        },
        scales: {
            x: {
                display: true,
                grid: {
                    display: true,
                    drawBorder: false,
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    font: {
                        size: 11,
                        weight: '500',
                    },
                    color: secondary || '#8B4513',
                },
            },
            y: {
                display: true,
                beginAtZero: false,
                grid: {
                    display: true,
                    drawBorder: false,
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    font: {
                        size: 11,
                        weight: '500',
                    },
                    color: secondary || '#8B4513',
                },
            },
        },
    };

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No vital signs data available</p>
            </div>
        );
    }

    return (
        <div style={{ height: '300px' }}>
            <Line data={chartData} options={options} />
        </div>
    );
}

// Modules Overview Component
function ModulesOverview({ stats, moduleStats, navigate }) {
    const modules = [
        {
            name: 'Assessments',
            icon: ClipboardList,
            path: '/assessments',
            count: stats?.pending_assessments || 0,
            color: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Pending assessments',
        },
        {
            name: 'Appointments',
            icon: Calendar,
            path: '/appointments',
            count: stats?.today_appointments || 0,
            color: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: "Today's appointments",
        },
        {
            name: 'Vitals',
            icon: Activity,
            path: '/vitals',
            count: stats?.today_vitals || 0,
            color: 'from-[var(--theme-secondary)] to-[var(--theme-secondary-light)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-secondary)]',
            description: 'Recorded today',
        },
        {
            name: 'Medications',
            icon: Pill,
            path: '/medications',
            count: stats?.active_medications || 0,
            color: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Active medications',
        },
        {
            name: 'Sleep',
            icon: Moon,
            path: '/sleep',
            count: moduleStats?.sleep || 0,
            color: 'from-[var(--theme-secondary)] to-[var(--theme-secondary-light)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-secondary)]',
            description: 'Sleep records',
        },
        {
            name: 'Housekeeping',
            icon: SparklesIcon,
            path: '/housekeeping',
            count: moduleStats?.housekeeping || 0,
            color: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Tasks & schedules',
        },
        {
            name: 'Grocery Status',
            icon: ShoppingCart,
            path: '/grocery-status',
            count: moduleStats?.grocery || 0,
            color: 'from-[var(--theme-secondary)] to-[var(--theme-secondary-light)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-secondary)]',
            description: 'Grocery items',
        },
        {
            name: 'Fire Drills',
            icon: Flame,
            path: '/fire-drills',
            count: 0, // Will be populated from upcomingFireDrills
            color: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Scheduled drills',
        },
        {
            name: 'Incidents',
            icon: AlertTriangle,
            path: '/incidents',
            count: moduleStats?.incidents || 0,
            color: 'from-[var(--theme-primary)] to-[var(--theme-primary-dark)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Incident reports',
        },
        {
            name: 'Pharmacy',
            icon: Building2,
            path: '/pharmacy/inventory',
            count: moduleStats?.pharmacy || 0,
            color: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Inventory items',
        },
        {
            name: 'Billing',
            icon: DollarSign,
            path: '/billing/expenses',
            count: moduleStats?.billing || 0,
            color: 'from-[var(--theme-secondary)] to-[var(--theme-secondary-light)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-secondary)]',
            description: 'Expenses & invoices',
        },
        {
            name: 'Reports',
            icon: FileText,
            path: '/reports',
            count: 0,
            color: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Analytics & reports',
        },
    ];

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[var(--theme-primary)]" />
                        <h2 className="text-base sm:text-lg font-bold text-[var(--theme-primary)]">Modules Overview</h2>
                    </div>
                    <span className="text-xs text-gray-500 hidden sm:inline">Quick access to all modules</span>
                </div>
            </div>
            <div className="p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                    {modules.map((module, index) => {
                        const Icon = module.icon;
                        return (
                            <button
                                key={index}
                                onClick={() => navigate(module.path)}
                                className="group relative bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 p-3 sm:p-4 text-left active:scale-95 touch-manipulation"
                            >
                                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${module.color} rounded-t-lg`}></div>
                                <div className="flex flex-col items-center text-center space-y-2 mt-1">
                                    <div className={`${module.bgColor} p-2 sm:p-3 rounded-lg group-hover:scale-110 transition-transform duration-200`}>
                                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${module.iconColor}`} />
                                    </div>
                                    <div className="flex-1 w-full">
                                        <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">{module.name}</p>
                                        <p className="text-lg sm:text-xl font-bold text-[var(--theme-primary)]">{module.count}</p>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{module.description}</p>
                                    </div>
                                </div>
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-[var(--theme-primary)]" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// Trends Chart Widget for Admins
function TrendsChartWidget({ data }) {
    const { primary, secondary } = useTheme();
    
    if (!data || !data.labels || data.labels.length === 0) {
        return null;
    }

    // Get theme colors for chart from CSS variables
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary').trim() || primary || '#1E3A5F';
    const secondaryColor = getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary').trim() || secondary || '#86EFAC';
    const primaryLight = getComputedStyle(document.documentElement).getPropertyValue('--theme-primary-light').trim() || '#2E5A8F';
    
    // Convert hex to rgb for chart.js (using imported function)
    const primaryRgb = hexToRgb(primaryColor);
    const secondaryRgb = hexToRgb(secondaryColor);
    const primaryLightRgb = hexToRgb(primaryLight);
    
    const tooltipBg = primaryRgb ? `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.9)` : 'rgba(37, 96, 62, 0.9)';
    
    const chartData = {
        labels: data.labels || [],
        datasets: [
            {
                label: 'Residents',
                data: data.residents || [],
                borderColor: `rgb(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b})`,
                backgroundColor: `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.1)`,
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Appointments',
                data: data.appointments || [],
                borderColor: `rgb(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b})`,
                backgroundColor: `rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.1)`,
                tension: 0.4,
                fill: true,
            },
            {
                label: 'Medications',
                data: data.medications || [],
                borderColor: `rgb(${primaryLightRgb.r}, ${primaryLightRgb.g}, ${primaryLightRgb.b})`,
                backgroundColor: `rgba(${primaryLightRgb.r}, ${primaryLightRgb.g}, ${primaryLightRgb.b}, 0.1)`,
                tension: 0.4,
                fill: true,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
            tooltip: {
                backgroundColor: tooltipBg,
                padding: 12,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                },
            },
        },
    };

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[var(--theme-primary)]" />
                        <h2 className="text-base sm:text-lg font-bold text-[var(--theme-primary)]">7-Day Trends Overview</h2>
                    </div>
                </div>
            </div>
            <div className="p-4 sm:p-6">
                <div style={{ height: '250px' }}>
                    <Line data={chartData} options={options} />
                </div>
            </div>
        </div>
    );
}

// Stat Cards Grid Component with animations
function StatCardsGrid({ statCards, isCaregiver, onCardClick }) {
    const containerRef = useStaggerAnimation('.stat-card', 'slideUp', {
        staggerDelay: 100,
        duration: 500,
        easing: 'easeOutExpo',
    });

    return (
        <div 
            ref={containerRef}
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8`}
        >
            {statCards.map((card, index) => {
                const Icon = card.icon;
                const valueRef = useRef(null);

                // Animate number counting
                useEffect(() => {
                    if (valueRef.current && shouldAnimate() && card.value > 0) {
                        countUp(valueRef.current, card.value, {
                            duration: 1500,
                            delay: 200 + (index * 100),
                            easing: 'easeOutExpo',
                        });
                    }
                }, [card.value, index]);

                return (
                    <div
                        key={index}
                        className="stat-card group relative bg-white rounded-xl sm:rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 active:scale-95 touch-manipulation"
                        onClick={() => onCardClick(card.link)}
                    >
                        {/* Gradient decoration */}
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`}></div>
                        
                        {/* Content - Data-dense layout */}
                        <div className="p-4 sm:p-6">
                            <div className="flex items-start justify-between mb-3 sm:mb-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 sm:gap-2 mb-1">
                                        <p className="text-[var(--theme-secondary)] text-xs sm:text-sm font-semibold uppercase tracking-wide truncate">
                                            {card.title}
                                        </p>
                                        {card.tooltip && (
                                            <Tooltip content={card.tooltip} position="top">
                                                <AlertCircle className="w-3 h-3 text-gray-400 cursor-help flex-shrink-0" />
                                            </Tooltip>
                                        )}
                                    </div>
                                    <div className="flex items-baseline space-x-2">
                                        <p 
                                            ref={valueRef}
                                            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--theme-primary)]"
                                        >
                                            {card.value}
                                        </p>
                                        {card.trend === 'warning' && (
                                            <Tooltip content="Requires attention" position="top">
                                                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 cursor-help flex-shrink-0" />
                                            </Tooltip>
                                        )}
                                    </div>
                                    {card.description && (
                                        <p className="text-gray-500 text-xs mt-1 sm:mt-2 flex items-center">
                                            <Clock className="w-3 h-3 mr-1 flex-shrink-0" />
                                            <span className="truncate">{card.description}</span>
                                        </p>
                                    )}
                                </div>
                                <Tooltip content={card.title} position="left">
                                    <div className={`${card.iconBg} p-2 sm:p-3 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                                        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${card.iconColor}`} />
                                    </div>
                                </Tooltip>
                            </div>
                            
                            {/* Hover effect */}
                            {card.link && (
                                <div className="flex items-center text-[var(--theme-primary)] text-xs sm:text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <span>View details</span>
                                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
