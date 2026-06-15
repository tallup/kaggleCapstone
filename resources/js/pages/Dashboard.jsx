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
import logger from '../utils/logger';
import { currentUserQueryOptions } from '../queries/currentUser';
import { dashboardStatsQueryOptions } from '../queries/dashboardStats';
import { useTheme } from '../contexts/ThemeContext';
import { hexToRgb, addOpacity } from '../utils/colorUtils';
import { formatInsightHours, formatInsightPercent } from '../utils/formatInsightMetric';
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
import UpcomingEventsWidget from '../components/dashboard/UpcomingEventsWidget';
import CaregiverDashboard from '../components/dashboard/CaregiverDashboard';
import DashboardLoadingSplash from '../components/dashboard/DashboardLoadingSplash';
import { useUserNotifications, useFacilityUpdates, useStaffClockUpdates } from '../hooks/useRealtimeUpdates';
import { usePacificGreeting } from '../hooks/usePacificGreeting';

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

// Resident Vitals Chart Component (must be defined before ResidentVitalsTrendSection)
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
                borderColor: '#66BB6A',
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
                borderColor: '#FFB74D',
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
                borderColor: '#9575CD',
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
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
            tooltip: {
                backgroundColor: tooltipBg,
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: primary || '#25603E',
                borderWidth: 1,
                callbacks: {
                    label: function (context) {
                        return `${context.dataset.label}: ${context.parsed.y}`;
                    }
                }
            },
        },
        scales: {
            y: {
                beginAtZero: false,
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                },
            },
            x: {
                grid: {
                    display: false,
                },
            },
        },
    };

    if (!data || data.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <Heart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No vital signs data available</p>
            </div>
        );
    }

    return (
        <Line data={chartData} options={options} />
    );
}

