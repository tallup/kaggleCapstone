import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import logger from '../utils/logger';
import {
    Search,
    Users,
    Plus,
    Edit,
    XCircle,
    CheckCircle,
    Filter,
    Eye,
    X,
    Building2,
    Home,
    Calendar,
    Cake,
    CalendarClock,
    Stethoscope,
    AlertTriangle,
} from 'lucide-react';
import Tooltip from '../components/ui/Tooltip';
import EmptyState from '../components/ui/EmptyState';
import BranchSelector from '../components/BranchSelector';
import ResidentForm from '../components/ResidentForm';
import Modal from '../components/ui/Modal';
import EntityCardShell, { EntityCardHeader } from '../components/ui/EntityCardShell';
import CardIconButton from '../components/ui/CardIconButton';
import DataPill from '../components/ui/DataPill';
import ResidentAvatarInline from '../components/ui/ResidentAvatarInline';
import ResidentStatusBadges from '../components/residents/ResidentStatusBadges';
import { formatPacificDate, calculateAgeFromPacificBirthDate } from '../utils/pacificTime';
import {
    LIFECYCLE_STATUSES,
    TEMPORARY_STATUSES,
    getLifecycleStatusMeta,
    getResidentLifecycleStatus,
    getResidentTemporaryStatus,
    getTemporaryStatusMeta,
    isResidentLifecycleActive,
} from '../utils/residentStatus';

