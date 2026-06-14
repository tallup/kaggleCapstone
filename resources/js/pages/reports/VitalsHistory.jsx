import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Line, Bar } from 'react-chartjs-2';
import { defaultOptions, colors } from '../../utils/chartConfig';
import { 
    Calendar, 
    Activity, 
    RefreshCcw,
    Download,
    Filter,
    Heart,
    Thermometer,
    TrendingUp,
    LineChart as LineChartIcon,
    BarChart3
} from 'lucide-react';
import { getLocalDateString } from '../../utils/pacificTime';
import { usePreventDateInputReload } from '../../hooks/usePreventDateInputReload';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

export default function VitalsHistory() {
    const containerRef = usePreventDateInputReload();
    const [branchId, setBranchId] = useState(null);
    const [residentId, setResidentId] = useState(null);
    const [dateFrom, setDateFrom] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => getLocalDateString());
    const [residents, setResidents] = useState([]);
    const [branches, setBranches] = useState([]);

    React.useEffect(() => {
        api.get('/residents', { params: { per_page: 100, status: 'active' } })
            .then(res => setResidents(res.data?.data || []))
            .catch(() => {});
        api.get('/branches', { params: { per_page: 100 } })
            .then(res => setBranches(res.data?.data || []))
            .catch(() => {});
    }, []);

    const { data: vitalsData, isLoading, refetch } = useQuery({
        queryKey: ['vitals-history', dateFrom, dateTo, branchId, residentId],
        queryFn: async () => {
            const params = { 
                per_page: 1000,
                date_from: dateFrom,
                date_to: dateTo,
            };
            if (branchId) params.branch_id = branchId;
            if (residentId) params.resident_id = residentId;
            return (await api.get('/vitals', { params })).data;
        },
    });

    const chartData = React.useMemo(() => {
        if (!vitalsData?.data?.length) return null;

        const sorted = [...vitalsData.data].sort((a, b) => 
            new Date(a.measurement_date) - new Date(b.measurement_date)
        );

        return {
            labels: sorted.map(v => new Date(v.measurement_date).toLocaleDateString()),
            systolic: sorted.filter(v => v.systolic).map(v => v.systolic),
            diastolic: sorted.filter(v => v.diastolic).map(v => v.diastolic),
            temperature: sorted.filter(v => v.temperature).map(v => v.temperature),
            pulse: sorted.filter(v => v.pulse).map(v => v.pulse),
        };
    }, [vitalsData]);

    const handleExport = () => {
        if (!chartData) return;
        let csv = 'Date,Systolic,Diastolic,Temperature,Pulse\n';
        const maxLen = Math.max(
            chartData.labels.length,
            chartData.systolic.length,
            chartData.diastolic.length,
            chartData.temperature.length,
            chartData.pulse.length
        );
        for (let i = 0; i < maxLen; i++) {
            csv += `${chartData.labels[i] || ''},${chartData.systolic[i] || ''},${chartData.diastolic[i] || ''},${chartData.temperature[i] || ''},${chartData.pulse[i] || ''}\n`;
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vitals-history-${dateFrom}-to-${dateTo}.csv`;
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
            <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading vitals history...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PrintableReportLayout
            title="Vitals History"
            subtitle={reportSubtitle}
            resident={selectedResident}
        >
            <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <Activity className="h-8 w-8 text-red-600" />
                                    Vitals History
                                </h1>
                                <p className="mt-2 text-gray-600">Historical vital signs trends and analysis</p>
                            </div>
                        <div className="flex items-center gap-3 no-print">
                            <button
                                onClick={handleExport}
                                disabled={!chartData}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 no-print">
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

                {chartData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {chartData.systolic.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Heart className="h-5 w-5 text-red-600" />
                            Blood Pressure
                        </h2>
                                </div>
                                <div className="h-80">
                        <Line
                            data={{
                                labels: chartData.labels.slice(-30),
                                datasets: [
                                    {
                                        label: 'Systolic',
                                        data: chartData.systolic.slice(-30),
                                        borderColor: colors.danger,
                                        backgroundColor: colors.danger + '20',
                                        fill: false,
                                        tension: 0.4,
                                        pointRadius: 3,
                                        pointHoverRadius: 5,
                                    },
                                    {
                                        label: 'Diastolic',
                                        data: chartData.diastolic.slice(-30),
                                        borderColor: colors.info,
                                        backgroundColor: colors.info + '20',
                                        fill: false,
                                        tension: 0.4,
                                        pointRadius: 3,
                                        pointHoverRadius: 5,
                                    },
                                ],
                            }}
                            options={{
                                ...defaultOptions,
                                scales: {
                                    y: {
                                        beginAtZero: false,
                                        title: {
                                            display: true,
                                            text: 'mmHg'
                                        }
                                    }
                                }
                            }}
                        />
                                </div>
                            </div>
                        )}

                        {chartData.temperature.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <Thermometer className="h-5 w-5 text-orange-600" />
                            Temperature
                        </h2>
                                </div>
                                <div className="h-80">
                        <Bar
                            data={{
                                labels: chartData.labels.slice(-30),
                                datasets: [{
                                    label: 'Temperature (°F)',
                                    data: chartData.temperature.slice(-30),
                                    backgroundColor: colors.warning + '80',
                                    borderColor: colors.warning,
                                    borderWidth: 2,
                                }],
                            }}
                            options={{
                                ...defaultOptions,
                                scales: {
                                    y: {
                                        beginAtZero: false,
                                        title: {
                                            display: true,
                                            text: 'Temperature (°F)'
                                        }
                                    }
                                }
                            }}
                        />
                                </div>
                            </div>
                        )}

                        {chartData.pulse.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
                                <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            Heart Rate (Pulse)
                        </h2>
                                </div>
                                <div className="h-80">
                        <Line
                            data={{
                                labels: chartData.labels.slice(-30),
                                datasets: [{
                                    label: 'Pulse (bpm)',
                                    data: chartData.pulse.slice(-30),
                                    borderColor: colors.success,
                                    backgroundColor: colors.success + '20',
                                    fill: true,
                                    tension: 0.4,
                                    pointRadius: 3,
                                    pointHoverRadius: 5,
                                }],
                            }}
                            options={{
                                ...defaultOptions,
                                scales: {
                                    y: {
                                        beginAtZero: false,
                                        title: {
                                            display: true,
                                            text: 'Beats per Minute (bpm)'
                                        }
                                    }
                                }
                            }}
                        />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Vitals Data Available</h3>
                        <p className="text-gray-600">Try adjusting your date range or filters to see data</p>
                    </div>
                )}
            </div>
            </div>
        </PrintableReportLayout>
    );
}
