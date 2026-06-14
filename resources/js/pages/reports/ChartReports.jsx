import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { defaultOptions, colors } from '../../utils/chartConfig';
import { 
    TrendingUp, 
    Users, 
    Activity, 
    Calendar, 
    Moon,
    RefreshCcw,
    BarChart3,
    LineChart as LineChartIcon,
    PieChart,
    Download,
    Clock,
    Heart,
    FileText,
    CheckCircle2
} from 'lucide-react';
import { getLocalDateString } from '../../utils/pacificTime';
import { usePreventDateInputReload } from '../../hooks/usePreventDateInputReload';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

export default function ChartReports() {
    const [dateFrom, setDateFrom] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => getLocalDateString());
    const containerRef = usePreventDateInputReload();
    const queryClient = useQueryClient();

    // Refetch data when dates change
    useEffect(() => {
        if (dateFrom && dateTo) {
            queryClient.invalidateQueries(['chart-overview', dateFrom, dateTo]);
        }
    }, [dateFrom, dateTo, queryClient]);

    const { data: stats, isLoading, refetch } = useQuery({
        queryKey: ['chart-overview', dateFrom, dateTo],
        queryFn: async () => {
            const [residents, vitals, appointments, sleep] = await Promise.all([
                api.get('/charts/residents').then(r => r.data),
                api.get('/charts/vitals').then(r => r.data),
                api.get('/charts/appointments').then(r => r.data),
                api.get('/charts/sleep', { params: { date_from: dateFrom, date_to: dateTo } }).then(r => r.data),
            ]);
            return { residents, vitals, appointments, sleep };
        },
        enabled: !!dateFrom && !!dateTo, // Only run if both dates are set
        refetchOnWindowFocus: false, // Prevent unnecessary refetches
    });

    const handleExport = () => {
        if (!stats) return;
        
        let csv = 'Category,Metric,Value\n';
        csv += `Residents,Total,${stats.residents?.total_residents || 0}\n`;
        csv += `Vitals,Total Records,${stats.vitals?.total_vitals || 0}\n`;
        csv += `Appointments,Total,${stats.appointments?.total_appointments || 0}\n`;
        csv += `Sleep,Avg Hours,${stats.sleep?.avg_sleep_hours || 0}\n`;
        csv += `Sleep,Total Records,${stats.sleep?.total_records || 0}\n`;
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chart-reports-${dateFrom}-to-${dateTo}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading chart reports...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PrintableReportLayout
            title="Chart Reports Dashboard"
            subtitle={`${dateFrom} to ${dateTo}`}
        >
            <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Page header (report title is in PrintableReportLayout) */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <BarChart3 className="h-8 w-8 text-[var(--theme-primary)]" />
                                    Chart Reports Dashboard
                                </h1>
                                <p className="mt-2 text-gray-600">Comprehensive overview of all facility metrics and analytics</p>
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

                    {/* Date Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 no-print">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Calendar className="inline h-4 w-4 mr-1" />
                                    From Date (for Sleep Data)
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                                            e.nativeEvent.stopImmediatePropagation();
                                        }
                                        const newDate = e.target.value;
                                        setDateFrom(newDate);
                                        // Force refetch when date changes
                                        setTimeout(() => {
                                            refetch();
                                        }, 100);
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                    onInput={(e) => {
                                        e.stopPropagation();
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Calendar className="inline h-4 w-4 mr-1" />
                                    To Date (for Sleep Data)
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
                                            e.nativeEvent.stopImmediatePropagation();
                                        }
                                        const newDate = e.target.value;
                                        setDateTo(newDate);
                                        // Force refetch when date changes
                                        setTimeout(() => {
                                            refetch();
                                        }, 100);
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                    onInput={(e) => {
                                        e.stopPropagation();
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
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
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Residents</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats?.residents?.total_residents || 0}</p>
                                    {stats?.residents?.by_branch && (
                                        <p className="text-sm text-gray-500 mt-2 flex items-center">
                                            <Users className="w-4 h-4 mr-1.5" />
                                            {stats.residents.by_branch.length} {stats.residents.by_branch.length === 1 ? 'branch' : 'branches'}
                                        </p>
                                    )}
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-red-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Vitals Records</p>
                                    <p className="text-3xl font-bold text-gray-900">{(stats?.vitals?.total_vitals || 0).toLocaleString()}</p>
                                    {stats?.vitals?.today_vitals !== undefined && (
                                        <p className="text-sm text-gray-500 mt-2 flex items-center">
                                            <Clock className="w-4 h-4 mr-1.5" />
                                            {stats.vitals.today_vitals} today
                                        </p>
                                    )}
                                </div>
                                <div className="bg-red-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Activity className="w-6 h-6 text-red-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 to-green-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Appointments</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats?.appointments?.total_appointments || 0}</p>
                                    {stats?.appointments?.upcoming !== undefined && (
                                        <p className="text-sm text-gray-500 mt-2 flex items-center">
                                            <Calendar className="w-4 h-4 mr-1.5" />
                                            {stats.appointments.upcoming} upcoming
                                        </p>
                                    )}
                                </div>
                                <div className="bg-green-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Calendar className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 to-amber-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Avg Sleep Hours</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {stats?.sleep?.avg_sleep_hours ? parseFloat(stats.sleep.avg_sleep_hours).toFixed(1) : '0.0'}h
                                    </p>
                                    {stats?.sleep?.total_records !== undefined && (
                                        <p className="text-sm text-gray-500 mt-2 flex items-center">
                                            <FileText className="w-4 h-4 mr-1.5" />
                                            {stats.sleep.total_records} records
                                        </p>
                                    )}
                                </div>
                                <div className="bg-amber-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Moon className="w-6 h-6 text-amber-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Stats Row */}
                {(stats?.sleep?.avg_quality || stats?.sleep?.total_sleep_hours) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
                        {stats?.sleep?.avg_quality && (
                            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-purple-600"></div>
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Avg Sleep Quality</p>
                                            <p className="text-3xl font-bold text-gray-900">
                                                {parseFloat(stats.sleep.avg_quality).toFixed(1)}/10
                                            </p>
                                        </div>
                                        <div className="bg-purple-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                            <CheckCircle2 className="w-6 h-6 text-purple-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {stats?.sleep?.total_sleep_hours && (
                            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Sleep Hours</p>
                                            <p className="text-3xl font-bold text-gray-900">
                                                {parseFloat(stats.sleep.total_sleep_hours).toFixed(1)}h
                                            </p>
                                        </div>
                                        <div className="bg-indigo-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                            <Clock className="w-6 h-6 text-indigo-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {stats?.sleep?.min_sleep_hours && stats?.sleep?.max_sleep_hours && (
                            <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 to-teal-600"></div>
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Sleep Range</p>
                                            <p className="text-3xl font-bold text-gray-900">
                                                {parseFloat(stats.sleep.min_sleep_hours).toFixed(1)}h - {parseFloat(stats.sleep.max_sleep_hours).toFixed(1)}h
                                            </p>
                                        </div>
                                        <div className="bg-teal-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                            <TrendingUp className="w-6 h-6 text-teal-600" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Residents by Branch */}
                    {stats?.residents?.by_branch && stats.residents.by_branch.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-600" />
                        Residents by Branch
                                </h2>
                            </div>
                            <div className="h-80">
                                <Bar
                        data={{
                            labels: stats.residents.by_branch.map(b => b.branch_name),
                            datasets: [{
                                label: 'Residents',
                                data: stats.residents.by_branch.map(b => b.count),
                                backgroundColor: colors.primary + '80',
                                borderColor: colors.primary,
                                borderWidth: 2,
                            }],
                        }}
                        options={{
                            ...defaultOptions,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Number of Residents'
                                    }
                                }
                            }
                        }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Vitals Trends */}
                    {stats?.vitals?.trends && stats.vitals.trends.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <LineChartIcon className="h-5 w-5 text-red-600" />
                        Vitals Trends (Last 7 Days)
                                </h2>
                            </div>
                            <div className="h-80">
                                <Line
                        data={{
                            labels: stats.vitals.trends.map(t => t.date),
                            datasets: [{
                                label: 'Vitals Count',
                                data: stats.vitals.trends.map(t => t.count),
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
                                        text: 'Number of Records'
                                    }
                                }
                            }
                        }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Sleep Duration Trends */}
                    {stats?.sleep?.sleep_duration_trends && stats.sleep.sleep_duration_trends.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Moon className="h-5 w-5 text-amber-600" />
                        Sleep Duration Trends
                                </h2>
                            </div>
                            <div className="h-80">
                                <Line
                        data={{
                            labels: stats.sleep.sleep_duration_trends.map(t => t.date),
                            datasets: [{
                                label: 'Avg Hours',
                                data: stats.sleep.sleep_duration_trends.map(t => t.avg_hours),
                                borderColor: colors.primary,
                                backgroundColor: colors.primary + '20',
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
                                        text: 'Hours'
                                    }
                                }
                            }
                        }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Sleep Quality Distribution */}
                    {stats?.sleep?.quality_distribution && stats.sleep.quality_distribution.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-purple-600" />
                        Sleep Quality Distribution
                                </h2>
                            </div>
                            <div className="h-80">
                                <Bar
                        data={{
                            labels: stats.sleep.quality_distribution.map(q => `Quality ${q.quality}`),
                            datasets: [{
                                label: 'Count',
                                data: stats.sleep.quality_distribution.map(q => q.count),
                                backgroundColor: [
                                    colors.danger + '80',
                                    colors.warning + '80',
                                    colors.info + '80',
                                    colors.success + '80',
                                    colors.primary + '80',
                                ],
                                borderColor: [
                                    colors.danger,
                                    colors.warning,
                                    colors.info,
                                    colors.success,
                                    colors.primary,
                                ],
                                borderWidth: 2,
                            }],
                        }}
                        options={{
                            ...defaultOptions,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Count'
                                    }
                                }
                            }
                        }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Appointments by Status */}
                    {stats?.appointments?.by_status && stats.appointments.by_status.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        Appointments by Status
                                </h2>
                            </div>
                            <div className="h-80">
                                <Doughnut
                        data={{
                            labels: stats.appointments.by_status.map(s => s.status),
                            datasets: [{
                                label: 'Count',
                                data: stats.appointments.by_status.map(s => s.count),
                                backgroundColor: [
                                    colors.info + '80',
                                    colors.success + '80',
                                    colors.warning + '80',
                                    colors.danger + '80',
                                ],
                                borderColor: [
                                    colors.info,
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
                            </div>
                        </div>
                    )}

                    {/* Weekly Sleep Average */}
                    {stats?.sleep?.weekly_average && stats.sleep.weekly_average.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-indigo-600" />
                        Weekly Sleep Average by Day
                                </h2>
                            </div>
                            <div className="h-80">
                                <Bar
                        data={{
                            labels: stats.sleep.weekly_average.map(w => w.day),
                            datasets: [{
                                label: 'Avg Hours',
                                data: stats.sleep.weekly_average.map(w => w.avg_hours),
                                backgroundColor: colors.primary + '80',
                                borderColor: colors.primary,
                                borderWidth: 2,
                            }],
                        }}
                        options={{
                            ...defaultOptions,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Hours'
                                    }
                                }
                            }
                        }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Empty State */}
                {(!stats?.residents?.by_branch?.length && 
                  !stats?.vitals?.trends?.length && 
                  !stats?.sleep?.sleep_duration_trends?.length) && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Chart Data Available</h3>
                        <p className="text-gray-600">Start recording data to see analytics and insights here.</p>
                    </div>
                )}
                </div>
            </div>
        </PrintableReportLayout>
    );
}
