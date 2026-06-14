import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Pill, ClipboardList, User as UserIcon, Building2, Calendar, Download, AlertCircle } from 'lucide-react';
import api from '../services/api';
import SectionCard from '../components/SectionCard';
import PrintableReportLayout from '../components/reports/PrintableReportLayout';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const perPage = 25;

export default function MedicationsReport() {
    const [dateFrom, setDateFrom] = React.useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        // Use local date string in YYYY-MM-DD format
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    });
    const [dateTo, setDateTo] = React.useState(() => {
        const d = new Date();
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    });
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

    // Fetch aggregate stats
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['medications-stats', dateFrom, dateTo, branchId, residentId],
        queryFn: async () => {
            const params = {
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                branch_id: branchId || undefined,
                resident_id: residentId || undefined,
            };
            return (await api.get('/medication-administrations/stats', { params })).data;
        }
    });

    // Fetch paginated records
    const {
        data: administrationsData,
        isLoading: recordsLoading,
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

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f3f4f6',
                }
            },
            x: {
                grid: {
                    display: false,
                }
            }
        }
    };

    const chartData = {
        labels: statsData?.chart_data?.map(d => d.day) || [],
        datasets: [
            {
                label: 'Administered',
                data: statsData?.chart_data?.map(d => d.administered) || [],
                backgroundColor: 'rgba(34, 197, 94, 0.6)',
                borderColor: 'rgb(34, 197, 94)',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Missed',
                data: statsData?.chart_data?.map(d => d.missed) || [],
                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                borderColor: 'rgb(239, 68, 68)',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Refused',
                data: statsData?.chart_data?.map(d => d.refused) || [],
                backgroundColor: 'rgba(234, 179, 8, 0.6)',
                borderColor: 'rgb(234, 179, 8)',
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    };

    return (
        <PrintableReportLayout
            title="Medication Report"
            subtitle="View administered and missed medications with filters and KPIs."
        >
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 no-print">
                    <button
                        onClick={handleExport}
                        type="button"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-semibold transition-colors"
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="lg:col-span-1 space-y-4">
                    <SectionCard className="h-full">
                        <div className="flex flex-col h-full justify-between gap-6">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 border border-green-100">
                                <div className="p-3 rounded-full bg-green-100">
                                    <Pill className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Administered</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {statsLoading ? '...' : statsData?.administered || 0}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 border border-red-100">
                                <div className="p-3 rounded-full bg-red-100">
                                    <AlertCircle className="w-6 h-6 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Missed</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {statsLoading ? '...' : statsData?.missed || 0}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 p-4 rounded-xl bg-blue-50 border border-blue-100">
                                <div className="p-3 rounded-full bg-blue-100">
                                    <ClipboardList className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Adherence Rate</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {statsLoading ? '...' : `${statsData?.adherence || 0}%`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </SectionCard>
                </div>

                {/* Chart */}
                <div className="lg:col-span-2">
                    <SectionCard className="h-full min-h-[300px]">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Administration Trends</h3>
                        <div className="h-[250px] w-full">
                            {statsLoading ? (
                                <div className="h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                            ) : (
                                <Bar options={chartOptions} data={chartData} />
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>

            <SectionCard>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Administration Records</h3>
                    {isFetching && <span className="text-xs text-gray-500 animate-pulse">Refreshing...</span>}
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Failed to load data: {error.message}
                    </div>
                )}

                {recordsLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading records...</p>
                    </div>
                ) : administrations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p>No records found for the selected filters.</p>
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
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
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
                                                        className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                                        onError={(e) => {
                                                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=25603E&color=fff&size=128`;
                                                        }}
                                                        title={name}
                                                    />
                                                );

                                                if (r.id) {
                                                    return (
                                                        <a href={`/my-residents/${r.id}/medications/list`} className="inline-flex items-center gap-2 group" title={name} aria-label={name}>
                                                            {avatar}
                                                            <span className="font-medium text-gray-900 group-hover:text-[var(--theme-primary)]">{name}</span>
                                                        </a>
                                                    );
                                                }
                                                return (
                                                    <div className="inline-flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-[var(--theme-primary)] text-white flex items-center justify-center font-semibold text-xs" title={name} aria-label={name}>
                                                            {initials.toUpperCase() || 'R'}
                                                        </div>
                                                        <span className="font-medium text-gray-900">{name}</span>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            <div className="font-medium">{item.medication?.name || item.name || 'N/A'}</div>
                                            {item.dosage_given && <div className="text-xs text-gray-500">{item.dosage_given}</div>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${item.status === 'administered'
                                                ? 'bg-green-100 text-green-800'
                                                : item.status === 'missed'
                                                    ? 'bg-red-100 text-red-800'
                                                    : item.status === 'refused'
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {item.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {item.administered_by?.name || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                            {item.administered_at ? new Date(item.administered_at).toLocaleString() : (item.scheduled_at || 'N/A')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {item.branch?.name || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={item.notes || ''}>
                                            {item.notes || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing <span className="font-medium">{(perPage * (page - 1)) + 1}</span> to <span className="font-medium">{Math.min(perPage * page, total)}</span> of <span className="font-medium">{total}</span> results
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                            Page {page} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </SectionCard>
            </div>
        </PrintableReportLayout>
    );
}
