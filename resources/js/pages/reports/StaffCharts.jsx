import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
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
    BarChart3,
    TrendingUp,
    MapPin,
    UserCog,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Building2,
    Award,
    Activity,
    FileText
} from 'lucide-react';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

export default function StaffCharts() {
    const [expandedSections, setExpandedSections] = useState({
        assignments: true,
        leave: true,
        attendance: true
    });

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['charts-staff'],
        queryFn: async () => (await api.get('/charts/staff')).data,
    });

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const handleExport = () => {
        if (!data) return;
        let csv = 'Category,Value\n';
        csv += `Total Staff,${data.total_staff || 0}\n`;
        csv += `Caregivers,${data.total_caregivers || 0}\n`;
        csv += `Active Assignments,${data.active_assignments || 0}\n`;
        csv += `Pending Leave,${data.pending_leave || 0}\n`;
        csv += `Approved Leave,${data.approved_leave || 0}\n`;
        csv += `Today Clock-ins,${data.today_clock_ins || 0}\n`;
        csv += `Active Clock-ins,${data.active_clock_ins || 0}\n`;
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
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading staff charts...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PrintableReportLayout title="Staff Analytics Dashboard">
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

                {/* Key Statistics Cards - Reduced to 4 main cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Total Staff</p>
                                    <p className="text-3xl font-bold text-gray-900">{(data?.total_staff || 0).toLocaleString()}</p>
                                    <div className="mt-2 flex items-center gap-4 text-xs">
                                        <span className="text-gray-600">
                                            <span className="font-semibold text-blue-600">{data?.total_caregivers || 0}</span> caregivers
                                        </span>
                                        {data?.staff_by_role && data.staff_by_role.length > 0 && (
                                            <span className="text-gray-600">
                                                <span className="font-semibold text-indigo-600">{data.staff_by_role.length}</span> roles
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-indigo-50 p-3 rounded-xl">
                                    <UserCheck className="w-6 h-6 text-indigo-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-green-500 to-green-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Active Assignments</p>
                                    <p className="text-3xl font-bold text-gray-900">{(data?.active_assignments || 0).toLocaleString()}</p>
                                    {data?.assignments_by_caregiver && data.assignments_by_caregiver.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            Across <span className="font-semibold">{data.assignments_by_caregiver.length}</span> caregiver{data.assignments_by_caregiver.length !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                                <div className="bg-green-50 p-3 rounded-xl">
                                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 to-orange-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Leave Requests</p>
                                    <p className="text-3xl font-bold text-gray-900">{(data?.pending_leave || 0).toLocaleString()}</p>
                                    <div className="mt-2 flex items-center gap-4 text-xs">
                                        <span className="text-gray-600">
                                            <span className="font-semibold text-orange-600">{data?.pending_leave || 0}</span> pending
                                        </span>
                                        <span className="text-gray-600">
                                            <span className="font-semibold text-green-600">{data?.approved_leave || 0}</span> approved
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-orange-50 p-3 rounded-xl">
                                    <Clock className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 to-teal-600"></div>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Attendance Today</p>
                                    <p className="text-3xl font-bold text-gray-900">{(data?.today_clock_ins || 0).toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        <span className="font-semibold text-teal-600">{data?.active_clock_ins || 0}</span> currently active
                                    </p>
                                </div>
                                <div className="bg-teal-50 p-3 rounded-xl">
                                    <TrendingUp className="w-6 h-6 text-teal-600" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Sections */}
                <div className="space-y-6">
                    {/* Assignments Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <button
                            onClick={() => toggleSection('assignments')}
                            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition rounded-t-xl"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-xl font-semibold text-gray-900">Active Assignments</h2>
                                    <p className="text-sm text-gray-500">Caregiver-resident assignments overview</p>
                                </div>
                            </div>
                            {expandedSections.assignments ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </button>
                        {expandedSections.assignments && (
                            <div className="px-6 pb-6 border-t border-gray-200">
                                {data?.active_assignments > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                        {data?.assignments_by_branch && data.assignments_by_branch.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-indigo-600" />
                                                    By Branch
                                                </h3>
                                                <div className="space-y-3">
                                                    {data.assignments_by_branch.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                                                    <Building2 className="w-5 h-5 text-indigo-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-gray-900">{item.branch?.name || 'Unknown Branch'}</p>
                                                                    <p className="text-xs text-gray-500">Branch assignments</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-2xl font-bold text-indigo-600">{item.count}</p>
                                                                <p className="text-xs text-gray-500">assignments</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {data?.assignments_by_caregiver && data.assignments_by_caregiver.length > 0 && (
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                                    <Award className="h-4 w-4 text-green-600" />
                                                    Top Caregivers
                                                </h3>
                                                <div className="space-y-3">
                                                    {data.assignments_by_caregiver.map((item, idx) => (
                                                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                                    <Users className="w-5 h-5 text-green-600" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-medium text-gray-900">{item.caregiver?.name || 'Unknown Caregiver'}</p>
                                                                    <p className="text-xs text-gray-500">Active assignments</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-2xl font-bold text-green-600">{item.count}</p>
                                                                <p className="text-xs text-gray-500">residents</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center">
                                        <CheckCircle2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">No active assignments</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Leave Management Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <button
                            onClick={() => toggleSection('leave')}
                            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition rounded-t-xl"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <Clock className="h-5 w-5 text-orange-600" />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-xl font-semibold text-gray-900">Leave Management</h2>
                                    <p className="text-sm text-gray-500">Pending and approved leave requests</p>
                                </div>
                            </div>
                            {expandedSections.leave ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </button>
                        {expandedSections.leave && (
                            <div className="px-6 pb-6 border-t border-gray-200">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Leave Requests by Status</h3>
                                        <div className="h-64">
                                            {data?.leave_by_status?.length ? (
                                                <Doughnut
                                                    data={{
                                                        labels: data.leave_by_status.map(l => l.status.charAt(0).toUpperCase() + l.status.slice(1)),
                                                        datasets: [{
                                                            data: data.leave_by_status.map(l => l.count),
                                                            backgroundColor: [
                                                                colors.warning + '80',
                                                                colors.success + '80',
                                                                colors.danger + '80',
                                                            ],
                                                            borderColor: [
                                                                colors.warning,
                                                                colors.success,
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
                                                <div className="h-64 flex items-center justify-center text-gray-500">
                                                    <div className="text-center">
                                                        <PieChart className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                                        <p>No leave data available</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Pending Requests</h3>
                                        {data?.recent_pending_leave && data.recent_pending_leave.length > 0 ? (
                                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                                {data.recent_pending_leave.map((leave, idx) => (
                                                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div>
                                                                <p className="font-medium text-gray-900">{leave.staff?.name || 'Unknown Staff'}</p>
                                                                <p className="text-xs text-gray-500">{leave.staff?.email || ''}</p>
                                                            </div>
                                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                                                                {leave.leave_type || 'Personal'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {leave.reason && (
                                                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{leave.reason}</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 text-center">
                                                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                                <p className="text-gray-500">No pending leave requests</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Staff Overview Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Users className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-900">Staff Overview</h2>
                                    <p className="text-sm text-gray-500">Staff distribution and roles</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {data?.staff_by_role && data.staff_by_role.length > 0 ? (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Staff by Role</h3>
                                        <div className="h-64">
                                            <Bar
                                                data={{
                                                    labels: data.staff_by_role.map(r => r.role.charAt(0).toUpperCase() + r.role.slice(1)),
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
                                                    maintainAspectRatio: false,
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
                                ) : (
                                    <div className="h-64 flex items-center justify-center text-gray-500">
                                        <div className="text-center">
                                            <UserCog className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                                            <p>No role data available</p>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Staff Summary</h3>
                                    <div className="space-y-4">
                                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-600">Total Staff</p>
                                                    <p className="text-2xl font-bold text-indigo-600">{data?.total_staff || 0}</p>
                                                </div>
                                                <UserCheck className="h-8 w-8 text-indigo-400" />
                                            </div>
                                        </div>
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-600">Caregivers</p>
                                                    <p className="text-2xl font-bold text-blue-600">{data?.total_caregivers || 0}</p>
                                                    {data?.total_staff > 0 && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            {Math.round((data.total_caregivers / data.total_staff) * 100)}% of total
                                                        </p>
                                                    )}
                                                </div>
                                                <Users className="h-8 w-8 text-blue-400" />
                                            </div>
                                        </div>
                                        <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-gray-600">Active Today</p>
                                                    <p className="text-2xl font-bold text-teal-600">{data?.active_clock_ins || 0}</p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Currently working
                                                    </p>
                                                </div>
                                                <TrendingUp className="h-8 w-8 text-teal-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <button
                            onClick={() => toggleSection('attendance')}
                            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition rounded-t-xl"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-teal-100 rounded-lg">
                                    <Activity className="h-5 w-5 text-teal-600" />
                                </div>
                                <div className="text-left">
                                    <h2 className="text-xl font-semibold text-gray-900">Attendance</h2>
                                    <p className="text-sm text-gray-500">Today's clock-ins and active staff</p>
                                </div>
                            </div>
                            {expandedSections.attendance ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                        </button>
                        {expandedSections.attendance && (
                            <div className="px-6 pb-6 border-t border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    <div className="p-6 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl border border-teal-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 mb-1">Today's Clock-ins</p>
                                                <p className="text-3xl font-bold text-teal-700">{data?.today_clock_ins || 0}</p>
                                            </div>
                                            <Clock className="h-10 w-10 text-teal-500" />
                                        </div>
                                        <p className="text-xs text-gray-600">Staff members who clocked in today</p>
                                    </div>
                                    <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 mb-1">Currently Active</p>
                                                <p className="text-3xl font-bold text-green-700">{data?.active_clock_ins || 0}</p>
                                            </div>
                                            <TrendingUp className="h-10 w-10 text-green-500" />
                                        </div>
                                        <p className="text-xs text-gray-600">Staff members currently clocked in</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </div>
        </PrintableReportLayout>
    );
}
