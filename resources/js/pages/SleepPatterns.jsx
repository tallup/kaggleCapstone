import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { BarChart3, LineChart, Grid, Download, Edit, Moon, Calendar, User, Filter, HelpCircle, Eye, TrendingUp } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import SectionCard from '../components/SectionCard';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function SleepPatterns() {
    const [branchId, setBranchId] = useState('');
    const [residentId, setResidentId] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [chartType, setChartType] = useState('bar'); // 'bar', 'line', 'heatmap'
    const [groupBy, setGroupBy] = useState('day');

    // Fetch branches
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 100 } });
            const branches = response.data?.data || response.data || [];
            return branches.filter(b => b.is_active !== false);
        },
    });

    // Fetch residents filtered by branch
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list', branchId],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (branchId) {
                params.branch_id = branchId;
            }
            const response = await api.get('/residents', { params });
            return response.data;
        },
        enabled: true,
    });

    // Fetch sleep pattern data
    const { data: patternData, isLoading, error } = useQuery({
        queryKey: ['sleep-pattern', residentId, month, year],
        queryFn: async () => {
            try {
                const response = await api.get('/sleep-patterns', {
                    params: {
                        resident_id: residentId,
                        month: month,
                        year: year,
                    }
                });
                console.log('Sleep Pattern API Response:', response.data);
                return response.data;
            } catch (err) {
                console.error('Sleep Pattern API Error:', err);
                console.error('Error details:', err.response?.data);
                throw err;
            }
        },
        enabled: !!residentId && !!month && !!year,
    });

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

    // Prepare chart data
    const chartData = React.useMemo(() => {
        if (!patternData?.daily_data || patternData.daily_data.length === 0) {
            return null;
        }

        const labels = patternData.daily_data.map(d => d.day);
        const sleepHours = patternData.daily_data.map(d => d.sleep_hours);
        const awakeHours = patternData.daily_data.map(d => d.awake_hours);

        return {
            labels,
            datasets: [
                {
                    label: 'Awake Hours',
                    data: awakeHours,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                },
                {
                    label: 'Sleep Hours',
                    data: sleepHours,
                    backgroundColor: 'rgba(147, 51, 234, 0.8)',
                    borderColor: 'rgba(147, 51, 234, 1)',
                    borderWidth: 1,
                },
            ],
        };
    }, [patternData]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 24,
                title: {
                    display: true,
                    text: 'Hours',
                },
            },
            x: {
                title: {
                    display: true,
                    text: 'Day of Month',
                },
            },
        },
    };

    // Hourly distribution chart
    const hourlyChartData = React.useMemo(() => {
        if (!patternData?.hourly_distribution || patternData.hourly_distribution.length === 0) {
            return null;
        }

        const labels = patternData.hourly_distribution.map(h => h.hour);
        const percentages = patternData.hourly_distribution.map(h => h.percentage);

        return {
            labels,
            datasets: [
                {
                    label: 'Sleep Distribution (%)',
                    data: percentages,
                    backgroundColor: 'rgba(147, 51, 234, 0.8)',
                    borderColor: 'rgba(147, 51, 234, 1)',
                    borderWidth: 1,
                },
            ],
        };
    }, [patternData]);

    const hourlyChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                title: {
                    display: true,
                    text: 'Percentage (%)',
                },
            },
        },
    };

    const selectedResident = residentsData?.data?.find(r => r.id == residentId);

    return (
        <div>
            <SectionCard>
                <h1 className="text-3xl font-bold text-[#2D5016] mb-6">Sleep Pattern Management</h1>
                
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Branch</label>
                        <div className="relative">
                            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={branchId}
                                onChange={(e) => {
                                    setBranchId(e.target.value);
                                    setResidentId(''); // Reset resident when branch changes
                                }}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent appearance-none bg-white"
                            >
                                <option value="">Select a branch</option>
                                {(branchesData || []).map(branch => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Resident</label>
                        <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={residentId}
                                onChange={(e) => setResidentId(e.target.value)}
                                disabled={!branchId}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="">Select a resident</option>
                                {(residentsData?.data || []).map(resident => (
                                    <option key={resident.id} value={resident.id}>
                                        {resident.first_name} {resident.last_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                        <div className="relative">
                            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent appearance-none bg-white"
                            >
                                {months.map((m, idx) => (
                                    <option key={idx + 1} value={idx + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                        <div className="relative">
                            <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2D5016] focus:border-transparent appearance-none bg-white"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Empty State */}
                {!residentId && (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-700 text-lg font-semibold mb-2">Select a resident</p>
                        <p className="text-gray-500">Select a branch and resident to view sleep patterns</p>
                    </div>
                )}

                {/* Sleep Pattern Data */}
                {residentId && (
                    <>
                        {/* Chart Type Selector */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setChartType('bar')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                        chartType === 'bar'
                                            ? 'bg-[#2D5016] text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    Bar Chart
                                </button>
                                <button
                                    onClick={() => setChartType('line')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                        chartType === 'line'
                                            ? 'bg-[#2D5016] text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <LineChart className="w-4 h-4" />
                                    Line Chart
                                </button>
                                <button
                                    onClick={() => setChartType('heatmap')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                        chartType === 'heatmap'
                                            ? 'bg-[#2D5016] text-white'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <Grid className="w-4 h-4" />
                                    Hourly Heatmap
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                                    <Edit className="w-4 h-4" />
                                    Edit Sleep Data
                                </button>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                                    <Download className="w-4 h-4" />
                                    Download Sleep Data
                                </button>
                            </div>
                        </div>

                        {/* Sleep Pattern Preview */}
                        <div className="bg-white rounded-lg shadow p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Sleep Pattern Preview</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-700">Group by:</label>
                                        <select
                                            value={groupBy}
                                            onChange={(e) => setGroupBy(e.target.value)}
                                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#2D5016] focus:border-transparent"
                                        >
                                            <option value="day">Day</option>
                                            <option value="week">Week</option>
                                        </select>
                                    </div>
                                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm">
                                        <Eye className="w-4 h-4" />
                                        Show Preview
                                    </button>
                                </div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2D5016]"></div>
                                <p className="mt-4 text-gray-600">Loading sleep pattern data...</p>
                            </div>
                        ) : error ? (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                                <p className="text-red-700 font-semibold mb-2">Error loading sleep pattern data</p>
                                <p className="text-red-600 text-sm">{error.message || 'Unknown error occurred'}</p>
                                {error.response?.data && (
                                    <p className="text-red-500 text-xs mt-2">{JSON.stringify(error.response.data)}</p>
                                )}
                            </div>
                        ) : (patternData?.daily_data && patternData.daily_data.length > 0) ? (
                            <>
                                {/* Main Chart */}
                                <div className="bg-white rounded-lg shadow p-6 mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Sleep Patterns for {selectedResident?.first_name} {selectedResident?.last_name}
                                        </h3>
                                        <span className="text-gray-600">
                                            {months[month - 1]} {year}
                                        </span>
                                    </div>
                                    <div className="h-96">
                                        {chartData && chartType === 'bar' && (
                                            <Bar data={chartData} options={chartOptions} />
                                        )}
                                        {chartData && chartType === 'line' && (
                                            <Line data={chartData} options={chartOptions} />
                                        )}
                                        {chartType === 'heatmap' && (
                                            <div className="text-center py-20 text-gray-500">
                                                Hourly Heatmap visualization coming soon
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Monthly Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <p className="text-sm text-gray-600 mb-1">Total Awake Hours</p>
                                        <p className="text-3xl font-bold text-blue-600">
                                            {patternData.pattern?.total_awake_hours ?? 
                                                (patternData.daily_data ? patternData.daily_data.reduce((sum, d) => sum + d.awake_hours, 0).toFixed(1) : 0)}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <p className="text-sm text-gray-600 mb-1">Total Sleep Hours</p>
                                        <p className="text-3xl font-bold text-purple-600">
                                            {patternData.pattern?.total_sleep_hours ?? 
                                                (patternData.daily_data ? patternData.daily_data.reduce((sum, d) => sum + d.sleep_hours, 0).toFixed(1) : 0)}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <p className="text-sm text-gray-600 mb-1">Avg. Sleep Hours / Day</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            {patternData.pattern?.avg_sleep_hours ?? 
                                                (patternData.daily_data && patternData.daily_data.length > 0 
                                                    ? (patternData.daily_data.reduce((sum, d) => sum + d.sleep_hours, 0) / patternData.daily_data.length).toFixed(1) 
                                                    : 0)}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <p className="text-sm text-gray-600 mb-1">Days With Records</p>
                                        <p className="text-3xl font-bold text-gray-900">
                                            {patternData.pattern?.days_with_records ?? 
                                                (patternData.daily_data ? patternData.daily_data.length : 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Sleep Quality Indicators */}
                                <div className="bg-white rounded-lg shadow p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sleep Quality Indicators</h3>
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-700">Healthy sleep pattern</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {(patternData.pattern?.avg_sleep_hours ?? 
                                                    (patternData.daily_data && patternData.daily_data.length > 0 
                                                        ? (patternData.daily_data.reduce((sum, d) => sum + d.sleep_hours, 0) / patternData.daily_data.length) 
                                                        : 0)).toFixed(1)} hrs
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-green-600 h-3 rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min((patternData.pattern?.avg_sleep_hours ?? 
                                                        (patternData.daily_data && patternData.daily_data.length > 0 
                                                            ? (patternData.daily_data.reduce((sum, d) => sum + d.sleep_hours, 0) / patternData.daily_data.length) 
                                                            : 0)) / 10 * 100, 100)}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Most Sleep</p>
                                            <p className="text-xl font-bold text-purple-600">
                                                {patternData.daily_data && patternData.daily_data.length > 0
                                                    ? Math.max(...patternData.daily_data.map(d => d.sleep_hours)).toFixed(1)
                                                    : '0'} hrs
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Least Sleep</p>
                                            <p className="text-xl font-bold text-purple-600">
                                                {patternData.daily_data && patternData.daily_data.length > 0
                                                    ? Math.min(...patternData.daily_data.map(d => d.sleep_hours)).toFixed(1)
                                                    : '0'} hrs
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Pattern Analysis */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <p className="text-sm text-gray-600 mb-2">Common Sleep Time</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {patternData.pattern?.common_sleep_time 
                                                ? (() => {
                                                    const time = patternData.pattern.common_sleep_time;
                                                    if (typeof time === 'string') {
                                                        const [h, m] = time.split(':');
                                                        return `${h.padStart(2, '0')}:${m ? m.substring(0, 2) : '00'}`;
                                                    }
                                                    return 'N/A';
                                                })()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <p className="text-sm text-gray-600 mb-2">Common Wake Time</p>
                                        <p className="text-2xl font-bold text-orange-600">
                                            {patternData.pattern?.common_wake_time 
                                                ? (() => {
                                                    const time = patternData.pattern.common_wake_time;
                                                    if (typeof time === 'string') {
                                                        const [h, m] = time.split(':');
                                                        return `${h.padStart(2, '0')}:${m ? m.substring(0, 2) : '00'}`;
                                                    }
                                                    return 'N/A';
                                                })()
                                                : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <p className="text-sm text-gray-600 mb-2">Sleep Quality</p>
                                        <p className="text-2xl font-bold text-purple-600">
                                            {patternData.pattern?.sleep_quality_score || 'N/A'}
                                            {patternData.pattern?.sleep_quality_score && '/100'}
                                        </p>
                                    </div>
                                </div>

                                {/* Hourly Sleep Distribution */}
                                {hourlyChartData && (
                                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Sleep Distribution</h3>
                                        <div className="h-64">
                                            <Bar data={hourlyChartData} options={hourlyChartOptions} />
                                        </div>
                                    </div>
                                )}

                                {/* Key Observations */}
                                {patternData.key_observations && patternData.key_observations.length > 0 && (
                                    <div className="bg-white rounded-lg shadow p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Observations</h3>
                                        <ul className="space-y-2">
                                            {patternData.key_observations.map((obs, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-gray-700">
                                                    <TrendingUp className="w-5 h-5 text-[#2D5016] mt-0.5 flex-shrink-0" />
                                                    <span>{obs}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        ) : residentId && !isLoading && (
                            <div className="bg-white rounded-lg shadow p-12 text-center">
                                <Moon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-700 text-lg font-semibold mb-2">No sleep data found</p>
                                <p className="text-gray-500">No sleep records found for {selectedResident?.first_name} {selectedResident?.last_name} in {months[month - 1]} {year}</p>
                            </div>
                        )}
                    </>
                )}
            </SectionCard>
        </div>
    );
}

