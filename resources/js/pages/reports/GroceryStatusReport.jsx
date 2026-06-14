import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

export default function GroceryStatusReport() {
    const [branchFilter, setBranchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');

    const { data: branchesData } = useQuery({
        queryKey: ['branches-options-grocery-report'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });
    const branches = branchesData?.data || [];

    const queryParams = useMemo(() => {
        const params = { per_page: 100 };
        if (branchFilter) params.branch_id = branchFilter;
        if (statusFilter) params.status = statusFilter;
        return params;
    }, [branchFilter, statusFilter]);

    const { data, isLoading } = useQuery({
        queryKey: ['grocery-status-updates-report', queryParams],
        queryFn: async () => (await api.get('/grocery-status-updates', { params: queryParams })).data,
    });

    const updates = data?.data || [];

    const filtered = useMemo(() => {
        if (!search.trim()) return updates;
        const q = search.toLowerCase();
        return updates.filter(
            (u) =>
                u.branch?.name?.toLowerCase().includes(q) ||
                u.items_needed?.toLowerCase().includes(q) ||
                u.items_received?.toLowerCase().includes(q) ||
                u.notes?.toLowerCase().includes(q)
        );
    }, [updates, search]);

    return (
        <PrintableReportLayout title="Grocery status report" subtitle="Weekly updates and fulfillment">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 no-print">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <ShoppingCart className="h-7 w-7 text-[var(--theme-primary)]" />
                                Grocery status report
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">Read-only view for printing and review</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                to="/grocery-status"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--theme-primary)] hover:underline"
                            >
                                Manage grocery status
                                <ExternalLink className="h-4 w-4" />
                            </Link>
                            <ReportPrintButton />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 no-print">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Branch, items, notes…"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                <select
                                    value={branchFilter}
                                    onChange={(e) => setBranchFilter(e.target.value)}
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
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="">All</option>
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12 text-gray-600">Loading…</div>
                    ) : filtered.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-600">
                            No grocery updates match your filters.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead>
                                    <tr className="text-left text-xs font-semibold uppercase text-gray-500">
                                        <th className="px-4 py-3">Week</th>
                                        <th className="px-4 py-3">Branch</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Items needed</th>
                                        <th className="px-4 py-3">Items received</th>
                                        <th className="px-4 py-3">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.map((u) => (
                                        <tr key={u.id}>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-800">
                                                {u.week_start_date || '—'}
                                            </td>
                                            <td className="px-4 py-3">{u.branch?.name || '—'}</td>
                                            <td className="px-4 py-3 capitalize">{u.status || '—'}</td>
                                            <td className="px-4 py-3 max-w-xs">{u.items_needed || '—'}</td>
                                            <td className="px-4 py-3 max-w-xs">{u.items_received || '—'}</td>
                                            <td className="px-4 py-3 max-w-md text-gray-600">{u.notes || '—'}</td>
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
