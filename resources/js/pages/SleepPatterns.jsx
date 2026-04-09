import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import logger from '../utils/logger';
import { BarChart3, LineChart, Grid, Download, Edit, Moon, Calendar, User, Filter, HelpCircle, Eye, TrendingUp, List } from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import CalendarComponent from '../components/ui/Calendar';
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
import EmptyState from '../components/ui/EmptyState';

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

/** Coerce API values to arrays (objects like {} are truthy but break .map). */
function ensureArray(value) {
    if (Array.isArray(value)) {
        return value;
    }
    if (value === null || value === undefined) {
        return [];
    }
    if (typeof value === 'object') {
        return Object.keys(value).length ? Object.values(value) : [];
    }
    return [];
}

export default function SleepPatterns() {
    const navigate = useNavigate();
    const [branchId, setBranchId] = useState('');
    const [residentId, setResidentId] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [chartType, setChartType] = useState('bar'); // 'bar', 'line', 'heatmap'
    const [groupBy, setGroupBy] = useState('day');
    const [showPreview, setShowPreview] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [isCaregiver, setIsCaregiver] = useState(false);
    const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false); // Hidden by default
    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/user');
                const user = response.data;
                setCurrentUser(user);

                const roles = [];
                if (user?.role) {
                    roles.push(String(user.role).toLowerCase());
                }
                if (Array.isArray(user?.roles)) {
                    user.roles.forEach((roleItem) => {
                        if (typeof roleItem === 'string') {
                            roles.push(roleItem.toLowerCase());
                        } else if (roleItem?.name) {
                            roles.push(String(roleItem.name).toLowerCase());
                        }
                    });
                }

                const derivedCaregiver =
                    roles.some((role) => role && role.replace(/[\s_-]+/g, '') === 'caregiver');

                setIsCaregiver(derivedCaregiver);

                if (derivedCaregiver && user?.assigned_branch_id) {
                    setBranchId((prev) => prev || String(user.assigned_branch_id));
                }
            } catch (err) {
                logger.error('Failed to fetch current user:', err);
            }
        };

        fetchUser();
    }, []);


    // Fetch branches
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 100 } });
            const branches = response.data?.data || response.data || [];
            return branches.filter(b => b.is_active !== false);
        },
    });

    const availableBranches = React.useMemo(() => {
        if (!branchesData) {
            return [];
        }

        if (isCaregiver) {
            const assignedBranchId = currentUser?.assigned_branch_id;
            if (assignedBranchId) {
                return branchesData.filter((branch) => Number(branch.id) === Number(assignedBranchId));
            }
            // If caregiver has no assigned branch, show empty list
            return [];
        }

        return branchesData;
    }, [branchesData, isCaregiver, currentUser?.assigned_branch_id]);

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

    React.useEffect(() => {
        if (isCaregiver && currentUser?.assigned_branch_id) {
            setBranchId((prev) => prev || String(currentUser.assigned_branch_id));
        }
    }, [isCaregiver, currentUser?.assigned_branch_id]);

    React.useEffect(() => {
        if (branchId && !residentId && residentsData?.data?.length) {
            setResidentId(String(residentsData.data[0].id));
        }
    }, [branchId, residentId, residentsData]);

    // Fetch sleep pattern data
    const { data: patternData, isLoading, error } = useQuery({
        queryKey: ['sleep-pattern', residentId, month, year, selectedCalendarDate],
        queryFn: async () => {
            try {
                const response = await api.get('/sleep-patterns', {
                    params: {
                        resident_id: residentId,
                        month: month,
                        year: year,
                    }
                });
                const raw = response.data ?? {};
                return {
                    ...raw,
                    pattern: raw?.pattern ?? null,
                    daily_data: ensureArray(raw?.daily_data),
                    hourly_distribution: ensureArray(raw?.hourly_distribution),
                    key_observations: ensureArray(raw?.key_observations),
                    weekly_summary: ensureArray(raw?.weekly_summary),
                };
            } catch (err) {
                logger.error('Sleep Pattern API Error:', err);
                const message = err.response?.status === 403
                    ? err.response?.data?.message || 'You do not have access to this resident.'
                    : err.response?.data?.message || err.message || 'Unable to load sleep pattern data.';
                throw new Error(message);
            }
        },
        enabled: !!residentId && !!month && !!year,
        retry: false,
    });

    // Process sleep pattern data for calendar heatmap
    const calendarData = useMemo(() => {
        if (!patternData?.daily_data) return [];

        const dateMap = new Map();

        patternData.daily_data.forEach((day) => {
            const date = new Date(year, month - 1, day.day);
            const dateStr = date.toISOString().split('T')[0];

            const sleepHours = Number(day.sleep_hours) || 0;
            
            // Create heatmap intensity based on sleep hours (0-24 hours)
            // More sleep = darker purple color
            const intensity = Math.min(sleepHours / 12, 1); // Normalize to 0-1 (12 hours = max intensity)

            dateMap.set(dateStr, {
                date: dateStr,
                indicators: [{
                    type: 'sleep_hours',
                    color: 'bg-purple-500',
                    hours: sleepHours,
                }],
                count: 1,
                backgroundColor: intensity >= 0.8 ? 'bg-purple-200' : intensity >= 0.5 ? 'bg-purple-100' : 'bg-purple-50',
                sleepHours: sleepHours,
            });
        });

        return Array.from(dateMap.values());
    }, [patternData, year, month]);

    const handleCalendarDateSelect = (dateStr) => {
        setSelectedCalendarDate(dateStr);
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

    // Helper function to safely convert to number
    const toNumber = (value) => {
        if (value === null || value === undefined) return 0;
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        return isNaN(num) ? 0 : num;
    };

    // Handle Edit Sleep Data
    const handleEditSleepData = () => {
        if (residentId) {
            navigate(`/sleep?resident=${residentId}&month=${month}&year=${year}`);
        } else {
            navigate('/sleep');
        }
    };

    // Handle Download Sleep Data
    const handleDownloadSleepData = () => {
        if (!patternData || !patternData.daily_data || patternData.daily_data.length === 0) {
            alert('No sleep data available to download');
            return;
        }

        const selectedResident = residentsData?.data?.find(r => r.id == residentId);
        const residentName = selectedResident 
            ? `${selectedResident.first_name}_${selectedResident.last_name}`.replace(/\s+/g, '_')
            : 'Unknown';
        
        const fileName = `sleep_data_${residentName}_${months[month - 1]}_${year}.csv`;
        
        // Prepare CSV content
        const headers = ['Date', 'Sleep Hours', 'Awake Hours', 'Total Hours'];
        const rows = patternData.daily_data.map(d => {
            const date = new Date(year, month - 1, d.day);
            return [
                date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                toNumber(d.sleep_hours).toFixed(2),
                toNumber(d.awake_hours).toFixed(2),
                '24.00'
            ];
        });

        // Add summary row
        const totalSleep = patternData.daily_data.reduce((sum, d) => sum + toNumber(d.sleep_hours), 0);
        const totalAwake = patternData.daily_data.reduce((sum, d) => sum + toNumber(d.awake_hours), 0);
        const avgSleep = patternData.daily_data.length > 0 ? totalSleep / patternData.daily_data.length : 0;

        // Create CSV content
        let csvContent = headers.join(',') + '\n';
        rows.forEach(row => {
            csvContent += row.join(',') + '\n';
        });
        csvContent += '\n';
        csvContent += 'Summary\n';
        csvContent += `Total Sleep Hours,${totalSleep.toFixed(2)}\n`;
        csvContent += `Total Awake Hours,${totalAwake.toFixed(2)}\n`;
        csvContent += `Average Sleep Hours/Day,${avgSleep.toFixed(2)}\n`;
        csvContent += `Days With Records,${patternData.daily_data.length}\n`;

        // Download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handle Show Preview
    const handleShowPreview = () => {
        setShowPreview(!showPreview);
    };

    // Prepare chart data based on groupBy
    const chartData = React.useMemo(() => {
        if (!patternData?.daily_data || patternData.daily_data.length === 0) {
            return null;
        }

        let processedData = patternData.daily_data;

        // Group by week if selected
        if (groupBy === 'week') {
            const weeklyData = {};
            patternData.daily_data.forEach(d => {
                const date = new Date(year, month - 1, d.day);
                const weekNum = Math.ceil(d.day / 7);
                const weekKey = `Week ${weekNum}`;
                
                if (!weeklyData[weekKey]) {
                    weeklyData[weekKey] = { sleepHours: 0, awakeHours: 0, days: 0 };
                }
                weeklyData[weekKey].sleepHours += toNumber(d.sleep_hours);
                weeklyData[weekKey].awakeHours += toNumber(d.awake_hours);
                weeklyData[weekKey].days += 1;
            });

            processedData = Object.keys(weeklyData).map(week => ({
                label: week,
                sleep_hours: weeklyData[week].sleepHours / weeklyData[week].days,
                awake_hours: weeklyData[week].awakeHours / weeklyData[week].days,
            }));
        }

        const labels = processedData.map(d => d.label || d.day);
        const sleepHours = processedData.map(d => toNumber(d.sleep_hours));
        const awakeHours = processedData.map(d => toNumber(d.awake_hours));

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

    // Hourly distribution chart - Removed due to incorrect data

    const selectedResident = residentsData?.data?.find(r => r.id == residentId);

    return (
        <div>
            <SectionCard>
                <h1 className="text-3xl font-bold text-[var(--theme-primary)] mb-6">Sleep Pattern Management</h1>
                
                <div className="mb-6">
                    {/* Filters Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div />
                            <button
                                onClick={() => setShowCalendar(!showCalendar)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                                {showCalendar ? (
                                    <>
                                        <List className="w-4 h-4" />
                                        Hide Calendar
                                    </>
                                ) : (
                                    <>
                                        <Grid className="w-4 h-4" />
                                        Show Calendar
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Branch</label>
                        <div className="relative">
                            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={branchId}
                                onChange={(e) => {
                                    const nextBranchId = e.target.value;
                                    setBranchId(nextBranchId);
                                    setResidentId(''); // Reset resident when branch changes
                                }}
                                disabled={isCaregiver && availableBranches.length <= 1}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                {!isCaregiver && <option value="">Select a branch</option>}
                                {availableBranches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {isCaregiver && !currentUser?.assigned_branch_id && (
                            <p className="mt-2 text-xs text-red-600">
                                Your account is not linked to a branch. Please contact an administrator.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Resident</label>
                        <div className="relative">
                            <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <select
                                value={residentId}
                                onChange={(e) => setResidentId(e.target.value)}
                                disabled={!branchId}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
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
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
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
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                    </div>

                    {/* Calendar Widget - Hidden by default, shows below filters */}
                    {showCalendar && (
                        <div className="mt-6">
                            <CalendarComponent
                                selectedDate={selectedCalendarDate}
                                onDateSelect={handleCalendarDateSelect}
                                calendarData={calendarData}
                                showIndicators={true}
                            />
                            {selectedCalendarDate && (
                                <button
                                    onClick={() => setSelectedCalendarDate(null)}
                                    className="mt-2 w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Clear Date Filter
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Empty State */}
                {!residentId && (
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <EmptyState
                            icon={HelpCircle}
                            title="Select a resident"
                            description="Select a branch and resident to view sleep patterns"
                        />
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
                                            ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
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
                                            ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
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
                                            ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <Grid className="w-4 h-4" />
                                    Hourly Heatmap
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleEditSleepData}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Sleep Data
                                </button>
                                <button 
                                    onClick={handleDownloadSleepData}
                                    disabled={!patternData?.daily_data || patternData.daily_data.length === 0}
                                    className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Download className="w-4 h-4" />
                                    Download Sleep Data
                                </button>
                            </div>
                        </div>

                        {/* Sleep Pattern Preview */}
                        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Sleep Pattern Preview</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-gray-700">Group by:</label>
                                        <select
                                            value={groupBy}
                                            onChange={(e) => {
                                                setGroupBy(e.target.value);
                                                setShowPreview(false); // Reset preview when grouping changes
                                            }}
                                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                        >
                                            <option value="day">Day</option>
                                            <option value="week">Week</option>
                                        </select>
                                    </div>
                                    <button 
                                        onClick={handleShowPreview}
                                        disabled={!patternData?.daily_data || patternData.daily_data.length === 0}
                                        className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                                            showPreview 
                                                ? 'bg-purple-700 text-white' 
                                                : 'bg-purple-600 text-white hover:bg-purple-700'
                                        }`}
                                    >
                                        <Eye className="w-4 h-4" />
                                        {showPreview ? 'Hide Preview' : 'Show Preview'}
                                    </button>
                                </div>
                            </div>
                            
                            {/* Preview Content */}
                            {showPreview && patternData?.daily_data && patternData.daily_data.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    {groupBy === 'day' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                            {patternData.daily_data.slice(0, 8).map((day, idx) => {
                                                const date = new Date(year, month - 1, day.day);
                                                return (
                                                    <div key={idx} className="bg-gray-50 rounded-lg p-3">
                                                        <div className="text-xs font-semibold text-gray-700">
                                                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </div>
                                                        <div className="text-lg font-bold text-purple-600 mt-1">
                                                            {toNumber(day.sleep_hours).toFixed(1)}h
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Sleep / {toNumber(day.awake_hours).toFixed(1)}h Awake
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                            {(() => {
                                                const weeklyData = {};
                                                patternData.daily_data.forEach(d => {
                                                    const weekNum = Math.ceil(d.day / 7);
                                                    const weekKey = `Week ${weekNum}`;
                                                    
                                                    if (!weeklyData[weekKey]) {
                                                        weeklyData[weekKey] = { sleepHours: 0, awakeHours: 0, days: 0 };
                                                    }
                                                    weeklyData[weekKey].sleepHours += toNumber(d.sleep_hours);
                                                    weeklyData[weekKey].awakeHours += toNumber(d.awake_hours);
                                                    weeklyData[weekKey].days += 1;
                                                });

                                                return Object.keys(weeklyData).map((week, idx) => {
                                                    const avgSleep = weeklyData[week].sleepHours / weeklyData[week].days;
                                                    const avgAwake = weeklyData[week].awakeHours / weeklyData[week].days;
                                                    return (
                                                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                                                            <div className="text-xs font-semibold text-gray-700">{week}</div>
                                                            <div className="text-lg font-bold text-purple-600 mt-1">
                                                                {avgSleep.toFixed(1)}h
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                Avg Sleep / {avgAwake.toFixed(1)}h Avg Awake
                                                            </div>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {isLoading ? (
                            <div className="text-center py-12">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
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
                        ) : patternData && (patternData.daily_data && patternData.daily_data.length > 0) ? (
                            <>
                                {/* Main Chart */}
                                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
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
                                            <HourlyHeatmap data={ensureArray(patternData.hourly_distribution)} />
                                        )}
                                    </div>
                                </div>

                                {/* Monthly Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white rounded-xl shadow-sm p-6">
                                        <p className="text-sm text-gray-600 mb-1">Total Awake Hours</p>
                                        <p className="text-3xl font-bold text-blue-600">
                                            {patternData.pattern?.total_awake_hours ?? 
                                                (patternData.daily_data ? toNumber(patternData.daily_data.reduce((sum, d) => sum + toNumber(d.awake_hours), 0)).toFixed(1) : 0)}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm p-6">
                                        <p className="text-sm text-gray-600 mb-1">Total Sleep Hours</p>
                                        <p className="text-3xl font-bold text-purple-600">
                                            {patternData.pattern?.total_sleep_hours ?? 
                                                (patternData.daily_data ? toNumber(patternData.daily_data.reduce((sum, d) => sum + toNumber(d.sleep_hours), 0)).toFixed(1) : 0)}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm p-6">
                                        <p className="text-sm text-gray-600 mb-1">Avg. Sleep Hours / Day</p>
                                        <p className="text-3xl font-bold text-green-600">
                                            {patternData.pattern?.avg_sleep_hours ?? 
                                                (patternData.daily_data && patternData.daily_data.length > 0 
                                                    ? toNumber(patternData.daily_data.reduce((sum, d) => sum + toNumber(d.sleep_hours), 0) / patternData.daily_data.length).toFixed(1) 
                                                    : 0)}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-xl shadow-sm p-6">
                                        <p className="text-sm text-gray-600 mb-1">Days With Records</p>
                                        <p className="text-3xl font-bold text-gray-900">
                                            {patternData.pattern?.days_with_records ?? 
                                                (patternData.daily_data ? patternData.daily_data.length : 0)}
                                        </p>
                                    </div>
                                </div>

                                {/* Sleep Quality Indicators */}
                                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sleep Quality Indicators</h3>
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-gray-700">Healthy sleep pattern</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {toNumber(patternData.pattern?.avg_sleep_hours ?? 
                                                    (patternData.daily_data && patternData.daily_data.length > 0 
                                                        ? (patternData.daily_data.reduce((sum, d) => sum + toNumber(d.sleep_hours), 0) / patternData.daily_data.length) 
                                                        : 0)).toFixed(1)} hrs
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-3">
                                            <div
                                                className="bg-green-600 h-3 rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(toNumber(patternData.pattern?.avg_sleep_hours ?? 
                                                        (patternData.daily_data && patternData.daily_data.length > 0 
                                                            ? (patternData.daily_data.reduce((sum, d) => sum + toNumber(d.sleep_hours), 0) / patternData.daily_data.length) 
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
                                                    ? toNumber(Math.max(...patternData.daily_data.map(d => toNumber(d.sleep_hours)))).toFixed(1)
                                                    : '0'} hrs
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Least Sleep</p>
                                            <p className="text-xl font-bold text-purple-600">
                                                {patternData.daily_data && patternData.daily_data.length > 0
                                                    ? toNumber(Math.min(...patternData.daily_data.map(d => toNumber(d.sleep_hours)))).toFixed(1)
                                                    : '0'} hrs
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Pattern Analysis */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white rounded-xl shadow-sm p-6">
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
                                    <div className="bg-white rounded-xl shadow-sm p-6">
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
                                    <div className="bg-white rounded-xl shadow-sm p-6">
                                        <p className="text-sm text-gray-600 mb-2">Sleep Quality</p>
                                        <p className="text-2xl font-bold text-purple-600">
                                            {patternData.pattern?.sleep_quality_score || 'N/A'}
                                            {patternData.pattern?.sleep_quality_score && '/100'}
                                        </p>
                                    </div>
                                </div>

                                {/* Key Observations */}
                                {patternData.key_observations && patternData.key_observations.length > 0 && (
                                    <div className="bg-white rounded-xl shadow-sm p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Observations</h3>
                                        <ul className="space-y-2">
                                            {patternData.key_observations.map((obs, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-gray-700">
                                                    <TrendingUp className="w-5 h-5 text-[var(--theme-primary)] mt-0.5 flex-shrink-0" />
                                                    <span>{obs}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        ) : residentId && !isLoading && patternData && (!patternData.daily_data || patternData.daily_data.length === 0) ? (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <EmptyState
                                    icon={Moon}
                                    title="No sleep data found"
                                    description={`No sleep records found for ${selectedResident?.first_name} ${selectedResident?.last_name} in ${months[month - 1]} ${year}`}
                                />
                            </div>
                        ) : residentId && !isLoading && !patternData ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                                <p className="text-yellow-700 font-semibold mb-2">No data available</p>
                                <p className="text-yellow-600 text-sm">Please check the browser console for errors.</p>
                            </div>
                        ) : null}
                    </>
                )}
            </SectionCard>
        </div>
    );
}

// Hourly Heatmap Component
function HourlyHeatmap({ data }) {
    const rows = ensureArray(data);

    if (rows.length === 0) {
        return (
            <div className="text-center py-20 text-gray-500">
                No hourly distribution data available
            </div>
        );
    }

    // Helper function to safely convert to number
    const toNumber = (value) => {
        if (value === null || value === undefined) return 0;
        const num = typeof value === 'string' ? parseFloat(value) : Number(value);
        return isNaN(num) ? 0 : num;
    };

    // Get the maximum percentage for color scaling
    const percentages = rows.map(d => toNumber(d.percentage));
    const maxPercentage = Math.max(...percentages, 1);

    // Function to get color intensity based on percentage
    const getColor = (percentage) => {
        const numPercentage = toNumber(percentage);
        const intensity = Math.min(numPercentage / maxPercentage, 1);
        // Use purple gradient from light to dark
        const opacity = 0.3 + (intensity * 0.7); // Range from 0.3 to 1.0
        return `rgba(147, 51, 234, ${opacity})`;
    };

    // Function to get text color based on background
    const getTextColor = (percentage) => {
        const numPercentage = toNumber(percentage);
        const intensity = numPercentage / maxPercentage;
        return intensity > 0.5 ? 'text-white' : 'text-gray-700';
    };

    // Format hour for display (12-hour format with AM/PM)
    const formatHour = (hour) => {
        const hourNum = parseInt(hour) || 0;
        if (hourNum === 0) return '12 AM';
        if (hourNum < 12) return `${hourNum} AM`;
        if (hourNum === 12) return '12 PM';
        return `${hourNum - 12} PM`;
    };

    // Group hours into time periods for better visualization
    const timePeriods = [
        { label: 'Night (12 AM - 6 AM)', hours: [0, 1, 2, 3, 4, 5] },
        { label: 'Morning (6 AM - 12 PM)', hours: [6, 7, 8, 9, 10, 11] },
        { label: 'Afternoon (12 PM - 6 PM)', hours: [12, 13, 14, 15, 16, 17] },
        { label: 'Evening (6 PM - 12 AM)', hours: [18, 19, 20, 21, 22, 23] },
    ];

    return (
        <div className="w-full">
            {/* Color Legend */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Less Sleep</span>
                    <div className="flex gap-1">
                        {[0, 0.25, 0.5, 0.75, 1].map((val) => (
                            <div
                                key={val}
                                className="w-8 h-6 rounded"
                                style={{
                                    backgroundColor: `rgba(147, 51, 234, ${0.3 + (val * 0.7)})`,
                                }}
                            />
                        ))}
                    </div>
                    <span className="text-sm text-gray-600">More Sleep</span>
                </div>
            </div>

            {/* Heatmap Grid */}
            <div className="grid grid-cols-12 gap-2 mb-6">
                {rows.map((item, index) => {
                    const hour = parseInt(item.hour) || 0;
                    const percentage = toNumber(item.percentage);
                    const isNewPeriod = hour % 6 === 0;

                    return (
                        <div key={index} className="relative">
                            {/* Period Labels */}
                            {isNewPeriod && (
                                <div className="absolute -top-6 left-0 right-0 text-xs text-gray-500 text-center font-medium">
                                    {formatHour(item.hour)}
                                </div>
                            )}
                            
                            {/* Heatmap Cell */}
                            <div
                                className="rounded-lg p-3 text-center transition-all hover:scale-105 cursor-pointer border border-gray-200"
                                style={{
                                    backgroundColor: getColor(percentage),
                                }}
                                title={`${formatHour(item.hour)}: ${percentage.toFixed(1)}% sleep`}
                            >
                                <div className={`text-xs font-semibold ${getTextColor(percentage)}`}>
                                    {percentage.toFixed(0)}%
                                </div>
                                <div className={`text-[10px] ${getTextColor(percentage)} opacity-75 mt-1`}>
                                    {formatHour(item.hour)}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Time Period Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {timePeriods.map((period) => {
                    const periodData = rows.filter(item => {
                        const hour = parseInt(item.hour) || 0;
                        return period.hours.includes(hour);
                    });
                    const avgPercentage = periodData.length > 0
                        ? periodData.reduce((sum, item) => sum + toNumber(item.percentage), 0) / periodData.length
                        : 0;

                    return (
                        <div key={period.label} className="bg-gray-50 rounded-lg p-4">
                            <div className="text-xs text-gray-600 mb-1">{period.label}</div>
                            <div className="text-lg font-bold text-purple-600">
                                {avgPercentage.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-500">Avg. Sleep</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

