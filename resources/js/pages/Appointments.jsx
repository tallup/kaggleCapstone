import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { CheckCircle, XCircle, Calendar, Plus, User, Stethoscope, MapPin, ChevronDown } from 'lucide-react';
import Card from '../components/Card';
import SectionCard from '../components/SectionCard';

export default function Appointments() {
    const queryClient = useQueryClient();
    const [dateFilter, setDateFilter] = useState('upcoming');
    const [statusFilter, setStatusFilter] = useState('all');
    const [residentFilter, setResidentFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
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

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['appointments', dateFilter, statusFilter, residentFilter],
        queryFn: async () => {
            const params = {
                date_filter: dateFilter,
                status: statusFilter,
                per_page: 15,
            };
            if (residentFilter) {
                params.resident_id = residentFilter;
            }
            const response = await api.get('/appointments', { params });
            return response.data;
        },
    });

    // Branches for form
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 100 } });
            // Filter active branches on frontend since backend doesn't support is_active filter
            const branches = response.data?.data || response.data || [];
            return {
                ...response.data,
                data: branches.filter(b => b.is_active !== false)
            };
        },
    });

    // Residents for form - filtered by branch
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list', formData.branch_id],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (formData.branch_id) {
                params.branch_id = formData.branch_id;
            }
            return (await api.get('/residents', { params })).data;
        },
        enabled: true, // Always enabled, but filters by branch_id
    });

    // All residents for filter dropdown (not filtered by branch)
    const { data: allResidentsData } = useQuery({
        queryKey: ['all-residents-list'],
        queryFn: async () => {
            return (await api.get('/residents', { params: { per_page: 100 } })).data;
        },
    });

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
            setShowForm(false);
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
        },
        onError: (error) => {
            console.error('Error creating appointment:', error);
        },
    });

    const [completingAppointment, setCompletingAppointment] = useState(null);
    const [completionNotes, setCompletionNotes] = useState('');

    const handleStatusUpdate = async (id, status, notes = null) => {
        try {
            const payload = { status };
            if (notes !== null) {
                payload.notes = notes;
            }
            await api.patch(`/appointments/${id}/status`, payload);
            setCompletingAppointment(null);
            setCompletionNotes('');
            refetch();
        } catch (error) {
            console.error('Failed to update appointment status:', error);
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

    return (
        <div>
            <SectionCard>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Appointment Management</h2>
                        <p className="text-gray-600">View, filter, update, and create resident appointments.</p>
                    </div>
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full sm:w-auto px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Appointment</span>
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date:</label>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setDateFilter('upcoming')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    dateFilter === 'upcoming'
                                        ? 'bg-[#2D5016] text-white'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                Upcoming
                            </button>
                            <button
                                onClick={() => setDateFilter('past')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    dateFilter === 'past'
                                        ? 'bg-[#2D5016] text-white'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                Past
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status:</label>
                        <div className="flex flex-wrap gap-2">
                            {['all', 'scheduled', 'completed', 'cancelled'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                                        statusFilter === status
                                            ? 'bg-[#2D5016] text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resident:</label>
                        <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={residentFilter}
                                onChange={(e) => setResidentFilter(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent appearance-none bg-white"
                            >
                                <option value="">All Residents</option>
                                {(allResidentsData?.data || []).map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.first_name} {r.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {residentFilter && (
                            <button
                                onClick={() => setResidentFilter('')}
                                className="mt-2 text-xs text-[#2D5016] hover:underline"
                            >
                                Clear filter
                            </button>
                        )}
                    </div>
                </div>
            </SectionCard>

            <div className="mb-6"></div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
                    <p className="mt-4 text-gray-600">Loading appointments...</p>
                </div>
            ) : (
                <div>
                    {data?.data?.length > 0 ? (
                        <div>
                            {residentFilter && (
                                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>Showing appointment history for:</strong>{' '}
                                        {(() => {
                                            const resident = (allResidentsData?.data || []).find(r => r.id == residentFilter);
                                            return resident ? `${resident.first_name} ${resident.last_name}` : 'Selected Resident';
                                        })()}
                                    </p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data.data.map((appointment) => (
                            <Card
                                key={appointment.id}
                                borderColor={
                                    appointment.status === 'scheduled' ? 'border-[#8B4513]' :
                                    appointment.status === 'completed' ? 'border-[#2D5016]' :
                                    'border-red-500'
                                }
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {appointment.resident?.first_name} {appointment.resident?.last_name}
                                    </h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        appointment.status === 'scheduled' ? 'bg-amber-50 text-[#8B4513] border border-[#8B4513]' :
                                        appointment.status === 'completed' ? 'bg-green-50 text-[#2D5016] border border-[#2D5016]' :
                                        'bg-red-50 text-red-800 border border-red-500'
                                    }`}>
                                        {appointment.status}
                                    </span>
                                </div>
                                
                                <div className="space-y-2">
                                    <p className="text-gray-600 mb-1">
                                        <span className="font-medium">{appointment.appointment_type?.name || 'Appointment'}</span>
                                    </p>
                                    
                                    {/* Date and Time */}
                                    <p className="text-gray-700 text-sm">
                                        <span className="font-medium">Date & Time:</span>{' '}
                                        {(() => {
                                            const date = new Date(appointment.appointment_date);
                                            const dateStr = date.toLocaleDateString('en-US', { 
                                                month: 'short', 
                                                day: 'numeric', 
                                                year: 'numeric' 
                                            });
                                            
                                            if (appointment.appointment_time) {
                                                // Time is stored as "HH:mm:ss" string format
                                                let timeStr = appointment.appointment_time;
                                                if (typeof timeStr === 'string') {
                                                    // Extract hours and minutes from "HH:mm:ss" or "HH:mm"
                                                    const timeParts = timeStr.split(':');
                                                    if (timeParts.length >= 2) {
                                                        const hours = parseInt(timeParts[0]) || 0;
                                                        const minutes = timeParts[1] || '00';
                                                        const hour12 = hours % 12 || 12;
                                                        const ampm = hours >= 12 ? 'PM' : 'AM';
                                                        timeStr = `${hour12}:${minutes} ${ampm}`;
                                                    }
                                                }
                                                return `${dateStr} at ${timeStr}`;
                                            }
                                            return dateStr;
                                        })()}
                                    </p>
                                    
                                    {/* Provider */}
                                    {(appointment.provider_name || appointment.healthcare_provider) && (
                                        <p className="text-gray-700 text-sm">
                                            <span className="font-medium">Provider:</span>{' '}
                                            {appointment.provider_name || appointment.healthcare_provider?.name}
                                        </p>
                                    )}
                                    
                                    {/* Location */}
                                    {appointment.location && (
                                        <p className="text-gray-700 text-sm">
                                            <span className="font-medium">Location:</span>{' '}
                                            {appointment.location}
                                        </p>
                                    )}
                                    
                                    {/* Description */}
                                    {appointment.description && (
                                        <p className="text-gray-600 text-sm">
                                            <span className="font-medium">Description:</span>{' '}
                                            {appointment.description}
                                        </p>
                                    )}
                                    
                                    {/* Notes (for completed appointments) */}
                                    {appointment.status === 'completed' && appointment.notes && (
                                        <p className="text-gray-600 text-sm bg-green-50 p-2 rounded">
                                            <span className="font-medium">Outcome:</span>{' '}
                                            {appointment.notes}
                                        </p>
                                    )}
                                </div>
                                
                                {appointment.status === 'scheduled' && (
                                    <div className="flex space-x-2 mt-4 pt-4 border-t">
                                        <button
                                            onClick={() => handleComplete(appointment.id)}
                                            className="flex-1 px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors flex items-center justify-center space-x-2"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Complete</span>
                                        </button>
                                        <button
                                            onClick={() => handleCancel(appointment.id)}
                                            className="flex-1 px-4 py-2 bg-[#8B4513] text-white rounded-lg hover:bg-[#6b3410] transition-colors flex items-center justify-center space-x-2"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            <span>Cancel</span>
                                        </button>
                                    </div>
                                )}
                            </Card>
                        ))}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow p-12 text-center">
                            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg font-medium">No appointments found</p>
                            <p className="text-gray-500 text-sm mt-2">
                                {dateFilter === 'upcoming' 
                                    ? 'No upcoming appointments.' 
                                    : 'No past appointments found.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {showForm && (
                <AddAppointmentModal
                    branches={branchesData?.data || branchesData || []}
                    residents={residentsData?.data || residentsData || []}
                    formData={formData}
                    setFormData={setFormData}
                    onClose={() => setShowForm(false)}
                    onSubmit={() => createMutation.mutate()}
                    isSubmitting={createMutation.isPending}
                    mutation={createMutation}
                />
            )}

            {/* Completion Notes Modal */}
            {completingAppointment && (
                <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}>
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6 border-b">
                            <h3 className="text-xl font-semibold text-gray-900">Complete Appointment</h3>
                        </div>
                        <div className="p-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Appointment Outcome / Notes (Optional)
                            </label>
                            <textarea
                                rows={4}
                                value={completionNotes}
                                onChange={(e) => setCompletionNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                placeholder="Enter notes about the appointment outcome..."
                            />
                        </div>
                        <div className="p-6 border-t flex items-center justify-end space-x-3">
                            <button
                                onClick={() => {
                                    setCompletingAppointment(null);
                                    setCompletionNotes('');
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(completingAppointment, 'completed', completionNotes || null)}
                                className="px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors"
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

function AddAppointmentModal({ branches, residents, formData, setFormData, onClose, onSubmit, isSubmitting, mutation }) {
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
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
                            <label className="block text-sm font-medium text-gray-700 mb-2">Resident *</label>
                            <div className="relative">
                                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={formData.resident_id}
                                    onChange={(e) => {
                                        setFormData({ ...formData, resident_id: e.target.value });
                                        setErrors({ ...errors, resident_id: null });
                                    }}
                                    className={`w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent ${
                                        errors.resident_id ? 'border-red-300' : 'border-gray-300'
                                    }`}
                                >
                                    <option value="">Select resident</option>
                                    {(residents?.data || []).map(r => (
                                        <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                                    ))}
                                </select>
                            </div>
                            {errors.resident_id && <p className="text-xs text-red-600 mt-1">{errors.resident_id}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                            <input
                                type="date"
                                value={formData.appointment_date}
                                onChange={(e) => {
                                    setFormData({ ...formData, appointment_date: e.target.value });
                                    setErrors({ ...errors, appointment_date: null });
                                }}
                                required
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent ${
                                    errors.appointment_date ? 'border-red-300' : 'border-gray-300'
                                }`}
                            />
                            {errors.appointment_date && <p className="text-xs text-red-600 mt-1">{errors.appointment_date}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                            <TimePicker
                                value={formData.appointment_time}
                                onChange={(value) => setFormData({ ...formData, appointment_time: value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Provider Name</label>
                            <div className="relative">
                                <Stethoscope className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.provider_name}
                                    onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    placeholder="Dr. Smith"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                            <div className="relative">
                                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                    placeholder="Clinic / Room"
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes / Description</label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
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
                            className="px-4 py-2 bg-[#2D5016] text-white rounded-lg hover:bg-[#1a3009] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent bg-white text-left flex items-center justify-between ${className}`}
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
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent text-center text-lg font-semibold"
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
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent text-center text-lg font-semibold"
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
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent text-center text-lg font-semibold"
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
