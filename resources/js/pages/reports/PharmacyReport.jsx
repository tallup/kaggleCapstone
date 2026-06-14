import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

function stockLabel(item) {
    const q = item.quantity ?? 0;
    const min = item.minimum_stock_level ?? 0;
    if (q <= 0) return 'Out of stock';
    if (q <= min) return 'Low stock';
    return 'In stock';
}

export default function PharmacyReport() {
    const [branchFilter, setBranchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');

    const { data: branchesData } = useQuery({
        queryKey: ['branches-options-pharmacy-report'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });
    const branches = branchesData?.data || [];

    const queryParams = useMemo(() => {
        const params = { per_page: 100 };
        if (branchFilter) params.branch_id = branchFilter;
        if (statusFilter) params.stock_status = statusFilter;
        if (search.trim()) params.search = search.trim();
        return params;
    }, [branchFilter, statusFilter, search]);

    const { data, isLoading } = useQuery({
        queryKey: ['pharmacy-inventory-report', queryParams],
        queryFn: async () => (await api.get('/pharmacy-inventory', { params: queryParams })).data,
    });

    const inventory = data?.data || [];

    return (
        <PrintableReportLayout title="Pharmacy inventory report" subtitle="Stock levels by branch">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 no-print">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                <Building2 className="h-7 w-7 text-cyan-700" />
                                Pharmacy inventory report
                            </h1>
                            <p className="mt-1 text-sm text-gray-600">Read-only snapshot for audits and printing</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Link
                                to="/pharmacy/inventory"
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--theme-primary)] hover:underline"
                            >
                                Manage inventory
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
                                    placeholder="Drug name…"
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stock status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="">All</option>
                                    <option value="low_stock">Low stock</option>
                                    <option value="out_of_stock">Out of stock</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12 text-gray-600">Loading…</div>
                    ) : inventory.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-600">
                            No inventory rows match your filters.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-100 text-sm">
                                <thead>
                                    <tr className="text-left text-xs font-semibold uppercase text-gray-500">
                                        <th className="px-4 py-3">Branch</th>
                                        <th className="px-4 py-3">Drug</th>
                                        <th className="px-4 py-3">Qty</th>
                                        <th className="px-4 py-3">Min</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Location</th>
                                        <th className="px-4 py-3">Unit cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {inventory.map((item) => (
                                        <tr key={item.id}>
                                            <td className="px-4 py-3">{item.branch?.name || '—'}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{item.drug?.name || '—'}</div>
                                                {item.drug?.strength ? (
                                                    <div className="text-xs text-gray-500">{item.drug.strength}</div>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-3">{item.quantity ?? 0}</td>
                                            <td className="px-4 py-3">{item.minimum_stock_level ?? 0}</td>
                                            <td className="px-4 py-3">{stockLabel(item)}</td>
                                            <td className="px-4 py-3 text-gray-600">{item.location || '—'}</td>
                                            <td className="px-4 py-3">
                                                {item.unit_cost != null
                                                    ? `$${parseFloat(item.unit_cost).toFixed(2)}`
                                                    : '—'}
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
