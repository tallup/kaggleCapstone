import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { defaultOptions, colors } from '../../utils/chartConfig';
import {
    BarChart3,
    Activity,
    Pill,
    Calendar,
    ClipboardList,
    Moon,
    Sparkles,
    ShoppingCart,
    Flame,
    AlertTriangle,
    Building2,
    DollarSign,
    RefreshCcw,
    Download,
    Filter,
    TrendingUp,
    ArrowRight,
    LineChart as LineChartIcon,
} from 'lucide-react';
import { getLocalDateString } from '../../utils/pacificTime';
import { usePreventDateInputReload } from '../../hooks/usePreventDateInputReload';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';

export default function AnalyticsDashboard() {
    const navigate = useNavigate();
    const containerRef = usePreventDateInputReload();
    const queryClient = useQueryClient();

    const [dateFrom, setDateFrom] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(getLocalDateString());
    const [branchId, setBranchId] = useState('');
    const [residentId, setResidentId] = useState('');
    const [branches, setBranches] = useState([]);
    const [residents, setResidents] = useState([]);

    useEffect(() => {
        api.get('/branches', { params: { per_page: 100 } })
            .then(res => setBranches(res.data?.data || []))
            .catch(() => {});
        
        api.get('/residents', { params: { per_page: 100, status: 'active' } })
            .then(res => setResidents(res.data?.data || []))
            .catch(() => {});
    }, []);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['analytics-dashboard', dateFrom, dateTo, branchId, residentId],
        queryFn: async () => {
            const params = {
                date_from: dateFrom,
                date_to: dateTo,
            };
            if (branchId) params.branch_id = branchId;
            if (residentId) params.resident_id = residentId;
            return (await api.get('/analytics/dashboard', { params })).data;
        },
        enabled: !!dateFrom && !!dateTo,
        refetchOnWindowFocus: false,
    });

    const handleExport = () => {
        if (!data) return;
        
        let csv = 'Module,Metric,Value\n';
        
        // Summary data
        Object.entries(data.summary || {}).forEach(([module, metrics]) => {
            Object.entries(metrics || {}).forEach(([key, value]) => {
                csv += `${module},${key},${value}\n`;
            });
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-dashboard-${dateFrom}-to-${dateTo}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
    };

    const selectedBranchName = branchId ? branches.find(b => b.id == branchId)?.name : null;
    const selectedResident = React.useMemo(() => {
        if (!residentId) return null;
        return residents.find(r => String(r.id) === String(residentId)) ?? null;
    }, [residentId, residents]);
    const analyticsSubtitle = React.useMemo(() => {
        const parts = [`${dateFrom} to ${dateTo}`];
        if (selectedBranchName) parts.push(selectedBranchName);
        return parts.join(' · ');
    }, [dateFrom, dateTo, selectedBranchName]);

    const moduleCards = [
        {
            name: 'Vitals',
            icon: Activity,
            color: 'from-red-500 to-red-600',
            iconBg: 'bg-red-50',
            iconColor: 'text-red-600',
            data: data?.summary?.vitals,
            metrics: [
                { label: 'Total Records', value: data?.summary?.vitals?.total || 0 },
                { label: 'Today', value: data?.summary?.vitals?.today || 0 },
                { label: 'This Week', value: data?.summary?.vitals?.week || 0 },
                { label: 'This Month', value: data?.summary?.vitals?.month || 0 },
            ],
            link: '/reports/vitals-charts',
        },
        {
            name: 'Medications',
            icon: Pill,
            color: 'from-blue-500 to-blue-600',
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            data: data?.summary?.medications,
            metrics: [
                { label: 'Active', value: data?.summary?.medications?.active || 0 },
                { label: 'Due Today', value: data?.summary?.medications?.due_today || 0 },
                { label: 'Compliance Rate', value: `${data?.summary?.medications?.compliance_rate || 0}%` },
            ],
            link: '/medications',
        },
        {
            name: 'Appointments',
            icon: Calendar,
            color: 'from-green-500 to-green-600',
            iconBg: 'bg-green-50',
            iconColor: 'text-green-600',
            data: data?.summary?.appointments,
            metrics: [
                { label: 'Total', value: data?.summary?.appointments?.total || 0 },
                { label: 'Upcoming', value: data?.summary?.appointments?.upcoming || 0 },
                { label: 'Completed (Month)', value: data?.summary?.appointments?.completed_month || 0 },
            ],
            link: '/reports/appointments-charts',
        },
        {
            name: 'Assessments',
            icon: ClipboardList,
            color: 'from-indigo-500 to-indigo-600',
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            data: data?.summary?.assessments,
            metrics: [
                { label: 'Total', value: data?.summary?.assessments?.total || 0 },
                { label: 'Pending', value: data?.summary?.assessments?.pending || 0 },
                { label: 'Completed (Month)', value: data?.summary?.assessments?.completed_month || 0 },
            ],
            link: '/reports/assessment-charts',
        },
        {
            name: 'Sleep',
            icon: Moon,
            color: 'from-amber-500 to-amber-600',
            iconBg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            data: data?.summary?.sleep,
            metrics: [
                { label: 'Total Records', value: data?.summary?.sleep?.total || 0 },
                { label: 'Avg Hours', value: `${data?.summary?.sleep?.avg_hours || 0}h` },
                { label: 'This Week', value: data?.summary?.sleep?.week || 0 },
            ],
            link: '/reports/sleep-charts',
        },
        {
            name: 'Housekeeping',
            icon: Sparkles,
            color: 'from-purple-500 to-purple-600',
            iconBg: 'bg-purple-50',
            iconColor: 'text-purple-600',
            data: data?.summary?.housekeeping,
            metrics: [
                { label: 'Total Tasks', value: data?.summary?.housekeeping?.total || 0 },
                { label: 'Completed', value: data?.summary?.housekeeping?.completed || 0 },
                { label: 'Pending', value: data?.summary?.housekeeping?.pending || 0 },
            ],
            link: '/reports/housekeeping',
        },
        {
            name: 'Grocery Status',
            icon: ShoppingCart,
            color: 'from-teal-500 to-teal-600',
            iconBg: 'bg-teal-50',
            iconColor: 'text-teal-600',
            data: data?.summary?.grocery_status,
            metrics: [
                { label: 'Total Updates', value: data?.summary?.grocery_status?.total || 0 },
                { label: 'Pending', value: data?.summary?.grocery_status?.pending || 0 },
                { label: 'Completed', value: data?.summary?.grocery_status?.completed || 0 },
            ],
            link: '/reports/grocery-status',
        },
        {
            name: 'Fire Drills',
            icon: Flame,
            color: 'from-orange-500 to-orange-600',
            iconBg: 'bg-orange-50',
            iconColor: 'text-orange-600',
            data: data?.summary?.fire_drills,
            metrics: [
                { label: 'Total Scheduled', value: data?.summary?.fire_drills?.total || 0 },
                { label: 'Upcoming', value: data?.summary?.fire_drills?.upcoming || 0 },
                { label: 'Completed', value: data?.summary?.fire_drills?.completed || 0 },
            ],
            link: '/reports/fire-drills',
        },
        {
            name: 'Incidents',
            icon: AlertTriangle,
            color: 'from-rose-500 to-rose-600',
            iconBg: 'bg-rose-50',
            iconColor: 'text-rose-600',
            data: data?.summary?.incidents,
            metrics: [
                { label: 'Total', value: data?.summary?.incidents?.total || 0 },
                { label: 'This Month', value: data?.summary?.incidents?.month || 0 },
                { label: 'Open Cases', value: data?.summary?.incidents?.open || 0 },
            ],
            link: '/reports/incidents',
        },
        {
            name: 'Pharmacy',
            icon: Building2,
            color: 'from-cyan-500 to-cyan-600',
            iconBg: 'bg-cyan-50',
            iconColor: 'text-cyan-600',
            data: data?.summary?.pharmacy,
            metrics: [
                { label: 'Inventory Items', value: data?.summary?.pharmacy?.total || 0 },
                { label: 'Low Stock', value: data?.summary?.pharmacy?.low_stock || 0 },
                { label: 'Out of Stock', value: data?.summary?.pharmacy?.out_of_stock || 0 },
            ],
            link: '/reports/pharmacy',
        },
        {
            name: 'Billing',
            icon: DollarSign,
            color: 'from-emerald-500 to-emerald-600',
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            data: data?.summary?.billing,
            metrics: [
                { label: 'Total Expenses', value: formatCurrency(data?.summary?.billing?.total_expenses || 0) },
                { label: 'This Month', value: formatCurrency(data?.summary?.billing?.month_expenses || 0) },
                { label: 'Pending Invoices', value: formatCurrency(data?.summary?.billing?.pending_invoices || 0) },
            ],
            link: '/billing/reports',
        },
    ];

    if (isLoading) {
        return (
            <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading analytics dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PrintableReportLayout
            title="Analytics Dashboard"
            subtitle={analyticsSubtitle}
            resident={selectedResident}
        >
            <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <BarChart3 className="h-8 w-8 text-[var(--theme-primary)]" />
                                    Analytics Dashboard
                                </h1>
                                <p className="mt-2 text-gray-600">Comprehensive overview of all facility metrics and analytics</p>
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
                                    <Filter className="inline h-4 w-4 mr-1" />
                                    Date From
                                </label>
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setDateFrom(e.target.value);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Filter className="inline h-4 w-4 mr-1" />
                                    Date To
                                </label>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setDateTo(e.target.value);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <Filter className="inline h-4 w-4 mr-1" />
                                    Branch (Optional)
                                </label>
                                <select
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
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

                {/* Summary Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
                    {moduleCards.map((module, index) => {
                        const Icon = module.icon;
                        return (
                            <div
                                key={index}
                                onClick={() => navigate(module.link)}
                                className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer border border-gray-100 hover:border-transparent"
                            >
                                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${module.color}`}></div>
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
                                                {module.name}
                                            </p>
                                            <div className="space-y-1">
                                                {module.metrics.map((metric, idx) => (
                                                    <div key={idx} className="flex items-center justify-between">
                                                        <span className="text-xs text-gray-500">{metric.label}:</span>
                                                        <span className="text-sm font-semibold text-gray-900">{metric.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className={`${module.iconBg} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300 flex-shrink-0 ml-4`}>
                                            <Icon className={`w-6 h-6 ${module.iconColor}`} />
                                        </div>
                                    </div>
                                    <div className="flex items-center text-[var(--theme-primary)] text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 mt-4 pt-4 border-t border-gray-100">
                                        <span>View details</span>
                                        <ArrowRight className="w-3 h-3 ml-2 transform group-hover:translate-x-2 transition-transform duration-300" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Trend Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Activity Trends */}
                    {data?.trends?.activity && data.trends.activity.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                    <LineChartIcon className="h-5 w-5 text-[var(--theme-primary)]" />
                                    Activity Trends
                                </h2>
                            </div>
                            <div className="h-80">
                                <Line
                                    data={{
                                        labels: data.trends.activity.map(t => t.date),
                                        datasets: [
                                            {
                                                label: 'Vitals',
                                                data: data.trends.activity.map(t => t.vitals),
                                                borderColor: colors.danger,
                                                backgroundColor: colors.danger + '20',
                                                fill: true,
                                                tension: 0.4,
                                            },
                                            {
                                                label: 'Appointments',
                                                data: data.trends.activity.map(t => t.appointments),
                                                borderColor: colors.success,
                                                backgroundColor: colors.success + '20',
                                                fill: true,
                                                tension: 0.4,
                                            },
                                            {
                                                label: 'Assessments',
                                                data: data.trends.activity.map(t => t.assessments),
                                                borderColor: colors.info,
                                                backgroundColor: colors.info + '20',
                                                fill: true,
                                                tension: 0.4,
                                            },
                                        ],
                                    }}
                                    options={{
                                        ...defaultOptions,
                                        scales: {
                                            y: {
                                                beginAtZero: true,
                                                title: {
                                                    display: true,
                                                    text: 'Count',
                                                },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Module Comparison */}
                    {data?.comparisons?.modules && data.comparisons.modules.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5 text-[var(--theme-primary)]" />
                                    Module Comparison
                                </h2>
                            </div>
                            <div className="h-80">
                                <Bar
                                    data={{
                                        labels: data.comparisons.modules.map(m => m.module),
                                        datasets: [{
                                            label: 'Total Count',
                                            data: data.comparisons.modules.map(m => m.count),
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
                                                    text: 'Count',
                                                },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 no-print">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => navigate('/reports')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg text-sm font-medium hover:bg-[var(--theme-primary-hover)] transition"
                        >
                            <BarChart3 className="h-4 w-4" />
                            View All Reports
                        </button>
                        <button
                            onClick={() => navigate('/reports/charts')}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            <TrendingUp className="h-4 w-4" />
                            Chart Reports
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </PrintableReportLayout>
    );
}

