import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Download, FileText, Calendar, ClipboardList, Filter } from 'lucide-react';
import { getLocalDateString } from '../../utils/pacificTime';
import PrintableReportLayout from '../../components/reports/PrintableReportLayout';

export default function CareLogsReport() {
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => getLocalDateString());
    const [branchId, setBranchId] = useState('');
    const [residentId, setResidentId] = useState('');

    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const res = await api.get('/branches', { params: { per_page: 100 } });
            return res.data?.data || res.data || [];
        },
    });
    const branches = branchesData || [];

    const { data: residentsData } = useQuery({
        queryKey: ['residents-list-care-logs'],
        queryFn: async () => {
            const res = await api.get('/residents', { params: { per_page: 200, status: 'active' } });
            return res.data?.data || res.data || [];
        },
    });
    const residents = residentsData || [];

    const { data: careLogsData, isLoading } = useQuery({
        queryKey: ['t-logs', dateFrom, dateTo, branchId, residentId],
        queryFn: async () => {
            const params = { date_from: dateFrom, date_to: dateTo, per_page: 100 };
            if (branchId) params.branch_id = branchId;
            if (residentId) params.resident_id = residentId;
            const res = await api.get('/t-logs', { params });
            return res.data;
        },
    });

    const careLogs = careLogsData?.data ?? careLogsData ?? [];
    const list = Array.isArray(careLogs) ? careLogs : [];

    const selectedResident = React.useMemo(() => {
        if (!residentId) return null;
        return residents.find(r => String(r.id) === String(residentId)) ?? null;
    }, [residentId, residents]);

    const handleExport = async () => {
        try {
            const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
            if (branchId) params.set('branch_id', branchId);
            if (residentId) params.set('resident_id', residentId);
            const res = await api.get(`/t-logs/export/care-logs?${params.toString()}`, {
                responseType: 'blob',
            });
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resident_care_logs_${dateFrom}_to_${dateTo}.csv`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed', err);
        }
    };

    return (
        <PrintableReportLayout
            title="Resident Care Logs"
            subtitle={`${dateFrom} to ${dateTo}`}
            resident={selectedResident}
        >
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <ClipboardList className="h-8 w-8 text-brand-primary-dark" />
                                    Resident Care Logs
                                </h1>
                                <p className="mt-2 text-gray-600">Progress notes / care notes for compliance and inspection</p>
                            </div>
                            <div className="flex items-center gap-3 no-print">
                                <button
                                    onClick={handleExport}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary-dark text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
                                >
                                    <Download className="h-4 w-4" />
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 items-end no-print">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                                <select
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[160px]"
                                >
                                    <option value="">All branches</option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Resident</label>
                                <select
                                    value={residentId}
                                    onChange={(e) => setResidentId(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[180px]"
                                >
                                    <option value="">All residents</option>
                                    {residents.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.first_name} {r.last_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary-dark"></div>
                            <p className="mt-4 text-gray-600">Loading care logs...</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Resident</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Branch</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Types</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Level</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Summary</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Reporter</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {list.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                                    No care logs in this date range.
                                                </td>
                                            </tr>
                                        ) : (
                                            list.map((log) => (
                                                <tr key={log.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {log.resident?.name ?? [log.resident?.first_name, log.resident?.last_name].filter(Boolean).join(' ') ?? '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{log.branch?.name ?? '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {log.reported_on ? new Date(log.reported_on).toLocaleDateString() : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {Array.isArray(log.types) ? log.types.join(', ') : (log.types ?? '—')}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{log.notification_level ?? '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{log.summary ?? '—'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{log.reporter?.name ?? log.entered_by?.name ?? '—'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PrintableReportLayout>
    );
}