// Resident Vitals Trend Section Component  
function ResidentVitalsTrendSection({ residents, defaultTrend }) {
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
            logger.error('Failed to fetch vitals trend:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[var(--theme-primary)]">Resident Vitals Trend</h2>
                    {residents.length > 1 && (
                        <Select
                            value={selectedResident?.toString()}
                            onValueChange={(value) => handleResidentChange(Number(value))}
                            options={residents.map(r => ({
                                value: r.id.toString(),
                                label: `${r.first_name} ${r.last_name}`,
                            }))}
                            placeholder="Select resident"
                            className="w-48"
                        />
                    )}
                </div>
            </div>
            <div className="p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    </div>
                ) : vitalsData ? (
                    <ResidentVitalsChart data={vitalsData} />
                ) : (
                    <div className="text-center py-12">
                        <Heart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No vital signs data available</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();

    const { data: currentUser, isFetched: userFetched } = useQuery(currentUserQueryOptions);

    // Redirect super admins to super admin dashboard
    useEffect(() => {
        if (currentUser && (currentUser.role === 'super_admin' || currentUser.role === 'Super Admin')) {
            navigate('/super-admin/dashboard', { replace: true });
        }
    }, [currentUser, navigate]);

    // Real-time: invalidate dashboard stats when medication, vitals, incidents, or staff events fire
    useFacilityUpdates(
        currentUser?.facility_id,
        ['medication.administration.created', 'vital.sign.created', 'incident.created'],
        {
            queryKeys: [
                ['dashboard-stats'],
                ['dashboard-daily-activities'],
            ],
        }
    );

    // Real-time: staff clock-in/out events
    useStaffClockUpdates(currentUser?.facility_id, {
        queryKeys: [['dashboard-stats'], ['staff-clock-ins-all']],
        showToast: true,
        getToastMessage: (_event, data) =>
            data.clock_out_at
                ? `${data.staff?.name || 'Staff'} clocked out`
                : `${data.staff?.name || 'Staff'} clocked in`,
    });

    // Real-time: personal notifications
    useUserNotifications(currentUser?.id, { showToast: true });

    const { data: stats, isLoading: statsLoading, isFetched: statsFetched, error } = useQuery(dashboardStatsQueryOptions);

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
                logger.error('Daily activities API error:', err);
                return { data: [] };
            }
        },
        retry: false,
        refetchInterval: 120000, // Poll every 2 minutes
        refetchIntervalInBackground: false,
        // Defer until primary stats load so the first paint does fewer parallel requests
        enabled: !statsLoading,
    });

    // Determine user type early
    const isCaregiver = stats?.user_type === 'caregiver';

    // Module overview counts (from /dashboard/stats — avoids 8 separate list API calls)
    const moduleStats =
        !isCaregiver && stats?.module_resource_counts ? stats.module_resource_counts : null;

    // Fetch trends data for admin users
    const { data: trendsData } = useQuery({
        queryKey: ['dashboard-trends'],
        queryFn: async () => {
            try {
                const response = await api.get('/charts/residents');
                return response.data;
            } catch (err) {
                logger.error('Trends API error:', err);
                return null;
            }
        },
        retry: false,
        enabled: !isCaregiver && !statsLoading, // Only fetch for admins after stats load
        refetchInterval: 180000, // Poll every 3 minutes
        refetchIntervalInBackground: false,
    });

    // Fetch upcoming fire drills (Laravel paginator: { data: FireDrill[] })
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
                logger.error('Fire drills API error:', err);
                return { data: [] };
            }
        },
        // API/cache can occasionally expose non-array `data`; strings pass .length but break .slice().map()
        select: (payload) => {
            if (Array.isArray(payload)) {
                return { data: payload };
            }
            if (!payload || typeof payload !== 'object') {
                return { data: [] };
            }
            const rows = payload.data;
            return { ...payload, data: Array.isArray(rows) ? rows : [] };
        },
        retry: false,
    });

    // Process daily activities for mini calendar
    const calendarData = useMemo(() => {
        const days = dailyActivities?.data;
        if (!Array.isArray(days)) return [];

        return days.map(day => ({
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

    const greeting = usePacificGreeting();

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
            link: '/my-residents',
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
            link: '/leave-requests',
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
            link: '/organization/residents',
            description: 'Active residents',
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
        },
        {
            title: 'Total Staff',
            value: Number(stats?.total_staff ?? 0),
            icon: UserCheck,
            gradient: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            iconBg: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            link: '/team/users',
            description: 'Active staff',
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
            trend: (stats?.pending_assessments ?? 0) > 0 ? 'warning' : undefined,
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

        // Medication Due (next 30 minutes) - Priority alert
        if (stats?.medication_reminders && stats.medication_reminders.length > 0) {
            const now = new Date();
            const next30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

            const dueSoon = stats.medication_reminders.filter(m => {
                if (!m.due_at && !m.due_time) return false;
                try {
                    // Try to parse the due time
                    let dueDate;
                    if (m.due_at) {
                        dueDate = new Date(m.due_at);
                    } else if (m.due_time) {
                        // Combine today's date with the time
                        const today = new Date().toISOString().split('T')[0];
                        dueDate = new Date(`${today}T${m.due_time}`);
                    }

                    if (!dueDate || isNaN(dueDate.getTime())) return false;

                    // Check if due within next 30 minutes
                    return dueDate >= now && dueDate <= next30Minutes;
                } catch (error) {
                    return false;
                }
            });

            if (dueSoon.length > 0) {
                const residentCount = new Set(dueSoon.map(m => m.resident_name || m.resident_id)).size;
                items.push({
                    id: 'medication-due',
                    type: 'medication',
                    title: 'Medication Due',
                    description: `${residentCount} resident${residentCount > 1 ? 's' : ''} need medication in the next 30 minutes`,
                    priority: 'urgent',
                    link: '/medications',
                    metadata: { count: dueSoon.length, residentCount },
                });
            }
        }

        // Low Inventory Alert (if pharmacy module available)
        if (stats?.low_inventory_count && stats.low_inventory_count > 0) {
            items.push({
                id: 'low-inventory',
                type: 'inventory',
                title: 'Low Inventory',
                description: 'Medical supplies running low - order needed',
                priority: 'soon',
                link: '/pharmacy/inventory?stock_status=low_stock',
                metadata: { count: stats.low_inventory_count },
            });
        }

        // Pending Leave Requests (for admins) - Updated design
        if (!isCaregiver && stats?.pending_leave_requests > 0) {
            items.push({
                id: 'pending-leave-requests',
                type: 'leave_request',
                title: 'Pending Approvals',
                description: `${stats.pending_leave_requests} leave request${stats.pending_leave_requests > 1 ? 's' : ''} awaiting your approval`,
                priority: 'info',
                link: '/team/leave-requests',
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
                    logger.error('Error processing fire drill task:', error, drill);
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

    // Fetch today's schedule for caregiver
    const { data: todaysSchedule } = useQuery({
        queryKey: ['dashboard-todays-schedule'],
        queryFn: async () => {
            try {
                const response = await api.get('/dashboard/todays-schedule');
                return response.data;
            } catch (err) {
                logger.error('Schedule API error:', err);
                return [];
            }
        },
        enabled: !!isCaregiver,
        refetchInterval: 60000,
    });

    // Fetch upcoming events
    const { data: upcomingEvents } = useQuery({
        queryKey: ['dashboard-upcoming-events'],
        queryFn: async () => {
            try {
                const response = await api.get('/dashboard/upcoming-events');
                return response.data;
            } catch (err) {
                logger.error('Upcoming events API error:', err);
                return [];
            }
        },
        enabled: !!isCaregiver,
        refetchInterval: 300000,
    });

    const showFireDrills =
        Array.isArray(upcomingFireDrills?.data) && upcomingFireDrills.data.length > 0;
    const trendsChartHasData =
        Boolean(
            trendsData &&
                Array.isArray(trendsData.labels) &&
                trendsData.labels.length > 0,
        );
    const showTrendsBesideUpcoming = trendsChartHasData && !showFireDrills;
    const adminMiddleRowTwoCols = showFireDrills || showTrendsBesideUpcoming;

    const isDashboardReady = userFetched && statsFetched;
    if (!isDashboardReady) {
        return <DashboardLoadingSplash />;
    }

    // Caregiver dashboard (all viewports — mobile uses responsive CaregiverDashboard, not admin MobileDashboard)
    if (isCaregiver && !statsLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                    <CaregiverDashboard
                        user={currentUser}
                        stats={stats}
                        todaysSchedule={todaysSchedule?.data || todaysSchedule || []}
                        upcomingEvents={upcomingEvents?.data || upcomingEvents || []}
                        actionableItems={actionableItems}
                    />
                </div>
            </div>
        );
    }

    // Mobile admin view
    if (isMobile && !statsLoading) {
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
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-5 py-3 sm:py-4">
                <div className="space-y-3">
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

                    {!statsLoading && stats && stats.facility_context_missing && (
                        <div className="bg-yellow-50 rounded-xl shadow-sm border-l-4 border-yellow-500 p-4">
                            <div className="flex items-center space-x-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                    <div>
                                        <h3 className="text-sm font-medium text-yellow-800">Facility Context Missing</h3>
                                        <p className="mt-1 text-sm text-yellow-700">
                                            Dashboard stats may be incomplete. Please ensure your user account has a facility assigned.
                                        </p>
                                    </div>
                            </div>
                        </div>
                    )}

                    {statsLoading && (
                        <DashboardSkeleton />
                    )}

                    {!statsLoading && (
                        <>
                            {/* Compact admin hero — date + context without large vertical padding */}
                            <div
                                className="bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-lg shadow-sm px-4 py-3 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                                role="banner"
                            >
                                <div>
                                    <h1 className="text-xl font-bold leading-tight tracking-tight">
                                        {greeting}, {currentUser?.first_name || currentUser?.name || 'User'} 👋
                                    </h1>
                                    <p className="text-white/80 text-xs mt-1">
                                        {new Date().toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                        {' · '}
                                        Facility overview — manage care with compassion and excellence
                                    </p>
                                </div>
                            </div>

                            {/* Attention queue + KPI grid: side-by-side on large screens */}
                            <div
                                className={
                                    actionableItems.length > 0
                                        ? 'grid grid-cols-1 gap-3 lg:grid-cols-12'
                                        : 'grid grid-cols-1 gap-3'
                                }
                            >
                                {actionableItems.length > 0 && (
                                    <div className="lg:col-span-6 min-w-0 order-1">
                                        <ActionableItemsSection
                                            items={actionableItems}
                                            onItemClick={(item) => item.link && navigate(item.link)}
                                            dense
                                        />
                                    </div>
                                )}
                                <div
                                    className={
                                        actionableItems.length > 0
                                            ? 'lg:col-span-6 min-w-0 order-2'
                                            : ''
                                    }
                                >
                                    <div
                                        className={
                                            actionableItems.length > 0
                                                ? 'grid grid-cols-2 gap-3 xl:grid-cols-3'
                                                : 'grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6'
                                        }
                                    >
                                        {statCards.map((card, index) => (
                                            <StatCard
                                                key={index}
                                                {...card}
                                                dense
                                                onClick={() => card.link && navigate(card.link)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div
                                className={`grid grid-cols-1 gap-3 ${adminMiddleRowTwoCols ? 'xl:grid-cols-2' : ''}`}
                            >
                                <div className="min-w-0">
                                    <UpcomingEventsWidget limit={4} dense />
                                </div>
                                {showFireDrills && (
                                <div className="min-w-0 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-4 py-2.5 border-b border-gray-200">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Flame className="w-4 h-4 text-orange-600 shrink-0" />
                                                <h2 className="text-base font-bold text-[var(--theme-primary)] truncate">Upcoming Fire Drills</h2>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => navigate('/fire-drills')}
                                                className="text-[11px] font-medium text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] hover:underline transition-colors shrink-0"
                                            >
                                                View All
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <div className="space-y-2">
                                            {upcomingFireDrills.data.slice(0, 5).map((drill) => {
                                                if (!drill.scheduled_date) return null;
                                                let drillDate;
                                                try {
                                                    drillDate = new Date(drill.scheduled_date);
                                                    if (isNaN(drillDate.getTime())) return null;
                                                } catch (error) {
                                                    logger.error('Invalid drill date:', drill);
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
                                                        logger.error('Error formatting drill time:', error);
                                                    }
                                                }

                                                return (
                                                    <div
                                                        key={drill.id}
                                                        className={`flex items-center justify-between p-2.5 ${urgencyBg} rounded-lg hover:opacity-90 transition-colors cursor-pointer`}
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
                                {showTrendsBesideUpcoming && (
                                    <div className="min-w-0">
                                        <TrendsChartWidget data={trendsData} dense />
                                    </div>
                                )}
                            </div>

                            {/* Trends chart full width when fire drills use the right column */}
                            {!isCaregiver && trendsChartHasData && showFireDrills && (
                                <TrendsChartWidget data={trendsData} dense />
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
                                    dense
                                />
                            )}

                            {/* Key Insights Section - Moved from Sidebar */}
                            {!isCaregiver && stats && (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-4 py-2.5 border-b border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-[var(--theme-primary)]" />
                                            <h2 className="text-base font-bold text-[var(--theme-primary)]">Key Insights</h2>
                                        </div>
                                        <p className="text-[11px] text-gray-500 mt-0.5">Performance metrics and analytics</p>
                                    </div>
                                    <div className="p-3 sm:p-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                                            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-gray-200">
                                                <div className="bg-blue-50 text-blue-600 p-1.5 rounded-md shrink-0">
                                                    <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">Occupancy Rate</p>
                                                    <p className="text-base sm:text-lg font-semibold text-gray-900 tabular-nums">
                                                        {(stats.occupancy_rate ?? 0).toFixed(1)}%
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-gray-200">
                                                <div className="bg-green-50 text-green-600 p-1.5 rounded-md shrink-0">
                                                    <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">Compliance Score</p>
                                                    <p className="text-base sm:text-lg font-semibold text-gray-900 tabular-nums">
                                                        {formatInsightPercent(stats.compliance_score)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-gray-200">
                                                <div className="bg-purple-50 text-purple-600 p-1.5 rounded-md shrink-0">
                                                    <Pill className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">Medication Adherence</p>
                                                    <p className="text-base sm:text-lg font-semibold text-gray-900 tabular-nums">
                                                        {formatInsightPercent(stats.medication_adherence_rate)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-gray-200">
                                                <div className="bg-orange-50 text-orange-600 p-1.5 rounded-md shrink-0">
                                                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">Avg Response Time</p>
                                                    <p className="text-base sm:text-lg font-semibold text-gray-900 tabular-nums">
                                                        {formatInsightHours(stats.average_incident_response_time)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border border-gray-200 col-span-2 sm:col-span-1 lg:col-span-1">
                                                <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-md shrink-0">
                                                    <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">Staff Count</p>
                                                    <p className="text-base sm:text-lg font-semibold text-gray-900 tabular-nums">
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
        </div>
    );
}

// Modules Overview Component  
function ModulesOverview({ stats, moduleStats, navigate, dense = false }) {
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
            count: moduleStats?.fireDrills || 0,
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
            count: null,
            color: 'from-[var(--theme-primary)] to-[var(--theme-primary-light)]',
            bgColor: 'bg-[var(--theme-primary-bg-light)]',
            iconColor: 'text-[var(--theme-primary)]',
            description: 'Analytics & reports',
        },
    ];

    return (
        <div className={`bg-white border border-gray-100 overflow-hidden ${dense ? 'rounded-lg shadow-sm' : 'rounded-xl shadow-md'}`}>
            <div className={`border-b border-gray-200 ${dense ? 'px-3 py-2.5' : 'px-4 sm:px-6 py-3 sm:py-4'}`}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <BarChart3 className={`${dense ? 'w-4 h-4' : 'w-5 h-5'} text-[var(--theme-primary)] shrink-0`} />
                        <h2 className={`font-bold text-[var(--theme-primary)] truncate ${dense ? 'text-sm sm:text-base' : 'text-base sm:text-lg'}`}>Modules Overview</h2>
                    </div>
                    <span className={`text-gray-500 hidden sm:inline shrink-0 ${dense ? 'text-[10px]' : 'text-xs'}`}>Quick access to all modules</span>
                </div>
            </div>
            <div className={dense ? 'p-3' : 'p-4 sm:p-6'}>
                <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 ${dense ? 'gap-2 sm:gap-2.5' : 'gap-3 sm:gap-4'}`}>
                    {modules.map((module, index) => {
                        const Icon = module.icon;
                        return (
                            <button
                                key={index}
                                type="button"
                                onClick={() => navigate(module.path)}
                                className={`group relative bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 text-left active:scale-95 touch-manipulation ${dense ? 'p-2 sm:p-2.5' : 'p-3 sm:p-4'}`}
                            >
                                <div className={`absolute top-0 left-0 right-0 ${dense ? 'h-0.5' : 'h-1'} bg-gradient-to-r ${module.color} rounded-t-lg`}></div>
                                <div className={`flex flex-col items-center text-center ${dense ? 'space-y-1 mt-0.5' : 'space-y-2 mt-1'}`}>
                                    <div className={`${module.bgColor} ${dense ? 'p-1.5' : 'p-2 sm:p-3'} rounded-lg group-hover:scale-105 transition-transform duration-200`}>
                                        <Icon className={`${dense ? 'w-4 h-4 sm:w-5 sm:h-5' : 'w-5 h-5 sm:w-6 sm:h-6'} ${module.iconColor}`} />
                                    </div>
                                    <div className="flex-1 w-full">
                                        <p className={`font-semibold text-gray-900 ${dense ? 'text-[11px] sm:text-xs mb-0' : 'text-xs sm:text-sm mb-1'}`}>{module.name}</p>
                                        {module.count != null && (
                                            <p className={`font-bold text-[var(--theme-primary)] tabular-nums ${dense ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'}`}>{module.count}</p>
                                        )}
                                        <p className={`text-gray-500 line-clamp-2 ${dense ? 'text-[10px] mt-0.5' : 'text-xs mt-1'}`}>{module.description}</p>
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
function TrendsChartWidget({ data, dense = false }) {
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
        <div className={`bg-white border border-gray-100 overflow-hidden ${dense ? 'rounded-lg shadow-sm' : 'rounded-xl shadow-md'}`}>
            <div className={`border-b border-gray-200 ${dense ? 'px-3 py-2.5' : 'px-4 sm:px-6 py-3 sm:py-4'}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className={`${dense ? 'w-4 h-4' : 'w-5 h-5'} text-[var(--theme-primary)]`} />
                        <h2 className={`font-bold text-[var(--theme-primary)] ${dense ? 'text-sm sm:text-base' : 'text-base sm:text-lg'}`}>7-Day Trends Overview</h2>
                    </div>
                </div>
            </div>
            <div className={dense ? 'p-3' : 'p-4 sm:p-6'}>
                <div style={{ height: dense ? '200px' : '250px' }}>
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
