import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Calendar, ClipboardList, Pill, User, ChevronLeft, ChevronRight, FileText, Download } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { formatPacificDate as formatDate, formatPacificTime as formatTime } from '../utils/pacificTime';
import EmptyState from '../components/ui/EmptyState';

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
    refused: 'bg-yellow-100 text-yellow-800',
    hospital_admission: 'bg-blue-100 text-blue-800',
    pharmacy_administration_confirm: 'bg-purple-100 text-purple-800',
};

export default function MedicationHistory() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [residentId, setResidentId] = useState(() => searchParams.get('resident') || '');
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
    const perPage = 25;

    useEffect(() => {
        const nextResident = searchParams.get('resident') || '';
        const nextMedication = searchParams.get('medication') || '';
        const nextStatus = searchParams.get('status') || '';
        const nextDateFrom = searchParams.get('date_from') || '';
        const nextDateTo = searchParams.get('date_to') || '';
        const parsedPage = parseInt(searchParams.get('page') || '1', 10);
        const nextPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

        setResidentId((prev) => (prev === nextResident ? prev : nextResident));
        setMedicationId((prev) => (prev === nextMedication ? prev : nextMedication));
        setStatus((prev) => (prev === nextStatus ? prev : nextStatus));
        setDateFrom((prev) => (prev === nextDateFrom ? prev : nextDateFrom));
        setDateTo((prev) => (prev === nextDateTo ? prev : nextDateTo));
        setPage((prev) => (prev === nextPage ? prev : nextPage));
    }, [searchParams]);

    useEffect(() => {
        const nextParams = new URLSearchParams();
        if (residentId) nextParams.set('resident', residentId);
        if (medicationId) nextParams.set('medication', medicationId);
        if (status) nextParams.set('status', status);
        if (dateFrom) nextParams.set('date_from', dateFrom);
        if (dateTo) nextParams.set('date_to', dateTo);
        if (page > 1) nextParams.set('page', String(page));

        const current = searchParams.toString();
        const next = nextParams.toString();
        if (current !== next) {
            setSearchParams(nextParams, { replace: true });
        }
    }, [residentId, medicationId, status, dateFrom, dateTo, page, searchParams, setSearchParams]);

    useEffect(() => {
        setPage((prev) => (prev === 1 ? prev : 1));
    }, [residentId, medicationId, status, dateFrom, dateTo]);

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

    const {
        data: historyResponse,
        isLoading,
        error,
        isFetching,
    } = useQuery({
        queryKey: ['medication-history', residentId, medicationId, status, dateFrom, dateTo, page, currentUser?.assigned_branch_id],
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
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Medication Administration History</h2>
                        {medicationId && medicationData ? (
                            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-900">
                                    <span className="font-semibold">Viewing history for:</span> {medicationData.name || 'Medication'}
                                    {medicationData.resident && (
                                        <span className="text-blue-700"> • Resident: {medicationData.resident.first_name} {medicationData.resident.last_name}</span>
                                    )}
                                </p>
                            </div>
                        ) : (
                            <p className="text-gray-600 max-w-2xl">
                                Review medication administrations captured in Evergreen. Filter by resident, status, and date range to
                                audit medication compliance and follow-up on missed doses.
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resident</label>
                        <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={residentId}
                                onChange={(event) => setResidentId(event.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                            >
                                <option value="">All residents</option>
                                {residents.map((resident) => (
                                    <option key={resident.id} value={resident.id}>
                                        {resident.first_name} {resident.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <div className="relative">
                            <ClipboardList className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                        <div className="relative">
                            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(event) => setDateFrom(event.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                        <div className="relative">
                            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(event) => setDateTo(event.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-500 max-w-xl">
                        Download a printable medication administration log (MAR-style PDF) for one resident and the date range
                        above.
                    </p>
                    <button
                        type="button"
                        onClick={handleExportMedicationLogPdf}
                        disabled={!canExportMedicationLogPdf || exportingPdf}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        <Download className="w-4 h-4" />
                        {exportingPdf ? 'Exporting…' : 'Export medication log (PDF)'}
                    </button>
                </div>
                {exportPdfError ? <p className="text-sm text-red-600 mt-2">{exportPdfError}</p> : null}
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

                                return (
                                    <div key={administration.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">
                                                    {resident?.first_name} {resident?.last_name}
                                                </p>
                                                <p className="text-xs text-gray-500">{resident?.branch?.name || 'Branch N/A'}</p>
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
                                    </div>
                                );
                            })}
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
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

                                        return (
                                            <tr key={administration.id} className="hover:bg-gray-50 transition-colors">
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
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                                                        {getStatusLabel(administration.status)}
                                                    </span>
                                                    {isLateAdministration && (
                                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                            Late
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {administeredBy ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{administeredBy}</span>
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