export default function Residents() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const selectedBranchId = searchParams.get('branch');
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [statusResident, setStatusResident] = useState(null);

    React.useEffect(() => {
        const loadUser = async () => {
            try {
                const response = await api.get('/user');
                setCurrentUser(response.data);
            } catch (err) {
                logger.error('Failed to fetch current user for residents view:', err);
            }
        };

        loadUser();
    }, []);

    const isCaregiver = React.useMemo(() => {
        if (!currentUser?.role) {
            return false;
        }
        const role = currentUser.role.toLowerCase().trim();
        const normalized = role.replace(/[\s_]/g, '');
        return normalized === 'caregiver' || (role.includes('care') && role.includes('giver'));
    }, [currentUser]);

    const isSuperAdmin = currentUser?.role === 'super_admin';
    const isAdmin = currentUser?.role === 'administrator' || currentUser?.role === 'admin';
    const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
    const canCreate = isSuperAdmin || isAdmin || permissions.includes('create_residents');
    const canEdit = isSuperAdmin || isAdmin || permissions.includes('edit_residents');
    const canDelete = isSuperAdmin || isAdmin || permissions.includes('delete_residents');

    const { data: currentUserData } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const response = await api.get('/user');
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    React.useEffect(() => {
        if (currentUserData) {
            setCurrentUser(currentUserData);
        }
    }, [currentUserData]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['residents', search, selectedBranchId, statusFilter],
        queryFn: async () => {
            try {
                const params = { per_page: 50 };
                if (search) params.search = search;
                if (selectedBranchId) params.branch_id = selectedBranchId;
                if (statusFilter) params.status = statusFilter;
                if (!isCaregiver) {
                    params.show_all = true;
                }
                
                const response = await api.get('/residents', { params });
                return response.data;
            } catch (err) {
                logger.error('Error fetching residents:', err);
                throw err;
            }
        },
        enabled: !!selectedBranchId, // Only fetch if branch is selected
    });

    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    // Use selected branch from URL, fallback to user's assigned branch
    const branchId = selectedBranchId ? parseInt(selectedBranchId) : (currentUser?.assigned_branch_id ?? null);

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, payload }) => api.post(`/residents/${id}/status`, payload),
        onSuccess: () => queryClient.invalidateQueries(['residents']),
    });

    const residentsList = data?.data || [];
    const filteredResidents = residentsList.filter((resident) => {
        if (statusFilter === 'active') return isResidentLifecycleActive(resident);
        if (statusFilter === 'inactive') return !isResidentLifecycleActive(resident);
        return true;
    });
    const activeResidents = filteredResidents.filter((resident) => isResidentLifecycleActive(resident));
    const inactiveResidents = filteredResidents.filter((resident) => !isResidentLifecycleActive(resident));
    const showActiveSection = statusFilter !== 'inactive';
    const showInactiveSection = statusFilter !== 'active';

    const renderResidentCard = (resident) => {
        const isInactive = !isResidentLifecycleActive(resident);
        const ageYears = calculateAgeFromPacificBirthDate(resident.date_of_birth);
        const fullName = [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ');
        return (
            <EntityCardShell
                key={resident.id}
                className={
                    isInactive
                        ? 'border-red-200/90 bg-red-50/60 hover:border-red-300/90'
                        : ''
                }
            >
                <EntityCardHeader
                    left={
                        <div className="flex flex-wrap items-start gap-3">
                            <ResidentAvatarInline resident={resident} className="h-10 w-10 text-xs" />
                            <div className="space-y-2">
                                <ResidentStatusBadges resident={resident} showCensus />
                            </div>
                        </div>
                    }
                    right={
                        <>
                            <Tooltip content="View details" position="top">
                                <CardIconButton
                                    variant="view"
                                    icon={Eye}
                                    aria-label="View details"
                                    onClick={() => navigate(`/my-residents/${resident.id}`)}
                                />
                            </Tooltip>
                            {canEdit && (
                                <Tooltip content="Edit resident" position="top">
                                    <CardIconButton
                                        variant="edit"
                                        icon={Edit}
                                        aria-label="Edit resident"
                                        onClick={() => {
                                            setEditing(resident);
                                            setShowForm(true);
                                        }}
                                    />
                                </Tooltip>
                            )}
                            {canEdit && (
                                <Tooltip
                                    content="Update resident status"
                                    position="top"
                                >
                                    <CardIconButton
                                        variant={isResidentLifecycleActive(resident) ? 'deactivate' : 'activate'}
                                        icon={isResidentLifecycleActive(resident) ? XCircle : CheckCircle}
                                        aria-label="Update resident status"
                                        onClick={() => {
                                            updateStatusMutation.reset();
                                            setStatusResident(resident);
                                        }}
                                    />
                                </Tooltip>
                            )}
                        </>
                    }
                />

                <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">{fullName}</h3>

                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {resident.branch && (
                        <DataPill icon={Building2}>
                            <span className="font-medium">{resident.branch.name}</span>
                        </DataPill>
                    )}
                    <DataPill icon={Home}>
                        <span className="font-normal text-slate-600">
                            Room: {resident.room_number || resident.room || 'N/A'}
                        </span>
                    </DataPill>
                    <DataPill icon={Calendar}>
                        <span className="font-normal text-slate-600">
                            DOB: {resident.date_of_birth ? formatPacificDate(resident.date_of_birth) : 'N/A'}
                        </span>
                    </DataPill>
                    <DataPill icon={Cake}>
                        <span className="font-normal text-slate-600">
                            Age: {ageYears !== null ? `${ageYears} yrs` : 'N/A'}
                        </span>
                    </DataPill>
                    <DataPill icon={CalendarClock} className="sm:col-span-2">
                        <span className="font-normal text-slate-600">
                            Admission:{' '}
                            {resident.admission_date ? formatPacificDate(resident.admission_date) : 'N/A'}
                        </span>
                    </DataPill>
                    {resident.allergies && (
                        <DataPill icon={AlertTriangle} className="sm:col-span-2">
                            <span className="font-normal text-slate-600 line-clamp-2">
                                Allergies:{' '}
                                {Array.isArray(resident.allergies)
                                    ? resident.allergies.join(', ')
                                    : resident.allergies}
                            </span>
                        </DataPill>
                    )}
                    {resident.diagnosis && (
                        <DataPill icon={Stethoscope} className="sm:col-span-2">
                            <span className="font-normal text-slate-600 line-clamp-2">
                                Diagnosis: {resident.diagnosis}
                            </span>
                        </DataPill>
                    )}
                </div>
            </EntityCardShell>
        );
    };

    // Show branch selector and wait for branch selection
    if (!selectedBranchId) {
        return (
            <div>
                <BranchSelector currentUser={currentUserData} />
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-sm font-semibold text-gray-700">Please select a branch to continue</p>
                    <p className="mt-2 text-xs text-gray-500">Select a branch from the dropdown above to view and manage residents.</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <Modal
                isOpen={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditing(null);
                }}
                title={editing ? 'Edit Resident' : 'Add Resident'}
                size="xl"
            >
                <ResidentForm
                    key={editing?.id ?? 'new'}
                    record={editing}
                    branches={branchesData?.data || []}
                    selectedBranchId={branchId}
                    inModal
                    onClose={() => {
                        setShowForm(false);
                        setEditing(null);
                    }}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditing(null);
                        queryClient.invalidateQueries(['residents']);
                    }}
                />
            </Modal>
            <ResidentStatusModal
                resident={statusResident}
                isOpen={statusResident != null}
                isPending={updateStatusMutation.isPending}
                error={updateStatusMutation.error}
                onClose={() => {
                    if (updateStatusMutation.isPending) return;
                    updateStatusMutation.reset();
                    setStatusResident(null);
                }}
                onSubmit={(payload) => {
                    if (!statusResident) return;
                    updateStatusMutation.reset();
                    updateStatusMutation.mutate(
                        { id: statusResident.id, payload },
                        { onSuccess: () => setStatusResident(null) }
                    );
                }}
            />
        <div>
            <BranchSelector currentUser={currentUserData} />
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">All Residents</h2>
                        <p className="text-gray-600">Search and view details for all residents in the facility.</p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => {
                                setEditing(null);
                                setShowForm(true);
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Resident</span>
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or room number..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="inactive">Non-active</option>
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800 text-sm">
                        Error loading residents: {error.response?.data?.message || error.message}
                    </p>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading residents...</p>
                </div>
            ) : (
                <>
                    {showActiveSection && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Active Residents</h3>
                                <span className="text-sm text-gray-500">{activeResidents.length} total</span>
                            </div>
                            {activeResidents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                    {activeResidents.map(renderResidentCard)}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <EmptyState
                                        icon={Users}
                                        title="No active residents found"
                                        description="Try adjusting your filters or add a new resident."
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {showInactiveSection && (
                        <div className={showActiveSection ? 'mt-10' : ''}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Non-active Residents</h3>
                                <span className="text-sm text-gray-500">{inactiveResidents.length} total</span>
                            </div>
                            {inactiveResidents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                                    {inactiveResidents.map(renderResidentCard)}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <EmptyState
                                        icon={XCircle}
                                        title="No non-active residents found"
                                        description="Discharged, transferred, deceased, or inactive residents will appear here when available."
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
        </>
    );
}

function ResidentStatusModal({ resident, isOpen, isPending, error, onClose, onSubmit }) {
    const [form, setForm] = useState(() => createStatusForm(resident));
    const [errors, setErrors] = useState({});

    React.useEffect(() => {
        setForm(createStatusForm(resident));
        setErrors({});
    }, [resident]);

    if (!resident) {
        return null;
    }

    const fullName = [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ');
    const selectedLifecycleMeta = getLifecycleStatusMeta(form.lifecycle_status);
    const selectedTemporaryMeta = form.temporary_status ? getTemporaryStatusMeta(form.temporary_status) : null;
    const isLifecycle = form.status_type === 'lifecycle';
    const requiresDischargeDetails = isLifecycle && form.lifecycle_status !== 'active';
    const serverErrors = error?.response?.data?.errors || {};
    const fieldErrors = { ...serverErrors, ...errors };
    const generalError = error?.response?.data?.message || errors.general;

    const setField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleStatusTypeChange = (statusType) => {
        setForm((prev) => ({
            ...prev,
            status_type: statusType,
            lifecycle_status: prev.lifecycle_status || 'active',
            temporary_status: prev.temporary_status || '',
        }));
        setErrors({});
    };

    const validate = () => {
        const nextErrors = {};

        if (requiresDischargeDetails) {
            if (!form.discharge_date) {
                nextErrors.discharge_date = ['Discharge date is required.'];
            }
            if (!form.discharge_reason.trim()) {
                nextErrors.discharge_reason = ['Discharge reason is required.'];
            }
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!validate()) return;

        const payload = {
            status_type: form.status_type,
            status: isLifecycle ? form.lifecycle_status : (form.temporary_status || null),
            effective_at: new Date().toISOString(),
        };

        if (isLifecycle && form.lifecycle_status !== 'active') {
            payload.discharge_date = form.discharge_date;
            payload.discharge_reason = form.discharge_reason.trim();
            payload.discharge_destination = form.discharge_destination.trim() || null;
            payload.discharge_notes = form.discharge_notes.trim() || null;
            payload.details = {
                discharge_notes: form.discharge_notes.trim() || null,
            };
        }

        if (!isLifecycle) {
            const temporaryNote = form.temporary_status_note.trim();
            payload.temporary_status_note = form.temporary_status ? (temporaryNote || null) : null;
            if (form.temporary_status && temporaryNote) {
                payload.details = { note: temporaryNote };
            }
        }

        onSubmit(payload);
    };

    const statusTypeButtonClass = (statusType) => (
        form.status_type === statusType
            ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] shadow-sm'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Update Resident Status"
            size="lg"
            closeOnBackdropClick={!isPending}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {generalError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="text-sm text-red-800">{generalError}</p>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-sm font-semibold text-slate-900">{fullName || 'Resident'}</p>
                    <div className="mt-2">
                        <ResidentStatusBadges resident={resident} showCensus />
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Status type</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleStatusTypeChange('temporary')}
                            className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${statusTypeButtonClass('temporary')}`}
                        >
                            Temporary
                            <span className="mt-1 block text-xs font-normal opacity-80">
                                Out of facility, hospital, hospice, alert, or clear temporary status.
                            </span>
                        </button>
                        <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleStatusTypeChange('lifecycle')}
                            className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${statusTypeButtonClass('lifecycle')}`}
                        >
                            Lifecycle
                            <span className="mt-1 block text-xs font-normal opacity-80">
                                Active, discharged, transferred, or deceased.
                            </span>
                        </button>
                    </div>
                </div>

                {isLifecycle ? (
                    <div className="space-y-5">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-lifecycle-status">
                                Lifecycle status *
                            </label>
                            <select
                                id="resident-lifecycle-status"
                                value={form.lifecycle_status}
                                disabled={isPending}
                                onChange={(event) => setField('lifecycle_status', event.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                            >
                                {LIFECYCLE_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {getLifecycleStatusMeta(status).label}
                                    </option>
                                ))}
                            </select>
                            <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${selectedLifecycleMeta.ringClassName}`}>
                                {selectedLifecycleMeta.label}
                            </p>
                            {fieldErrors.status && <p className="mt-1 text-xs text-red-600">{fieldErrors.status[0]}</p>}
                        </div>

                        {requiresDischargeDetails && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-discharge-date">
                                        Discharge date *
                                    </label>
                                    <input
                                        id="resident-discharge-date"
                                        type="date"
                                        value={form.discharge_date}
                                        disabled={isPending}
                                        onChange={(event) => setField('discharge_date', event.target.value)}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                                    />
                                    {fieldErrors.discharge_date && <p className="mt-1 text-xs text-red-600">{fieldErrors.discharge_date[0]}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-discharge-reason">
                                        Discharge reason *
                                    </label>
                                    <input
                                        id="resident-discharge-reason"
                                        type="text"
                                        value={form.discharge_reason}
                                        disabled={isPending}
                                        onChange={(event) => setField('discharge_reason', event.target.value)}
                                        placeholder="Reason for status change"
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                                    />
                                    {fieldErrors.discharge_reason && <p className="mt-1 text-xs text-red-600">{fieldErrors.discharge_reason[0]}</p>}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-discharge-destination">
                                        Discharge destination
                                    </label>
                                    <input
                                        id="resident-discharge-destination"
                                        type="text"
                                        value={form.discharge_destination}
                                        disabled={isPending}
                                        onChange={(event) => setField('discharge_destination', event.target.value)}
                                        placeholder="Hospital, another facility, family home, etc."
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-discharge-notes">
                                        Notes / details
                                    </label>
                                    <textarea
                                        id="resident-discharge-notes"
                                        rows={3}
                                        value={form.discharge_notes}
                                        disabled={isPending}
                                        onChange={(event) => setField('discharge_notes', event.target.value)}
                                        placeholder="Optional details for the resident status event"
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-temporary-status">
                                Temporary status
                            </label>
                            <select
                                id="resident-temporary-status"
                                value={form.temporary_status}
                                disabled={isPending}
                                onChange={(event) => setField('temporary_status', event.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                            >
                                <option value="">Clear temporary status</option>
                                {TEMPORARY_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {getTemporaryStatusMeta(status).label}
                                    </option>
                                ))}
                            </select>
                            {selectedTemporaryMeta ? (
                                <p className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${selectedTemporaryMeta.badgeClassName}`}>
                                    {selectedTemporaryMeta.label}
                                </p>
                            ) : (
                                <p className="mt-2 text-xs text-slate-500">No temporary status will remain on this resident.</p>
                            )}
                            {fieldErrors.status && <p className="mt-1 text-xs text-red-600">{fieldErrors.status[0]}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-temporary-note">
                                Temporary status note
                            </label>
                            <textarea
                                id="resident-temporary-note"
                                rows={3}
                                value={form.temporary_status_note}
                                disabled={isPending || !form.temporary_status}
                                onChange={(event) => setField('temporary_status_note', event.target.value)}
                                placeholder="Optional details for this temporary status"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                            />
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex min-w-[9rem] items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-text-on-primary)] shadow-md transition hover:bg-[var(--theme-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--theme-text-on-primary)]/25 border-t-[var(--theme-text-on-primary)]" />
                                Saving...
                            </>
                        ) : (
                            'Update Status'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function createStatusForm(resident) {
    const lifecycleStatus = getResidentLifecycleStatus(resident);
    const temporaryStatus = getResidentTemporaryStatus(resident) || '';

    return {
        status_type: temporaryStatus ? 'temporary' : 'lifecycle',
        lifecycle_status: lifecycleStatus === 'inactive' ? 'discharged' : lifecycleStatus,
        temporary_status: temporaryStatus,
        temporary_status_note: resident?.temporary_status_note || '',
        discharge_date: resident?.discharge_date || new Date().toISOString().split('T')[0],
        discharge_reason: resident?.discharge_reason || '',
        discharge_destination: resident?.discharge_destination || '',
        discharge_notes: resident?.discharge_notes || '',
    };
}

// Resident Form Component

