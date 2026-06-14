import React, { useMemo, useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Calendar, ClipboardList, Pill, User, ChevronLeft, ChevronRight, FileText, Download, AlertTriangle, CheckCircle2, XCircle, Ban, Building2 } from 'lucide-react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { formatPacificDate as formatDate, formatPacificTime as formatTime } from '../utils/pacificTime';
import { RESIDENT_CONTEXT_QUERY_KEY, urlSearchParamsShallowEqual, parseResidentContextId } from '../utils/headerResidentSwitcher';
import EmptyState from '../components/ui/EmptyState';
import { useToastContext } from '../contexts/ToastContext';

const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'missed', label: 'Missed' },
    { value: 'refused', label: 'Refused' },
    { value: 'hospital_admission', label: 'Hospital Admission' },
    { value: 'pharmacy_administration_confirm', label: 'Pharmacy Administration Confirm' },
];

const statusStyles = {
    completed: 'bg-green-100 text-green-800',
    missed: 'bg-red-100 text-red-800',
    refused: 'bg-amber-100 text-amber-800',
    hospital_admission: 'bg-blue-100 text-blue-800',
    pharmacy_administration_confirm: 'bg-purple-100 text-purple-800',
};

const statusRowBorder = {
    completed: 'border-l-4 border-l-green-400',
    missed: 'border-l-4 border-l-red-400',
    refused: 'border-l-4 border-l-amber-400',
    hospital_admission: 'border-l-4 border-l-blue-400',
    pharmacy_administration_confirm: 'border-l-4 border-l-purple-400',
};

const StatusIcon = ({ status, className = 'w-3.5 h-3.5' }) => {
    if (status === 'completed') return <CheckCircle2 className={`${className} text-green-600`} aria-hidden="true" />;
    if (status === 'missed') return <XCircle className={`${className} text-red-500`} aria-hidden="true" />;
    if (status === 'refused') return <Ban className={`${className} text-amber-500`} aria-hidden="true" />;
    return null;
};

/** Match server resolve-missed payload for optimistic history cache updates. */
function applyOptimisticResolveMissedRow(row, status) {
    if (!row) return row;
    const med = row.medication;
    const fromMed = med ? [med.quantity, med.form].filter(Boolean).join(' ').trim() : '';
    const hasDosage = row.dosage_given != null && String(row.dosage_given).trim() !== '';

    if (status === 'completed') {
        return {
            ...row,
            status: 'completed',
            notes: 'Administered',
            dosage_given: hasDosage ? row.dosage_given : (fromMed || 'Administered'),
        };
    }

    if (status === 'refused') {
        return {
            ...row,
            status: 'refused',
            notes: 'Refused',
            dosage_given: 'N/A - Refused',
        };
    }

    return {
        ...row,
        status: 'hospital_admission',
        notes: 'Hospital Admission',
        dosage_given: 'N/A - Hospital Admission',
    };
}

const missedResolveActions = [
    {
        status: 'completed',
        label: 'Mark as administered',
        shortLabel: 'Administered',
        icon: CheckCircle2,
        className: 'border-emerald-700 bg-emerald-600 hover:bg-emerald-700',
    },
    {
        status: 'refused',
        label: 'Mark as refused',
        shortLabel: 'Refused',
        icon: Ban,
        className: 'border-amber-700 bg-amber-600 hover:bg-amber-700',
    },
    {
        status: 'hospital_admission',
        label: 'Mark as hospital admission',
        shortLabel: 'Hospital',
        icon: Building2,
        className: 'border-blue-700 bg-blue-600 hover:bg-blue-700',
    },
];

