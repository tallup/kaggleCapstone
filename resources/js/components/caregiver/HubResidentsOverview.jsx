import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, Search, MapPin, Calendar, Phone, Edit, Eye, DoorOpen, Activity } from 'lucide-react';
import api from '../../services/api';
import ResidentForm from '../ResidentForm';
import Tooltip from '../ui/Tooltip';
import EntityCardShell, { EntityCardHeader } from '../ui/EntityCardShell';
import CardIconButton from '../ui/CardIconButton';
import DataPill from '../ui/DataPill';
import ResidentAvatarInline from '../ui/ResidentAvatarInline';
import ResidentStatusBadges from '../residents/ResidentStatusBadges';
import { isCaregiverRole } from '../../utils/userRoles';
import {
    formatPacificCalendarMedium,
    formatPacificDateTimeShort,
    calculateAgeFromPacificBirthDate,
} from '../../utils/pacificTime';
import { RESIDENT_CONTEXT_QUERY_KEY } from '../../utils/headerResidentSwitcher';
import { currentUserQueryOptions } from '../../queries/currentUser';
import { isResidentLifecycleActive } from '../../utils/residentStatus';

const initialStats = [
    { key: 'active', label: 'Active Residents', icon: Users },
    { key: 'inactive', label: 'Non-active Residents', icon: Activity },
];

/**
 * @param {'record' | 'medicationHub' | 'clinicalHub'} [primaryResidentPath='record'] — Card click target: resident record, medication hub, or clinical section (Vitals + tab bar).
 */
export default function HubResidentsOverview({ primaryResidentPath = 'record' }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const queryClient = useQueryClient();
    const [search, setSearch] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [showForm, setShowForm] = React.useState(false);
    const [editing, setEditing] = React.useState(null);

    const { data: currentUser, isLoading: isLoadingUser } = useQuery(currentUserQueryOptions);

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
                show_all: true,
            };
            if (debouncedSearch) {
                params.search = debouncedSearch;
            }
            if (currentUser?.assigned_branch_id) {
                params.branch_id = currentUser.assigned_branch_id;
            }
            const response = await api.get('/residents', { params });
            return response.data;
        },
        enabled: !isLoadingUser,
    });

    const allResidents = React.useMemo(() => data?.data ?? [], [data?.data]);

    const residents = React.useMemo(() => {
        if (statusFilter === 'all') return allResidents;
        return allResidents.filter((r) => {
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
            if (isResidentLifecycleActive(resident)) totals.active += 1;
            else totals.inactive += 1;
        });
        return initialStats.map((item) => ({
            ...item,
            value: totals[item.key],
        }));
    }, [allResidents]);

    const navigateTargetForResident = React.useCallback(
        (resident) => {
            const id = resident?.id;
            if (primaryResidentPath === 'medicationHub') {
                return `/my-residents/${id}/medications/overview`;
            }
            if (primaryResidentPath === 'clinicalHub') {
                const q = new URLSearchParams();
                q.set(RESIDENT_CONTEXT_QUERY_KEY, String(id));
                const bid = resident?.branch_id ?? resident?.branch?.id;
                if (bid != null && bid !== '') {
                    q.set('branch', String(bid));
                }
                return `/vitals?${q.toString()}`;
            }
            return `/my-residents/${id}`;
        },
        [primaryResidentPath],
    );

    const renderResidentCard = (resident) => {
        const fullName = [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ');
        const branchNameRes = resident?.branch?.name ?? 'Unassigned';
        const ageYears = calculateAgeFromPacificBirthDate(resident.date_of_birth);
        const room = resident.room_number || resident.room;
        const profilePath = `/my-residents/${resident.id}`;
        const cardAria =
            primaryResidentPath === 'medicationHub'
                ? `Open medication hub for ${fullName || 'resident'}`
                : primaryResidentPath === 'clinicalHub'
                    ? `Open clinical hub for ${fullName || 'resident'}`
                    : `Open resident record for ${fullName || 'resident'}`;

        return (
            <EntityCardShell
                key={resident.id}
                className="cursor-pointer"
                aria-label={cardAria}
                onClick={(e) => {
                    if (e.target.closest('button')) return;
                    navigate(navigateTargetForResident(resident));
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
                        { key: 'active', label: `Active (${stats.find((s) => s.key === 'active')?.value ?? 0})` },
                        { key: 'inactive', label: `Non-active (${stats.find((s) => s.key === 'inactive')?.value ?? 0})` },
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
                <div className="relative w-full min-w-[12rem] sm:w-64 sm:shrink-0">
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
                        : `There are no ${statusFilter} residents matching your current filters.`,
                )
            ) : displayedResidents.length === 0 ? (
                renderResidentsEmptyState(
                    'No matching resident',
                    scopeId
                        ? 'The selected resident is not in this filtered list. Try another status filter or clear resident scope in the URL.'
                        : 'Try adjusting your filters.',
                )
            ) : (
                <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3" aria-label="Resident cards">
                    {displayedResidents.map(renderResidentCard)}
                </section>
            )}

            {canEditResidents && showForm ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <ResidentForm
                            record={editing}
                            branches={branchesData?.data || []}
                            selectedBranchId={currentUser?.assigned_branch_id}
                            onClose={() => {
                                setShowForm(false);
                                setEditing(null);
                            }}
                            onSuccess={() => {
                                setShowForm(false);
                                setEditing(null);
                                queryClient.invalidateQueries({ queryKey: ['my-residents'] });
                            }}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}
