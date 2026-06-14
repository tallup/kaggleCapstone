import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Search, MapPin, Calendar, Phone, Activity, Edit, Eye, LayoutGrid, List, DoorOpen, Pill } from 'lucide-react';
import api from '../../services/api';
import ResidentForm from '../../components/ResidentForm';
import Modal from '../../components/ui/Modal';
import Tooltip from '../../components/ui/Tooltip';
import EntityCardShell, { EntityCardHeader } from '../../components/ui/EntityCardShell';
import CardIconButton from '../../components/ui/CardIconButton';
import DataPill from '../../components/ui/DataPill';
import ResidentAvatarInline from '../../components/ui/ResidentAvatarInline';
import ResidentStatusBadges from '../../components/residents/ResidentStatusBadges';
import { isCaregiverRole } from '../../utils/userRoles';
import {
    formatPacificCalendarMedium,
    formatPacificDateTimeShort,
    calculateAgeFromPacificBirthDate,
} from '../../utils/pacificTime';
import { RESIDENT_CONTEXT_QUERY_KEY } from '../../utils/headerResidentSwitcher';
import { isResidentLifecycleActive } from '../../utils/residentStatus';

const initialStats = [
    { key: 'active', label: 'Active Residents', icon: Users },
    { key: 'inactive', label: 'Non-active Residents', icon: Activity },
];

