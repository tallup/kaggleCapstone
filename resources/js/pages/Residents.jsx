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
import ResidentStatusModal from '../components/residents/ResidentStatusModal';
import { formatPacificDate, calculateAgeFromPacificBirthDate } from '../utils/pacificTime';
import { isResidentLifecycleActive } from '../utils/residentStatus';

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['residents'] });
            queryClient.invalidateQueries({ queryKey: ['resident-hub'] });
        },
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
                allowLifecycle={!isCaregiver}
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

// Resident Form Component

