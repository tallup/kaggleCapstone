import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { defaultOptions, colors } from '../../utils/chartConfig';
import { 
    Users, 
    RefreshCcw,
    Download,
    Building2,
    CheckCircle2,
    UserCheck,
    BarChart3,
    PieChart,
    TrendingUp
} from 'lucide-react';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

export default function ResidentCharts() {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['charts-residents'],
        queryFn: async () => (await api.get('/charts/residents')).data,
    });

    const handleExport = () => {
        if (!data) return;
        let csv = 'Category,Value\n';
        csv += `Total Residents,${data.total_residents || 0}\n`;
        csv += `Active Residents,${data.active_residents || 0}\n`;
        if (data.by_branch) {
            data.by_branch.forEach(b => {
                csv += `${b.branch_name},${b.count}\n`;
            });
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resident-charts.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading resident charts...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PrintableReportLayout title="Resident Analytics Dashboard">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <Users className="h-8 w-8 text-emerald-600" />
                                    Resident Analytics Dashboard
                                </h1>
                                <p className="mt-2 text-gray-600">Comprehensive resident statistics and distribution</p>
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
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Residents</p>
                                    <p className="text-3xl font-bold text-gray-900">{(data?.total_residents || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-emerald-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <Users className="w-6 h-6 text-emerald-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-transparent">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 to-green-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Active Residents</p>
                                    <p className="text-3xl font-bold text-gray-900">{(data?.active_residents || 0).toLocaleString()}</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                    <UserCheck className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Residents by Branch */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-emerald-600" />
                                Residents by Branch
                            </h2>
                        </div>
                        <div className="h-80">
                            {data?.by_branch?.length ? (
                                <Bar
                        data={{
                            labels: data.by_branch.map(b => b.branch_name),
                            datasets: [{
                                label: 'Residents',
                                data: data.by_branch.map(b => b.count),
                                backgroundColor: [
                                    colors.primary + '80',
                                    colors.info + '80',
                                    colors.success + '80',
                                    colors.warning + '80',
                                    colors.danger + '80',
                                ],
                                borderColor: [
                                    colors.primary,
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
                            ) : (
                                <div className="h-80 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                            <p>No data available</p>
                        </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Residents by Status */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-purple-600" />
                                Residents by Status
                            </h2>
                        </div>
                        <div className="h-80">
                            {data?.by_status?.length ? (
                                <Doughnut
                        data={{
                            labels: data.by_status.map(s => s.status || 'Unknown'),
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
                </div>
            </div>
            </div>
        </PrintableReportLayout>
    );
}