export default function MyResidentsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const [search, setSearch] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all'); // 'all' | 'active' | 'inactive'
    const [viewMode, setViewMode] = React.useState('grid'); // 'grid' | 'list'
    const [showForm, setShowForm] = React.useState(false);
    const [editing, setEditing] = React.useState(null);

    // Current user query (to get assigned branch)
    const { data: currentUser, isLoading: isLoadingUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const res = await api.get('/user');
            return res.data;
        },
    });

    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });


    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 350);

        return () => clearTimeout(timeout);
    }, [search]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['my-residents', debouncedSearch, currentUser?.assigned_branch_id],
        queryFn: async () => {
            const params = { 
                per_page: 50,
                show_all: true, // Show both active and inactive residents
            };
            if (debouncedSearch) {
                params.search = debouncedSearch;
            }
            // For caregivers, backend automatically filters by assigned branch
            // For administrators with assigned branch, explicitly pass branch_id to ensure correct filtering
            if (currentUser?.assigned_branch_id) {
                params.branch_id = currentUser.assigned_branch_id;
            }
            const response = await api.get('/residents', { params });
            return response.data;
        },
        enabled: !isLoadingUser, // Wait for user data to load first
    });

    const allResidents = React.useMemo(() => data?.data ?? [], [data?.data]);

    const residents = React.useMemo(() => {
        if (statusFilter === 'all') return allResidents;
        return allResidents.filter(r => {
            const active = isResidentLifecycleActive(r);
            return statusFilter === 'active' ? active : !active;
        });
    }, [allResidents, statusFilter]);

    const scopeId = searchParams.get(RESIDENT_CONTEXT_QUERY_KEY) || '';
    const displayedResidents = React.useMemo(() => {
        if (!scopeId) return residents;
        return residents.filter((r) => String(r.id) === scopeId);
    }, [residents, scopeId]);

    const canEditResidents = !isCaregiverRole(currentUser?.role);

    const stats = React.useMemo(() => {
        const totals = { active: 0, inactive: 0 };
        allResidents.forEach((resident) => {
            if (isResidentLifecycleActive(resident)) {
                totals.active += 1;
            } else {
                totals.inactive += 1;
            }
        });

        return initialStats.map((item) => ({
            ...item,
            value: totals[item.key],
        }));
    }, [allResidents]);

    const renderResidentCard = (resident) => {
        const fullName = [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ');
        const branchNameRes = resident?.branch?.name ?? 'Unassigned';
        const ageYears = calculateAgeFromPacificBirthDate(resident.date_of_birth);
        const room = resident.room_number || resident.room;

        const profilePath = `/my-residents/${resident.id}`;
        const medicationHubPath = `/my-residents/${resident.id}/medications/overview`;

        return (
            <EntityCardShell
                key={resident.id}
                className="cursor-pointer"
                aria-label={`Open resident record for ${fullName || 'resident'}`}
                onClick={(e) => {
                    if (e.target.closest('button')) return;
                    navigate(profilePath);
                }}
            >
                <EntityCardHeader
                    left={
                        <div className="flex flex-wrap items-start gap-3">
                            <ResidentAvatarInline resident={resident} className="h-10 w-10 text-xs" />
                            <div className="space-y-1.5">
                                <ResidentStatusBadges resident={resident} showCensus />
                                <div className="flex flex-wrap gap-1.5">
                                    {room && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] font-semibold text-gray-600">
                                            <DoorOpen className="h-3 w-3" aria-hidden="true" />
                                            Room {room}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    }
                    right={
                        <>
                            {canEditResidents ? (
                                <Tooltip content="Edit resident" position="top">
                                    <CardIconButton
                                        variant="edit"
                                        icon={Edit}
                                        aria-label="Edit resident"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditing(resident);
                                            setShowForm(true);
                                        }}
                                    />
                                </Tooltip>
                            ) : null}
                            <Tooltip content="Medication hub" position="top">
                                <CardIconButton
                                    variant="resolve"
                                    icon={Pill}
                                    aria-label="Open medication hub"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(medicationHubPath);
                                    }}
                                />
                            </Tooltip>
                            <Tooltip content="View profile" position="top">
                                <CardIconButton
                                    variant="view"
                                    icon={Eye}
                                    aria-label="View profile"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(profilePath);
                                    }}
                                />
                            </Tooltip>
                        </>
                    }
                />

                <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                    {fullName || 'Unnamed Resident'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                    Resident since {formatPacificCalendarMedium(resident.admission_date)}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <DataPill icon={MapPin}>
                        <span className="font-normal text-slate-600">{branchNameRes}</span>
                    </DataPill>
                    <DataPill icon={Calendar}>
                        <span className="font-normal text-slate-600">
                            {formatPacificCalendarMedium(resident.date_of_birth)}
                            {ageYears !== null ? ` · ${ageYears} yrs` : ''}
                        </span>
                    </DataPill>
                    <DataPill icon={Phone}>
                        <span className="font-normal text-slate-600">
                            {resident.phone || resident.emergency_contact_phone || 'N/A'}
                        </span>
                    </DataPill>
                    <DataPill icon={Users}>
                        <span className="font-normal text-slate-600 truncate">
                            {resident.emergency_contact_name || 'Not provided'}
                        </span>
                    </DataPill>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                    Last updated {formatPacificDateTimeShort(resident.updated_at)}
                </p>
            </EntityCardShell>
        );
    };

    const renderResidentRow = (resident) => {
        const fullName = [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ');
        const branchNameRes = resident?.branch?.name ?? 'Unassigned';
        const ageYears = calculateAgeFromPacificBirthDate(resident.date_of_birth);
        const room = resident.room_number || resident.room;

        const profilePath = `/my-residents/${resident.id}`;
        const medicationHubPath = `/my-residents/${resident.id}/medications/overview`;

        return (
            <tr
                key={resident.id}
                className="group cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                onClick={(e) => {
                    if (e.target.closest('button')) return;
                    navigate(profilePath);
                }}
            >
                <td className="py-3 pl-4 pr-3">
                    <div className="flex items-center gap-3">
                        <ResidentAvatarInline resident={resident} className="h-8 w-8 text-[10px] flex-shrink-0" />
                        <div>
                            <p className="font-semibold text-sm text-gray-900">{fullName || 'Unnamed'}</p>
                            <p className="text-xs text-gray-500">{branchNameRes}</p>
                        </div>
                    </div>
                </td>
                <td className="py-3 px-3 text-sm text-gray-600">{room ? `Room ${room}` : '—'}</td>
                <td className="py-3 px-3 text-sm text-gray-600">
                    {formatPacificCalendarMedium(resident.date_of_birth)}
                    {ageYears !== null ? <span className="ml-1 text-xs text-gray-400">{ageYears} yrs</span> : null}
                </td>
                <td className="py-3 px-3">
                    <ResidentStatusBadges resident={resident} size="xs" showCensus />
                </td>
                <td className="py-3 pl-3 pr-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEditResidents && (
                            <Tooltip content="Edit" position="top">
                                <CardIconButton variant="edit" icon={Edit} aria-label="Edit resident" onClick={(e) => { e.stopPropagation(); setEditing(resident); setShowForm(true); }} />
                            </Tooltip>
                        )}
                        <Tooltip content="Medication hub" position="top">
                            <CardIconButton variant="resolve" icon={Pill} aria-label="Open medication hub" onClick={(e) => { e.stopPropagation(); navigate(medicationHubPath); }} />
                        </Tooltip>
                        <Tooltip content="View profile" position="top">
                            <CardIconButton variant="view" icon={Eye} aria-label="View profile" onClick={(e) => { e.stopPropagation(); navigate(profilePath); }} />
                        </Tooltip>
                    </div>
                </td>
            </tr>
        );
    };

    const renderResidentsEmptyState = (title, description, IconComponent = Users) => (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
            <IconComponent className="mx-auto h-12 w-12 text-[var(--theme-primary-light)]" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500">{description}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by status">
                    {[
                        { key: 'all', label: `All (${allResidents.length})` },
                        { key: 'active', label: `Active (${stats.find(s => s.key === 'active')?.value ?? 0})` },
                        { key: 'inactive', label: `Non-active (${stats.find(s => s.key === 'inactive')?.value ?? 0})` },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setStatusFilter(key)}
                            aria-pressed={statusFilter === key}
                            className={`rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] ${
                                statusFilter === key
                                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                    <div className="flex items-center rounded-lg border border-gray-200 p-0.5 bg-white">
                        <Tooltip content="Grid view" position="top">
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                aria-pressed={viewMode === 'grid'}
                                aria-label="Grid view"
                                className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] ${viewMode === 'grid' ? 'bg-gray-50 shadow-sm text-[var(--theme-primary)]' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </Tooltip>
                        <Tooltip content="List view" position="top">
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                aria-pressed={viewMode === 'list'}
                                aria-label="List view"
                                className={`rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] ${viewMode === 'list' ? 'bg-gray-50 shadow-sm text-[var(--theme-primary)]' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <List className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </Tooltip>
                    </div>
                    <div className="relative w-full min-w-[12rem] sm:w-64">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search residents…"
                            aria-label="Search residents by name, room, or contact"
                            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:border-[var(--theme-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-bg)]"
                        />
                    </div>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Unable to load residents. {error.response?.data?.message || error.message}
                </div>
            ) : null}

            {isLoading ? (
                <div className="flex min-h-[200px] items-center justify-center rounded-2xl bg-white shadow-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--theme-primary-bg)] border-t-[var(--theme-primary)]" />
                        <p className="text-sm text-gray-500">Loading residents…</p>
                    </div>
                </div>
            ) : residents.length === 0 ? (
                renderResidentsEmptyState(
                    statusFilter === 'all' ? 'No residents found' : `No ${statusFilter} residents`,
                    statusFilter === 'all'
                        ? 'Residents assigned to your branch will appear here. Try adjusting your search query.'
                        : `There are no ${statusFilter} residents matching your current filters.`
                )
            ) : displayedResidents.length === 0 ? (
                renderResidentsEmptyState(
                    'No matching resident',
                    scopeId
                        ? 'The selected resident is not in this filtered list. Try another status filter or clear the resident chip in the header.'
                        : 'Try adjusting your filters.',
                )
            ) : viewMode === 'list' ? (
                <section className="rounded-2xl bg-white shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm" aria-label="Resident list">
                        <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="py-3 pl-4 pr-3">Resident</th>
                                <th className="py-3 px-3">Room</th>
                                <th className="py-3 px-3">Date of Birth</th>
                                <th className="py-3 px-3">Status</th>
                                <th className="py-3 pl-3 pr-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {displayedResidents.map(renderResidentRow)}
                        </tbody>
                    </table>
                </section>
            ) : (
                <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-label="Resident cards">
                    {displayedResidents.map(renderResidentCard)}
                </section>
            )}

            {canEditResidents && (
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
                        selectedBranchId={currentUser?.assigned_branch_id}
                        inModal
                        onClose={() => {
                            setShowForm(false);
                            setEditing(null);
                        }}
                        onSuccess={() => {
                            setShowForm(false);
                            setEditing(null);
                            queryClient.invalidateQueries(['my-residents']);
                        }}
                    />
                </Modal>
            )}
        </div>
    );
}


