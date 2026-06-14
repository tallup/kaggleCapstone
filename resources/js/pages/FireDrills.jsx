import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import api from '../services/api';
import logger from '../utils/logger';
import { toast } from 'sonner';
import { Flame, Plus, Search, Filter, Edit, Trash2, Calendar, Clock, CheckCircle, XCircle, AlertTriangle, List, Grid, X, ArrowLeft, Loader2 } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import EntityCardShell, { EntityCardHeader } from '../components/ui/EntityCardShell';
import CardIconButton from '../components/ui/CardIconButton';
import DataPill, { DataPillSection } from '../components/ui/DataPill';
import CalendarView from '../components/CalendarView';
import Select from '../components/ui/radix/Select';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormSelect from '../components/forms/FormSelect';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';

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
    /** { type: 'delete' | 'complete' | 'cancel', id: number } | null */
    const [fireConfirm, setFireConfirm] = useState(null);

    // Fetch current user
    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/user');
                setCurrentUser(response.data);
            } catch (err) {
                logger.error('Failed to fetch current user:', err);
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

    const fireConfirmPending =
        deleteMutation.isPending || markCompleteMutation.isPending || cancelMutation.isPending;

    const handleFireConfirm = () => {
        if (!fireConfirm) return;
        const done = () => setFireConfirm(null);
        const { id } = fireConfirm;
        if (fireConfirm.type === 'delete') {
            deleteMutation.mutate(id, { onSuccess: done });
        } else if (fireConfirm.type === 'complete') {
            markCompleteMutation.mutate(id, { onSuccess: done });
        } else if (fireConfirm.type === 'cancel') {
            cancelMutation.mutate(id, { onSuccess: done });
        }
    };

    const handleDelete = (id) => setFireConfirm({ type: 'delete', id });

    const handleMarkComplete = (id) => setFireConfirm({ type: 'complete', id });

    const handleCancel = (id) => setFireConfirm({ type: 'cancel', id });

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

    const fireConfirmCopy =
        fireConfirm?.type === 'delete'
            ? {
                  title: 'Delete this fire drill?',
                  description: 'This fire drill will be permanently removed.',
                  confirmLabel: 'Delete',
                  variant: 'danger',
              }
            : fireConfirm?.type === 'complete'
              ? {
                    title: 'Mark fire drill complete?',
                    description: 'This will record the drill as completed.',
                    confirmLabel: 'Mark complete',
                    variant: 'primary',
                }
              : fireConfirm?.type === 'cancel'
                ? {
                      title: 'Cancel this fire drill?',
                      description: 'This action cannot be undone.',
                      confirmLabel: 'Cancel drill',
                      variant: 'danger',
                  }
                : { title: '', description: '', confirmLabel: 'Confirm', variant: 'neutral' };

    return (
        <>
            <ConfirmDialog
                isOpen={fireConfirm != null}
                onClose={() => !fireConfirmPending && setFireConfirm(null)}
                onConfirm={handleFireConfirm}
                title={fireConfirmCopy.title}
                description={fireConfirmCopy.description}
                confirmLabel={fireConfirmCopy.confirmLabel}
                cancelLabel="Back"
                variant={fireConfirmCopy.variant}
                isPending={fireConfirmPending}
            />
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
                            <EntityCardShell key={drill.id}>
                                <EntityCardHeader
                                    left={
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Flame className="h-5 w-5 shrink-0 text-orange-600" />
                                            {getStatusBadge(drill.status)}
                                        </div>
                                    }
                                    right={
                                        <>
                                            {drill.status === 'scheduled' && !isCaregiver && (
                                                <>
                                                    <Tooltip content="Mark complete" position="top">
                                                        <CardIconButton
                                                            variant="resolve"
                                                            icon={CheckCircle}
                                                            aria-label="Mark complete"
                                                            onClick={() => handleMarkComplete(drill.id)}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip content="Cancel drill" position="top">
                                                        <CardIconButton
                                                            variant="delete"
                                                            icon={XCircle}
                                                            aria-label="Cancel drill"
                                                            onClick={() => handleCancel(drill.id)}
                                                        />
                                                    </Tooltip>
                                                </>
                                            )}
                                            {!isCaregiver && (
                                                <>
                                                    <Tooltip content="Edit" position="top">
                                                        <CardIconButton
                                                            variant="edit"
                                                            icon={Edit}
                                                            aria-label="Edit fire drill"
                                                            onClick={() => handleEdit(drill)}
                                                        />
                                                    </Tooltip>
                                                    <Tooltip content="Delete" position="top">
                                                        <CardIconButton
                                                            variant="delete"
                                                            icon={Trash2}
                                                            aria-label="Delete fire drill"
                                                            onClick={() => handleDelete(drill.id)}
                                                        />
                                                    </Tooltip>
                                                </>
                                            )}
                                        </>
                                    }
                                />

                                <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                                    {drill.branch?.name || 'Unknown Branch'}
                                </h3>

                                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    <DataPill icon={Calendar}>
                                        <span className="font-normal text-slate-600">
                                            Scheduled: {formatDateTime(drill.scheduled_date, drill.scheduled_time)}
                                        </span>
                                    </DataPill>
                                    <DataPill icon={Clock}>
                                        <span className="font-normal text-slate-600">
                                            Created by: {drill.created_by?.name || 'N/A'}
                                        </span>
                                    </DataPill>
                                    {drill.completed_at && (
                                        <DataPill icon={CheckCircle} className="sm:col-span-2">
                                            <span className="font-normal text-slate-600">
                                                Completed: {new Date(drill.completed_at).toLocaleString()}
                                            </span>
                                        </DataPill>
                                    )}
                                </div>

                                {drill.notes ? (
                                    <DataPillSection label="Notes">
                                        <p className="text-sm text-slate-600">{drill.notes}</p>
                                    </DataPillSection>
                                ) : null}
                            </EntityCardShell>
                        ))}
                    </div>
                )}
            </SectionCard>
        </div>

            <Modal
                isOpen={showForm}
                onClose={handleCloseForm}
                title={editing ? 'Edit Fire Drill' : 'Schedule Fire Drill'}
                size="xl"
            >
                <FireDrillForm
                    key={editing?.id ?? 'new'}
                    inModal
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
            </Modal>
        </>
    );
}

function FireDrillForm({ record, branches, isCaregiver, caregiverBranchId, onClose, onSuccess, inModal = false }) {
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
            logger.error('Error saving fire drill:', error);
            const errorMessage = error.response?.data?.message || 'Failed to save fire drill';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {!inModal && (
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
            )}

            <div className={inModal ? '' : 'rounded-3xl bg-white shadow-lg ring-1 ring-gray-100'}>
                {!inModal && (
                <div className="border-b border-gray-100 px-6 py-4 sm:px-8 sm:py-5">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {record ? 'Edit Fire Drill' : 'Schedule New Fire Drill'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {record ? 'Update fire drill details below.' : 'Fill in the details to schedule a new fire drill.'}
                    </p>
                </div>
                )}

                <div className={inModal ? '' : 'px-6 py-6 sm:px-8 sm:py-8'}>
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


