import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
    Pill, AlertCircle, CheckCircle, Clock, TrendingUp,
    Users, ArrowRight, Activity, Package, XCircle,
    CalendarClock, Truck, Eye, BarChart3, RefreshCw,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import SectionCard from '../components/SectionCard';
import Tooltip from '../components/ui/Tooltip';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, PointElement,
    LineElement, Title, ChartTooltip, Legend, Filler,
);

function StatCard({ title, value, subtitle, icon: Icon, color, bgColor, borderColor, onClick }) {
    return (
        <button
            onClick={onClick}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-5 text-left w-full group"
        >
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    {subtitle && (
                        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
                    )}
                </div>
                <div className={`${bgColor} p-2.5 rounded-lg group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                </div>
            </div>
        </button>
    );
}

function AvatarFallback({ name, image, size = 'sm' }) {
    const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    const initials = name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?';

    if (image) {
        return (
            <img
                src={image}
                alt={name}
                className={`${sizeClasses} rounded-full object-cover border border-gray-200`}
                onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                }}
            />
        );
    }

    return (
        <div className={`${sizeClasses} rounded-full bg-[var(--theme-primary)] text-white flex items-center justify-center font-semibold flex-shrink-0`}>
            {initials}
        </div>
    );
}

function StatusBadge({ status }) {
    const config = {
        completed: { label: 'Administered', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
        missed: { label: 'Missed', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
        refused: { label: 'Refused', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
        hospital_admission: { label: 'Hospital', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
        pharmacy_administration_confirm: { label: 'Pharmacy', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    };
    const c = config[status] || { label: status, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${c.bg} ${c.text} ${c.border}`}>
            {c.label}
        </span>
    );
}

function DeliveryStatusBadge({ status }) {
    const config = {
        received: { label: 'Received', bg: 'bg-blue-50', text: 'text-blue-700' },
        verified: { label: 'Verified', bg: 'bg-green-50', text: 'text-green-700' },
        stored: { label: 'Stored', bg: 'bg-gray-50', text: 'text-gray-700' },
    };
    const c = config[status] || { label: status, bg: 'bg-gray-50', text: 'text-gray-700' };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
            {c.label}
        </span>
    );
}

const PAGE_SIZE = 5;

