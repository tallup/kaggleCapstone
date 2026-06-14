import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Download, FileText, Calendar, RefreshCcw, Activity, Heart, Thermometer, Droplet, Filter } from 'lucide-react';
import { getLocalDateString } from '../../utils/pacificTime';
import { usePreventDateInputReload } from '../../hooks/usePreventDateInputReload';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

export default function VitalsReports() {
    const containerRef = usePreventDateInputReload();
    const [dateFrom, setDateFrom] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => getLocalDateString());
    const [residentId, setResidentId] = useState('');
    const [residents, setResidents] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 25;

    React.useEffect(() => {
        api.get('/residents', { params: { per_page: 100, status: 'active' } })
            .then(res => setResidents(res.data?.data || []))
            .catch(() => {});
    }, []);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['vitals-report', dateFrom, dateTo, residentId, currentPage],
        queryFn: async () => {
            const params = {
                date_from: dateFrom,
                date_to: dateTo,
                per_page: perPage,
                page: currentPage,
            };
            if (residentId) params.resident_id = residentId;
            return (await api.get('/vitals', { params })).data;
        },
    });

    const vitals = data?.data || [];
    const totalPages = data?.last_page || 1;

    const selectedResident = React.useMemo(() => {
        if (!residentId) return null;
        return residents.find(r => String(r.id) === String(residentId)) ?? null;
    }, [residentId, residents]);
    const stats = {
        total: data?.total || vitals.length,
        withBP: vitals.filter(v => v.systolic && v.diastolic).length,
        withTemp: vitals.filter(v => v.temperature).length,
        withPulse: vitals.filter(v => v.pulse).length,
        withO2: vitals.filter(v => v.oxygen_saturation).length,
    };

    const handleExport = () => {
        let csv = 'Date,Resident,BP Systolic,BP Diastolic,Temperature,Pulse,Oxygen Saturation,Notes\n';
        vitals.forEach(vital => {
            const resident = vital.resident ? `${vital.resident.first_name} ${vital.resident.last_name}` : 'Unknown';
            csv += `${vital.measurement_date},${resident},${vital.systolic || ''},${vital.diastolic || ''},${vital.temperature || ''},${vital.pulse || ''},${vital.oxygen_saturation || ''},"${(vital.notes || '').replace(/"/g, '""')}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vitals-report-${dateFrom}-to-${dateTo}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading vitals report...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PrintableReportLayout
            title="Vitals Reports"
            subtitle={`${dateFrom} to ${dateTo}`}
            resident={selectedResident}
        >
            <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-red-600" />
                                    Vitals Reports
                                </h1>
                                <p className="mt-2 text-gray-600">Detailed vital signs records and analysis</p>
                            </div>
                        <div className="flex items-center gap-3 no-print">
                            <button
                                onClick={handleExport}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                            >
                                <Download className="h-4 w-4" />
                                Export CSV
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
                            setCurrentPage(1);
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
                            setCurrentPage(1);
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
                        onChange={(e) => {
                            setResidentId(e.target.value);
                            setCurrentPage(1);
                        }}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-8">
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Records</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 to-red-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">With BP</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.withBP.toLocaleString()}</p>
                                </div>
                                <div className="bg-red-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Heart className="w-6 h-6 text-red-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-orange-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">With Temperature</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.withTemp.toLocaleString()}</p>
                                </div>
                                <div className="bg-orange-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Activity className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 to-green-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">With Pulse</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.withPulse.toLocaleString()}</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Activity className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 to-cyan-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">With O2 Sat</p>
                                    <p className="text-3xl font-bold text-gray-900">{stats.withO2.toLocaleString()}</p>
                                </div>
                                <div className="bg-cyan-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Droplet className="w-6 h-6 text-cyan-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">Vitals Data</h2>
                        <div className="text-sm text-gray-600 no-print">
                            Showing {((currentPage - 1) * perPage) + 1} - {Math.min(currentPage * perPage, stats.total)} of {stats.total}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resident</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Pressure</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pulse</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">O2 Saturation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {vitals.length > 0 ? (
                        vitals.map((vital) => (
                            <tr key={vital.id} className="hover:bg-gray-50 transition">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {new Date(vital.measurement_date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {vital.resident?.first_name} {vital.resident?.last_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {vital.systolic && vital.diastolic ? (
                                        <span className="inline-flex items-center gap-1">
                                            <Heart className="h-3 w-3 text-red-500" />
                                            {vital.systolic}/{vital.diastolic} mmHg
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {vital.temperature ? (
                                        <span className="inline-flex items-center gap-1">
                                            <Thermometer className="h-3 w-3 text-orange-500" />
                                            {vital.temperature}°F
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {vital.pulse ? (
                                        <span className="inline-flex items-center gap-1">
                                            <Activity className="h-3 w-3 text-blue-500" />
                                            {vital.pulse} bpm
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {vital.oxygen_saturation ? (
                                        <span className="inline-flex items-center gap-1">
                                            <Droplet className="h-3 w-3 text-cyan-500" />
                                            {vital.oxygen_saturation}%
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                    {vital.notes || '—'}
                                </td>
                            </tr>
                        ))
                                ) : (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center">
                                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-600 text-lg font-medium">No vitals data found</p>
                                <p className="text-gray-500 text-sm mt-1">Try adjusting your date range or filters</p>
                            </td>
                        </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-6 flex items-center justify-between no-print">
                            <div className="text-sm text-gray-600">
                                Page {currentPage} of {totalPages}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                        Previous
                                </button>
                                <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                        Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </PrintableReportLayout>
    );
}
