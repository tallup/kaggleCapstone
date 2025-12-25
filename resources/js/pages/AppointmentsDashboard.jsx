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
    Search,
    Upload
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
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        branch_id: '',
        resident_id: '',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '',
        appointment_type_id: '',
        provider_name: '',
        location: '',
        description: '',
        status: 'scheduled',
    });
    const [expandedAppointment, setExpandedAppointment] = useState(null);
    const [appointmentNotes, setAppointmentNotes] = useState({});
    const [appointmentDocuments, setAppointmentDocuments] = useState({});

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

    // Check if user is a facility administrator (can access all branches in facility)
    const isFacilityAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator';
    }, [currentUser]);
    
    // Check if user is a branch-level admin (restricted to assigned branch)
    const isBranchAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'admin';
    }, [currentUser]);

    // Fetch branches
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 100 } });
            return response.data;
        },
    });

    // Fetch residents
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list'],
        queryFn: async () => {
            const response = await api.get('/residents', { params: { per_page: 100 } });
            return response.data;
        },
    });

    // Fetch appointment types
    const { data: appointmentTypes } = useQuery({
        queryKey: ['appointment-types'],
        queryFn: async () => {
            const response = await api.get('/appointment-types');
            return response.data;
        },
    });

    // Create appointment mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/appointments', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['appointments-dashboard']);
            queryClient.invalidateQueries(['appointments-statistics']);
            setShowForm(false);
            setFormData({
                branch_id: '',
                resident_id: '',
                appointment_date: new Date().toISOString().split('T')[0],
                appointment_time: '',
                appointment_type_id: '',
                provider_name: '',
                location: '',
                description: '',
                status: 'scheduled',
            });
        },
        onError: (error) => {
            console.error('Error creating appointment:', error);
            alert(error.response?.data?.message || 'Failed to create appointment');
        },
    });

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
            } else if (activeTab === 'upcoming') {
                // Set date_filter to upcoming - backend will exclude completed/cancelled
                params.date_filter = 'upcoming';
            }
            
            if (dateFilter === 'upcoming' && activeTab !== 'upcoming') {
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
        mutationFn: async ({ id, notes, documents }) => {
            const formData = new FormData();
            formData.append('status', 'completed');
            if (notes !== null) {
                formData.append('notes', notes);
            }

            // Add documents if any
            if (documents && documents.length > 0) {
                documents.forEach((doc, index) => {
                    if (doc.file) {
                        formData.append(`documents[${index}][file]`, doc.file);
                        formData.append(`documents[${index}][document_name]`, doc.document_name);
                        formData.append(`documents[${index}][document_type]`, doc.document_type || 'appointment');
                        if (doc.notes) {
                            formData.append(`documents[${index}][notes]`, doc.notes);
                        }
                    }
                });
            }

            return await api.patch(`/appointments/${id}/status`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries(['appointments-dashboard']);
            queryClient.invalidateQueries(['appointments-statistics']);
            setExpandedAppointment(null);
            setAppointmentNotes(prev => {
                const updated = { ...prev };
                delete updated[variables.id];
                return updated;
            });
            setAppointmentDocuments(prev => {
                const updated = { ...prev };
                delete updated[variables.id];
                return updated;
            });
        },
    });

    const handleToggleComplete = (appointmentId) => {
        if (expandedAppointment === appointmentId) {
            setExpandedAppointment(null);
        } else {
            setExpandedAppointment(appointmentId);
            if (!appointmentNotes[appointmentId]) {
                setAppointmentNotes(prev => ({ ...prev, [appointmentId]: '' }));
            }
            if (!appointmentDocuments[appointmentId]) {
                setAppointmentDocuments(prev => ({ ...prev, [appointmentId]: [] }));
            }
        }
    };

    const handleCompleteSubmit = async (appointmentId) => {
        const notes = appointmentNotes[appointmentId] || null;
        const documents = appointmentDocuments[appointmentId] || [];
        
        const validDocuments = documents.filter(doc =>
            doc.document_name && doc.document_type && doc.file
        );
        
        if (documents.length > 0 && validDocuments.length !== documents.length) {
            alert('Please fill in all required fields for documents');
            return;
        }
        
        await completeMutation.mutateAsync({ 
            id: appointmentId, 
            notes, 
            documents: validDocuments 
        });
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
                        onClick={() => {
                            // Auto-fill branch for branch admin users (not facility administrators)
                            if (isBranchAdmin && currentUser?.assigned_branch_id) {
                                setFormData(prev => ({ ...prev, branch_id: currentUser.assigned_branch_id }));
                            }
                            setShowForm(true);
                        }}
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
                                                onClick={() => handleToggleComplete(appointment.id)}
                                                disabled={completeMutation.isPending}
                                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                                                title="Mark as Complete"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                                Complete
                                            </button>
                                        )}
                                        <Link
                                            to={`/appointments/${appointment.id}`}
                                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-1.5"
                                        >
                                            View
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>

                                {/* Expandable Completion Section */}
                                {expandedAppointment === appointment.id && isAdmin && appointment.status === 'scheduled' && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="space-y-4">
                                            {/* Notes Section */}
                                            <div>
                                                <div className="block text-sm font-medium text-gray-900 mb-1">
                                                    Appointment Outcome / Comments (Optional)
                                                </div>
                                                <textarea
                                                    rows={3}
                                                    value={appointmentNotes[appointment.id] || ''}
                                                    onChange={(e) => setAppointmentNotes(prev => ({ ...prev, [appointment.id]: e.target.value }))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 text-sm"
                                                    placeholder="Enter notes, comments, or details about the appointment outcome..."
                                                />
                                            </div>

                                            {/* Documents Section */}
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="block text-sm font-medium text-gray-900">
                                                        Upload Documents (Optional)
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const currentDocs = appointmentDocuments[appointment.id] || [];
                                                            setAppointmentDocuments(prev => ({
                                                                ...prev,
                                                                [appointment.id]: [...currentDocs, {
                                                                    document_name: '',
                                                                    document_type: 'appointment',
                                                                    file: null,
                                                                    notes: '',
                                                                }]
                                                            }));
                                                        }}
                                                        className="px-3 py-1.5 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors text-sm font-medium flex items-center gap-2"
                                                    >
                                                        <Upload className="w-4 h-4" />
                                                        Add Document
                                                    </button>
                                                </div>
                                                
                                                {appointmentDocuments[appointment.id]?.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {appointmentDocuments[appointment.id].map((doc, index) => (
                                                            <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="text-sm font-medium text-gray-900">Document {index + 1}</div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = [...appointmentDocuments[appointment.id]];
                                                                            updated.splice(index, 1);
                                                                            setAppointmentDocuments(prev => ({
                                                                                ...prev,
                                                                                [appointment.id]: updated
                                                                            }));
                                                                        }}
                                                                        className="text-gray-400 hover:text-red-600"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <div>
                                                                        <div className="block text-xs font-medium text-gray-700 mb-1">
                                                                            Document Name *
                                                                        </div>
                                                                        <input
                                                                            type="text"
                                                                            value={doc.document_name}
                                                                            onChange={(e) => {
                                                                                const updated = [...appointmentDocuments[appointment.id]];
                                                                                updated[index].document_name = e.target.value;
                                                                                setAppointmentDocuments(prev => ({
                                                                                    ...prev,
                                                                                    [appointment.id]: updated
                                                                                }));
                                                                            }}
                                                                            required
                                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900"
                                                                            placeholder="e.g., Consultation Report"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <div className="block text-xs font-medium text-gray-700 mb-1">
                                                                            Type *
                                                                        </div>
                                                                        <select
                                                                            value={doc.document_type}
                                                                            onChange={(e) => {
                                                                                const updated = [...appointmentDocuments[appointment.id]];
                                                                                updated[index].document_type = e.target.value;
                                                                                setAppointmentDocuments(prev => ({
                                                                                    ...prev,
                                                                                    [appointment.id]: updated
                                                                                }));
                                                                            }}
                                                                            required
                                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                                                        >
                                                                            <option value="appointment">Appointment</option>
                                                                            <option value="consultation">Consultation</option>
                                                                            <option value="medical">Medical</option>
                                                                            <option value="insurance">Insurance</option>
                                                                            <option value="legal">Legal</option>
                                                                            <option value="other">Other</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <div className="block text-xs font-medium text-gray-700 mb-1">
                                                                            File *
                                                                        </div>
                                                                        <input
                                                                            type="file"
                                                                            onChange={(e) => {
                                                                                const updated = [...appointmentDocuments[appointment.id]];
                                                                                updated[index].file = e.target.files[0];
                                                                                setAppointmentDocuments(prev => ({
                                                                                    ...prev,
                                                                                    [appointment.id]: updated
                                                                                }));
                                                                            }}
                                                                            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                                                                            required
                                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900"
                                                                        />
                                                                        <p className="text-xs text-gray-500 mt-1">Max size: 10MB</p>
                                                                    </div>
                                                                    <div className="col-span-2">
                                                                        <div className="block text-xs font-medium text-gray-700 mb-1">
                                                                            Notes
                                                                        </div>
                                                                        <textarea
                                                                            value={doc.notes || ''}
                                                                            onChange={(e) => {
                                                                                const updated = [...appointmentDocuments[appointment.id]];
                                                                                updated[index].notes = e.target.value;
                                                                                setAppointmentDocuments(prev => ({
                                                                                    ...prev,
                                                                                    [appointment.id]: updated
                                                                                }));
                                                                            }}
                                                                            rows={2}
                                                                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900"
                                                                            placeholder="Additional notes..."
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500 italic py-2">No documents added yet. Click "Add Document" to upload files.</p>
                                                )}
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center justify-end space-x-3 pt-2">
                                                <button
                                                    onClick={() => {
                                                        setExpandedAppointment(null);
                                                        setAppointmentNotes(prev => {
                                                            const updated = { ...prev };
                                                            delete updated[appointment.id];
                                                            return updated;
                                                        });
                                                        setAppointmentDocuments(prev => {
                                                            const updated = { ...prev };
                                                            delete updated[appointment.id];
                                                            return updated;
                                                        });
                                                    }}
                                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all text-sm"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleCompleteSubmit(appointment.id)}
                                                    disabled={completeMutation.isPending}
                                                    className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-all disabled:opacity-50 text-sm"
                                                >
                                                    {completeMutation.isPending ? 'Completing...' : 'Mark as Completed'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </SectionCard>

            {/* Add Appointment Modal */}
            {showForm && (
                <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-900">Add Appointment</h3>
                            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!formData.resident_id) {
                                alert('Please select a resident');
                                return;
                            }
                            if (!formData.appointment_date) {
                                alert('Please select a date');
                                return;
                            }
                            if (!formData.appointment_time) {
                                alert('Please select a time');
                                return;
                            }
                            await createMutation.mutateAsync(formData);
                        }}>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-1">Branch</label>
                                        <select
                                            value={formData.branch_id}
                                            onChange={(e) => setFormData({ ...formData, branch_id: e.target.value, resident_id: '' })}
                                            disabled={!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id}
                                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                                        >
                                            <option value="">All Branches</option>
                                            {(branchesData?.data || []).map(branch => (
                                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-1">Resident *</label>
                                        <div className="relative">
                                            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <select
                                                value={formData.resident_id}
                                                onChange={(e) => setFormData({ ...formData, resident_id: e.target.value })}
                                                required
                                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                            >
                                                <option value="">Select resident</option>
                                                {(residentsData?.data || []).filter(r => !formData.branch_id || r.branch_id == formData.branch_id).map(r => (
                                                    <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-1">Date *</label>
                                        <input
                                            type="date"
                                            value={formData.appointment_date}
                                            onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-1">Time *</label>
                                        <input
                                            type="time"
                                            value={formData.appointment_time}
                                            onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-1">Appointment Type</label>
                                        <select
                                            value={formData.appointment_type_id}
                                            onChange={(e) => setFormData({ ...formData, appointment_type_id: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                        >
                                            <option value="">Select type</option>
                                            {(appointmentTypes || []).map(type => (
                                                <option key={type.id} value={type.id}>{type.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-1">Provider Name</label>
                                        <input
                                            type="text"
                                            value={formData.provider_name}
                                            onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-900 mb-1">Location</label>
                                        <input
                                            type="text"
                                            value={formData.location}
                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-900 mb-1">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 border-t flex items-center justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-all disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create Appointment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