function MiniPagination({ page, totalPages, onPrev, onNext }) {
    if (totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2">
            <span className="text-xs text-gray-400">
                Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={onPrev}
                    disabled={page <= 1}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={onNext}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

export default function MedicationDashboard() {
    const navigate = useNavigate();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['medication-dashboard'],
        queryFn: async () => {
            const response = await api.get('/medications/dashboard');
            return response.data;
        },
        refetchInterval: 120000,
        refetchIntervalInBackground: false,
        retry: 2,
    });

    const [upcomingPage, setUpcomingPage] = useState(1);
    const [missedPage, setMissedPage] = useState(1);
    const [activityPage, setActivityPage] = useState(1);

    const today = data?.today || {};
    const upcoming = data?.upcoming || [];
    const missedToday = data?.missed_today || [];
    const trend = data?.adherence_trend || [];
    const recentActivity = data?.recent_activity || [];
    const residentSummary = data?.resident_summary || [];
    const delivery = data?.delivery_status || {};

    const upcomingPages = Math.ceil(upcoming.length / PAGE_SIZE) || 1;
    const pagedUpcoming = upcoming.slice((upcomingPage - 1) * PAGE_SIZE, upcomingPage * PAGE_SIZE);

    const missedPages = Math.ceil(missedToday.length / PAGE_SIZE) || 1;
    const pagedMissed = missedToday.slice((missedPage - 1) * PAGE_SIZE, missedPage * PAGE_SIZE);

    const activityPages = Math.ceil(recentActivity.length / PAGE_SIZE) || 1;
    const pagedActivity = recentActivity.slice((activityPage - 1) * PAGE_SIZE, activityPage * PAGE_SIZE);

    const adherenceTrendChart = useMemo(() => {
        if (!trend.length) return null;

        return {
            data: {
                labels: trend.map(d => d.day),
                datasets: [
                    {
                        label: 'Adherence %',
                        data: trend.map(d => d.adherence),
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: 'rgb(34, 197, 94)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        yAxisID: 'y',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        callbacks: {
                            label: (ctx) => `Adherence: ${ctx.parsed.y}%`,
                            afterLabel: (ctx) => {
                                const d = trend[ctx.dataIndex];
                                return `Administered: ${d.administered} | Missed: ${d.missed} | Refused: ${d.refused}`;
                            },
                        },
                    },
                },
                scales: {
                    y: { min: 0, max: 100, ticks: { callback: v => `${v}%` }, grid: { color: '#f3f4f6' } },
                    x: { grid: { display: false } },
                },
            },
        };
    }, [trend]);

    const dailyBreakdownChart = useMemo(() => {
        if (!trend.length) return null;

        return {
            data: {
                labels: trend.map(d => d.day),
                datasets: [
                    {
                        label: 'Administered',
                        data: trend.map(d => d.administered),
                        backgroundColor: 'rgba(34, 197, 94, 0.7)',
                        borderRadius: 4,
                    },
                    {
                        label: 'Missed',
                        data: trend.map(d => d.missed),
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderRadius: 4,
                    },
                    {
                        label: 'Refused',
                        data: trend.map(d => d.refused),
                        backgroundColor: 'rgba(234, 179, 8, 0.7)',
                        borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, usePointStyle: true } },
                },
                scales: {
                    y: { beginAtZero: true, stacked: true, grid: { color: '#f3f4f6' } },
                    x: { stacked: true, grid: { display: false } },
                },
            },
        };
    }, [trend]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Medication Dashboard</h1>
                        <p className="text-gray-500 text-sm">Loading medication data...</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                            <div className="h-8 bg-gray-200 rounded w-16" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 animate-pulse">
                            <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
                            <div className="h-48 bg-gray-100 rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        const errorData = error?.response?.data;
        const errorMsg = [errorData?.error, errorData?.file, errorData?.message].filter(Boolean).join(' — ') || error?.message || 'Unknown error';
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-900">Medication Dashboard</h1>
                <div className="bg-white rounded-xl shadow-sm border-l-4 border-red-500 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <div>
                                <p className="text-red-800 text-sm font-medium">
                                    Failed to load medication dashboard.
                                </p>
                                <p className="text-red-600 text-xs mt-1">{errorMsg}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => refetch()}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Medication Dashboard</h1>
                    <p className="text-gray-500 text-sm">Real-time overview of medication management</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                    <button
                        onClick={() => navigate('/medications/report')}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-[var(--theme-primary)] rounded-lg hover:opacity-90 transition-colors"
                    >
                        <BarChart3 className="w-4 h-4" />
                        Full Report
                    </button>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Scheduled Today"
                    value={today.scheduled || 0}
                    subtitle={`${today.active_medications || 0} active medications`}
                    icon={CalendarClock}
                    color="text-[var(--theme-primary)]"
                    bgColor="bg-[var(--theme-primary-bg-light)]"
                    onClick={() => navigate('/medications')}
                />
                <StatCard
                    title="Administered"
                    value={today.administered || 0}
                    subtitle={today.scheduled ? `${Math.round(((today.administered || 0) / today.scheduled) * 100)}% of scheduled` : 'No doses scheduled'}
                    icon={CheckCircle}
                    color="text-green-600"
                    bgColor="bg-green-50"
                    onClick={() => navigate('/medication-history')}
                />
                <StatCard
                    title="Missed"
                    value={today.missed || 0}
                    subtitle="Needs attention"
                    icon={XCircle}
                    color="text-red-600"
                    bgColor="bg-red-50"
                    onClick={() => navigate('/medication-history')}
                />
                <StatCard
                    title="Refused"
                    value={today.refused || 0}
                    subtitle="Declined by resident"
                    icon={AlertCircle}
                    color="text-amber-600"
                    bgColor="bg-amber-50"
                    onClick={() => navigate('/medication-history')}
                />
                <StatCard
                    title="Adherence Rate"
                    value={`${today.adherence || 0}%`}
                    subtitle="Today's compliance"
                    icon={TrendingUp}
                    color={
                        (today.adherence || 0) >= 90
                            ? 'text-green-600'
                            : (today.adherence || 0) >= 70
                                ? 'text-amber-600'
                                : 'text-red-600'
                    }
                    bgColor={
                        (today.adherence || 0) >= 90
                            ? 'bg-green-50'
                            : (today.adherence || 0) >= 70
                                ? 'bg-amber-50'
                                : 'bg-red-50'
                    }
                    onClick={() => navigate('/medications/report')}
                />
            </div>

            {/* Upcoming + Missed Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Upcoming Medications */}
                <SectionCard
                    title="Upcoming Medications"
                    actionLabel="View All"
                    onAction={() => navigate('/medications')}
                    headerRight={
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            Next 4 hours
                        </span>
                    }
                >
                    {upcoming.length === 0 ? (
                        <div className="text-center py-8">
                            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No upcoming medications</p>
                        </div>
                    ) : (
                        <div>
                            <div className="space-y-2">
                                {pagedUpcoming.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigate(`/my-residents/${item.resident_id}/medications/list`)}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors w-full text-left"
                                    >
                                        <AvatarFallback name={item.resident_name} image={null} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{item.medication_name}</p>
                                            <p className="text-xs text-gray-500 truncate">{item.resident_name}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-semibold text-[var(--theme-primary)]">{item.scheduled_time}</p>
                                            <p className="text-xs text-gray-400">
                                                {item.minutes_until <= 0
                                                    ? 'Due now'
                                                    : item.minutes_until < 60
                                                        ? `in ${item.minutes_until}m`
                                                        : `in ${Math.floor(item.minutes_until / 60)}h ${item.minutes_until % 60}m`
                                                }
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <MiniPagination
                                page={upcomingPage}
                                totalPages={upcomingPages}
                                onPrev={() => setUpcomingPage(p => Math.max(1, p - 1))}
                                onNext={() => setUpcomingPage(p => Math.min(upcomingPages, p + 1))}
                            />
                        </div>
                    )}
                </SectionCard>

                {/* Missed / Overdue */}
                <SectionCard
                    title="Missed Today"
                    actionLabel="View History"
                    onAction={() => navigate('/medication-history')}
                    headerRight={
                        missedToday.length > 0 && (
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-medium">
                                {missedToday.length} dose{missedToday.length !== 1 ? 's' : ''}
                            </span>
                        )
                    }
                >
                    {missedToday.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle className="w-10 h-10 text-green-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No missed medications today</p>
                            <p className="text-xs text-green-600 mt-1">Great work!</p>
                        </div>
                    ) : (
                        <div>
                            <div className="space-y-2">
                                {pagedMissed.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigate(`/my-residents/${item.resident_id}/medications/list`)}
                                        className="flex items-center gap-3 p-3 rounded-lg bg-red-50/50 hover:bg-red-50 transition-colors w-full text-left"
                                    >
                                        <AvatarFallback name={item.resident_name} image={null} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{item.medication_name}</p>
                                            <p className="text-xs text-gray-500 truncate">{item.resident_name}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-medium text-red-600">{item.scheduled_time}</p>
                                            <p className="text-xs text-red-400">Missed</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <MiniPagination
                                page={missedPage}
                                totalPages={missedPages}
                                onPrev={() => setMissedPage(p => Math.max(1, p - 1))}
                                onNext={() => setMissedPage(p => Math.min(missedPages, p + 1))}
                            />
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Adherence Trend */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[var(--theme-primary)]" />
                            <h2 className="text-lg font-bold text-[var(--theme-primary)]">7-Day Adherence Trend</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        {adherenceTrendChart ? (
                            <div style={{ height: '250px' }}>
                                <Line data={adherenceTrendChart.data} options={adherenceTrendChart.options} />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
                                No trend data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Daily Breakdown */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-[var(--theme-primary)]" />
                            <h2 className="text-lg font-bold text-[var(--theme-primary)]">Daily Breakdown</h2>
                        </div>
                    </div>
                    <div className="p-6">
                        {dailyBreakdownChart ? (
                            <div style={{ height: '250px' }}>
                                <Bar data={dailyBreakdownChart.data} options={dailyBreakdownChart.options} />
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-[250px] text-gray-400 text-sm">
                                No breakdown data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Per-Resident Summary */}
            <SectionCard
                title="Resident Summary"
                actionLabel="View All Residents"
                onAction={() => navigate('/medications/residents')}
                headerRight={
                    <span className="text-xs text-gray-500">
                        {residentSummary.length} resident{residentSummary.length !== 1 ? 's' : ''} with active medications
                    </span>
                }
            >
                {residentSummary.length === 0 ? (
                    <div className="text-center py-8">
                        <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No residents with active medications</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-3">Resident</th>
                                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Active Meds</th>
                                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Scheduled</th>
                                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Given</th>
                                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Missed</th>
                                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2">Adherence</th>
                                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider py-3 px-2"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {residentSummary.map((r) => (
                                    <tr key={r.resident_id} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2">
                                                <AvatarFallback name={r.resident_name} image={null} />
                                                <span className="text-sm font-medium text-gray-900">{r.resident_name}</span>
                                            </div>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            <span className="text-sm text-gray-700">{r.active_medications}</span>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            <span className="text-sm text-gray-700">{r.scheduled_today}</span>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            <span className="text-sm font-medium text-green-600">{r.administered_today}</span>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            <span className={`text-sm font-medium ${r.missed_today > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                {r.missed_today}
                                            </span>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${
                                                            r.adherence >= 90 ? 'bg-green-500'
                                                                : r.adherence >= 70 ? 'bg-amber-500'
                                                                    : 'bg-red-500'
                                                        }`}
                                                        style={{ width: `${r.adherence}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-medium ${
                                                    r.adherence >= 90 ? 'text-green-600'
                                                        : r.adherence >= 70 ? 'text-amber-600'
                                                            : 'text-red-600'
                                                }`}>
                                                    {r.adherence}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            <Tooltip content="View details" position="left">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/my-residents/${r.resident_id}/medications/list`)}
                                                    className="text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] transition-colors"
                                                    aria-label="View medication details for resident"
                                                >
                                                    <Eye className="w-4 h-4" strokeWidth={2.25} />
                                                </button>
                                            </Tooltip>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>

            {/* Recent Activity + Deliveries Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2">
                    <SectionCard
                        title="Recent Activity"
                        actionLabel="Full History"
                        onAction={() => navigate('/medication-history')}
                    >
                        {recentActivity.length === 0 ? (
                            <div className="text-center py-8">
                                <Activity className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No recent activity</p>
                            </div>
                        ) : (
                            <div>
                                <div className="space-y-1">
                                    {pagedActivity.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            <AvatarFallback name={item.resident_name} image={null} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900">
                                                    <span className="font-medium">{item.medication_name}</span>
                                                    <span className="text-gray-400 mx-1">for</span>
                                                    <span className="font-medium">{item.resident_name}</span>
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    by {item.administered_by}
                                                    {item.administered_at && (
                                                        <> &middot; {new Date(item.administered_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</>
                                                    )}
                                                </p>
                                            </div>
                                            <StatusBadge status={item.status} />
                                        </div>
                                    ))}
                                </div>
                                <MiniPagination
                                    page={activityPage}
                                    totalPages={activityPages}
                                    onPrev={() => setActivityPage(p => Math.max(1, p - 1))}
                                    onNext={() => setActivityPage(p => Math.min(activityPages, p + 1))}
                                />
                            </div>
                        )}
                    </SectionCard>
                </div>

                {/* Delivery Status */}
                <div className="lg:col-span-1">
                    <SectionCard
                        title="Deliveries"
                        actionLabel="View All"
                        onAction={() => navigate('/medication-deliveries')}
                    >
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-blue-700">{delivery.today_count || 0}</p>
                                    <p className="text-xs text-blue-600">Today</p>
                                </div>
                                <div className="bg-amber-50 rounded-lg p-3 text-center">
                                    <p className="text-2xl font-bold text-amber-700">{delivery.pending_verification || 0}</p>
                                    <p className="text-xs text-amber-600">Pending</p>
                                </div>
                            </div>

                            {delivery.recent && delivery.recent.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recent</p>
                                    {delivery.recent.map((d) => (
                                        <div key={d.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                                            <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-gray-900 truncate">
                                                    {d.pharmacy_name || 'Unknown Pharmacy'}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate">{d.resident_name}</p>
                                            </div>
                                            <DeliveryStatusBadge status={d.status} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                                    <p className="text-xs text-gray-400">No recent deliveries</p>
                                </div>
                            )}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
}
