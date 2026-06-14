import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Search, MapPin, Calendar, Pill } from 'lucide-react';
import api from '../../services/api';
import logger from '../../utils/logger';
import EntityCardShell, { EntityCardHeader } from '../../components/ui/EntityCardShell';
import DataPill from '../../components/ui/DataPill';
import ResidentAvatarInline from '../../components/ui/ResidentAvatarInline';
import { formatPacificCalendarMedium, formatPacificDateTimeShort } from '../../utils/pacificTime';

export default function CaregiverMedicationsResidents() {
    const [search, setSearch] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    const [currentUser, setCurrentUser] = React.useState(null);

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 350);

        return () => clearTimeout(timeout);
    }, [search]);

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

    const { data, isLoading, error } = useQuery({
        queryKey: ['medications-residents', debouncedSearch],
        queryFn: async () => {
            const params = { per_page: 50 };
            if (debouncedSearch) {
                params.search = debouncedSearch;
            }
            const response = await api.get('/residents', { params });
            return response.data;
        },
    });

    const residents = React.useMemo(() => data?.data ?? [], [data?.data]);

    const renderResidentCard = (resident) => {
        const isActive = resident?.is_active === true || resident?.is_active === 1 || resident?.is_active === '1';
        const fullName = [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ');
        const branchName = resident?.branch?.name ?? 'Unassigned';

        return (
            <Link
                key={resident.id}
                to={`/my-residents/${resident.id}/medications/list`}
                aria-label={fullName ? `View medications for ${fullName}` : 'View medications for this resident'}
                className="block rounded-2xl text-left text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2"
            >
                <EntityCardShell className="cursor-pointer">
                    <EntityCardHeader
                        left={
                            <div className="flex flex-wrap items-start gap-3">
                                <ResidentAvatarInline resident={resident} className="h-10 w-10 text-xs" />
                                <div className="space-y-2">
                                    <span
                                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                            isActive
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                                : 'border-amber-200 bg-amber-50 text-amber-800'
                                        }`}
                                    >
                                        {isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        }
                        right={
                            <span
                                className="inline-flex rounded-lg border border-emerald-200/80 bg-emerald-50/80 p-2 text-[var(--theme-primary)]"
                                aria-hidden
                            >
                                <Pill className="h-4 w-4" strokeWidth={2.25} />
                            </span>
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
                        <span className="font-normal text-slate-600">{branchName}</span>
                    </DataPill>
                    <DataPill icon={Calendar}>
                        <span className="font-normal text-slate-600">
                            {formatPacificCalendarMedium(resident.date_of_birth)}
                        </span>
                    </DataPill>
                </div>

                <p className="mt-4 text-xs text-slate-400">
                    Last updated {formatPacificDateTimeShort(resident.updated_at)}
                </p>
                </EntityCardShell>
            </Link>
        );
    };

    const renderResidentsEmptyState = (title, description, IconComponent = Users) => (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
            <IconComponent className="mx-auto h-12 w-12" style={{ color: 'var(--theme-primary-bg)' }} />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500">{description}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <header className="rounded-2xl p-6 text-white shadow-lg"
                style={{ 
                    background: `linear-gradient(to right, var(--theme-primary), var(--theme-primary-hover), var(--theme-primary))`
                }}
            >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wide opacity-90">Medication Management</p>
                        <h1 className="text-2xl font-semibold md:text-3xl">Residents</h1>
                        <p className="mt-2 max-w-xl text-sm opacity-90">
                            Select a resident to view and administer their medications.
                        </p>
                    </div>
                    <div className="rounded-xl bg-white/10 px-4 py-3 text-sm text-white shadow-inner backdrop-blur">
                        <span className="text-2xl font-semibold">{residents.length}</span>{' '}
                        <span className="opacity-90">total residents</span>
                    </div>
                </div>
            </header>

            <section className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Resident Directory</h2>
                        <p className="text-sm text-gray-500">
                            Search by name to quickly find a resident and manage their medications.
                        </p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search residents..."
                            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-11 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2"
                            style={{ 
                                '--tw-ring-color': 'var(--theme-primary-bg)',
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = 'var(--theme-primary)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '';
                            }}
                        />
                    </div>
                </div>
            </section>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Unable to load residents. {error.response?.data?.message || error.message}
                </div>
            ) : null}

            {isLoading ? (
                <div className="flex min-h-[200px] items-center justify-center rounded-2xl bg-white shadow-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-t-4"
                            style={{ 
                                borderColor: 'var(--theme-primary-bg)',
                                borderTopColor: 'var(--theme-primary)'
                            }}
                        />
                        <p className="text-sm text-gray-500">Loading residents...</p>
                    </div>
                </div>
            ) : residents.length === 0 ? (
                renderResidentsEmptyState(
                    'No residents found',
                    'Residents assigned to your branch will appear here. Try adjusting your search query.'
                )
            ) : (
                <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {residents.map(renderResidentCard)}
                </section>
            )}
        </div>
    );
}




































