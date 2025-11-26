import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, Search, MapPin, Calendar, Pill, User } from 'lucide-react';
import api from '../../services/api';

function getInitials(first = '', last = '') {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function formatDate(value) {
    if (!value) {
        return 'N/A';
    }

    try {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(new Date(value));
    } catch (err) {
        console.warn('Failed to format date', value, err);
        return value;
    }
}

export default function CaregiverMedicationsResidents() {
    const navigate = useNavigate();
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
                console.error('Failed to fetch current user:', err);
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
            <article
                key={resident.id}
                className="group flex flex-col rounded-2xl border border-transparent bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:border-emerald-100"
            >
                <div className="flex items-start gap-4">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-emerald-100 bg-emerald-600 text-white">
                        {resident.profile_image_url || resident.profile_image ? (
                            <img
                                src={resident.profile_image_url || `/storage/${resident.profile_image}`}
                                alt={fullName || 'Resident profile'}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                    event.currentTarget.style.display = 'none';
                                    event.currentTarget.nextElementSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div
                            className={`absolute inset-0 ${resident.profile_image ? 'hidden' : 'flex'} items-center justify-center bg-emerald-600 text-lg font-semibold uppercase text-white`}
                        >
                            {getInitials(resident.first_name, resident.last_name) || <User className="h-6 w-6" />}
                        </div>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">{fullName || 'Unnamed Resident'}</h3>
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                    isActive
                                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                                        : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
                                }`}
                            >
                                {isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">Resident since {formatDate(resident.admission_date)}</p>
                    </div>
                </div>

                <dl className="mt-6 grid grid-cols-1 gap-4 text-sm text-gray-600 sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                        <MapPin className="h-4 w-4 text-emerald-500" />
                        <div>
                            <dt className="text-xs uppercase tracking-wide text-gray-500">Branch</dt>
                            <dd className="font-medium text-gray-900">{branchName}</dd>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2">
                        <Calendar className="h-4 w-4 text-emerald-500" />
                        <div>
                            <dt className="text-xs uppercase tracking-wide text-gray-500">Date of Birth</dt>
                            <dd className="font-medium text-gray-900">{formatDate(resident.date_of_birth)}</dd>
                        </div>
                    </div>
                </dl>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-gray-400">
                        Last updated {formatDate(resident.updated_at)}
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate(`/medications/residents/${resident.id}`)}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-text-on-primary)] shadow-sm transition hover:bg-[var(--theme-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--theme-primary)]"
                    >
                        <Pill className="w-4 h-4" />
                        Medications
                    </button>
                </div>
            </article>
        );
    };

    const renderResidentsEmptyState = (title, description, IconComponent = Users) => (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
            <IconComponent className="mx-auto h-12 w-12 text-emerald-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500">{description}</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <header className="rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wide text-emerald-100">Medication Management</p>
                        <h1 className="text-2xl font-semibold md:text-3xl">Residents</h1>
                        <p className="mt-2 max-w-xl text-sm text-emerald-100">
                            Select a resident to view and administer their medications.
                        </p>
                    </div>
                    <div className="rounded-xl bg-white/10 px-4 py-3 text-sm text-white shadow-inner backdrop-blur">
                        <span className="text-2xl font-semibold">{residents.length}</span>{' '}
                        <span className="text-emerald-100">total residents</span>
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
                            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-11 pr-4 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
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



















