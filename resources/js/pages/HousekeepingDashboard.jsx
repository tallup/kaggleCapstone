import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, RefreshCcw, CalendarDays, CheckCircle2, XCircle, Clock3, ShieldCheck, FileText, User } from 'lucide-react';
import api from '../services/api';
import { getLocalDateString } from '../utils/pacificTime';

const statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'skipped', label: 'Skipped' },
];

const formatTime = (value) => {
    if (!value) return '';
    try {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
        }).format(new Date(`1970-01-01T${value}`));
    } catch (err) {
        return value;
    }
};

export default function HousekeepingDashboard() {
    const [selectedDate, setSelectedDate] = React.useState(() => getLocalDateString());
    const [areaId, setAreaId] = React.useState('');
    const [status, setStatus] = React.useState('');
    const [showCompletionReport, setShowCompletionReport] = React.useState(false);
    const [reportDateFrom, setReportDateFrom] = React.useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [reportDateTo, setReportDateTo] = React.useState(() => getLocalDateString());

    const { data, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['housekeeping-dashboard', selectedDate, areaId, status],
        queryFn: async () => {
            const params = { date: selectedDate };
            if (areaId) params.area_id = areaId;
            if (status) params.status = status;
            const response = await api.get('/cleaning/dashboard', { params });
            return response.data;
        },
    });

    const { data: completionReport, isLoading: reportLoading } = useQuery({
        queryKey: ['housekeeping-completion-report', reportDateFrom, reportDateTo],
        queryFn: async () => {
            const params = { date_from: reportDateFrom, date_to: reportDateTo };
            const response = await api.get('/cleaning/completion-report', { params });
            return response.data;
        },
        enabled: showCompletionReport,
    });

    const summary = data?.summary ?? { total: 0, completed: 0, skipped: 0, pending: 0, required_missing: 0 };
    const rows = data?.rows ?? [];
    const areas = data?.areas ?? [];

    return (
        <div className="space-y-6">
            <header className="rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-100">Operations Overview</p>
                        <h1 className="text-3xl font-semibold">Housekeeping Dashboard</h1>
                        <p className="mt-2 max-w-2xl text-sm text-emerald-100">
                            Monitor the daily checklist, confirm float accountability, and close any pending or skipped chores before shift change.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-emerald-600 shadow-inner transition hover:bg-emerald-50"
                    >
                        <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </header>

            <section className="grid gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100 md:grid-cols-3">
                <label className="text-sm font-semibold text-gray-700">
                    Checklist Date
                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-2">
                        <CalendarDays className="h-5 w-5 text-emerald-500" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(event) => setSelectedDate(event.target.value)}
                            className="flex-1 border-0 bg-transparent text-sm text-gray-700 outline-none"
                        />
                    </div>
                </label>
                <label className="text-sm font-semibold text-gray-700">
                    Cleaning Area
                    <select
                        value={areaId}
                        onChange={(event) => setAreaId(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                        <option value="">All areas</option>
                        {areas.map((area) => (
                            <option key={area.id} value={area.id}>
                                {area.name} {area.shift_label ? `(${area.shift_label})` : ''}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="text-sm font-semibold text-gray-700">
                    Status
                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
            </section>

            <section className="grid gap-4 md:grid-cols-5">
                <SummaryCard label="Tasks today" value={summary.total} subtext="Scheduled" />
                <SummaryCard label="Completed" value={summary.completed} subtext="Marked done" tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
                <SummaryCard label="Skipped" value={summary.skipped} subtext="Needs review" tone="warning" icon={<XCircle className="h-4 w-4" />} />
                <SummaryCard label="Pending" value={summary.pending} subtext="Still open" tone="muted" icon={<Clock3 className="h-4 w-4" />} />
                <SummaryCard label="Required missing" value={summary.required_missing} subtext="Must close" tone="danger" icon={<ShieldCheck className="h-4 w-4" />} />
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Daily Checklist Status</h2>
                    {isLoading ? (
                        <span className="text-sm text-gray-400">Loading...</span>
                    ) : (
                        <span className="text-sm text-gray-400">{rows.length} tasks</span>
                    )}
                </div>

                {error ? (
                    <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Unable to load housekeeping data. {error.response?.data?.message || error.message}
                    </div>
                ) : isLoading ? (
                    <div className="mt-6 flex items-center justify-center py-12 text-sm text-gray-500">
                        <LoaderIndicator />
                    </div>
                ) : !rows.length ? (
                    <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                        No tasks match your filters. Try another date or area.
                    </div>
                ) : (
                    <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="px-4 py-3">Area / Shift</th>
                                    <th className="px-4 py-3">Task</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Initials</th>
                                    <th className="px-4 py-3">Completed at</th>
                                    <th className="px-4 py-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {rows.map((row) => (
                                    <tr key={`${row.task_id}-${row.area}`} className={row.required && row.status === 'pending' ? 'bg-rose-50/60' : ''}>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-gray-900">{row.area}</div>
                                            <p className="text-xs text-gray-500">{row.shift}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{row.task}</div>
                                            {row.required ? (
                                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                                    <ShieldCheck className="h-3 w-3" />
                                                    Required
                                                </span>
                                            ) : null}
                                            <div className="mt-1 text-xs text-gray-500">
                                                {row.window_start || row.window_end
                                                    ? `${row.window_start ? formatTime(row.window_start) : 'Start'} – ${
                                                          row.window_end ? formatTime(row.window_end) : 'End'
                                                      }`
                                                    : 'Anytime'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{row.completed_by_name || row.initials || '—'}</td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {row.completed_at ? new Date(row.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{row.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Completion Report Section */}
            <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-emerald-600" />
                        Task Completion Report
                    </h2>
                    <button
                        type="button"
                        onClick={() => setShowCompletionReport(!showCompletionReport)}
                        className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                        {showCompletionReport ? 'Hide Report' : 'Show Report'}
                    </button>
                </div>

                {showCompletionReport && (
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="text-sm font-semibold text-gray-700">
                                From Date
                                <input
                                    type="date"
                                    value={reportDateFrom}
                                    onChange={(e) => setReportDateFrom(e.target.value)}
                                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                />
                            </label>
                            <label className="text-sm font-semibold text-gray-700">
                                To Date
                                <input
                                    type="date"
                                    value={reportDateTo}
                                    onChange={(e) => setReportDateTo(e.target.value)}
                                    className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                />
                            </label>
                        </div>

                        {reportLoading ? (
                            <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600"></div>
                                <span className="ml-3">Loading report...</span>
                            </div>
                        ) : completionReport?.records?.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100">
                                    <thead>
                                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Area / Shift</th>
                                            <th className="px-4 py-3">Task</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Completed By</th>
                                            <th className="px-4 py-3">Completed At</th>
                                            <th className="px-4 py-3">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {completionReport.records.map((record) => (
                                            <tr key={record.id}>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {new Date(record.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-semibold text-gray-900">{record.area}</div>
                                                    <p className="text-xs text-gray-500">{record.shift}</p>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900">{record.task}</td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={record.status} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    {record.completed_by ? (
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-4 w-4 text-gray-400" />
                                                            <div>
                                                                <div className="font-medium text-gray-900">{record.completed_by.name}</div>
                                                                <div className="text-xs text-gray-500">{record.initials}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-700">
                                                    {record.completed_at
                                                        ? new Date(record.completed_at).toLocaleString([], {
                                                              month: 'short',
                                                              day: 'numeric',
                                                              hour: '2-digit',
                                                              minute: '2-digit',
                                                          })
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{record.notes || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-4 text-sm text-gray-500">
                                    Total records: {completionReport.total_records}
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
                                No completion records found for the selected date range.
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

function SummaryCard({ label, value, subtext, tone = 'default', icon }) {
    const toneClasses = {
        default: 'bg-white text-gray-700',
        success: 'bg-emerald-50 text-emerald-700',
        warning: 'bg-amber-50 text-amber-700',
        danger: 'bg-rose-50 text-rose-700',
        muted: 'bg-gray-50 text-gray-600',
    };
    return (
        <div className={`rounded-3xl border border-gray-100 p-4 shadow-sm ${toneClasses[tone]}`}>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
            <div className="mt-2 flex items-center gap-2">
                <span className="text-3xl font-semibold">{value}</span>
                {icon}
            </div>
            <p className="mt-1 text-xs text-gray-500">{subtext}</p>
        </div>
    );
}

function StatusBadge({ status }) {
    const map = {
        completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        skipped: 'bg-amber-50 text-amber-700 ring-amber-200',
        pending: 'bg-gray-100 text-gray-600 ring-gray-200',
    };
    return (
        <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ring-1 ${map[status] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
        </span>
    );
}

function LoaderIndicator() {
    return (
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-gray-500">
            <RefreshCcw className="h-4 w-4 animate-spin" />
            Loading...
        </div>
    );
}

