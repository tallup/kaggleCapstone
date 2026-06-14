import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useToastContext } from '../contexts/ToastContext';
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
    Upload,
    X,
    CalendarClock,
    Building2
} from 'lucide-react';
import Card from '../components/Card';
import SectionCard from '../components/SectionCard';
import BranchSelector from '../components/BranchSelector';
import logger from '../utils/logger';
import Tooltip from '../components/ui/Tooltip';
import Modal from '../components/ui/Modal';

const tabs = [
    { id: 'today', label: 'Today', icon: Calendar },
    { id: 'upcoming', label: 'Upcoming', icon: Clock },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'this_month', label: 'This Month', icon: TrendingUp },
];

export default function AppointmentsDashboard() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const selectedBranchId = searchParams.get('branch');
    const toast = useToastContext();
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
    const [reschedulingAppointment, setReschedulingAppointment] = useState(null);
    const [rescheduleFormData, setRescheduleFormData] = useState({
        appointment_date: '',
        appointment_time: '',
        reschedule_reason: '',
    });
    const [cancellingAppointment, setCancellingAppointment] = useState(null);
    const [cancellationStatus, setCancellationStatus] = useState('cancelled');
    const [cancellationNotes, setCancellationNotes] = useState('');
    const [updateAppointmentDate, setUpdateAppointmentDate] = useState('');
    const [updateAppointmentTime, setUpdateAppointmentTime] = useState('');

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

    // Fetch residents - filtered by branch
    const { data: residentsData, isLoading: residentsLoading } = useQuery({
        queryKey: ['residents-list', selectedBranchId],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (selectedBranchId) {
                params.branch_id = selectedBranchId;
            }
            const response = await api.get('/residents', { params });
            return response.data;
        },
        enabled: !!selectedBranchId, // Only fetch if branch is selected
        refetchOnWindowFocus: false,
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
                branch_id: branchId ? String(branchId) : '',
                resident_id: '',
                appointment_date: new Date().toISOString().split('T')[0],
                appointment_time: '',
                appointment_type_id: '',
                provider_name: '',
                location: '',
                description: '',
                status: 'scheduled',
            });
            toast.success('Appointment created successfully!', '', { isFormSubmission: true });
        },
        onError: (error) => {
            logger.error('Error creating appointment:', error);
            const errorMessage = error.response?.data?.message || 'Failed to create appointment';
            toast.error('Error', errorMessage);
        },
    });

    // Fetch statistics
    const { data: statistics, isLoading: statsLoading, error: statsError } = useQuery({
        queryKey: ['appointments-statistics', selectedBranchId],
        queryFn: async () => {
            try {
                const params = {};
                if (selectedBranchId) {
                    params.branch_id = selectedBranchId;
                }
                const response = await api.get('/appointments/statistics', { params });
                return response.data;
            } catch (error) {
                logger.error('Error fetching statistics:', error);
                throw error;
            }
        },
        enabled: !!selectedBranchId, // Only fetch if branch is selected
        refetchOnWindowFocus: true,
    });

    // Use selected branch from URL
    const branchId = React.useMemo(() => {
        return selectedBranchId ? parseInt(selectedBranchId) : (currentUser?.assigned_branch_id ?? null);
    }, [selectedBranchId, currentUser?.assigned_branch_id]);

    // Initialize formData.branch_id when branchId is available
    React.useEffect(() => {
        if (branchId && !formData.branch_id) {
            setFormData(prev => ({ ...prev, branch_id: String(branchId) }));
        }
    }, [branchId]);

    // Fetch appointments based on filters
    const { data: appointmentsData, isLoading: appointmentsLoading, refetch } = useQuery({
        queryKey: ['appointments-dashboard', dateFilter, activeTab, search, selectedBranchId],
        queryFn: async () => {
            const params = {
                per_page: 50,
            };
            
            if (selectedBranchId) {
                params.branch_id = selectedBranchId;
            }
            
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
        enabled: !!selectedBranchId, // Only fetch if branch is selected
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
            toast.success('Appointment marked as completed!', '', { isFormSubmission: true });
        },
        onError: (error) => {
            logger.error('Complete error:', error);
            const errorMessage = error.response?.data?.message || 'Failed to complete appointment. Please try again.';
            toast.error('Error', errorMessage);
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
            toast.warning('Validation', 'Please fill in all required fields for documents');
            return;
        }
        
        await completeMutation.mutateAsync({ 
            id: appointmentId, 
            notes, 
            documents: validDocuments 
        });
    };

    // Cancel appointment mutation (now handles both status updates and rescheduling)
    const cancelMutation = useMutation({
        mutationFn: async ({ id, status, notes, appointment_date, appointment_time, currentStatus }) => {
            let response = null;
            
            // If date or time is changed, update the appointment first
            if (appointment_date || appointment_time) {
                const updateData = {};
                if (appointment_date) updateData.appointment_date = appointment_date;
                if (appointment_time) updateData.appointment_time = appointment_time;
                
                response = await api.put(`/appointments/${id}`, updateData);
            }
            
            // Then update the status if it has changed or if notes are provided
            if (status && (status !== currentStatus || notes)) {
                const formData = new FormData();
                formData.append('status', status);
                if (notes) {
                    formData.append('notes', notes);
                }

                response = await api.patch(`/appointments/${id}/status`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
            }
            
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['appointments-dashboard']);
            queryClient.invalidateQueries(['appointments-statistics']);
            setCancellingAppointment(null);
            setCancellationStatus('scheduled');
            setCancellationNotes('');
            setUpdateAppointmentDate('');
            setUpdateAppointmentTime('');
            toast.success('Appointment updated successfully!', '', { isFormSubmission: true });
        },
        onError: (error) => {
            logger.error('Update error:', error);
            const errorMessage = error.response?.data?.message || 'Failed to update appointment. Please try again.';
            toast.error('Error', errorMessage);
        },
    });

    // Reschedule appointment mutation
    const rescheduleMutation = useMutation({
        mutationFn: async ({ id, appointment_date, appointment_time, reschedule_reason }) => {
            const response = await api.put(`/appointments/${id}`, {
                appointment_date,
                appointment_time,
                reschedule_reason: reschedule_reason || null,
            });
            return response;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['appointments-dashboard']);
            queryClient.invalidateQueries(['appointments-statistics']);
            setReschedulingAppointment(null);
            setRescheduleFormData({ appointment_date: '', appointment_time: '', reschedule_reason: '' });
            toast.success('Appointment rescheduled successfully!', '', { isFormSubmission: true });
        },
        onError: (error) => {
            logger.error('Reschedule error:', error);
            const errorMessage = error.response?.data?.message || 'Failed to reschedule appointment. Please try again.';
            toast.error('Error', errorMessage);
        },
    });

    const handleCancel = (appointment) => {
        setCancellingAppointment(appointment);
        setCancellationStatus(appointment.status || 'scheduled');
        setCancellationNotes('');
        
        // Initialize date and time fields with current appointment values
        if (appointment.appointment_date) {
            const date = new Date(appointment.appointment_date);
            if (!isNaN(date.getTime())) {
                setUpdateAppointmentDate(date.toISOString().split('T')[0]);
            } else {
                setUpdateAppointmentDate('');
            }
        } else {
            setUpdateAppointmentDate('');
        }
        
        if (appointment.appointment_time) {
            // Format time for input (HH:MM) - remove seconds if present
            const timeFormatted = appointment.appointment_time.substring(0, 5);
            setUpdateAppointmentTime(timeFormatted);
        } else {
            setUpdateAppointmentTime('');
        }
    };

    const handleReschedule = (appointment) => {
        setReschedulingAppointment(appointment);
        
        // Format date for input (YYYY-MM-DD)
        let formattedDate = '';
        if (appointment.appointment_date) {
            const date = new Date(appointment.appointment_date);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toISOString().split('T')[0];
            }
        }
        
        // Format time for input (HH:MM) - remove seconds if present
        let formattedTime = '';
        if (appointment.appointment_time) {
            formattedTime = appointment.appointment_time.substring(0, 5); // Take only HH:MM
        }
        
        setRescheduleFormData({
            appointment_date: formattedDate,
            appointment_time: formattedTime,
            reschedule_reason: '',
        });
    };

    const handleRescheduleSubmit = async (e) => {
        e.preventDefault();
        if (!rescheduleFormData.appointment_date || !rescheduleFormData.appointment_time) {
            toast.warning('Validation', 'Please select both date and time');
            return;
        }
        
        // Ensure time is in HH:MM format (backend expects this)
        const timeFormatted = rescheduleFormData.appointment_time.length === 5 
            ? rescheduleFormData.appointment_time 
            : rescheduleFormData.appointment_time.substring(0, 5);
        
        rescheduleMutation.mutate({
            id: reschedulingAppointment.id,
            appointment_date: rescheduleFormData.appointment_date,
            appointment_time: timeFormatted,
            reschedule_reason: rescheduleFormData.reschedule_reason || null,
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

    useEffect(() => {
        if (statsError) {
            logger.error('Statistics Error:', statsError);
        }
    }, [statsError]);

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

    // Show branch selector and wait for branch selection
    if (!selectedBranchId) {
        return (
            <div>
                <BranchSelector currentUser={currentUser} />
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-sm font-semibold text-gray-700">Please select a branch to continue</p>
                    <p className="mt-2 text-xs text-gray-500">Select a branch from the dropdown above to view and manage appointments.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <BranchSelector currentUser={currentUser} />
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
                                        {isAdmin && (
                                            <>
                                                {/* Complete button - only show on the day of the appointment */}
                                                {appointment.status !== 'completed' && (() => {
                                                    const appointmentDate = appointment.appointment_date 
                                                        ? new Date(appointment.appointment_date).toDateString() 
                                                        : null;
                                                    const today = new Date().toDateString();
                                                    const isToday = appointmentDate === today;
                                                    
                                                    return isToday && (appointment.status === 'scheduled' || appointment.status === 'rescheduled' || appointment.status === 'confirmed') ? (
                                                        <Tooltip content="Mark as complete" position="top">
                                                            <span className="inline-flex">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleToggleComplete(appointment.id)}
                                                                    disabled={completeMutation.isPending}
                                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                                                                    aria-label="Mark appointment as complete"
                                                                >
                                                                    <CheckCircle className="w-4 h-4" />
                                                                    Complete
                                                                </button>
                                                            </span>
                                                        </Tooltip>
                                                    ) : null;
                                                })()}
                                                
                                                {/* Update button - always visible until appointment is completed */}
                                                {appointment.status !== 'completed' && (
                                                    <Tooltip content="Update appointment status" position="top">
                                                        <span className="inline-flex">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCancel(appointment)}
                                                                disabled={cancelMutation.isPending}
                                                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                                                                aria-label="Update appointment status"
                                                            >
                                                                <CalendarClock className="w-4 h-4" />
                                                                Update
                                                            </button>
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </>
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
                                {expandedAppointment === appointment.id && isAdmin && (() => {
                                    const appointmentDate = appointment.appointment_date 
                                        ? new Date(appointment.appointment_date).toDateString() 
                                        : null;
                                    const today = new Date().toDateString();
                                    const isToday = appointmentDate === today;
                                    
                                    return isToday && (appointment.status === 'scheduled' || appointment.status === 'rescheduled' || appointment.status === 'confirmed');
                                })() && (
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
            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title="Add Appointment"
                size="xl"
            >
                <form
                    onSubmit={async (e) => {
                        e.preventDefault();
                        if (!formData.resident_id) {
                            toast.warning('Validation', 'Please select a resident');
                            return;
                        }
                        if (!formData.appointment_date) {
                            toast.warning('Validation', 'Please select a date');
                            return;
                        }
                        if (!formData.appointment_time) {
                            toast.warning('Validation', 'Please select a time');
                            return;
                        }
                        await createMutation.mutateAsync(formData);
                    }}
                >
                    <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Branch Selection - Only show if branch not already selected from URL */}
                                    {!selectedBranchId ? (
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
                                    ) : (
                                        // Branch is selected from URL, use it as hidden field
                                        <input type="hidden" value={selectedBranchId.toString()} />
                                    )}
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
                                                {residentsLoading ? (
                                                    <option disabled>Loading residents...</option>
                                                ) : (
                                                    (residentsData?.data || []).map(r => (
                                                        <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                                                    ))
                                                )}
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
                    <div className="flex items-center justify-end space-x-3 border-t border-gray-200 pt-4 mt-6">
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
            </Modal>

            {/* Reschedule Appointment Modal */}
            <Modal
                isOpen={reschedulingAppointment != null}
                onClose={() => {
                    setReschedulingAppointment(null);
                    setRescheduleFormData({ appointment_date: '', appointment_time: '', reschedule_reason: '' });
                }}
                title="Reschedule Appointment"
                size="md"
            >
                <form onSubmit={handleRescheduleSubmit}>
                    <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">Date *</label>
                                    <input
                                        type="date"
                                        value={rescheduleFormData.appointment_date}
                                        onChange={(e) => setRescheduleFormData({ ...rescheduleFormData, appointment_date: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">Time *</label>
                                    <input
                                        type="time"
                                        value={rescheduleFormData.appointment_time}
                                        onChange={(e) => setRescheduleFormData({ ...rescheduleFormData, appointment_time: e.target.value })}
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1">Reason for Rescheduling (Optional)</label>
                                    <textarea
                                        value={rescheduleFormData.reschedule_reason}
                                        onChange={(e) => setRescheduleFormData({ ...rescheduleFormData, reschedule_reason: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                        placeholder="Enter the reason for rescheduling this appointment..."
                                    />
                                </div>
                                {reschedulingAppointment && (
                                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                        <p><strong>Resident:</strong> {reschedulingAppointment.resident?.name || reschedulingAppointment.resident?.first_name + ' ' + reschedulingAppointment.resident?.last_name}</p>
                                        <p><strong>Current Date:</strong> {new Date(reschedulingAppointment.appointment_date).toLocaleDateString()}</p>
                                        <p><strong>Current Time:</strong> {reschedulingAppointment.appointment_time}</p>
                                    </div>
                                )}
                            </div>
                    <div className="flex items-center justify-end space-x-3 border-t border-gray-200 pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReschedulingAppointment(null);
                                        setRescheduleFormData({ appointment_date: '', appointment_time: '', reschedule_reason: '' });
                                    }}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={rescheduleMutation.isPending}
                                    className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-all disabled:opacity-50"
                                >
                                    {rescheduleMutation.isPending ? 'Rescheduling...' : 'Reschedule'}
                                </button>
                            </div>
                </form>
            </Modal>

            {/* Cancellation/Status Update Modal */}
            <Modal
                isOpen={cancellingAppointment != null}
                onClose={() => {
                    setCancellingAppointment(null);
                    setCancellationStatus('scheduled');
                    setCancellationNotes('');
                    setUpdateAppointmentDate('');
                    setUpdateAppointmentTime('');
                }}
                title="Update Appointment Status"
                size="xl"
            >
                <p className="text-sm text-gray-600 mb-4">Select the appointment status and add any comments</p>
                <div className="space-y-6">
                            {/* Status Dropdown */}
                            <div>
                                <label className="block text-base font-semibold text-gray-900 mb-2" style={{ color: '#111827', fontWeight: 700 }}>
                                    Appointment Status *
                                </label>
                                <select
                                    value={cancellationStatus}
                                    onChange={(e) => setCancellationStatus(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                >
                                    <option value="">- Please Select -</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="no_show">No Show</option>
                                    <option value="rescheduled">Rescheduled</option>
                                </select>
                            </div>

                            {/* Reschedule Date and Time */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-base font-semibold text-gray-900 mb-2" style={{ color: '#111827', fontWeight: 700 }}>
                                        Appointment Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={updateAppointmentDate}
                                        onChange={(e) => setUpdateAppointmentDate(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-base font-semibold text-gray-900 mb-2" style={{ color: '#111827', fontWeight: 700 }}>
                                        Appointment Time (Optional)
                                    </label>
                                    <input
                                        type="time"
                                        value={updateAppointmentTime}
                                        onChange={(e) => setUpdateAppointmentTime(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Notes/Comments */}
                            <div>
                                <label className="block text-base font-semibold text-gray-900 mb-2" style={{ color: '#111827', fontWeight: 700 }}>
                                    Comments (Optional)
                                </label>
                                <textarea
                                    value={cancellationNotes}
                                    onChange={(e) => setCancellationNotes(e.target.value)}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    placeholder="Enter any comments or notes about this status change..."
                                />
                            </div>

                            {/* Appointment Info */}
                            {cancellingAppointment && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">
                                        <strong>Resident:</strong> {cancellingAppointment.resident?.name || (cancellingAppointment.resident?.first_name + ' ' + cancellingAppointment.resident?.last_name)}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                        <strong>Date:</strong> {new Date(cancellingAppointment.appointment_date).toLocaleDateString()}
                                    </p>
                                    {cancellingAppointment.appointment_time && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            <strong>Time:</strong> {cancellingAppointment.appointment_time}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                <div className="flex items-center justify-end space-x-3 border-t border-gray-200 pt-4 mt-6">
                            <button
                                type="button"
                                onClick={() => {
                                    setCancellingAppointment(null);
                                    setCancellationStatus('scheduled');
                                    setCancellationNotes('');
                                    setUpdateAppointmentDate('');
                                    setUpdateAppointmentTime('');
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    // Check if date or time is being changed
                                    const currentDate = cancellingAppointment.appointment_date 
                                        ? new Date(cancellingAppointment.appointment_date).toISOString().split('T')[0]
                                        : '';
                                    const currentTime = cancellingAppointment.appointment_time?.substring(0, 5) || '';
                                    
                                    const hasDateChange = updateAppointmentDate && updateAppointmentDate !== currentDate;
                                    const hasTimeChange = updateAppointmentTime && updateAppointmentTime !== currentTime;
                                    const hasStatusChange = cancellationStatus && cancellationStatus !== cancellingAppointment.status;
                                    
                                    // Validate that at least one change is being made
                                    if (!hasDateChange && !hasTimeChange && !hasStatusChange && !cancellationNotes) {
                                        toast.warning('Validation', 'Please make at least one change (status, date, time, or add comments)');
                                        return;
                                    }

                                    // Status is required only if no other changes are being made
                                    if (!cancellationStatus && !hasDateChange && !hasTimeChange) {
                                        toast.warning('Validation', 'Please select an appointment status or change the date/time');
                                        return;
                                    }
                                    
                                    // Format time if provided
                                    let formattedTime = updateAppointmentTime;
                                    if (formattedTime && formattedTime.length === 5) {
                                        formattedTime = formattedTime.substring(0, 5);
                                    }
                                    
                                    cancelMutation.mutate({ 
                                        id: cancellingAppointment.id, 
                                        status: cancellationStatus || cancellingAppointment.status, // Use current status if not changed
                                        notes: cancellationNotes || '',
                                        appointment_date: updateAppointmentDate || null,
                                        appointment_time: formattedTime || null,
                                        currentStatus: cancellingAppointment.status
                                    });
                                }}
                                disabled={cancelMutation.isPending}
                                className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-all disabled:opacity-50"
                            >
                                {cancelMutation.isPending ? 'Updating...' : 'Update Appointment'}
                            </button>
                        </div>
            </Modal>

        </div>
    );
}

