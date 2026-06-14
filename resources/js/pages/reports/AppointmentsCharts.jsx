import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { defaultOptions, colors } from '../../utils/chartConfig';
import { 
    Calendar, 
    RefreshCcw,
    Download,
    Filter,
    CheckCircle2,
    Clock,
    XCircle,
    TrendingUp,
    PieChart,
    LineChart as LineChartIcon
} from 'lucide-react';
import { getLocalDateString } from '../../utils/pacificTime';
import { usePreventDateInputReload } from '../../hooks/usePreventDateInputReload';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

export default function AppointmentsCharts() {
    const [branchId, setBranchId] = useState(null);
    const [residentId, setResidentId] = useState(null);
    const [dateFrom, setDateFrom] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => getLocalDateString());
    const [residents, setResidents] = useState([]);
    const [branches, setBranches] = useState([]);
    const filtersRef = usePreventDateInputReload();

    React.useEffect(() => {
        api.get('/residents', { params: { per_page: 100, status: 'active' } })
            .then(res => setResidents(res.data?.data || []))
            .catch(() => {});
        api.get('/branches', { params: { per_page: 100 } })
            .then(res => setBranches(res.data?.data || []))
            .catch(() => {});
    }, []);
    
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['charts-appointments', branchId, residentId, dateFrom, dateTo],
        queryFn: async () => {
            const params = { date_from: dateFrom, date_to: dateTo };
            if (branchId) params.branch_id = branchId;
            if (residentId) params.resident_id = residentId;
            return (await api.get('/charts/appointments', { params })).data;
        },
    });

    const handleExport = () => {
        if (!data) return;
        let csv = 'Date,Count\n';
        if (data.trends) {
            data.trends.forEach(trend => {
                csv += `${trend.date},${trend.count}\n`;
            });
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `appointments-charts-${dateFrom}-to-${dateTo}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const selectedBranchName = branchId ? branches.find(b => b.id === branchId)?.name : null;
    const selectedResident = React.useMemo(() => {
        if (residentId == null || residentId === '') return null;
        return residents.find(r => String(r.id) === String(residentId)) ?? null;
    }, [residentId, residents]);
    const reportSubtitle = React.useMemo(() => {
        const parts = [`${dateFrom} to ${dateTo}`];
        if (selectedBranchName) parts.push(selectedBranchName);
        return parts.join(' · ');
    }, [dateFrom, dateTo, selectedBranchName]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading appointment charts...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PrintableReportLayout
            title="Appointments Analytics Dashboard"
            subtitle={reportSubtitle}
            resident={selectedResident}
        >
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <Calendar className="h-8 w-8 text-blue-600" />
                                    Appointments Analytics Dashboard
                                </h1>
                                <p className="mt-2 text-gray-600">Comprehensive appointment tracking and analysis</p>
                            </div>
                        <div className="flex items-center gap-3 no-print">
                            <button
                                onClick={handleExport}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                            >
                                <Download className="h-4 w-4" />
                                Export
                            </button>
                            <ReportPrintButton />
                            <button
                                onClick={() => refetch()}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg text-sm font-medium hover:bg-[var(--theme-primary-hover)] transition"
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div ref={filtersRef} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 no-print">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        From Date
                                </label>
                                <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                            e.stopPropagation();
                            if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                                e.nativeEvent.stopImmediatePropagation();
                            }
                            setDateFrom(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                                    e.nativeEvent.stopImmediatePropagation();
                                }
                                return false;
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onInput={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Calendar className="inline h-4 w-4 mr-1" />
                        To Date
                                </label>
                                <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                            e.stopPropagation();
                            if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                                e.nativeEvent.stopImmediatePropagation();
                            }
                            setDateTo(e.target.value);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                                    e.nativeEvent.stopImmediatePropagation();
                                }
                                return false;
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onInput={(e) => e.stopPropagation()}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Filter className="inline h-4 w-4 mr-1" />
                        Branch (Optional)
                                </label>
                                <select
                        value={branchId || ''}
                        onChange={(e) => setBranchId(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                >
                        <option value="">All Branches</option>
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Filter className="inline h-4 w-4 mr-1" />
                        Resident (Optional)
                                </label>
                                <select
                        value={residentId || ''}
                        onChange={(e) => setResidentId(e.target.value || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                >
                        <option value="">All Residents</option>
                        {residents.map(r => (
                            <option key={r.id} value={r.id}>
                                {r.first_name} {r.last_name}
                            </option>
                        ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Appointments</p>
                                    <p className="text-3xl font-bold text-gray-900">{(data?.total_appointments || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Calendar className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 to-green-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Upcoming</p>
                                    <p className="text-3xl font-bold text-gray-900">{(data?.upcoming || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <TrendingUp className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Completed</p>
                                    <p className="text-3xl font-bold text-gray-900">{(data?.completed || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-emerald-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Pending</p>
                                    <p className="text-3xl font-bold text-gray-900">{(data?.pending || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Clock className="w-6 h-6 text-yellow-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-blue-600" />
                                Appointments by Status
                            </h2>
                        </div>
                        <div className="h-80">
                            {data?.by_status?.length ? (
                                <Doughnut
                        data={{
                            labels: data.by_status.map(s => s.status),
                            datasets: [{
                                data: data.by_status.map(s => s.count),
                                backgroundColor: [
                                    colors.primary + '80',
                                    colors.success + '80',
                                    colors.warning + '80',
                                    colors.danger + '80',
                                ],
                                borderColor: [
                                    colors.primary,
                                    colors.success,
                                    colors.warning,
                                    colors.danger,
                                ],
                                borderWidth: 2,
                            }],
                        }}
                        options={{
                            ...defaultOptions,
                            maintainAspectRatio: false,
                        }}
                                />
                            ) : (
                                <div className="h-80 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <PieChart className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                            <p>No data available</p>
                        </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <LineChartIcon className="h-5 w-5 text-[var(--theme-primary)]" />
                                Appointment Trends (Last 7 Days)
                            </h2>
                        </div>
                        <div className="h-80">
                            {data?.trends?.length ? (
                                <Line
                        data={{
                            labels: data.trends.map(t => t.date),
                            datasets: [{
                                label: 'Appointments',
                                data: data.trends.map(t => t.count),
                                borderColor: colors.info,
                                backgroundColor: colors.info + '20',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                            }],
                        }}
                        options={{
                            ...defaultOptions,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Number of Appointments'
                                    }
                                }
                            }
                        }}
                                />
                            ) : (
                                <div className="h-80 flex items-center justify-center text-gray-500">
                                    <div className="text-center">
                                        <LineChartIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                        <p>No data available</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </PrintableReportLayout>
    );
}
