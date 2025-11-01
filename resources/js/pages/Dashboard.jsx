import React from 'react';
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
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import api from '../services/api';
import { 
    Users, Calendar, Activity, UserCheck, ClipboardList, AlertCircle, 
    TrendingUp, Clock, CheckCircle, FileText, Heart, Pill, Moon,
    ArrowRight, Sparkles, MoreVertical
} from 'lucide-react';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
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
    
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            try {
                const response = await api.get('/dashboard/stats');
                return response.data;
            } catch (err) {
                console.error('Dashboard API error:', err);
                return {
                    total_residents: 0,
                    today_appointments: 0,
                    today_vitals: 0,
                    total_staff: 0,
                };
            }
        },
        retry: false,
    });

    const isCaregiver = stats?.user_type === 'caregiver';
    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 18 ? 'Good Afternoon' : 'Good Evening';
    
    // Define stat cards based on user type with gradients and modern styling
    const statCards = isCaregiver ? [
        {
            title: 'My Residents',
            value: stats?.assigned_residents || 0,
            icon: Users,
            gradient: 'from-blue-500 to-blue-600',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            description: 'Assigned to me',
            link: '/administration/residents',
            trend: 'positive'
        },
        {
            title: "Today's Appointments",
            value: stats?.todays_appointments || 0,
            icon: Calendar,
            gradient: 'from-emerald-500 to-emerald-600',
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
            description: 'Scheduled meetings',
            link: '/appointments',
            trend: 'positive'
        },
        {
            title: 'Pending Assessments',
            value: stats?.pending_assessments || 0,
            icon: ClipboardList,
            gradient: 'from-amber-500 to-amber-600',
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            description: 'Awaiting completion',
            link: '/assessments',
            trend: stats?.pending_assessments > 0 ? 'warning' : 'positive'
        },
        {
            title: 'Vitals Recorded',
            value: stats?.today_vitals || 0,
            icon: Activity,
            gradient: 'from-purple-500 to-purple-600',
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600',
            description: 'Today',
            link: '/vitals',
            trend: 'positive'
        },
        {
            title: 'Leave Requests',
            value: stats?.pending_leave_requests || 0,
            icon: AlertCircle,
            gradient: 'from-indigo-500 to-indigo-600',
            iconBg: 'bg-indigo-100',
            iconColor: 'text-indigo-600',
            description: 'Pending approval',
            link: '/administration/leave-requests',
            trend: stats?.pending_leave_requests > 0 ? 'warning' : 'positive'
        },
        {
            title: 'Weekly Appointments',
            value: stats?.week_appointments || 0,
            icon: Calendar,
            gradient: 'from-teal-500 to-teal-600',
            iconBg: 'bg-teal-100',
            iconColor: 'text-teal-600',
            description: 'Next 7 days',
            link: '/appointments',
            trend: 'positive'
        },
    ] : [
        {
            title: 'Total Residents',
            value: stats?.total_residents || 0,
            icon: Users,
            gradient: 'from-blue-500 to-blue-600',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            link: '/administration/residents',
        },
        {
            title: "Today's Appointments",
            value: stats?.today_appointments || 0,
            icon: Calendar,
            gradient: 'from-emerald-500 to-emerald-600',
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
            link: '/appointments',
        },
        {
            title: 'Today Vitals',
            value: stats?.today_vitals || 0,
            icon: Activity,
            gradient: 'from-purple-500 to-purple-600',
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-600',
            link: '/vitals',
        },
        {
            title: 'Total Staff',
            value: stats?.total_staff || 0,
            icon: UserCheck,
            gradient: 'from-orange-500 to-orange-600',
            iconBg: 'bg-orange-100',
            iconColor: 'text-orange-600',
            link: '/administration/users',
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F5F5DC] to-[#E6E6D4]">
            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 bg-white rounded-xl shadow-lg border-l-4 border-amber-500 p-4">
                        <div className="flex items-center space-x-3">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            <p className="text-amber-800 text-sm">
                                Note: API connection failed. Showing default values. Please check authentication.
                            </p>
                        </div>
                    </div>
                )}
                
                {isLoading && (
                    <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#2D5016] border-t-transparent"></div>
                        <p className="mt-4 text-[#8B4513] text-lg font-medium">Loading dashboard data...</p>
                    </div>
                )}
                
                {!isLoading && (
                    <>
                        {/* Modern Welcome Card */}
                        <div className="mb-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#2D5016] to-[#4a7a2a] rounded-xl blur-sm opacity-50"></div>
                                            <div className="relative w-16 h-16 bg-gradient-to-br from-[#2D5016] to-[#4a7a2a] rounded-xl flex items-center justify-center">
                                                <Sparkles className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-bold text-[#2D5016]">
                                                {greeting}, {currentUser?.first_name || currentUser?.name || 'User'} 👋
                                            </h1>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {isCaregiver ? 'Welcome to your Care Dashboard' : 'Welcome to the Admin Dashboard'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Last Login</p>
                                        <p className="text-sm font-semibold text-[#8B4513]">
                                            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stat Cards Grid */}
                        <div className={`grid grid-cols-1 md:grid-cols-2 ${isCaregiver ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-6 mb-8`}>
                            {statCards.map((card, index) => {
                                const Icon = card.icon;
                                return (
                                    <div
                                        key={index}
                                        onClick={() => card.link && navigate(card.link)}
                                        className="group relative bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100"
                                    >
                                        {/* Gradient decoration */}
                                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient}`}></div>
                                        
                                        {/* Content */}
                                        <div className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <p className="text-[#8B4513] text-sm font-semibold uppercase tracking-wide mb-1">
                                                        {card.title}
                                                    </p>
                                                    <div className="flex items-baseline space-x-2">
                                                        <p className="text-4xl font-bold text-[#2D5016]">
                                                            {card.value}
                                                        </p>
                                                        {card.trend === 'warning' && (
                                                            <AlertCircle className="w-5 h-5 text-amber-500" />
                                                        )}
                                                    </div>
                                                    {card.description && (
                                                        <p className="text-gray-500 text-xs mt-2 flex items-center">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {card.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className={`${card.iconBg} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                                                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                                                </div>
                                            </div>
                                            
                                            {/* Hover effect */}
                                            {card.link && (
                                                <div className="flex items-center text-[#2D5016] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <span>View details</span>
                                                    <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Two Column Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            {/* Upcoming Appointments */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-bold text-[#2D5016]">Upcoming Appointments</h2>
                                        <button
                                            onClick={() => navigate('/appointments')}
                                            className="text-sm text-[#2D5016] hover:text-[#1a3009] font-medium"
                                        >
                                            View all →
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    {stats?.upcoming_appointments_list?.length > 0 ? (
                                        <div className="space-y-3">
                                            {stats.upcoming_appointments_list.map((apt, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <Calendar className="w-5 h-5 text-[#2D5016] flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-[#2D5016] truncate">
                                                                {apt.resident_name}
                                                            </p>
                                                            <p className="text-xs text-gray-600 truncate">
                                                                {apt.time} - {apt.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                                                        apt.status === 'confirmed' || apt.status === 'scheduled' 
                                                            ? 'bg-green-100 text-green-700'
                                                            : apt.status === 'pending'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {apt.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">No upcoming appointments</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* My Residents */}
                            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-lg font-bold text-[#2D5016]">My Residents</h2>
                                        <button
                                            onClick={() => navigate('/administration/residents')}
                                            className="text-sm text-[#2D5016] hover:text-[#1a3009] font-medium"
                                        >
                                            View all →
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    {stats?.resident_list?.length > 0 ? (
                                        <div className="space-y-3">
                                            {stats.resident_list.map((resident, idx) => (
                                                <div key={idx} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                                                    <div className="w-10 h-10 bg-[#2D5016] rounded-full flex items-center justify-center flex-shrink-0">
                                                        <span className="text-white text-sm font-bold">
                                                            {resident.name.split(' ').map(n => n[0]).join('')}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[#2D5016] truncate">
                                                            {resident.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            Room: {resident.room}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">No residents assigned</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Lower Section Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Resident Vitals Trend Chart */}
                            {stats?.resident_list && stats.resident_list.length > 0 && (
                                <div className="lg:col-span-2">
                                    <ResidentVitalsTrendSection 
                                        residents={stats.resident_list}
                                        defaultTrend={stats.resident_vitals_trend}
                                    />
                                </div>
                            )}

                            {/* Medication Reminders */}
                            <div>
                                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-lg font-bold text-[#2D5016]">Medication Reminders</h2>
                                            <span className="text-xs text-gray-500">Next 24 Hours</span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        {stats?.medication_reminders?.length > 0 ? (
                                            <div className="space-y-3">
                                                {stats.medication_reminders.map((reminder, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                                        <div className="flex items-center space-x-3 flex-1">
                                                            <div className="w-10 h-10 bg-[#2D5016] rounded-full flex items-center justify-center flex-shrink-0">
                                                                <span className="text-white text-sm font-bold">
                                                                    {reminder.resident_name.split(' ').map(n => n[0]).join('')}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-semibold text-[#2D5016] truncate">
                                                                    {reminder.resident_name}
                                                                </p>
                                                                <p className="text-xs text-gray-600 truncate">
                                                                    {reminder.medication_name}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    Due: {reminder.due_time}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => navigate('/medications')}
                                                            className="ml-2 px-4 py-1.5 bg-[#8B4513] hover:bg-[#6b3410] text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                                                        >
                                                            Log
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Pill className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                <p className="text-sm text-gray-500">No upcoming medications</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Resident Vitals Trend Section Component
function ResidentVitalsTrendSection({ residents, defaultTrend }) {
    const [selectedResident, setSelectedResident] = React.useState(residents[0]?.id || null);
    const [vitalsData, setVitalsData] = React.useState(defaultTrend);
    const [isLoading, setIsLoading] = React.useState(false);

    React.useEffect(() => {
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
                <h2 className="text-xl font-bold text-[#2D5016]">Resident Vitals Trend</h2>
                <div className="flex items-center">
                    {isLoading && (
                        <div className="inline-flex items-center mr-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#2D5016]"></div>
                        </div>
                    )}
                    <select
                        value={selectedResident || ''}
                        onChange={(e) => handleResidentChange(e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-[#2D5016] focus:ring-2 focus:ring-[#2D5016] focus:border-transparent bg-white"
                    >
                        {residents.map((resident) => (
                            <option key={resident.id} value={resident.id}>
                                {resident.name}
                            </option>
                        ))}
                    </select>
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
                    color: '#2D5016',
                },
            },
            tooltip: {
                backgroundColor: 'rgba(45, 80, 22, 0.9)',
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
                    color: '#8B4513',
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
                    color: '#8B4513',
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
