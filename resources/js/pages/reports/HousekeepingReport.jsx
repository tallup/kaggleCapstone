import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, User, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import BranchSelector from '../../components/BranchSelector';
import PrintableReportLayout, { ReportPrintButton } from '../../components/reports/PrintableReportLayout';
import { getLocalDateString } from '../../utils/pacificTime';

function StatusBadge({ status }) {
    const getStatusStyles = (s) => {
        switch (s) {
            case 'completed':
                return {
                    backgroundColor: 'var(--theme-primary-bg)',
                    color: 'var(--theme-primary)',
                    borderColor: 'var(--theme-primary-bg)',
                };
            case 'skipped':
                return {
                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                    color: 'rgb(180, 83, 9)',
                    borderColor: 'rgba(251, 191, 36, 0.3)',
                };
            default:
                return {
                    backgroundColor: 'rgb(243, 244, 246)',
                    color: 'rgb(75, 85, 99)',
                    borderColor: 'rgb(229, 231, 235)',
                };
        }
    };
    const styles = getStatusStyles(status);
    return (
        <span className="inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ring-1" style={styles}>
            {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
        </span>
    );
}

export default function HousekeepingReport() {
    const [searchParams] = useSearchParams();
    const selectedBranchId = searchParams.get('branch');
    const [reportDateFrom, setReportDateFrom] = React.useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 7);
        return date.toISOString().slice(0, 10);
    });
    const [reportDateTo, setReportDateTo] = React.useState(() => getLocalDateString());

    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => (await api.get('/user')).data,
        staleTime: 5 * 60 * 1000,
    });

    const { data: completionReport, isLoading, error: reportError } = useQuery({
        queryKey: ['housekeeping-completion-report', reportDateFrom, reportDateTo, selectedBranchId],
        queryFn: async () => {
            const params = { date_from: reportDateFrom, date_to: reportDateTo };
            if (selectedBranchId) params.branch_id = selectedBranchId;
            const response = await api.get('/cleaning/completion-report', { params });
            return response.data;
        },
        enabled: !!selectedBranchId,
        staleTime: 60 * 1000,
        retry: 1,
    });

    if (!selectedBranchId) {
        return (
            <PrintableReportLayout title="Housekeeping Reports" subtitle="Task completion history">
                <div className="space-y-6">
                    <BranchSelector currentUser={currentUser} />
                    <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
                        <FileText className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-4 text-sm font-semibold text-gray-700">Select a branch to view the report</p>
                    </div>
                </div>
            </PrintableReportLayout>
        );
    }

    const records = completionReport?.records && Array.isArray(completionReport.records) ? completionReport.records : [];

    return (
        <PrintableReportLayout
            title="Housekeeping Reports"
            subtitle={`${reportDateFrom} to ${reportDateTo}`}
        >
            <div className="space-y-6">
                <BranchSelector currentUser={currentUser} />

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="h-7 w-7 text-[var(--theme-primary)]" />
                            Housekeeping completion report
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">Completed and skipped tasks by date range</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            to="/housekeeping"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--theme-primary)] hover:underline"
                        >
                            Open checklist
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                        <ReportPrintButton />
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 no-print">
                    <div className="grid gap-4 md:grid-cols-2 max-w-xl">
                        <label className="text-sm font-semibold text-gray-700">
                            From date
                            <input
                                type="date"
                                value={reportDateFrom}
                                onChange={(e) => setReportDateFrom(e.target.value)}
                                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            />
                        </label>
                        <label className="text-sm font-semibold text-gray-700">
                            To date
                            <input
                                type="date"
                                value={reportDateTo}
                                onChange={(e) => setReportDateTo(e.target.value)}
                                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            />
                        </label>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-sm text-gray-500">
                        Loading report…
                    </div>
                ) : reportError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        {reportError.response?.data?.message || reportError.message || 'Unable to load report.'}
                    </div>
                ) : records.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-600">
                        No completed or skipped tasks in this date range.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Area / Shift</th>
                                    <th className="px-4 py-3">Task</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">By</th>
                                    <th className="px-4 py-3">At</th>
                                    <th className="px-4 py-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {records.map((record) => (
                                    <tr key={record.id}>
                                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                            {new Date(record.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{record.area}</div>
                                            <div className="text-xs text-gray-500">{record.shift}</div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{record.task}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={record.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            {record.completed_by ? (
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                    <span>{record.completed_by.name}</span>
                                                </div>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                                            {record.status === 'skipped' && record.skipped_at
                                                ? new Date(record.skipped_at).toLocaleString()
                                                : record.completed_at
                                                  ? new Date(record.completed_at).toLocaleString()
                                                  : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 max-w-xs">{record.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="px-4 py-3 text-sm text-gray-500 border-t border-gray-100">
                            Total records: {completionReport?.total_records ?? records.length}
                        </div>
                    </div>
                )}
            </div>
        </PrintableReportLayout>
    );
}