function MissedDoseActionBar({
    administration = null,
    selectedCount = 0,
    isResolving = false,
    onResolve,
    compact = false,
}) {
    const scheduledLabel = administration
        ? `${formatDate(administration.administered_at)} ${formatTime(administration.administered_at)}`
        : null;

    return (
        <div
            className={`rounded-lg border border-emerald-200 bg-emerald-50/80 ${compact ? 'px-3 py-3' : 'px-4 py-3'} flex flex-col gap-3`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
        >
            <p className={`${compact ? 'text-xs' : 'text-sm'} text-emerald-950`}>
                {selectedCount > 1 ? (
                    <>
                        Resolve <span className="font-semibold">{selectedCount}</span> selected missed doses as:
                    </>
                ) : (
                    <>
                        Resolve this missed dose at the scheduled time
                        {scheduledLabel ? (
                            <>
                                {' '}
                                (<span className="font-semibold">{scheduledLabel}</span>)
                            </>
                        ) : null}
                        :
                    </>
                )}
            </p>
            <div className="flex flex-wrap gap-1.5">
                {missedResolveActions.map(({ status, label, icon: Icon, className }) => (
                    <button
                        key={status}
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            void onResolve(status);
                        }}
                        disabled={isResolving}
                        aria-label={label}
                        title={label}
                        className={`inline-flex items-center justify-center shrink-0 rounded-md border p-1.5 !text-white shadow-sm disabled:opacity-50 [&_svg]:!text-white ${className}`}
                    >
                        <Icon className="w-4 h-4" aria-hidden="true" />
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function MedicationHistory({ embedded = false, embeddedResidentId = '' } = {}) {
    const toast = useToastContext();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const [residentId, setResidentId] = useState(() => {
        if (embedded && embeddedResidentId) return String(embeddedResidentId);
        return String(parseResidentContextId(location.search, location.pathname) || '');
    });
    const [medicationId, setMedicationId] = useState(() => searchParams.get('medication') || '');
    const [status, setStatus] = useState(() => searchParams.get('status') || '');
    const [dateFrom, setDateFrom] = useState(() => searchParams.get('date_from') || '');
    const [dateTo, setDateTo] = useState(() => searchParams.get('date_to') || '');
    const [page, setPage] = useState(() => {
        const raw = parseInt(searchParams.get('page') || '1', 10);
        return Number.isNaN(raw) || raw < 1 ? 1 : raw;
    });
    const [exportingPdf, setExportingPdf] = useState(false);
    const [exportPdfError, setExportPdfError] = useState('');
    /** Missed-dose row expanded to show admin resolve actions (admin id). */
    const [historyActionRowId, setHistoryActionRowId] = useState(null);
    const [selectedMissedIds, setSelectedMissedIds] = useState(() => new Set());
    const [resolvingMissed, setResolvingMissed] = useState(false);
    const perPage = 25;

    /** When the URL changes (header switcher, back/forward), we hydrate state in the first effect. The second effect must not run in the same tick with stale state or it overwrites the new URL. */
    const skipPushSearchFromStateRef = useRef(false);

    useEffect(() => {
        if (embedded) return;
        const nextResident = String(parseResidentContextId(location.search, location.pathname) || '');
        const nextMedication = searchParams.get('medication') || '';
        const nextStatus = searchParams.get('status') || '';
        const nextDateFrom = searchParams.get('date_from') || '';
        const nextDateTo = searchParams.get('date_to') || '';
        const parsedPage = parseInt(searchParams.get('page') || '1', 10);
        const nextPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

        setResidentId((prev) => {
            if (prev === nextResident) return prev;
            skipPushSearchFromStateRef.current = true;
            return nextResident;
        });
        setMedicationId((prev) => {
            if (prev === nextMedication) return prev;
            skipPushSearchFromStateRef.current = true;
            return nextMedication;
        });
        setStatus((prev) => {
            if (prev === nextStatus) return prev;
            skipPushSearchFromStateRef.current = true;
            return nextStatus;
        });
        setDateFrom((prev) => {
            if (prev === nextDateFrom) return prev;
            skipPushSearchFromStateRef.current = true;
            return nextDateFrom;
        });
        setDateTo((prev) => {
            if (prev === nextDateTo) return prev;
            skipPushSearchFromStateRef.current = true;
            return nextDateTo;
        });
        setPage((prev) => {
            if (prev === nextPage) return prev;
            skipPushSearchFromStateRef.current = true;
            return nextPage;
        });
    }, [searchParams, location.search, location.pathname, embedded]);

    useEffect(() => {
        if (embedded) return;
        if (skipPushSearchFromStateRef.current) {
            skipPushSearchFromStateRef.current = false;
            return;
        }
        const nextParams = new URLSearchParams();
        if (residentId) nextParams.set(RESIDENT_CONTEXT_QUERY_KEY, residentId);
        if (medicationId) nextParams.set('medication', medicationId);
        if (status) nextParams.set('status', status);
        if (dateFrom) nextParams.set('date_from', dateFrom);
        if (dateTo) nextParams.set('date_to', dateTo);
        if (page > 1) nextParams.set('page', String(page));

        if (!urlSearchParamsShallowEqual(searchParams, nextParams)) {
            setSearchParams(nextParams, { replace: true });
        }
        // searchParams intentionally omitted: including it re-runs this effect after every URL replace and can fight the URL→state effect in the same flush before state catches up.
    }, [residentId, medicationId, status, dateFrom, dateTo, page, setSearchParams, embedded]);

    useEffect(() => {
        if (embedded && embeddedResidentId) {
            setResidentId(String(embeddedResidentId));
        }
    }, [embedded, embeddedResidentId]);

    useEffect(() => {
        setPage((prev) => (prev === 1 ? prev : 1));
    }, [residentId, medicationId, status, dateFrom, dateTo]);

    useEffect(() => {
        setHistoryActionRowId(null);
    }, [page, residentId, medicationId, status, dateFrom, dateTo]);

    // Current user query (to get assigned branch)
    const { data: currentUser, isLoading: isLoadingUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const res = await api.get('/user');
            return res.data;
        },
    });

    const { data: residentsResponse } = useQuery({
        queryKey: ['medication-history-residents', currentUser?.assigned_branch_id],
        queryFn: async () => {
            const response = await api.get('/residents', {
                params: {
                    per_page: 100,
                    show_all: true,
                },
            });
            return response.data;
        },
        enabled: !isLoadingUser, // Wait for user data to load first
    });

    // Fetch medication details when filtering by medication
    const { data: medicationData } = useQuery({
        queryKey: ['medication', medicationId],
        queryFn: async () => {
            const response = await api.get(`/medications/${medicationId}`);
            return response.data;
        },
        enabled: !!medicationId && !isLoadingUser,
    });

    const residents = useMemo(() => {
        if (!residentsResponse) return [];
        return residentsResponse.data || residentsResponse;
    }, [residentsResponse]);

    const embeddedResidentLabel = useMemo(() => {
        if (!embedded || !residentId) return '';
        const r = residents.find((x) => String(x.id) === String(residentId));
        if (!r) return `Resident #${residentId}`;
        return [r.first_name, r.middle_names, r.last_name].filter(Boolean).join(' ') || `Resident #${residentId}`;
    }, [embedded, residentId, residents]);

    const medicationHistoryQueryKey = useMemo(
        () => ['medication-history', residentId, medicationId, status, dateFrom, dateTo, page, currentUser?.assigned_branch_id],
        [residentId, medicationId, status, dateFrom, dateTo, page, currentUser?.assigned_branch_id],
    );

    const {
        data: historyResponse,
        isLoading,
        error,
        isFetching,
    } = useQuery({
        queryKey: medicationHistoryQueryKey,
        queryFn: async () => {
            const params = {
                per_page: perPage,
                page,
            };

            if (residentId) params.resident_id = residentId;
            if (medicationId) params.medication_id = medicationId;
            if (status) params.status = status;
            if (dateFrom) params.date_from = dateFrom;
            if (dateTo) params.date_to = dateTo;

            const response = await api.get('/medication-administrations', { params });
            return response.data;
        },
        enabled: !isLoadingUser, // Wait for user data to load first
        keepPreviousData: true,
        retry: false,
    });

    const history = historyResponse?.data || [];
    const totalPages = historyResponse?.last_page || 1;
    const total = historyResponse?.total || 0;
    const lateNoteMarker = '[Late Administration]';

    const isAdminUser = currentUser?.role === 'administrator' || currentUser?.role === 'super_admin';

    const canShowMarkMissedAction = useCallback(
        (administration) => Boolean(isAdminUser && administration?.status === 'missed' && administration?.id),
        [isAdminUser],
    );

    const missedOnPage = useMemo(
        () => history.filter((row) => canShowMarkMissedAction(row)),
        [history, canShowMarkMissedAction],
    );

    const allMissedOnPageSelected = missedOnPage.length > 0
        && missedOnPage.every((row) => selectedMissedIds.has(row.id));

    const toggleMissedSelection = useCallback((administrationId, checked) => {
        setSelectedMissedIds((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(administrationId);
            } else {
                next.delete(administrationId);
            }
            return next;
        });
    }, []);

    const toggleSelectAllMissedOnPage = useCallback(() => {
        setSelectedMissedIds((prev) => {
            const next = new Set(prev);
            if (allMissedOnPageSelected) {
                missedOnPage.forEach((row) => next.delete(row.id));
            } else {
                missedOnPage.forEach((row) => next.add(row.id));
            }
            return next;
        });
    }, [allMissedOnPageSelected, missedOnPage]);

    useEffect(() => {
        setSelectedMissedIds((prev) => {
            const visibleIds = new Set(history.map((row) => row.id));
            const next = new Set([...prev].filter((id) => visibleIds.has(id)));
            return next.size === prev.size ? prev : next;
        });
    }, [history]);

    const toggleHistoryActionRow = useCallback(
        (administration) => {
            if (!canShowMarkMissedAction(administration)) return;
            const id = administration.id;
            setHistoryActionRowId((prev) => (prev === id ? null : id));
        },
        [canShowMarkMissedAction],
    );

    const resolveMissedFromHistory = useCallback(
        async (targetStatus, administration = null) => {
            const ids = administration
                ? [administration.id]
                : [...selectedMissedIds];

            if (!ids.length || !targetStatus) return;

            const previous = queryClient.getQueryData(medicationHistoryQueryKey);
            const idSet = new Set(ids.map(String));

            queryClient.setQueryData(medicationHistoryQueryKey, (old) => {
                if (!old || !Array.isArray(old.data)) return old;
                return {
                    ...old,
                    data: old.data.map((row) =>
                        idSet.has(String(row.id)) ? applyOptimisticResolveMissedRow(row, targetStatus) : row
                    ),
                };
            });

            setResolvingMissed(true);
            try {
                if (ids.length === 1) {
                    await api.patch(`/medication-administrations/${ids[0]}/mark-administered`, {
                        status: targetStatus,
                    });
                } else {
                    const response = await api.post('/medication-administrations/bulk-resolve-missed', {
                        ids,
                        status: targetStatus,
                    });
                    const errors = response.data?.errors || [];
                    if (errors.length > 0) {
                        const failedCount = errors.length;
                        const successCount = (response.data?.count || 0);
                        toast.error(
                            'Partial update',
                            `${successCount} updated, ${failedCount} could not be resolved.`,
                        );
                    }
                }

                setHistoryActionRowId(null);
                setSelectedMissedIds(new Set());
                await queryClient.invalidateQueries({ queryKey: ['medication-history'] });

                const actionLabel = missedResolveActions.find((action) => action.status === targetStatus)?.shortLabel
                    || targetStatus;
                toast.success('Updated', `${ids.length} missed dose${ids.length === 1 ? '' : 's'} marked as ${actionLabel.toLowerCase()}.`);
            } catch (err) {
                queryClient.setQueryData(medicationHistoryQueryKey, previous);
                const msg =
                    err?.response?.data?.message || err?.message || 'Failed to resolve missed dose.';
                toast.error('Error', msg);
            } finally {
                setResolvingMissed(false);
            }
        },
        [queryClient, medicationHistoryQueryKey, selectedMissedIds, toast],
    );

    const canExportMedicationLogPdf = Boolean(residentId && dateFrom && dateTo);

    const handleExportMedicationLogPdf = async () => {
        if (!canExportMedicationLogPdf) return;
        setExportingPdf(true);
        setExportPdfError('');
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token');
            const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
            const res = await fetch(`/api/v1/residents/${residentId}/reports/medication-log?${params}`, {
                method: 'GET',
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    Accept: 'application/pdf',
                },
                credentials: 'include',
            });
            if (!res.ok) {
                const text = await res.text();
                let message = `Export failed (${res.status})`;
                try {
                    const data = JSON.parse(text);
                    if (data?.message) message = data.message;
                } catch {
                    if (text && text.length < 500) message = text;
                }
                throw new Error(message);
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Medication_Log_${dateFrom}_${dateTo}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            setExportPdfError(e?.message || 'Unable to export PDF.');
        } finally {
            setExportingPdf(false);
        }
    };

    const getStatusLabel = (statusValue) => {
        if (statusValue === 'hospital_admission') return 'Hospital Admission';
        if (statusValue === 'pharmacy_administration_confirm') return 'Pharmacy Administration Confirm';
        return statusValue?.charAt(0).toUpperCase() + statusValue?.slice(1);
    };

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="mb-3">
                    {medicationId && medicationData ? (
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-xs text-blue-900 leading-snug">
                                <span className="font-semibold">Viewing history for:</span> {medicationData.name || 'Medication'}
                                {medicationData.resident && (
                                    <span className="text-blue-700"> • Resident: {medicationData.resident.first_name} {medicationData.resident.last_name}</span>
                                )}
                            </p>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-500 max-w-3xl leading-snug">
                            Filter by resident, status, and date range to audit compliance and follow up on missed doses.
                        </p>
                    )}
                </div>

                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${embedded ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Resident</label>
                        {embedded ? (
                            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900">
                                <User className="w-3.5 h-3.5 shrink-0 text-gray-400" aria-hidden="true" />
                                <span className="font-medium truncate">{embeddedResidentLabel || '—'}</span>
                            </div>
                        ) : (
                            <div className="relative">
                                <User className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                                <select
                                    value={residentId}
                                    onChange={(event) => setResidentId(event.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                                >
                                    <option value="">All residents</option>
                                    {residents.map((resident) => (
                                        <option key={resident.id} value={resident.id}>
                                            {resident.first_name} {resident.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                        <div className="relative">
                            <ClipboardList className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                            <select
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
                        <div className="relative">
                            <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(event) => setDateFrom(event.target.value)}
                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
                        <div className="relative">
                            <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(event) => setDateTo(event.target.value)}
                                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-500 max-w-xl leading-snug">
                        MAR-style PDF: select a resident and date range, then export.
                    </p>
                    <button
                        type="button"
                        onClick={handleExportMedicationLogPdf}
                        disabled={!canExportMedicationLogPdf || exportingPdf}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        {exportingPdf ? 'Exporting…' : 'Export log (PDF)'}
                    </button>
                </div>
                {exportPdfError ? <p className="text-xs text-red-600 mt-1.5">{exportPdfError}</p> : null}
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="py-12 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading medication history…</p>
                    </div>
                ) : error ? (
                    <div className="py-12 text-center text-red-600 text-sm">
                        {error.message || 'Unable to load medication history.'}
                    </div>
                ) : history.length === 0 ? (
                    <EmptyState
                        icon={Pill}
                        title="No medication administrations found"
                        description="Adjust the filters to broaden your search or verify that medication administrations have been recorded for this resident."
                    />
                ) : (
                    <>
                        {isAdminUser && selectedMissedIds.size > 0 ? (
                            <div className="border-b border-emerald-100 bg-emerald-50/60 px-4 py-3">
                                <MissedDoseActionBar
                                    selectedCount={selectedMissedIds.size}
                                    isResolving={resolvingMissed}
                                    onResolve={(status) => resolveMissedFromHistory(status)}
                                />
                            </div>
                        ) : null}

                        <div className="md:hidden p-3 space-y-3">
                            {history.map((administration) => {
                                const resident = administration.resident;
                                const medication = administration.medication;
                                const statusClass = statusStyles[administration.status] || 'bg-gray-100 text-gray-800';
                                const administeredBy = administration.status === 'missed'
                                    ? 'System'
                                    : (administration.administered_by?.name ??
                                       administration.administered_by?.full_name ??
                                       administration.administeredBy?.name ??
                                       administration.administered_by_name ??
                                       administration.administered_by_full_name ??
                                       administration.administered_by);

                                const isLateAdministration = typeof administration.notes === 'string' && administration.notes.includes(lateNoteMarker);
                                const cleanedNotes = isLateAdministration
                                    ? administration.notes.replace(lateNoteMarker, '').trim()
                                    : administration.notes;

                                const canMarkMissed = canShowMarkMissedAction(administration);
                                const isSelected = selectedMissedIds.has(administration.id);

                                return (
                                    <div
                                        key={administration.id}
                                        role={canMarkMissed ? 'button' : undefined}
                                        tabIndex={canMarkMissed ? 0 : undefined}
                                        className={`bg-white border rounded-xl shadow-sm p-4 ${isSelected ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-gray-200'} ${canMarkMissed ? 'cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500' : ''}`}
                                        onClick={canMarkMissed ? () => toggleHistoryActionRow(administration) : undefined}
                                        onKeyDown={
                                            canMarkMissed
                                                ? (e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        toggleHistoryActionRow(administration);
                                                    }
                                                }
                                                : undefined
                                        }
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                {canMarkMissed ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => toggleMissedSelection(administration.id, e.target.checked)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                        aria-label={`Select missed dose for ${medication?.name || 'medication'}`}
                                                    />
                                                ) : null}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {resident?.first_name} {resident?.last_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{resident?.branch?.name || 'Branch N/A'}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                                                    {getStatusLabel(administration.status)}
                                                </span>
                                                {isLateAdministration && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                        Late
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-gray-500">Medication</p>
                                                <p className="font-medium text-gray-900">{medication?.name || 'Medication'}</p>
                                                <p className="text-xs text-gray-500">{medication?.instructions || 'Instructions not set'}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-gray-500">Administered</p>
                                                    <p className="font-medium text-gray-900">{formatDate(administration.administered_at)}</p>
                                                    <p className="text-xs text-gray-500">{formatTime(administration.administered_at)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs uppercase tracking-wide text-gray-500">Administered By</p>
                                                    {administeredBy ? (
                                                        <>
                                                            <p className="font-medium text-gray-900">{administeredBy}</p>
                                                            {administration.administered_by?.position && (
                                                                <p className="text-xs text-gray-500">{administration.administered_by.position}</p>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <p className="text-sm text-gray-400">Not recorded</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-gray-500">Dosage / Notes</p>
                                                <p className="text-gray-900">{administration.dosage_given || 'Dose not recorded'}</p>
                                                {(cleanedNotes || isLateAdministration) && (
                                                    <p className="text-xs text-gray-500 mt-1 whitespace-pre-line">
                                                        {cleanedNotes || 'Late administration recorded outside scheduled window.'}
                                                    </p>
                                                )}
                                            </div>

                                            {administration.status === 'hospital_admission' && (
                                                <div className="pt-1">
                                                    {administration.document_path ? (
                                                        <a
                                                            href={`/storage/${administration.document_path}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-2 px-3 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors text-sm font-semibold"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                            View Document
                                                        </a>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-500 rounded-md text-xs">
                                                            <FileText className="w-3 h-3" />
                                                            No document attached
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {canMarkMissed ? (
                                            <p className="text-[11px] text-emerald-800 font-medium mt-3 pt-2 border-t border-gray-100">
                                                {historyActionRowId === administration.id
                                                    ? 'Choose how to resolve this missed dose below.'
                                                    : 'Select or tap to open administrator actions.'}
                                            </p>
                                        ) : null}

                                        {historyActionRowId === administration.id && canMarkMissed ? (
                                            <div className="mt-3" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
                                                <MissedDoseActionBar
                                                    administration={administration}
                                                    selectedCount={1}
                                                    isResolving={resolvingMissed}
                                                    onResolve={(status) => resolveMissedFromHistory(status, administration)}
                                                    compact
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {isAdminUser ? (
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                                                <input
                                                    type="checkbox"
                                                    checked={allMissedOnPageSelected}
                                                    onChange={toggleSelectAllMissedOnPage}
                                                    disabled={missedOnPage.length === 0}
                                                    className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
                                                    aria-label="Select all missed doses on this page"
                                                />
                                            </th>
                                        ) : null}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Resident
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Medication
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Administered
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Administered By
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Dosage / Notes
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {history.map((administration) => {
                                        const resident = administration.resident;
                                        const medication = administration.medication;
                                        const statusClass = statusStyles[administration.status] || 'bg-gray-100 text-gray-800';
                                        const administeredBy = administration.status === 'missed'
                                            ? 'System'
                                            : (administration.administered_by?.name ??
                                               administration.administered_by?.full_name ??
                                               administration.administeredBy?.name ??
                                               administration.administered_by_name ??
                                               administration.administered_by_full_name ??
                                               administration.administered_by);

                                        const isLateAdministration = typeof administration.notes === 'string' && administration.notes.includes(lateNoteMarker);
                                        const cleanedNotes = isLateAdministration
                                            ? administration.notes.replace(lateNoteMarker, '').trim()
                                            : administration.notes;

                                        const rowBorder = statusRowBorder[administration.status] || '';
                                        const isAutoMissed = administration.status === 'missed' && administeredBy === 'System';
                                        const canMarkMissed = canShowMarkMissedAction(administration);
                                        const isSelected = selectedMissedIds.has(administration.id);

                                        return (
                                            <Fragment key={administration.id}>
                                                <tr
                                                    className={`hover:bg-gray-50 transition-colors ${rowBorder} ${canMarkMissed ? 'cursor-pointer' : ''} ${isSelected ? 'bg-emerald-50/40' : ''}`}
                                                    onClick={canMarkMissed ? () => toggleHistoryActionRow(administration) : undefined}
                                                    title={canMarkMissed ? 'Click to show administrator actions' : undefined}
                                                >
                                                {isAdminUser ? (
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        {canMarkMissed ? (
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) => toggleMissedSelection(administration.id, e.target.checked)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                                aria-label={`Select missed dose for ${medication?.name || 'medication'}`}
                                                            />
                                                        ) : null}
                                                    </td>
                                                ) : null}
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="font-medium">
                                                        {resident?.first_name} {resident?.last_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {resident?.branch?.name || 'Branch N/A'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="font-medium">{medication?.name || 'Medication'}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {medication?.instructions || 'Instructions not set'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    <div className="font-medium">{formatDate(administration.administered_at)}</div>
                                                    <div className="text-xs text-gray-500">{formatTime(administration.administered_at)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className="flex items-center gap-1.5">
                                                        <StatusIcon status={administration.status} />
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass}`}>
                                                            {getStatusLabel(administration.status)}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {isLateAdministration && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                                Late
                                                            </span>
                                                        )}
                                                        {isAutoMissed && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                                                                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                                                                Auto-missed
                                                            </span>
                                                        )}
                                                    </div>
                                                    {canMarkMissed ? (
                                                        <p className="text-[11px] text-emerald-800 font-medium mt-1.5">
                                                            {historyActionRowId === administration.id
                                                                ? 'Action bar below.'
                                                                : 'Select or click row to correct.'}
                                                        </p>
                                                    ) : null}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {administeredBy ? (
                                                        <div className="flex flex-col">
                                                            <span className={`font-medium ${isAutoMissed ? 'text-gray-400 italic' : ''}`}>{administeredBy}</span>
                                                            {administration.administered_by?.position && (
                                                                <span className="text-xs text-gray-500">
                                                                    {administration.administered_by.position}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">Not recorded</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    <div>{administration.dosage_given || 'Dose not recorded'}</div>
                                                    {isAutoMissed && (
                                                        <div className="flex items-start gap-1 mt-1 text-xs text-red-500">
                                                            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                                            Automatically recorded as missed — dose window closed without administration.
                                                        </div>
                                                    )}
                                                    {(cleanedNotes || isLateAdministration) && (
                                                        <div className="text-xs text-gray-500 mt-1 whitespace-pre-line">
                                                            {cleanedNotes || 'Late administration recorded outside scheduled window.'}
                                                        </div>
                                                    )}
                                                    {administration.status === 'hospital_admission' && (
                                                        <div className="mt-2">
                                                            {administration.document_path ? (
                                                                <a
                                                                    href={`/storage/${administration.document_path}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors text-sm font-semibold shadow-md hover:shadow-lg"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                    View Document
                                                                </a>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-50 text-gray-500 rounded-md text-xs">
                                                                    <FileText className="w-3 h-3" />
                                                                    No document attached
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                </tr>
                                                {historyActionRowId === administration.id && canMarkMissed ? (
                                                <tr className="bg-emerald-50/70 border-l-4 border-l-emerald-500">
                                                    <td colSpan={isAdminUser ? 7 : 6} className="px-6 py-3">
                                                        <MissedDoseActionBar
                                                            administration={administration}
                                                            selectedCount={1}
                                                            isResolving={resolvingMissed}
                                                            onResolve={(status) => resolveMissedFromHistory(status, administration)}
                                                        />
                                                    </td>
                                                </tr>
                                                ) : null}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                                Showing {history.length} of {total} medication administrations
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    disabled={page === 1 || isFetching}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Previous
                                </button>
                                <span className="text-gray-700">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={page === totalPages || isFetching}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}


