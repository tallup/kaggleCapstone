import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

export default function IncidentsReport() {
    const [branchId, setBranchId] = useState('');
    const [status, setStatus] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const perPage = 50;

    const { data: branchesData } = useQuery({
        queryKey: ['branches-options-incidents-report'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });
    const branches = branchesData?.data || [];

    const queryParams = useMemo(() => {
        const params = { per_page: perPage, page };
        if (branchId) params.branch_id = branchId;
        if (status && status !== 'all') params.status = status;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        return params;
    }, [branchId, status, dateFrom, dateTo, page]);

    const { data, isLoading } = useQuery({
        queryKey: ['incidents-report', queryParams],
        queryFn: async () => (await api.get('/incidents', { params: queryParams })).data,
    });

    const rows = data?.data || [];
    const lastPage = data?.last_page || 1;

    return (
        <PrintableReportLayout title="Incidents report" subtitle="Safety and compliance log">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 no-print">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <AlertTriangle className="h-7 w-7 text-amber-600" />
                                Incidents report
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">Read-only list for inspections and printing</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                to="/incidents"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--theme-primary)] hover:underline"
                            >
                                Manage incidents
                                <ExternalLink className="h-4 w-4" />
                            </Link>
                            <ReportPrintButton />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 no-print">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                <select
                                    value={branchId}
                                    onChange={(e) => {
                                        setBranchId(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="">All branches</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => {
                                        setStatus(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="all">All</option>
                                    <option value="open">Open</option>
                                    <option value="in_progress">In progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                    <option value="on_hold">On hold</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                        {lastPage > 1 ? (
                            <div className="mt-4 flex items-center gap-2 text-sm no-print">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span>
                                    Page {page} of {lastPage}
                                </span>
                                <button
                                    type="button"
                                    disabled={page >= lastPage}
                                    onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                                    className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12 text-gray-600">Loading…</div>
                    ) : rows.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-600">
                            No incidents match your filters.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead>
                                    <tr className="text-left text-xs font-semibold uppercase text-gray-500">
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Branch</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3">Severity</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Resident</th>
                                        <th className="px-4 py-3">Summary</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.map((inc) => (
                                        <tr key={inc.id}>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-800">
                                                {inc.incident_date
                                                    ? new Date(inc.incident_date).toLocaleString()
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3">{inc.branch?.name || '—'}</td>
                                            <td className="px-4 py-3">{inc.incident_type || '—'}</td>
                                            <td className="px-4 py-3 capitalize">{inc.severity || '—'}</td>
                                            <td className="px-4 py-3 capitalize">{inc.status || '—'}</td>
                                            <td className="px-4 py-3">
                                                {inc.resident
                                                    ? `${inc.resident.first_name || ''} ${inc.resident.last_name || ''}`.trim()
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 max-w-md text-gray-700 line-clamp-3">
                                                {inc.description || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </PrintableReportLayout>
    );
}
