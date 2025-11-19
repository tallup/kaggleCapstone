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
            console.log('ChartReports: Dates changed, invalidating query', { dateFrom, dateTo });
            queryClient.invalidateQueries(['chart-overview', dateFrom, dateTo]);
        }
    }, [dateFrom, dateTo, queryClient]);

    const { data: stats, isLoading, refetch } = useQuery({
        queryKey: ['chart-overview', dateFrom, dateTo],
        queryFn: async () => {
            console.log('ChartReports: Fetching data with dates', { dateFrom, dateTo });
            const [residents, vitals, appointments, sleep] = await Promise.all([
                api.get('/charts/residents').then(r => r.data),
                api.get('/charts/vitals').then(r => r.data),
                api.get('/charts/appointments').then(r => r.data),
                api.get('/charts/sleep', { params: { date_from: dateFrom, date_to: dateTo } }).then(r => {
                    console.log('ChartReports: Sleep data received', r.data);
                    return r.data;
                }),
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
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#25603E]"></div>
                        <p className="mt-4 text-gray-600">Loading chart reports...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <BarChart3 className="h-8 w-8 text-[#25603E]" />
                                Chart Reports Dashboard
                            </h1>
                            <p className="mt-2 text-gray-600">Comprehensive overview of all facility metrics and analytics</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleExport}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                            >
                                <Download className="h-4 w-4" />
                                Export
                            </button>
                            <button
                                onClick={() => refetch()}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#25603E] text-white rounded-lg text-sm font-medium hover:bg-[#1B402D] transition"
                            >
                                <RefreshCcw className="h-4 w-4" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Date Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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
                                        console.log('ChartReports: DateFrom changed to', newDate);
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
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
                                        console.log('ChartReports: DateTo changed to', newDate);
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                        <p className="text-gray-600 text-xs font-medium">Total Residents</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{stats?.residents?.total_residents || 0}</p>
                        {stats?.residents?.by_branch && (
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.residents.by_branch.length} {stats.residents.by_branch.length === 1 ? 'branch' : 'branches'}
                            </p>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                        <p className="text-gray-600 text-xs font-medium">Vitals Records</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{stats?.vitals?.total_vitals || 0}</p>
                        {stats?.vitals?.today_vitals !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.vitals.today_vitals} today
                            </p>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                        <p className="text-gray-600 text-xs font-medium">Appointments</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{stats?.appointments?.total_appointments || 0}</p>
                        {stats?.appointments?.upcoming !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.appointments.upcoming} upcoming
                            </p>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                        <p className="text-gray-600 text-xs font-medium">Avg Sleep Hours</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">
                            {stats?.sleep?.avg_sleep_hours ? parseFloat(stats.sleep.avg_sleep_hours).toFixed(1) : '0.0'}h
                        </p>
                        {stats?.sleep?.total_records !== undefined && (
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.sleep.total_records} records
                            </p>
                        )}
                    </div>
                </div>

                {/* Additional Stats Row */}
                {(stats?.sleep?.avg_quality || stats?.sleep?.total_sleep_hours) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {stats?.sleep?.avg_quality && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                                <p className="text-gray-600 text-xs font-medium">Avg Sleep Quality</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">
                                    {parseFloat(stats.sleep.avg_quality).toFixed(1)}/10
                                </p>
                            </div>
                        )}
                        {stats?.sleep?.total_sleep_hours && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                                <p className="text-gray-600 text-xs font-medium">Total Sleep Hours</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">
                                    {parseFloat(stats.sleep.total_sleep_hours).toFixed(1)}h
                                </p>
                            </div>
                        )}
                        {stats?.sleep?.min_sleep_hours && stats?.sleep?.max_sleep_hours && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                                <p className="text-gray-600 text-xs font-medium">Sleep Range</p>
                                <p className="text-xl font-bold text-gray-900 mt-1">
                                    {parseFloat(stats.sleep.min_sleep_hours).toFixed(1)}h - {parseFloat(stats.sleep.max_sleep_hours).toFixed(1)}h
                                </p>
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
    );
}
