import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flame, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

export default function FireDrillsReport() {
    const [branchFilter, setBranchFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const { data: branchesData } = useQuery({
        queryKey: ['branches-options-fire-report'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });
    const branches = branchesData?.data || [];

    const queryParams = useMemo(() => {
        const params = { per_page: 100 };
        if (branchFilter && branchFilter !== 'all') params.branch_id = branchFilter;
        if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        return params;
    }, [branchFilter, statusFilter, dateFrom, dateTo]);

    const { data, isLoading } = useQuery({
        queryKey: ['fire-drills-report', queryParams],
        queryFn: async () => (await api.get('/fire-drills', { params: queryParams })).data,
    });

    const rows = data?.data || [];

    const formatSchedule = (drill) => {
        if (!drill.scheduled_date) return '—';
        const datePart = new Date(drill.scheduled_date).toLocaleDateString();
        if (drill.scheduled_time) return `${datePart} ${drill.scheduled_time}`;
        return datePart;
    };

    return (
        <PrintableReportLayout title="Fire drills report" subtitle="Schedules and completion">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 no-print">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Flame className="h-7 w-7 text-orange-600" />
                                Fire drills report
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">Read-only list for compliance printing</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                to="/fire-drills"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--theme-primary)] hover:underline"
                            >
                                Manage fire drills
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
                                    value={branchFilter}
                                    onChange={(e) => setBranchFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="all">All branches</option>
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
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="all">All</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12 text-gray-600">Loading…</div>
                    ) : rows.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-600">
                            No fire drills match your filters.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead>
                                    <tr className="text-left text-xs font-semibold uppercase text-gray-500">
                                        <th className="px-4 py-3">Scheduled</th>
                                        <th className="px-4 py-3">Branch</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Completed</th>
                                        <th className="px-4 py-3">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {rows.map((drill) => (
                                        <tr key={drill.id}>
                                            <td className="px-4 py-3 whitespace-nowrap">{formatSchedule(drill)}</td>
                                            <td className="px-4 py-3">{drill.branch?.name || '—'}</td>
                                            <td className="px-4 py-3 capitalize">{drill.status || '—'}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                                                {drill.completed_at
                                                    ? new Date(drill.completed_at).toLocaleString()
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 max-w-md text-gray-600">{drill.notes || '—'}</td>
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
