import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Pill, ClipboardList, User as UserIcon, Building2, Calendar, Download } from 'lucide-react';
import api from '../services/api';
import SectionCard from '../components/SectionCard';

const perPage = 25;

export default function MedicationsReport() {
    const [dateFrom, setDateFrom] = React.useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = React.useState(() => new Date().toISOString().split('T')[0]);
    const [branchId, setBranchId] = React.useState('');
    const [residentId, setResidentId] = React.useState('');
    const [page, setPage] = React.useState(1);

    const { data: branchesData } = useQuery({
        queryKey: ['branches-options-report'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    const { data: residentsData } = useQuery({
        queryKey: ['residents-report'],
        queryFn: async () => (await api.get('/residents', { params: { per_page: 200 } })).data,
    });

    const {
        data: administrationsData,
        isLoading,
        isFetching,
        error,
    } = useQuery({
        queryKey: ['medications-report', dateFrom, dateTo, branchId, residentId, page],
        queryFn: async () => {
            const params = {
                per_page: perPage,
                page,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                branch_id: branchId || undefined,
                resident_id: residentId || undefined,
            };
            const response = await api.get('/medication-administrations', { params });
            return response.data;
        },
        keepPreviousData: true,
    });

    const administrations = administrationsData?.data || [];
    const totalPages = administrationsData?.last_page || 1;
    const total = administrationsData?.total || 0;

    const administeredCount = administrations.filter(a => a.status === 'administered').length;
    const missedCount = administrations.filter(a => a.status === 'missed').length;
    const adherence = (administeredCount + missedCount) > 0 ? Math.round((administeredCount / (administeredCount + missedCount)) * 100) : 0;

    const handleExport = () => {
        const rows = administrations.map(a => ({
            Resident: a.resident?.name || 'N/A',
            Medication: a.medication?.name || a.name || 'N/A',
            Status: a.status,
            'Administered By': a.administered_by?.name || 'N/A',
            Time: a.administered_at || a.scheduled_at || '',
            Branch: a.branch?.name || 'N/A',
            Notes: a.notes || '',
        }));
        const headers = Object.keys(rows[0] || {});
        const csv = [
            headers.join(','),
            ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'medications-report.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Medication Report</h1>
                    <p className="text-gray-600">View administered and missed medications with filters and KPIs.</p>
                </div>
                <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-semibold"
                    disabled={!administrations.length}
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            <SectionCard>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                        <div className="relative">
                            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                        <div className="relative">
                            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                        <div className="relative">
                            <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={branchId}
                                onChange={(e) => { setBranchId(e.target.value); setPage(1); }}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                            >
                                <option value="">All branches</option>
                                {branchesData?.data?.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resident</label>
                        <div className="relative">
                            <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={residentId}
                                onChange={(e) => { setResidentId(e.target.value); setPage(1); }}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                            >
                                <option value="">All residents</option>
                                {residentsData?.data?.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name || `${r.first_name || ''} ${r.last_name || ''}`}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </SectionCard>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SectionCard>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-50">
                            <Pill className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Administered</p>
                            <p className="text-2xl font-bold text-gray-900">{administeredCount}</p>
                        </div>
                    </div>
                </SectionCard>
                <SectionCard>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-50">
                            <ClipboardList className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Missed</p>
                            <p className="text-2xl font-bold text-gray-900">{missedCount}</p>
                        </div>
                    </div>
                </SectionCard>
                <SectionCard>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-50">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Adherence</p>
                            <p className="text-2xl font-bold text-gray-900">{adherence}%</p>
                        </div>
                    </div>
                </SectionCard>
            </div>

            <SectionCard>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Administration Records</h3>
                    {isFetching && <span className="text-xs text-gray-500">Refreshing...</span>}
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                        Failed to load data: {error.message}
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                ) : administrations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No records found for the selected filters.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resident</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Administered By</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {administrations.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm">
                                            {(() => {
                                                const r = item.resident || {};
                                                const name = r.name || r.full_name || [r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Resident';
                                                const initials = (r.first_name?.[0] || '') + (r.last_name?.[0] || '');
                                                const avatarSrc = r.profile_image_url
                                                    || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=25603E&color=fff&size=128`;

                                                const avatar = (
                                                    <img
                                                        src={avatarSrc}
                                                        alt={name}
                                                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                                        onError={(e) => {
                                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=25603E&color=fff&size=128`;
                                                        }}
                                                        title={name}
                                                    />
                                                );

                                                if (r.id) {
                                                    return (
                                                        <a href={`/medications/residents/${r.id}`} className="inline-flex items-center" title={name} aria-label={name}>
                                                            {avatar}
                                                        </a>
                                                    );
                                                }
                                                return (
                                                    <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)] text-white flex items-center justify-center font-semibold" title={name} aria-label={name}>
                                                        {initials.toUpperCase() || 'R'}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {item.medication?.name || item.name || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                item.status === 'administered'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-700'
                                            }`}>
                                                {item.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {item.administered_by?.name || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {item.administered_at || item.scheduled_at || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {item.branch?.name || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={item.notes || ''}>
                                            {item.notes || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-4 flex items-center justify-between text-sm text-gray-700">
                            <div>
                                Showing {(perPage * (page - 1)) + 1} - {Math.min(perPage * page, total)} of {total}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <span>Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}

