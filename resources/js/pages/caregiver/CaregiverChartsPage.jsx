import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ClipboardList, Plus, Clock, Calendar, Stethoscope, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import EntityCardShell, { EntityCardHeader } from '../../components/ui/EntityCardShell';
import CardIconButton from '../../components/ui/CardIconButton';
import DataPill from '../../components/ui/DataPill';
import ResidentAvatarInline from '../../components/ui/ResidentAvatarInline';
import Tooltip from '../../components/ui/Tooltip';
import { RESIDENT_CONTEXT_QUERY_KEY } from '../../utils/headerResidentSwitcher';

export default function CaregiverChartsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pendingLoadingId, setPendingLoadingId] = useState(null);

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(search.trim());
        }, 350);
        return () => clearTimeout(timeout);
    }, [search]);

    const { data: residentsData, isLoading } = useQuery({
        queryKey: ['residents-for-charts', debouncedSearch],
        queryFn: async () => {
            const params = {
                per_page: 50,
                is_active: 1,
            };
            if (debouncedSearch) params.search = debouncedSearch;
            const response = await api.get('/residents', { params });
            return response.data;
        }
    });

    const residents = residentsData?.data ?? [];

    React.useEffect(() => {
        if (location.pathname !== '/charts') return;
        const sp = new URLSearchParams(location.search.startsWith('?') ? location.search.slice(1) : location.search);
        const id = sp.get(RESIDENT_CONTEXT_QUERY_KEY);
        if (id) {
            navigate(`/charts/resident/${id}${location.search}`, { replace: true });
        }
    }, [location.pathname, location.search, navigate]);

    const headerScopeId = React.useMemo(() => {
        const sp = new URLSearchParams(location.search.startsWith('?') ? location.search.slice(1) : location.search);
        return sp.get(RESIDENT_CONTEXT_QUERY_KEY) || '';
    }, [location.search]);

    const displayedResidents = React.useMemo(() => {
        if (!headerScopeId || location.pathname !== '/charts') return residents;
        return residents.filter((r) => String(r.id) === headerScopeId);
    }, [residents, headerScopeId, location.pathname]);

    const handleOpenChart = (residentId) => {
        navigate(`/charts/resident/${residentId}${location.search || ''}`);
    };

    const handlePendingCharts = async (residentId) => {
        setPendingLoadingId(residentId);
        try {
            const res = await api.get(`/resident-charts/${residentId}/pending`);
            const list = res.data?.data ?? [];
            if (list.length > 0) {
                const mostRecent = list[0];
                const date = mostRecent.chart_date;
                navigate(`/charts/resident/${residentId}?date=${date}`);
            } else {
                toast.info('No pending charts for this resident.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not load pending charts.');
        } finally {
            setPendingLoadingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <header className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardList className="w-8 h-8 text-[var(--theme-primary)]" />
                            Resident Charts
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Select a resident to record or view behavior charts.
                        </p>
                    </div>
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search residents..."
                            className="w-full rounded-lg border border-gray-200 py-2 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent outline-none"
                        />
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedResidents.map((resident) => {
                        const fullName = [resident.first_name, resident.last_name].filter(Boolean).join(' ');
                        const pending = pendingLoadingId === resident.id;
                        return (
                            <EntityCardShell key={resident.id}>
                                <EntityCardHeader
                                    left={
                                        <div className="flex flex-wrap items-start gap-3">
                                            <ResidentAvatarInline resident={resident} className="h-10 w-10 text-xs" />
                                            <div className="space-y-2">
                                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                                                    Active
                                                </span>
                                            </div>
                                        </div>
                                    }
                                    right={
                                        <>
                                            <Tooltip content="Open behavior charts" position="top">
                                                <CardIconButton
                                                    variant="primary"
                                                    icon={Plus}
                                                    aria-label="New charts"
                                                    onClick={() => handleOpenChart(resident.id)}
                                                />
                                            </Tooltip>
                                            <Tooltip content="Pending charts" position="top">
                                                <CardIconButton
                                                    variant="view"
                                                    icon={pending ? Loader2 : Clock}
                                                    aria-label="Pending charts"
                                                    disabled={pending}
                                                    onClick={() => handlePendingCharts(resident.id)}
                                                    className={pending ? '[&_svg]:animate-spin' : ''}
                                                />
                                            </Tooltip>
                                        </>
                                    }
                                />

                                <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl truncate">
                                    {fullName}
                                </h3>

                                <div className="mt-4 grid grid-cols-1 gap-2.5">
                                    <DataPill icon={Calendar}>
                                        <span className="font-normal text-slate-600">
                                            DOB: {resident.date_of_birth || 'N/A'}
                                        </span>
                                    </DataPill>
                                    <DataPill icon={Stethoscope}>
                                        <span className="font-normal text-slate-600 line-clamp-2">
                                            Diagnosis: {resident.diagnosis || 'N/A'}
                                        </span>
                                    </DataPill>
                                    <DataPill icon={User}>
                                        <span className="font-normal text-slate-600 truncate">
                                            Physician:{' '}
                                            {resident.primary_care_doctor || resident.physician_name || 'N/A'}
                                        </span>
                                    </DataPill>
                                </div>
                            </EntityCardShell>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
