import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { CheckCircle, XCircle, Calendar, Plus, User, Stethoscope, MapPin, ChevronDown, Edit, List, Grid } from 'lucide-react';
import Card from '../components/Card';
import SectionCard from '../components/SectionCard';
import CalendarView from '../components/CalendarView';

// Profile Image Component with fallback
function ProfileImage({ resident }) {
    const [imageError, setImageError] = useState(false);
    
    if (!resident.profile_image || imageError) {
        return (
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                resident.gender?.toLowerCase() === 'male' ? 'bg-blue-500' : 'bg-pink-500'
            }`}>
                {resident.first_name?.[0]?.toUpperCase() || ''}{resident.last_name?.[0]?.toUpperCase() || ''}
            </div>
        );
    }
    
    return (
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
            <img 
                src={`/storage/${resident.profile_image}`} 
                alt={`${resident.first_name} ${resident.last_name}`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
            />
        </div>
    );
}

export default function Appointments() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [residentFilter, setResidentFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const highlightedAppointmentId = useRef(null);
    const appointmentRowRefs = useRef({});
    const urlParamsProcessed = useRef(false);
    const [showForm, setShowForm] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [componentError, setComponentError] = useState(null);
    const [isPreFilled, setIsPreFilled] = useState(false); // Track if form was opened with pre-filled data
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar' - default to list (calendar hidden)
    const [formData, setFormData] = useState({
        branch_id: '',
        resident_id: '',
        appointment_date: new Date().toISOString().split('T')[0],
        appointment_time: '',
        provider_name: '',
        location: '',
        description: '',
        status: 'scheduled',
    });

    // Fetch current user
    React.useEffect(() => {
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

    // Check if user is a caregiver
    const isCaregiver = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        const roleNormalized = role.replace(/[\s_]/g, '');
        return roleNormalized === 'caregiver' || (role.includes('care') && role.includes('giver'));
    }, [currentUser]);

    // Define queries FIRST before using them in useEffect
    const { data, isLoading, error: appointmentsError, refetch } = useQuery({
        queryKey: ['appointments', residentFilter, branchFilter],
        queryFn: async () => {
            try {
                const params = {
                    per_page: 100,
                };
                if (residentFilter) {
                    params.resident_id = residentFilter;
                }
                if (branchFilter) {
                    params.branch_id = branchFilter;
                }
                const response = await api.get('/appointments', { params });
                return response.data;
            } catch (error) {
                console.error('Error fetching appointments:', error);
                throw error;
            }
        },
        enabled: !isCaregiver && !!residentFilter, // Only fetch for non-caregivers when resident is selected
        retry: 1,
    });

    // Branches for form
    const { data: branchesData, error: branchesError } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            try {
                const response = await api.get('/branches', { params: { per_page: 100 } });
                // Filter active branches on frontend since backend doesn't support is_active filter
                const branches = response.data?.data || response.data || [];
                return {
                    ...response.data,
                    data: branches.filter(b => b.is_active !== false)
                };
            } catch (error) {
                console.error('Error fetching branches:', error);
                throw error;
            }
        },
        retry: 1,
    });

    // Residents for form - filtered by branch
    const { data: residentsData, error: residentsError } = useQuery({
        queryKey: ['residents-list', formData.branch_id],
        queryFn: async () => {
            try {
                const params = { per_page: 100 };
                if (formData.branch_id) {
                    params.branch_id = formData.branch_id;
                }
                return (await api.get('/residents', { params })).data;
            } catch (error) {
                console.error('Error fetching residents:', error);
                throw error;
            }
        },
        enabled: true, // Always enabled, but filters by branch_id
        retry: 1,
    });

    // All residents for filter dropdown (not filtered by branch)
    const { data: allResidentsData, error: allResidentsError } = useQuery({
        queryKey: ['all-residents-list', branchFilter],
        queryFn: async () => {
            try {
                const params = { per_page: 100 };
                if (branchFilter) {
                    params.branch_id = branchFilter;
                }
                return (await api.get('/residents', { params })).data;
            } catch (error) {
                console.error('Error fetching all residents:', error);
                throw error;
            }
        },
        retry: 1,
    });

    // Read URL parameters on mount and set filters
    useEffect(() => {
        if (urlParamsProcessed.current) return;
        
        try {
            const residentId = searchParams.get('resident_id');
            const appointmentId = searchParams.get('appointment_id');
            
            if (residentId) {
                setResidentFilter(residentId);
                highlightedAppointmentId.current = appointmentId;
                
                // Clear URL parameters after reading them
                const newSearchParams = new URLSearchParams(searchParams);
                if (appointmentId) {
                    // Keep appointment_id until we've scrolled to it
                    newSearchParams.delete('resident_id');
                } else {
                    newSearchParams.delete('resident_id');
                    newSearchParams.delete('appointment_id');
                }
                setSearchParams(newSearchParams, { replace: true });
            }
            
            urlParamsProcessed.current = true;
        } catch (error) {
            console.error('Error processing URL parameters:', error);
            urlParamsProcessed.current = true;
        }
    }, []); // Only run once on mount

    // Scroll to and highlight appointment when data is loaded
    useEffect(() => {
        if (!highlightedAppointmentId.current || !data || !data.data || data.data.length === 0) {
            return;
        }

        try {
            // Wait a bit for the DOM to render
            const timeoutId = setTimeout(() => {
                const appointmentId = highlightedAppointmentId.current;
                if (!appointmentId) return;
                
                // Try both string and number keys
                const rowRef = appointmentRowRefs.current[appointmentId] || 
                              appointmentRowRefs.current[String(appointmentId)] ||
                              appointmentRowRefs.current[parseInt(appointmentId)];
                
                if (rowRef) {
                    // Scroll to the appointment row
                    rowRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                        highlightedAppointmentId.current = null;
                        const newSearchParams = new URLSearchParams(window.location.search);
                        newSearchParams.delete('appointment_id');
                        setSearchParams(newSearchParams, { replace: true });
                    }, 3000);
                }
            }, 200); // Slightly longer delay to ensure DOM is ready
            
            // Cleanup function to clear timeout if component unmounts or dependencies change
            return () => clearTimeout(timeoutId);
        } catch (error) {
            console.error('Error scrolling to appointment:', error);
        }
    }, [data, setSearchParams]);

    const createMutation = useMutation({
        mutationFn: async () => {
            // Prepare payload - send date and time separately as backend expects
            const payload = {
                resident_id: parseInt(formData.resident_id),
                appointment_date: formData.appointment_date,
                appointment_time: formData.appointment_time || null,
                provider_name: formData.provider_name || null,
                location: formData.location || null,
                description: formData.description || null,
                status: formData.status || 'scheduled',
            };
            
            return await api.post('/appointments', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['appointments']);
            handleCloseForm();
        },
        onError: (error) => {
            console.error('Error creating appointment:', error);
        },
    });


    const [completingAppointment, setCompletingAppointment] = useState(null);
    const [completionNotes, setCompletionNotes] = useState('');
    const [completionDocuments, setCompletionDocuments] = useState([]);

    const handleStatusUpdate = async (id, status, notes = null, documents = []) => {
        try {
            const formData = new FormData();
            formData.append('status', status);
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
            
            await api.patch(`/appointments/${id}/status`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setCompletingAppointment(null);
            setCompletionNotes('');
            setCompletionDocuments([]);
            refetch();
        } catch (error) {
            console.error('Failed to update appointment status:', error);
            alert(error.response?.data?.message || 'Failed to complete appointment');
        }
    };

    const handleCancel = (id) => {
        if (window.confirm('Are you sure you want to cancel this appointment?')) {
            handleStatusUpdate(id, 'cancelled');
        }
    };

    const handleComplete = (id) => {
        setCompletingAppointment(id);
    };

    // Error boundary - if component error occurs, show error message
    if (componentError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-red-800 mb-2">Application Error</h2>
                <p className="text-sm text-red-700 mb-4">{componentError.message || 'An unexpected error occurred'}</p>
                <button
                    onClick={() => {
                        setComponentError(null);
                        window.location.reload();
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                    Reload Page
                </button>
            </div>
        );
    }

    // Helper function to calculate age
    const calculateAge = (dateOfBirth) => {
        if (!dateOfBirth) return 'N/A';
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    // Helper function to get next appointment for a resident
    const getNextAppointment = (residentId) => {
        if (!data?.data) return null;
        const residentAppointments = data.data.filter(apt => apt.resident_id === residentId && apt.status !== 'cancelled' && apt.status !== 'completed');
        if (residentAppointments.length === 0) return null;
        
        // Sort by date and return the next one
        const sorted = residentAppointments.sort((a, b) => {
            const dateA = new Date(a.appointment_date);
            const dateB = new Date(b.appointment_date);
            return dateA - dateB;
        });
        
        return sorted[0];
    };

    // Handle opening appointment view for a specific resident
    const handleOpenAppointmentView = (residentId) => {
        console.log('Navigating to appointment page for resident:', residentId);
        // Navigate to the create appointment page
        window.location.href = `/app/appointments/create/${residentId}`;
    };


    // Handle opening appointment modal for a specific resident (for manual form)
    const handleOpenAppointmentModal = (residentId) => {
        const resident = allResidentsData?.data?.find(r => r.id === residentId);
        setFormData(prev => ({
            ...prev,
            resident_id: residentId,
            branch_id: resident?.branch_id || '',
        }));
        setIsPreFilled(true); // Mark as pre-filled
        setShowForm(true);
    };

    // Handle opening form manually (not from resident card)
    const handleOpenFormManually = () => {
        setFormData({
            branch_id: '',
            resident_id: '',
            appointment_date: new Date().toISOString().split('T')[0],
            appointment_time: '',
            provider_name: '',
            location: '',
            description: '',
            status: 'scheduled',
        });
        setIsPreFilled(false); // Allow editing
        setShowForm(true);
    };

    // Handle closing form
    const handleCloseForm = () => {
        setShowForm(false);
        setIsPreFilled(false);
        setFormData({
            branch_id: '',
            resident_id: '',
            appointment_date: new Date().toISOString().split('T')[0],
            appointment_time: '',
            provider_name: '',
            location: '',
            description: '',
            status: 'scheduled',
        });
    };

    return (
        <div className="space-y-6">
            {isCaregiver ? (
                <>
                    {/* Resident Cards Section */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Residents</h3>
                        {allResidentsData?.data && allResidentsData.data.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                                {(allResidentsData.data || []).map((resident) => {
                                    const nextAppt = getNextAppointment(resident.id);
                                    const age = calculateAge(resident.date_of_birth);
                                    
                                    return (
                                        <div key={resident.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 overflow-hidden">
                                            <div className="p-5">
                                                {/* Resident Header */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1">
                                                        <h4 className="text-lg font-semibold text-gray-900 mb-1">
                                                            {resident.first_name} {resident.last_name}
                                                        </h4>
                                                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                                                            {age !== 'N/A' && (
                                                                <span className="flex items-center">
                                                                    <User className="w-4 h-4 mr-1" />
                                                                    {age} years
                                                                </span>
                                                            )}
                                                            {resident.room_number && (
                                                                <span className="flex items-center">
                                                                    <MapPin className="w-4 h-4 mr-1" />
                                                                    Room {resident.room_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ProfileImage resident={resident} />
                                                </div>

                                                {/* Resident Info */}
                                                <div className="space-y-2 mb-4 text-sm">
                                                    {resident.diagnosis && (
                                                        <div className="text-gray-600">
                                                            <span className="font-medium">Diagnosis:</span> {resident.diagnosis}
                                                        </div>
                                                    )}
                                                    {resident.allergies && (
                                                        <div className="text-amber-600">
                                                            <span className="font-medium">Allergies:</span> {resident.allergies}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Next Appointment Info */}
                                                {nextAppt && (
                                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="text-xs text-blue-600 font-medium mb-1">Next Appointment</p>
                                                                <p className="text-sm font-semibold text-blue-900">
                                                                    {new Date(nextAppt.appointment_date).toLocaleDateString('en-US', { 
                                                                        month: 'short', 
                                                                        day: 'numeric',
                                                                        year: 'numeric'
                                                                    })}
                                                                </p>
                                                                {nextAppt.appointment_time && (
                                                                    <p className="text-xs text-blue-700">
                                                                        {(() => {
                                                                            const timeParts = nextAppt.appointment_time.split(':');
                                                                            if (timeParts.length >= 2) {
                                                                                const hours = parseInt(timeParts[0]) || 0;
                                                                                const minutes = timeParts[1] || '00';
                                                                                const hour12 = hours % 12 || 12;
                                                                                const ampm = hours >= 12 ? 'PM' : 'AM';
                                                                                return `${hour12}:${minutes} ${ampm}`;
                                                                            }
                                                                            return '';
                                                                        })()}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                                nextAppt.status === 'scheduled' ? 'bg-amber-100 text-amber-800' :
                                                                nextAppt.status === 'confirmed' ? 'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)]' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {nextAppt.status?.charAt(0).toUpperCase() + nextAppt.status?.slice(1)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Appointment Button */}
                                                <Link
                                                    to={`/appointments/create/${resident.id}`}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        window.location.href = `/app/appointments/create/${resident.id}`;
                                                    }}
                                                    className="w-full bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-[var(--theme-text-on-primary)] px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-2 no-underline"
                                                >
                                                    <Calendar className="w-4 h-4" />
                                                    <span>Schedule Appointment</span>
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-600 text-lg font-semibold mb-2">No Residents Found</p>
                                <p className="text-gray-500 text-sm">You don't have any assigned residents yet.</p>
                            </div>
                        )}
                    </div>


                </>
            ) : (
                <>
                    {/* Non-caregiver view - Original filters */}
                    <SectionCard>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary-dark)] rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">View Appointments</h3>
                                    <p className="text-sm text-gray-500">Select branch and resident to view appointment history</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {/* Branch Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">Branch:</label>
                                <div className="relative">
                                    <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select
                                        value={branchFilter}
                                        onChange={(e) => {
                                            setBranchFilter(e.target.value);
                                            setResidentFilter('');
                                        }}
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                                    >
                                        <option value="">All Branches</option>
                                        {(branchesData?.data || branchesData || []).map(branch => (
                                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Resident Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">Resident:</label>
                                <div className="relative">
                                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select
                                        value={residentFilter}
                                        onChange={(e) => setResidentFilter(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                                    >
                                        <option value="">All Residents</option>
                                        {(allResidentsData?.data || []).map(r => (
                                            <option key={r.id} value={r.id}>
                                                {r.first_name} {r.last_name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </>
            )}

            {/* Error Messages */}
            {(appointmentsError || branchesError || residentsError || allResidentsError) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-red-800 font-medium mb-2">Error loading data:</p>
                    <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                        {appointmentsError && <li>Appointments: {appointmentsError?.response?.data?.message || appointmentsError?.message || 'Failed to load appointments'}</li>}
                        {branchesError && <li>Branches: {branchesError?.response?.data?.message || branchesError?.message || 'Failed to load branches'}</li>}
                        {residentsError && <li>Residents: {residentsError?.response?.data?.message || residentsError?.message || 'Failed to load residents'}</li>}
                        {allResidentsError && <li>All Residents: {allResidentsError?.response?.data?.message || allResidentsError?.message || 'Failed to load all residents'}</li>}
                    </ul>
                </div>
            )}

            {/* Appointment History Display */}
            {!isCaregiver && (
                // Non-caregiver view - Show table or calendar
                !residentFilter ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <div className="w-20 h-20 bg-[var(--theme-primary-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar className="w-10 h-10 text-[var(--theme-primary)]" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Resident to View Appointments</h3>
                        <p className="text-gray-600 mb-4">
                            Choose a resident from the filter above to view their appointment history
                        </p>
                        <div className="inline-flex items-center space-x-2 text-sm text-[var(--theme-primary)] bg-[var(--theme-primary-bg)] px-4 py-2 rounded-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>You can filter by branch first to narrow down resident options</span>
                        </div>
                    </div>
                ) : isLoading ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600 font-medium">Loading appointments...</p>
                    </div>
                ) : (
                    <div>
                        {/* View Toggle */}
                        {data?.data?.length > 0 && (
                            <div className="mb-4 flex justify-end">
                                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                            viewMode === 'list'
                                                ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                                : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <List className="w-4 h-4" />
                                        List View
                                    </button>
                                    <button
                                        onClick={() => setViewMode('calendar')}
                                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                            viewMode === 'calendar'
                                                ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                                : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Grid className="w-4 h-4" />
                                        Calendar View
                                    </button>
                                </div>
                            </div>
                        )}

                        {viewMode === 'calendar' && data?.data?.length > 0 ? (
                            <CalendarView
                                events={data.data.map(apt => {
                                    const date = apt.appointment_date ? new Date(apt.appointment_date) : new Date();
                                    let start = new Date(date);
                                    let end = new Date(date);
                                    
                                    if (apt.appointment_time) {
                                        const timeParts = apt.appointment_time.split(':');
                                        if (timeParts.length >= 2) {
                                            const hours = parseInt(timeParts[0]) || 0;
                                            const minutes = parseInt(timeParts[1]) || 0;
                                            start.setHours(hours, minutes, 0);
                                            end.setHours(hours + 1, minutes, 0);
                                        }
                                    } else {
                                        start.setHours(9, 0, 0);
                                        end.setHours(10, 0, 0);
                                    }

                                    const statusColors = {
                                        scheduled: 'var(--theme-primary)',
                                        confirmed: '#10b981',
                                        completed: '#059669',
                                        cancelled: '#ef4444',
                                        pending: '#f59e0b',
                                    };

                                    return {
                                        id: apt.id,
                                        title: `${apt.resident?.first_name || ''} ${apt.resident?.last_name || ''} - ${apt.appointmentType?.name || apt.description || 'Appointment'}`,
                                        start,
                                        end,
                                        color: statusColors[apt.status] || 'var(--theme-primary)',
                                        borderColor: statusColors[apt.status] || 'var(--theme-primary)',
                                        textColor: '#ffffff',
                                        resource: apt,
                                    };
                                })}
                                onSelectEvent={(event) => {
                                    if (event.resource) {
                                        setFormData({
                                            ...formData,
                                            resident_id: event.resource.resident_id,
                                            appointment_date: event.resource.appointment_date,
                                            appointment_time: event.resource.appointment_time || '',
                                            provider_name: event.resource.provider_name || '',
                                            location: event.resource.location || '',
                                            description: event.resource.description || event.resource.appointmentType?.name || '',
                                            status: event.resource.status || 'scheduled',
                                        });
                                        setIsPreFilled(true);
                                        setShowForm(true);
                                    }
                                }}
                                onSelectSlot={(slotInfo) => {
                                    setFormData({
                                        ...formData,
                                        appointment_date: slotInfo.start.toISOString().split('T')[0],
                                        appointment_time: slotInfo.start.toTimeString().slice(0, 5),
                                    });
                                    setShowForm(true);
                                }}
                            />
                        ) : data?.data?.length > 0 ? (
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Resident Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date Taken
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Other Details
                                            </th>
                                            {isCaregiver && (
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data.data.map((appointment) => {
                                            if (!appointment) return null;
                                            
                                            const date = appointment.appointment_date ? new Date(appointment.appointment_date) : null;
                                            const dateStr = date && !isNaN(date.getTime()) ? date.toLocaleDateString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                year: 'numeric' 
                                            }) : 'N/A';
                                            
                                            let timeStr = '';
                                            if (appointment.appointment_time) {
                                                try {
                                                    const timeParts = appointment.appointment_time.split(':');
                                                    if (timeParts.length >= 2) {
                                                        const hours = parseInt(timeParts[0]) || 0;
                                                        const minutes = timeParts[1] || '00';
                                                        const hour12 = hours % 12 || 12;
                                                        const ampm = hours >= 12 ? 'PM' : 'AM';
                                                        timeStr = `${hour12}:${minutes} ${ampm}`;
                                                    }
                                                } catch (err) {
                                                    console.error('Error parsing appointment time:', err);
                                                }
                                            }

                                            const isHighlighted = highlightedAppointmentId.current && appointment.id && (
                                                String(highlightedAppointmentId.current) === String(appointment.id) || 
                                                highlightedAppointmentId.current === appointment.id
                                            );
                                            
                                            return (
                                                <tr 
                                                    key={appointment.id || Math.random()} 
                                                    ref={(el) => {
                                                        try {
                                                            if (el && appointment?.id) {
                                                                appointmentRowRefs.current[appointment.id] = el;
                                                                appointmentRowRefs.current[String(appointment.id)] = el;
                                                            }
                                                        } catch (err) {
                                                            console.error('Error setting ref:', err);
                                                        }
                                                    }}
                                                    className={`hover:bg-gray-50 transition-all duration-500 ${
                                                        isHighlighted 
                                                            ? 'bg-[var(--theme-primary-bg)] border-l-4 border-[var(--theme-primary)] shadow-md' 
                                                            : ''
                                                    }`}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {appointment?.resident?.first_name || ''} {appointment?.resident?.last_name || ''}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {dateStr}
                                                            {timeStr && <div className="text-xs text-gray-500">{timeStr}</div>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {appointment?.appointment_type?.name || appointment?.appointmentType?.name || 'Other'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-900">
                                                            {appointment?.description || appointment?.provider_name || '-'}
                                                        </div>
                                                    </td>
                                                    {isCaregiver && (
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                                appointment.status === 'scheduled' ? 'bg-amber-100 text-amber-800' :
                                                                appointment.status === 'confirmed' ? 'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)]' :
                                                                appointment.status === 'completed' ? 'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)]' :
                                                                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                            }`}>
                                                                {appointment.status?.charAt(0).toUpperCase() + appointment.status?.slice(1)}
                                                            </span>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-900 text-lg font-semibold mb-2">No Appointments Found</p>
                            <p className="text-gray-500 text-sm">
                                No appointments match your current filters.
                            </p>
                            <p className="text-gray-400 text-xs mt-2">
                                Try adjusting your filters or add a new appointment.
                            </p>
                        </div>
                    )}
                </div>
                )
            )}

            {showForm && (
                <AddAppointmentModal
                    branches={branchesData?.data || branchesData || []}
                    residents={residentsData?.data || residentsData || []}
                    formData={formData}
                    setFormData={setFormData}
                    onClose={handleCloseForm}
                    onSubmit={() => createMutation.mutate()}
                    isSubmitting={createMutation.isPending}
                    mutation={createMutation}
                    isPreFilled={isPreFilled}
                />
            )}

            {/* Completion Notes Modal */}
            {completingAppointment && (
                <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h3 className="text-xl font-semibold text-gray-900">Complete Appointment</h3>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Appointment Outcome / Notes (Optional)
                                </label>
                                <textarea
                                    rows={4}
                                    value={completionNotes}
                                    onChange={(e) => setCompletionNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900"
                                    placeholder="Enter notes about the appointment outcome..."
                                />
                            </div>

                            {/* Documents Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Upload Documents (Optional)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCompletionDocuments([...completionDocuments, {
                                                document_name: '',
                                                document_type: 'appointment',
                                                file: null,
                                                notes: '',
                                            }]);
                                        }}
                                        className="text-sm text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] font-medium"
                                    >
                                        + Add Document
                                    </button>
                                </div>
                                {completionDocuments.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">No documents added</p>
                                ) : (
                                    <div className="space-y-3">
                                        {completionDocuments.map((doc, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <h4 className="text-sm font-medium text-gray-900">Document {index + 1}</h4>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCompletionDocuments(completionDocuments.filter((_, i) => i !== index));
                                                        }}
                                                        className="text-gray-400 hover:text-red-600"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Document Name *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={doc.document_name}
                                                            onChange={(e) => {
                                                                const updated = [...completionDocuments];
                                                                updated[index].document_name = e.target.value;
                                                                setCompletionDocuments(updated);
                                                            }}
                                                            required
                                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                                            placeholder="e.g., Medical Report"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Type *
                                                        </label>
                                                        <select
                                                            value={doc.document_type}
                                                            onChange={(e) => {
                                                                const updated = [...completionDocuments];
                                                                updated[index].document_type = e.target.value;
                                                                setCompletionDocuments(updated);
                                                            }}
                                                            required
                                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                                        >
                                                            <option value="appointment">Appointment</option>
                                                            <option value="medical">Medical</option>
                                                            <option value="insurance">Insurance</option>
                                                            <option value="other">Other</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            File *
                                                        </label>
                                                        <input
                                                            type="file"
                                                            onChange={(e) => {
                                                                const updated = [...completionDocuments];
                                                                updated[index].file = e.target.files[0];
                                                                setCompletionDocuments(updated);
                                                            }}
                                                            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                                                            required
                                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                                        />
                                                        <p className="text-xs text-gray-500 mt-1">Max size: 10MB</p>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                                            Notes
                                                        </label>
                                                        <textarea
                                                            value={doc.notes}
                                                            onChange={(e) => {
                                                                const updated = [...completionDocuments];
                                                                updated[index].notes = e.target.value;
                                                                setCompletionDocuments(updated);
                                                            }}
                                                            rows={2}
                                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                                            placeholder="Additional notes..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t flex items-center justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setCompletingAppointment(null);
                                    setCompletionNotes('');
                                    setCompletionDocuments([]);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    // Validate documents
                                    const validDocuments = completionDocuments.filter(doc => 
                                        doc.document_name && doc.document_type && doc.file
                                    );
                                    if (completionDocuments.length > 0 && validDocuments.length !== completionDocuments.length) {
                                        alert('Please fill in all required fields for documents');
                                        return;
                                    }
                                    handleStatusUpdate(completingAppointment, 'completed', completionNotes || null, validDocuments);
                                }}
                                className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-all"
                            >
                                Mark as Completed
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AddAppointmentModal({ branches, residents, formData, setFormData, onClose, onSubmit, isSubmitting, mutation, isPreFilled = false }) {
    const [errors, setErrors] = React.useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        
        // Validate required fields
        if (!formData.resident_id) {
            setErrors({ resident_id: 'Resident is required' });
            return;
        }
        if (!formData.appointment_date) {
            setErrors({ appointment_date: 'Date is required' });
            return;
        }
        
        onSubmit();
    };

    return (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-gray-900">Add Appointment</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Branch
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.branch_id}
                                    onChange={(e) => {
                                        setFormData({ 
                                            ...formData, 
                                            branch_id: e.target.value,
                                            resident_id: '' // Reset resident when branch changes
                                        });
                                        setErrors({ ...errors, branch_id: null, resident_id: null });
                                    }}
                                    disabled={isPreFilled}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${
                                        isPreFilled ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''
                                    }`}
                                >
                                    <option value="">All Branches</option>
                                    {(branches || []).map(branch => (
                                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                                    ))}
                                </select>
                            </div>
                            {errors.branch_id && <p className="text-xs text-red-600 mt-1">{errors.branch_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Resident *
                            </label>
                            <div className="relative">
                                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={formData.resident_id}
                                    onChange={(e) => {
                                        setFormData({ ...formData, resident_id: e.target.value });
                                        setErrors({ ...errors, resident_id: null });
                                    }}
                                    disabled={isPreFilled}
                                    className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${
                                        errors.resident_id ? 'border-red-300' : 'border-gray-300'
                                    } ${isPreFilled ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                                >
                                    <option value="">Select resident</option>
                                    {(residents || []).map(r => (
                                        <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                                    ))}
                                </select>
                            </div>
                            {errors.resident_id && <p className="text-xs text-red-600 mt-1">{errors.resident_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date *
                            </label>
                            <input
                                type="date"
                                value={formData.appointment_date}
                                onChange={(e) => {
                                    setFormData({ ...formData, appointment_date: e.target.value });
                                    setErrors({ ...errors, appointment_date: null });
                                }}
                                required
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${
                                    errors.appointment_date ? 'border-red-300' : 'border-gray-300'
                                }`}
                            />
                            {errors.appointment_date && <p className="text-xs text-red-600 mt-1">{errors.appointment_date}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Time
                            </label>
                            <TimePicker
                                value={formData.appointment_time}
                                onChange={(value) => setFormData({ ...formData, appointment_time: value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Provider Name
                            </label>
                            <div className="relative">
                                <Stethoscope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.provider_name}
                                    onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    placeholder="Dr. Smith"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Location
                            </label>
                            <div className="relative">
                                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    placeholder="Clinic / Room"
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes / Description
                        </label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            placeholder="Additional details..."
                        />
                    </div>
                    {mutation?.isError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-800">
                                {mutation.error?.response?.data?.message || 'Failed to create appointment. Please try again.'}
                            </p>
                            {mutation.error?.response?.data?.errors && (
                                <ul className="mt-2 list-disc list-inside text-xs text-red-700">
                                    {Object.entries(mutation.error.response.data.errors).map(([key, messages]) => (
                                        <li key={key}>{key}: {Array.isArray(messages) ? messages.join(', ') : messages}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </div>
                    <div className="p-6 border-t flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !formData.resident_id || !formData.appointment_date}
                            className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Appointment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


// TimePicker Component
function TimePicker({ value, onChange, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hours, setHours] = useState(() => {
        if (value) {
            const [h] = value.split(':');
            return parseInt(h) || 12;
        }
        return 12;
    });
    const [minutes, setMinutes] = useState(() => {
        if (value) {
            const [, m] = value.split(':');
            return parseInt(m) || 0;
        }
        return 0;
    });
    const [period, setPeriod] = useState(() => {
        if (value) {
            const [h] = value.split(':');
            const hour = parseInt(h) || 0;
            return hour >= 12 ? 'PM' : 'AM';
        }
        return 'AM';
    });

    React.useEffect(() => {
        if (value) {
            const [h, m] = value.split(':');
            const hour = parseInt(h) || 0;
            const min = parseInt(m) || 0;
            setHours(hour % 12 || 12);
            setMinutes(min);
            setPeriod(hour >= 12 ? 'PM' : 'AM');
        }
    }, [value]);

    const formatTime = (h, m, p) => {
        let hour24 = h;
        if (p === 'PM' && h !== 12) hour24 = h + 12;
        if (p === 'AM' && h === 12) hour24 = 0;
        return `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const handleTimeChange = (newHours, newMinutes, newPeriod) => {
        const timeValue = formatTime(newHours, newMinutes, newPeriod);
        onChange(timeValue);
        setIsOpen(false);
    };

    const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
    const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

    const displayValue = value 
        ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`
        : '--:-- --';

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent bg-white text-left flex items-center justify-between ${className}`}
            >
                <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                    {displayValue}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute z-20 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-full">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            {/* Hours */}
                            <select
                                value={hours}
                                onChange={(e) => {
                                    const newHours = parseInt(e.target.value);
                                    handleTimeChange(newHours, minutes, period);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-center text-lg font-semibold"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {hourOptions.map(h => (
                                    <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                                ))}
                            </select>
                            
                            <span className="text-2xl font-bold text-gray-700">:</span>
                            
                            {/* Minutes */}
                            <select
                                value={minutes}
                                onChange={(e) => {
                                    const newMinutes = parseInt(e.target.value);
                                    handleTimeChange(hours, newMinutes, period);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-center text-lg font-semibold"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {minuteOptions.map(m => (
                                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                ))}
                            </select>
                            
                            {/* AM/PM */}
                            <select
                                value={period}
                                onChange={(e) => {
                                    const newPeriod = e.target.value;
                                    handleTimeChange(hours, minutes, newPeriod);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-center text-lg font-semibold"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                            </select>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
