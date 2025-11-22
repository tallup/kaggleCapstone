import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Calendar, ClipboardList, Pill, User, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { formatPacificDate as formatDate, formatPacificTime as formatTime } from '../utils/pacificTime';

const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'missed', label: 'Missed' },
    { value: 'refused', label: 'Refused' },
    { value: 'hospital_admission', label: 'Hospital Admission' },
];

const statusStyles = {
    completed: 'bg-green-100 text-green-800',
    missed: 'bg-red-100 text-red-800',
    refused: 'bg-yellow-100 text-yellow-800',
    hospital_admission: 'bg-blue-100 text-blue-800',
};

export default function MedicationHistory() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [residentId, setResidentId] = useState(() => searchParams.get('resident') || '');
    const [status, setStatus] = useState(() => searchParams.get('status') || '');
    const [dateFrom, setDateFrom] = useState(() => searchParams.get('date_from') || '');
    const [dateTo, setDateTo] = useState(() => searchParams.get('date_to') || '');
    const [page, setPage] = useState(() => {
        const raw = parseInt(searchParams.get('page') || '1', 10);
        return Number.isNaN(raw) || raw < 1 ? 1 : raw;
    });
    const perPage = 25;

    useEffect(() => {
        const nextResident = searchParams.get('resident') || '';
        const nextStatus = searchParams.get('status') || '';
        const nextDateFrom = searchParams.get('date_from') || '';
        const nextDateTo = searchParams.get('date_to') || '';
        const parsedPage = parseInt(searchParams.get('page') || '1', 10);
        const nextPage = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

        setResidentId((prev) => (prev === nextResident ? prev : nextResident));
        setStatus((prev) => (prev === nextStatus ? prev : nextStatus));
        setDateFrom((prev) => (prev === nextDateFrom ? prev : nextDateFrom));
        setDateTo((prev) => (prev === nextDateTo ? prev : nextDateTo));
        setPage((prev) => (prev === nextPage ? prev : nextPage));
    }, [searchParams]);

    useEffect(() => {
        const nextParams = new URLSearchParams();
        if (residentId) nextParams.set('resident', residentId);
        if (status) nextParams.set('status', status);
        if (dateFrom) nextParams.set('date_from', dateFrom);
        if (dateTo) nextParams.set('date_to', dateTo);
        if (page > 1) nextParams.set('page', String(page));

        const current = searchParams.toString();
        const next = nextParams.toString();
        if (current !== next) {
            setSearchParams(nextParams, { replace: true });
        }
    }, [residentId, status, dateFrom, dateTo, page, searchParams, setSearchParams]);

    useEffect(() => {
        setPage((prev) => (prev === 1 ? prev : 1));
    }, [residentId, status, dateFrom, dateTo]);

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
        queryKey: ['medication-history', residentId, status, dateFrom, dateTo, page, currentUser?.assigned_branch_id],
        queryFn: async () => {
            const params = {
                per_page: perPage,
                page,
            };

            if (residentId) params.resident_id = residentId;
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

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Medication Administration History</h2>
                        <p className="text-gray-600 max-w-2xl">
                            Review medication administrations captured in Evergreen. Filter by resident, status, and date range to
                            audit medication compliance and follow-up on missed doses.
                        </p>
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
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    <div className="py-12 text-center">
                        <Pill className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg font-medium">No medication administrations found</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Adjust the filters to broaden your search or verify that medication administrations have been recorded for
                            this resident.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
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
                                        const administeredBy =
                                            administration.administered_by?.name ??
                                            administration.administered_by?.full_name ??
                                            administration.administeredBy?.name ??
                                            administration.administered_by_name ??
                                            administration.administered_by_full_name ??
                                            administration.administered_by;
                                        const lateNoteMarker = '[Late Administration]';
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
                                                        {administration.status === 'hospital_admission'
                                                            ? 'Hospital Admission'
                                                            : administration.status?.charAt(0).toUpperCase() + administration.status?.slice(1)}
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
                                                                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-xs font-medium"
                                                                >
                                                                    <FileText className="w-3 h-3" />
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


