import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { 
    Calendar, 
    CheckCircle, 
    XCircle, 
    Clock, 
    TrendingUp,
    Plus,
    User,
    MapPin,
    Stethoscope,
    ChevronRight,
    FileText,
    List,
    Search
} from 'lucide-react';
import Card from '../components/Card';
import SectionCard from '../components/SectionCard';

const tabs = [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'upcoming', label: 'Upcoming', icon: Clock },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'this_month', label: 'This Month', icon: TrendingUp },
];

export default function AppointmentsDashboard() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [dateFilter, setDateFilter] = useState('upcoming');
    const [activeTab, setActiveTab] = useState('upcoming'); // 'today', 'upcoming', 'completed', 'this_month'
    const [search, setSearch] = useState('');

    // Fetch current user
    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const response = await api.get('/user');
            return response.data;
        },
    });

    // Check if user is admin
    const isAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator' || role === 'admin' || role === 'super_admin';
    }, [currentUser]);

    // Fetch statistics
    const { data: statistics, isLoading: statsLoading, error: statsError } = useQuery({
        queryKey: ['appointments-statistics'],
        queryFn: async () => {
            try {
                const response = await api.get('/appointments/statistics');
                return response.data;
            } catch (error) {
                console.error('Error fetching statistics:', error);
                throw error;
            }
        },
        refetchOnWindowFocus: true,
    });

    // Fetch appointments based on filters
    const { data: appointmentsData, isLoading: appointmentsLoading, refetch } = useQuery({
        queryKey: ['appointments-dashboard', dateFilter, activeTab, search],
        queryFn: async () => {
            const params = {
                per_page: 50,
            };
            
            // Apply status filter based on active tab
            if (activeTab === 'completed') {
                params.status = 'completed';
            }
            
            if (dateFilter === 'upcoming') {
                params.date_filter = 'upcoming';
            } else if (dateFilter === 'past') {
                params.date_filter = 'past';
            } else if (dateFilter === 'today') {
                params.date_filter = 'today';
            } else if (activeTab === 'this_month') {
                // For this month, we need to filter by date range
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                const endOfMonth = new Date(startOfMonth);
                endOfMonth.setMonth(endOfMonth.getMonth() + 1);
                endOfMonth.setDate(0);
                endOfMonth.setHours(23, 59, 59, 999);
                params.date_from = startOfMonth.toISOString().split('T')[0];
                params.date_to = endOfMonth.toISOString().split('T')[0];
            }
            
            if (search) {
                params.search = search;
            }
            
            const response = await api.get('/appointments', { params });
            return response.data;
        },
    });

    // Mark appointment as complete mutation
    const completeMutation = useMutation({
        mutationFn: async ({ id, notes }) => {
            const formData = new FormData();
            formData.append('status', 'completed');
            if (notes) {
                formData.append('notes', notes);
            }
            return await api.patch(`/appointments/${id}/status`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['appointments-dashboard']);
            queryClient.invalidateQueries(['appointments-statistics']);
        },
    });

    const handleQuickComplete = async (appointmentId) => {
        if (window.confirm('Mark this appointment as completed?')) {
            await completeMutation.mutateAsync({ id: appointmentId });
        }
    };

    const appointments = appointmentsData?.data || [];
    const stats = statistics || {
        today: 0,
        upcoming: 0,
        completed: 0,
        cancelled: 0,
        total: 0,
        this_week: 0,
        this_month: 0,
    };

    // Debug: Log statistics when they change
    useEffect(() => {
        if (statistics) {
            console.log('Appointments Statistics:', statistics);
        }
        if (statsError) {
            console.error('Statistics Error:', statsError);
        }
    }, [statistics, statsError]);

    // Handle tab click - sync filters with active tab
    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        if (tabId === 'today') {
            setDateFilter('today');
        } else if (tabId === 'upcoming') {
            setDateFilter('upcoming');
        } else if (tabId === 'completed') {
            setDateFilter('all');
        } else if (tabId === 'this_month') {
            setDateFilter('all');
        }
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        try {
            const [hours, minutes] = timeString.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour}:${minutes} ${ampm}`;
        } catch {
            return timeString;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return dateString;
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            scheduled: 'bg-blue-100 text-blue-800 border-blue-300',
            completed: 'bg-green-100 text-green-800 border-green-300',
            cancelled: 'bg-red-100 text-red-800 border-red-300',
            confirmed: 'bg-purple-100 text-purple-800 border-purple-300',
            in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        };
        return badges[status] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Appointments Dashboard</h1>
                    <p className="text-gray-600 mt-1">Overview and management of all appointments</p>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/appointments"
                        className="inline-flex items-center gap-2 rounded-lg border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm"
                    >
                        <List className="h-4 w-4" />
                        View All
                    </Link>
                    <button
                        onClick={() => navigate('/appointments?action=create')}
                        className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add Appointment
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {statsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-800">
                        Error loading statistics. Please refresh the page.
                    </p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Today</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {statsLoading ? (
                                    <span className="inline-block animate-pulse">...</span>
                                ) : (
                                    stats.today
                                )}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Calendar className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Upcoming</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {statsLoading ? (
                                    <span className="inline-block animate-pulse">...</span>
                                ) : (
                                    stats.upcoming
                                )}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Clock className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Completed</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {statsLoading ? (
                                    <span className="inline-block animate-pulse">...</span>
                                ) : (
                                    stats.completed
                                )}
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <CheckCircle className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">This Month</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {statsLoading ? (
                                    <span className="inline-block animate-pulse">...</span>
                                ) : (
                                    stats.this_month
                                )}
                            </p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tab Navigation with Search */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-gray-100">
                <nav className="flex flex-wrap gap-2">
                    {tabs.map(({ id, label, icon: Icon }) => {
                        const isActive = activeTab === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => handleTabClick(id)}
                                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
                                    isActive
                                        ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </nav>
                
                <div className="relative w-full md:w-auto">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search appointments..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full md:w-64 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    />
                </div>
            </div>

            {/* Appointments List */}
            <SectionCard>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {activeTab === 'today' ? 'Today\'s Appointments' : 
                     activeTab === 'upcoming' ? 'Upcoming Appointments' : 
                     activeTab === 'completed' ? 'Completed Appointments' : 
                     activeTab === 'this_month' ? 'This Month\'s Appointments' :
                     dateFilter === 'past' ? 'Past Appointments' : 
                     'All Appointments'}
                </h2>

                {appointmentsLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading appointments...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="text-center py-12">
                        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No appointments found</p>
                        <p className="text-gray-500 text-sm mt-2">
                            {search ? 'Try adjusting your search' : 'Create a new appointment to get started'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {appointments.map((appointment) => (
                            <div
                                key={appointment.id}
                                className="p-4 border border-gray-200 rounded-lg hover:border-[var(--theme-primary)] hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadge(appointment.status)}`}>
                                                {appointment.status?.replace('_', ' ').toUpperCase() || 'SCHEDULED'}
                                            </div>
                                            {appointment.appointment_type && (
                                                <div className="flex items-center gap-1 text-sm text-gray-600">
                                                    <Stethoscope className="w-4 h-4" />
                                                    {appointment.appointment_type?.name || 'General'}
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {appointment.resident ? (
                                                `${appointment.resident.first_name} ${appointment.resident.last_name}`
                                            ) : (
                                                'Unknown Resident'
                                            )}
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>{formatDate(appointment.appointment_date)}</span>
                                                {appointment.appointment_time && (
                                                    <span className="ml-2">at {formatTime(appointment.appointment_time)}</span>
                                                )}
                                            </div>

                                            {appointment.location && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{appointment.location}</span>
                                                </div>
                                            )}

                                            {appointment.provider_name && (
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4" />
                                                    <span>{appointment.provider_name}</span>
                                                </div>
                                            )}

                                            {appointment.branch && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{appointment.branch.name}</span>
                                                </div>
                                            )}
                                        </div>

                                        {appointment.description && (
                                            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                                {appointment.description}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        {isAdmin && appointment.status === 'scheduled' && (
                                            <button
                                                onClick={() => handleQuickComplete(appointment.id)}
                                                disabled={completeMutation.isPending}
                                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                                                title="Mark as Complete"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Complete
                                            </button>
                                        )}
                                        <Link
                                            to={`/appointments?id=${appointment.id}`}
                                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1.5"
                                        >
                                            View
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}

