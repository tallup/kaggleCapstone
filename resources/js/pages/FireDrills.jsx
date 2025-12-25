import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import api from '../services/api';
import { toast } from 'sonner';
import { Flame, Plus, Search, Filter, Edit, Trash2, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, List, Grid, X, ArrowLeft, Loader2 } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import Card from '../components/Card';
import CalendarView from '../components/CalendarView';
import Select from '../components/ui/radix/Select';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormSelect from '../components/forms/FormSelect';

export default function FireDrills() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

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

    // Auto-set branch filter for caregivers
    React.useEffect(() => {
        if (isCaregiver && currentUser?.assigned_branch_id) {
            setBranchFilter(String(currentUser.assigned_branch_id));
        }
    }, [isCaregiver, currentUser?.assigned_branch_id]);

    // Fetch branches
    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });


    // Build query params
    const queryParams = useMemo(() => {
        const params = { per_page: 50 };
        if (branchFilter && branchFilter !== 'all') params.branch_id = branchFilter;
        if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        return params;
    }, [branchFilter, statusFilter, dateFrom, dateTo]);

    // Fetch fire drills
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['fire-drills', queryParams],
        queryFn: async () => (await api.get('/fire-drills', { params: queryParams })).data,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/fire-drills/${id}`);
        },
        onSuccess: () => {
            toast.success('Fire drill deleted');
            queryClient.invalidateQueries(['fire-drills']);
            queryClient.invalidateQueries(['reminders', 'upcoming']);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Delete failed');
        },
    });

    const markCompleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.post(`/fire-drills/${id}/mark-complete`);
        },
        onSuccess: () => {
            toast.success('Fire drill marked complete');
            queryClient.invalidateQueries(['fire-drills']);
            queryClient.invalidateQueries(['reminders', 'upcoming']);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Action failed');
        },
    });

    const cancelMutation = useMutation({
        mutationFn: async (id) => {
            await api.post(`/fire-drills/${id}/cancel`);
        },
        onSuccess: () => {
            toast.success('Fire drill cancelled');
            queryClient.invalidateQueries(['fire-drills']);
            queryClient.invalidateQueries(['reminders', 'upcoming']);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Action failed');
        },
    });

    const drills = data?.data || [];
    const branches = branchesData?.data || [];

    // Filter drills by search
    const filteredDrills = useMemo(() => {
        if (!search) return drills;
        const searchLower = search.toLowerCase();
        return drills.filter(d => 
            d.branch?.name?.toLowerCase().includes(searchLower) ||
            d.notes?.toLowerCase().includes(searchLower) ||
            d.created_by?.name?.toLowerCase().includes(searchLower)
        );
    }, [drills, search]);

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this fire drill?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleMarkComplete = (id) => {
        if (window.confirm('Mark this fire drill as complete?')) {
            markCompleteMutation.mutate(id);
        }
    };

    const handleCancel = (id) => {
        if (window.confirm('Cancel this fire drill? This action cannot be undone.')) {
            cancelMutation.mutate(id);
        }
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditing(null);
    };

    const handleEdit = (drill) => {
        setEditing(drill);
        setShowForm(true);
    };

    const getStatusBadge = (status) => {
        const styles = {
            scheduled: 'bg-yellow-100 text-yellow-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
        };
        const icons = {
            scheduled: <AlertTriangle className="w-3 h-3" />,
            completed: <CheckCircle className="w-3 h-3" />,
            cancelled: <XCircle className="w-3 h-3" />,
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {icons[status]}
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A'}
            </span>
        );
    };

    const formatDateTime = (date, time) => {
        if (!date) return 'N/A';
        const dateObj = new Date(date);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (time) {
            const [hours, minutes] = time.split(':');
            const timeStr = new Date(1970, 0, 1, parseInt(hours), parseInt(minutes)).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            return `${dateStr} at ${timeStr}`;
        }
        return dateStr;
    };

    // Get upcoming drills
    const upcomingDrills = useMemo(() => {
        const today = new Date().toDateString();
        return filteredDrills.filter(d => 
            d.status === 'scheduled' && 
            new Date(d.scheduled_date).toDateString() >= today
        ).slice(0, 3);
    }, [filteredDrills]);

    if (showForm) {
        return (
            <div>
                <FireDrillForm
                    record={editing}
                    branches={branches}
                    isCaregiver={isCaregiver}
                    caregiverBranchId={currentUser?.assigned_branch_id}
                    onClose={handleCloseForm}
                    onSuccess={() => {
                        handleCloseForm();
                        queryClient.invalidateQueries(['fire-drills']);
                        queryClient.invalidateQueries(['reminders', 'upcoming']);
                    }}
                />
            </div>
        );
    }


    return (
        <div>
            <SectionCard>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Fire Drills</h2>
                        <p className="text-gray-600">Schedule and track fire drill exercises.</p>
                    </div>
                    {!isCaregiver && (
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={() => {
                                    setEditing(null);
                                    setShowForm(true);
                                }}
                                className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Schedule Fire Drill</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Upcoming Drills Alert */}
                {upcomingDrills.length > 0 && (
                    <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <h3 className="font-semibold text-orange-900">Upcoming Fire Drills</h3>
                        </div>
                        <div className="space-y-2">
                            {upcomingDrills.map(drill => (
                                <div key={drill.id} className="text-sm text-orange-700">
                                    <span className="font-medium">{drill.branch?.name}</span> - {formatDateTime(drill.scheduled_date, drill.scheduled_time)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <div className="relative md:col-span-2">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search fire drills..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>

                    {!isCaregiver && (
                        <Select
                            value={branchFilter || 'all'}
                            onValueChange={setBranchFilter}
                            placeholder="All Branches"
                            options={[
                                { value: 'all', label: 'All Branches' },
                                ...branches.map(branch => ({
                                    value: branch.id.toString(),
                                    label: branch.name,
                                }))
                            ]}
                            className="w-48"
                        />
                    )}

                    <Select
                        value={statusFilter || 'all'}
                        onValueChange={setStatusFilter}
                        placeholder="All Status"
                        options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'scheduled', label: 'Scheduled' },
                            { value: 'completed', label: 'Completed' },
                            { value: 'cancelled', label: 'Cancelled' },
                        ]}
                        className="w-48"
                    />

                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        placeholder="From Date"
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    />
                </div>

                {dateFrom && (
                    <div className="mb-4">
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            placeholder="To Date"
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>
                )}

                {/* View Toggle */}
                {filteredDrills.length > 0 && (
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

                {isLoading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Loading fire drills...</p>
                    </div>
                ) : filteredDrills.length === 0 ? (
                    <div className="text-center py-12">
                        <Flame className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No fire drills found.</p>
                    </div>
                ) : viewMode === 'calendar' ? (
                    <CalendarView
                        events={filteredDrills.map(drill => {
                            const date = drill.scheduled_date ? new Date(drill.scheduled_date) : new Date();
                            let start = new Date(date);
                            let end = new Date(date);
                            
                            if (drill.scheduled_time) {
                                const timeParts = drill.scheduled_time.split(':');
                                if (timeParts.length >= 2) {
                                    const hours = parseInt(timeParts[0]) || 0;
                                    const minutes = parseInt(timeParts[1]) || 0;
                                    start.setHours(hours, minutes, 0);
                                    end.setHours(hours + 1, minutes, 0);
                                }
                            } else {
                                start.setHours(10, 0, 0);
                                end.setHours(11, 0, 0);
                            }

                            const statusColors = {
                                scheduled: '#f59e0b',
                                completed: '#10b981',
                                cancelled: '#ef4444',
                            };

                            return {
                                id: drill.id,
                                title: `${drill.branch?.name || 'Branch'} - ${drill.status.charAt(0).toUpperCase() + drill.status.slice(1)}`,
                                start,
                                end,
                                color: statusColors[drill.status] || 'var(--theme-primary)',
                                borderColor: statusColors[drill.status] || 'var(--theme-primary)',
                                textColor: '#ffffff',
                                resource: drill,
                            };
                        })}
                        onSelectEvent={(event) => {
                            if (event.resource && !isCaregiver) {
                                handleEdit(event.resource);
                            }
                        }}
                        onSelectSlot={(slotInfo) => {
                            if (!isCaregiver) {
                                const selectedDate = slotInfo.start.toISOString().split('T')[0];
                                const selectedTime = slotInfo.start.toTimeString().slice(0, 5);
                                setEditing({
                                    scheduled_date: selectedDate,
                                    scheduled_time: selectedTime,
                                });
                                setShowForm(true);
                            }
                        }}
                        views={['month', 'week', 'day']}
                        defaultDate={new Date()}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredDrills.map((drill) => (
                            <Card key={drill.id} className="p-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Flame className="w-5 h-5 text-orange-600" />
                                            <h3 className="font-semibold text-gray-900">{drill.branch?.name || 'Unknown Branch'}</h3>
                                            {getStatusBadge(drill.status)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                <span className="font-medium">Scheduled:</span> {formatDateTime(drill.scheduled_date, drill.scheduled_time)}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                <span className="font-medium">Created by:</span> {drill.created_by?.name || 'N/A'}
                                            </div>
                                            {drill.completed_at && (
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle className="w-4 h-4" />
                                                    <span className="font-medium">Completed:</span> {new Date(drill.completed_at).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                        {drill.notes && (
                                            <div className="mt-2 text-sm text-gray-600">
                                                <span className="font-medium">Notes:</span> {drill.notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        {/* Quick Actions for Scheduled Drills */}
                                        {drill.status === 'scheduled' && !isCaregiver && (
                                            <>
                                                <button
                                                    onClick={() => handleMarkComplete(drill.id)}
                                                    className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                                                    title="Mark Complete"
                                                >
                                                    <CheckCircle className="w-3 h-3" />
                                                    Complete
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(drill.id)}
                                                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                                                    title="Cancel"
                                                >
                                                    <XCircle className="w-3 h-3" />
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                        {!isCaregiver && (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(drill)}
                                                    className="p-2 text-gray-600 hover:text-[var(--theme-primary)] transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(drill.id)}
                                                    className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </SectionCard>

            {showForm && (
                <FireDrillForm
                    record={editing}
                    branches={branches}
                    isCaregiver={isCaregiver}
                    caregiverBranchId={currentUser?.assigned_branch_id}
                    onClose={handleCloseForm}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['fire-drills']);
                        queryClient.invalidateQueries(['reminders', 'upcoming']);
                        handleCloseForm();
                    }}
                />
            )}
        </div>
    );
}

function FireDrillForm({ record, branches, isCaregiver, caregiverBranchId, onClose, onSuccess }) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const methods = useForm({
        defaultValues: {
            branch_id: record?.branch_id || caregiverBranchId || null,
            scheduled_date: record?.scheduled_date || new Date().toISOString().split('T')[0],
            scheduled_time: record?.scheduled_time || new Date().toTimeString().slice(0, 5),
            status: record?.status || 'scheduled',
            notes: record?.notes || '',
        },
    });

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        try {
            // Format time to HH:mm:ss
            const timeParts = data.scheduled_time.split(':');
            const formattedTime = `${timeParts[0]}:${timeParts[1]}:00`;

            const payload = {
                ...data,
                branch_id: data.branch_id ? parseInt(data.branch_id) : null,
                scheduled_time: formattedTime,
            };
            
            if (record) {
                await api.put(`/fire-drills/${record.id}`, payload);
            } else {
                await api.post('/fire-drills', payload);
            }

            toast.success(record ? 'Fire drill updated successfully' : 'Fire drill created successfully', '', { isFormSubmission: true });
            onSuccess();
        } catch (error) {
            console.error('Error saving fire drill:', error);
            const errorMessage = error.response?.data?.message || 'Failed to save fire drill';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to fire drills
                </button>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {record ? 'Edit Fire Drill' : 'Schedule Fire Drill'}
                </p>
            </div>

            <div className="rounded-3xl bg-white shadow-lg ring-1 ring-gray-100">
                <div className="border-b border-gray-100 px-6 py-4 sm:px-8 sm:py-5">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {record ? 'Edit Fire Drill' : 'Schedule New Fire Drill'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {record ? 'Update fire drill details below.' : 'Fill in the details to schedule a new fire drill.'}
                    </p>
                </div>

                <div className="px-6 py-6 sm:px-8 sm:py-8">
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormSelect
                                    name="branch_id"
                                    label="Branch"
                                    placeholder="Select Branch"
                                    required
                                    disabled={isCaregiver}
                                    options={branches.map(branch => ({
                                        value: branch.id.toString(),
                                        label: branch.name,
                                    }))}
                                />

                                <FormSelect
                                    name="status"
                                    label="Status"
                                    placeholder="Select Status"
                                    required
                                    options={[
                                        { value: 'scheduled', label: 'Scheduled' },
                                        { value: 'completed', label: 'Completed' },
                                        { value: 'cancelled', label: 'Cancelled' },
                                    ]}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    name="scheduled_date"
                                    label="Scheduled Date"
                                    type="date"
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                />

                                <FormInput
                                    name="scheduled_time"
                                    label="Scheduled Time"
                                    type="time"
                                    required
                                />
                            </div>

                            <FormTextarea
                                name="notes"
                                label="Notes"
                                placeholder="Enter any additional notes, guidelines, assembly points, etc."
                                rows={4}
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: 'var(--theme-primary)' }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4" />
                                            {record ? 'Update' : 'Create'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </FormProvider>
                </div>
            </div>
        </div>
    );
}


