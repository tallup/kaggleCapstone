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
    PieChart
} from 'lucide-react';
import { getLocalDateString } from '../../utils/pacificTime';

export default function SleepCharts() {
    const [dateFrom, setDateFrom] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => getLocalDateString());
    const [residentId, setResidentId] = useState('');
    const [residents, setResidents] = useState([]);

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

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#25603E]"></div>
                        <p className="mt-4 text-gray-600">Loading sleep charts...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <Moon className="h-8 w-8 text-[#25603E]" />
                                Sleep Analytics Dashboard
                            </h1>
                            <p className="mt-2 text-gray-600">Comprehensive sleep data analysis and insights</p>
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

                    {/* Filters */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Calendar className="inline h-4 w-4 mr-1" />
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
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
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#25603E] focus:border-transparent"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Total Records</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{data?.total_records || 0}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <Activity className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Avg Sleep Hours</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {data?.avg_sleep_hours ? parseFloat(data.avg_sleep_hours).toFixed(1) : '0.0'}h
                                </p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg">
                                <Clock className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Avg Quality</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {data?.avg_quality ? parseFloat(data.avg_quality).toFixed(1) : '0.0'}/10
                                </p>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-lg">
                                <TrendingUp className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Min Hours</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {data?.min_sleep_hours ? parseFloat(data.min_sleep_hours).toFixed(1) : '0.0'}h
                                </p>
                            </div>
                            <div className="p-3 bg-red-50 rounded-lg">
                                <BarChart3 className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Max Hours</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {data?.max_sleep_hours ? parseFloat(data.max_sleep_hours).toFixed(1) : '0.0'}h
                                </p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                                <BarChart3 className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Total Hours</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">
                                    {data?.total_sleep_hours ? parseFloat(data.total_sleep_hours).toFixed(1) : '0.0'}h
                                </p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-lg">
                                <Moon className="h-6 w-6 text-purple-600" />
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
                                <LineChartIcon className="h-5 w-5 text-[#25603E]" />
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
    );
}
