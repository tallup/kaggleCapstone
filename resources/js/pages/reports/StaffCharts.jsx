import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Bar, Doughnut } from 'react-chartjs-2';
import { defaultOptions, colors } from '../../utils/chartConfig';
import { 
    UserCheck, 
    RefreshCcw,
    Download,
    Users,
    CheckCircle2,
    Clock,
    Calendar,
    PieChart,
    BarChart3
} from 'lucide-react';

export default function StaffCharts() {
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['charts-staff'],
        queryFn: async () => (await api.get('/charts/staff')).data,
    });

    const handleExport = () => {
        if (!data) return;
        let csv = 'Category,Value\n';
        csv += `Total Staff,${data.total_staff || 0}\n`;
        csv += `Caregivers,${data.total_caregivers || 0}\n`;
        csv += `Active Assignments,${data.active_assignments || 0}\n`;
        csv += `Pending Leave,${data.pending_leave || 0}\n`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'staff-charts.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#25603E]"></div>
                        <p className="mt-4 text-gray-600">Loading staff charts...</p>
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
                                <UserCheck className="h-8 w-8 text-indigo-600" />
                                Staff Analytics Dashboard
                            </h1>
                            <p className="mt-2 text-gray-600">Comprehensive staff statistics and leave management</p>
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

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                        <p className="text-gray-600 text-xs font-medium">Total Staff</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{data?.total_staff || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                        <p className="text-gray-600 text-xs font-medium">Caregivers</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{data?.total_caregivers || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                        <p className="text-gray-600 text-xs font-medium">Active Assignments</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{data?.active_assignments || 0}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                        <p className="text-gray-600 text-xs font-medium">Pending Leave</p>
                        <p className="text-xl font-bold text-gray-900 mt-1">{data?.pending_leave || 0}</p>
                    </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                <PieChart className="h-5 w-5 text-indigo-600" />
                                Leave Requests by Status
                            </h2>
                        </div>
                        <div className="h-80">
                            {data?.leave_by_status?.length ? (
                                <Doughnut
                        data={{
                            labels: data.leave_by_status.map(l => l.status),
                            datasets: [{
                                data: data.leave_by_status.map(l => l.count),
                                backgroundColor: [
                                    colors.primary + '80',
                                    colors.success + '80',
                                    colors.warning + '80',
                                ],
                                borderColor: [
                                    colors.primary,
                                    colors.success,
                                    colors.warning,
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

                    {data?.staff_by_role && data.staff_by_role.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-indigo-600" />
                        Staff by Role
                                </h2>
                            </div>
                            <div className="h-80">
                                <Bar
                        data={{
                            labels: data.staff_by_role.map(r => r.role),
                            datasets: [{
                                label: 'Count',
                                data: data.staff_by_role.map(r => r.count),
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
                                        text: 'Number of Staff'
                                    }
                                }
                            }
                        }}
                                />
                            </div>
                        </div>
                    )}
                </div>
                    </div>
    );
}
