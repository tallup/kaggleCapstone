import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { defaultOptions, colors } from '../../utils/chartConfig';
import { 
    Moon, 
    TrendingUp, 
    Calendar, 
    Clock, 
    Activity, 
    Download, 
    Filter,
    RefreshCcw,
    BarChart3,
    LineChart as LineChartIcon,
    PieChart,
    Star,
    Minus,
    Plus,
    Timer
} from 'lucide-react';
import { getLocalDateString } from '../../utils/pacificTime';
import { usePreventDateInputReload } from '../../hooks/usePreventDateInputReload';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

export default function SleepCharts() {
    const [dateFrom, setDateFrom] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => getLocalDateString());
    const [residentId, setResidentId] = useState('');
    const [residents, setResidents] = useState([]);
    const filtersRef = usePreventDateInputReload();

    // Fetch residents for filter
    React.useEffect(() => {
        api.get('/residents', { params: { per_page: 100, status: 'active' } })
            .then(res => setResidents(res.data?.data || []))
            .catch(() => {});
    }, []);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['charts-sleep', dateFrom, dateTo, residentId],
        queryFn: async () => {
            const params = { date_from: dateFrom, date_to: dateTo };
            if (residentId) params.resident_id = residentId;
            return (await api.get('/charts/sleep', { params })).data;
        },
    });

    const handleExport = () => {
        // Simple CSV export
        if (!data) return;
        
        let csv = 'Date,Avg Hours,Avg Quality\n';
        if (data.sleep_duration_trends) {
            data.sleep_duration_trends.forEach(trend => {
                const quality = data.quality_over_time?.find(q => q.date === trend.date)?.avg_quality || '';
                csv += `${trend.date},${trend.avg_hours},${quality}\n`;
            });
        }
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sleep-report-${dateFrom}-to-${dateTo}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const selectedResident = React.useMemo(() => {
        if (!residentId) return null;
        return residents.find(r => String(r.id) === String(residentId)) ?? null;
    }, [residentId, residents]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading sleep charts...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PrintableReportLayout
            title="Sleep Analytics Dashboard"
            subtitle={`${dateFrom} to ${dateTo}`}
            resident={selectedResident}
        >
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <Moon className="h-8 w-8 text-[var(--theme-primary)]" />
                                    Sleep Analytics Dashboard
                                </h1>
                                <p className="mt-2 text-gray-600">Comprehensive sleep data analysis and insights</p>
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
                        Resident (Optional)
                                </label>
                                <select
                        value={residentId}
                        onChange={(e) => setResidentId(e.target.value)}
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
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Records</p>
                                    <p className="text-3xl font-bold text-gray-900">{(data?.total_records ?? 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <BarChart3 className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Avg Sleep Hours</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {data?.avg_sleep_hours != null ? parseFloat(data.avg_sleep_hours).toFixed(1) : '0.0'}h
                                    </p>
                                </div>
                                <div className="bg-indigo-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Moon className="w-6 h-6 text-indigo-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Avg Quality</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {data?.avg_quality != null ? parseFloat(data.avg_quality).toFixed(1) : '0.0'}/10
                                    </p>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Star className="w-6 h-6 text-yellow-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-purple-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Hours</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {data?.total_sleep_hours != null ? parseFloat(data.total_sleep_hours).toFixed(1) : '0.0'}h
                                    </p>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Timer className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Sleep Duration Trends */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <LineChartIcon className="h-5 w-5 text-[var(--theme-primary)]" />
                                Sleep Duration Trends
                            </h2>
                        </div>
                        <div className="h-80">
                            {data?.sleep_duration_trends?.length ? (
                                <Line
                        data={{
                            labels: data.sleep_duration_trends.map(t => t.date),
                            datasets: [{
                                label: 'Avg Hours',
                                data: data.sleep_duration_trends.map(t => t.avg_hours),
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
                            ) : (
                                <div className="h-80 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                            <p>No data available</p>
                        </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sleep Quality Over Time */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-amber-600" />
                                Sleep Quality Over Time
                            </h2>
                        </div>
                        <div className="h-80">
                            {data?.quality_over_time?.length ? (
                                <Line
                        data={{
                            labels: data.quality_over_time.map(q => q.date),
                            datasets: [{
                                label: 'Avg Quality',
                                data: data.quality_over_time.map(q => q.avg_quality),
                                borderColor: colors.warning,
                                backgroundColor: colors.warning + '20',
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
                                    max: 10,
                                    title: {
                                        display: true,
                                        text: 'Quality (1-10)'
                                    }
                                }
                            }
                        }}
                                />
                            ) : (
                                <div className="h-80 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                            <p>No data available</p>
                        </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quality Distribution */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-blue-600" />
                                Sleep Quality Distribution
                            </h2>
                        </div>
                        <div className="h-80">
                            {data?.quality_distribution?.length ? (
                                <Bar
                        data={{
                            labels: data.quality_distribution.map(q => `Quality ${q.quality}`),
                            datasets: [{
                                label: 'Count',
                                data: data.quality_distribution.map(q => q.count),
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

                    {/* Weekly Average */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-purple-600" />
                                Weekly Average by Day
                            </h2>
                        </div>
                        <div className="h-80">
                            {data?.weekly_average?.length ? (
                                <Bar
                        data={{
                            labels: data.weekly_average.map(w => w.day),
                            datasets: [{
                                label: 'Avg Hours',
                                data: data.weekly_average.map(w => w.avg_hours),
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
                            ) : (
                                <div className="h-80 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-2" />
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
