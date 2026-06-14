import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Send,
    Search,
    Filter,
    RotateCw,
    Loader2,
    ChevronLeft,
    ChevronRight,
    PenLine,
    Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import {
    faxesQueryOptions,
    FAXES_NAMESPACE,
    FAX_NAMESPACE,
} from '../../queries/fax';
import { currentUserQueryOptions } from '../../queries/currentUser';
import useFaxUpdates from '../../hooks/useFaxUpdates';
import FaxDetailDrawer from '../../components/FaxDetailDrawer';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_OPTIONS = [
    { value: 'all',       label: 'All statuses' },
    { value: 'queued',    label: 'Queued' },
    { value: 'sending',   label: 'Sending' },
    { value: 'sent',      label: 'Sent' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'failed',    label: 'Failed' },
    { value: 'rejected',  label: 'Rejected' },
];

const TYPE_OPTIONS = [
    { value: 'all',     label: 'All types' },
    { value: 'refills', label: 'Refills' },
    { value: 'orders',  label: 'Orders' },
    { value: 'records', label: 'Records' },
];

function statusPalette(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('fail') || s.includes('reject') || s.includes('error')) {
        return 'bg-red-100 text-red-800 border-red-200';
    }
    if (s === 'sent' || s === 'delivered' || s.includes('success')) {
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (s === 'queued' || s === 'sending' || s.includes('pending')) {
        return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
}

function isFailedStatus(status) {
    const s = String(status || '').toLowerCase();
    return s.includes('fail') || s.includes('reject') || s.includes('error');
}

function formatDateTime(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

function senderName(row) {
    const user = row?.sent_by_user ?? row?.sent_by;
    return user?.name || user?.email || '—';
}

export default function FaxSentPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [activeFaxId, setActiveFaxId] = useState(null);

    const { data: currentUser } = useQuery(currentUserQueryOptions);
    useFaxUpdates(currentUser?.facility_id);

    const params = useMemo(
        () => ({
            direction: 'outbound',
            status: statusFilter !== 'all' ? statusFilter : undefined,
            type: typeFilter !== 'all' ? typeFilter : undefined,
            from: dateFrom || undefined,
            to: dateTo || undefined,
            search: search || undefined,
            page,
            per_page: 25,
        }),
        [statusFilter, typeFilter, dateFrom, dateTo, search, page]
    );

    const { data, isLoading, isFetching } = useQuery(faxesQueryOptions(params));

    const retryMutation = useMutation({
        mutationFn: async (id) => {
            const res = await api.post(`/fax/${id}/retry`);
            return res.data;
        },
        onSuccess: (_d, id) => {
            toast.success('Fax retry queued');
            queryClient.invalidateQueries({ queryKey: FAXES_NAMESPACE });
            queryClient.invalidateQueries({ queryKey: [...FAX_NAMESPACE, id] });
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Retry failed'),
    });

    const rows = data?.data || [];
    const meta = data?.meta || null;
    const totalPages = meta?.last_page || 1;

    return (
        <div className="space-y-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Send className="w-5 h-5 text-[var(--theme-primary)]" />
                        Sent faxes
                    </h1>
                    <p className="text-sm text-gray-500">Outbound history with delivery status and retries.</p>
                </div>
                <Link
                    to="/fax/compose"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-[var(--theme-text-on-primary,white)] text-sm font-semibold hover:bg-[var(--theme-primary-hover,var(--theme-primary))] transition-colors"
                >
                    <PenLine className="w-4 h-4" />
                    Compose
                </Link>
            </header>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                    <Filter className="w-3.5 h-3.5" /> Filters
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="lg:col-span-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search subject, number, contact…"
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                            />
                        </div>
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    >
                        {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <select
                        value={typeFilter}
                        onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    >
                        {TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                            aria-label="From date"
                        />
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                            aria-label="To date"
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">To</th>
                                <th className="px-4 py-3 text-left font-semibold">Contact</th>
                                <th className="px-4 py-3 text-left font-semibold">Subject</th>
                                <th className="px-4 py-3 text-left font-semibold">Type</th>
                                <th className="px-4 py-3 text-right font-semibold">Pages</th>
                                <th className="px-4 py-3 text-left font-semibold">Status</th>
                                <th className="px-4 py-3 text-left font-semibold">Sent at</th>
                                <th className="px-4 py-3 text-left font-semibold">Sent by</th>
                                <th className="px-4 py-3 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400">
                                        <Loader2 className="inline w-5 h-5 animate-spin" />
                                    </td>
                                </tr>
                            )}
                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12">
                                        <EmptyState
                                            icon={Send}
                                            title="No outbound faxes yet"
                                            description="Outbound faxes you send will appear here with their delivery status."
                                            action={
                                                <Link
                                                    to="/fax/compose"
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-[var(--theme-text-on-primary,white)] text-sm font-semibold"
                                                >
                                                    <PenLine className="w-4 h-4" /> Compose fax
                                                </Link>
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                            {rows.map((row) => {
                                const failed = isFailedStatus(row.status);
                                return (
                                    <tr
                                        key={row.id}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => setActiveFaxId(row.id)}
                                    >
                                        <td className="px-4 py-3 text-gray-900 font-medium tabular-nums">
                                            {row.to_number || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {row.contact ? (
                                                <span>
                                                    {row.contact.name}
                                                    {row.contact.organization && (
                                                        <span className="text-gray-500 text-xs"> · {row.contact.organization}</span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                                            {row.subject || <span className="text-gray-400">No subject</span>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                                {row.fax_type_label || row.fax_type || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                                            {row.page_count ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusPalette(row.status)}`}>
                                                {row.status_label || row.status || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700 text-xs">{formatDateTime(row.sent_at)}</td>
                                        <td className="px-4 py-3 text-gray-700">{senderName(row)}</td>
                                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="inline-flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveFaxId(row.id)}
                                                    aria-label="View fax details"
                                                    title="View fax details"
                                                    className="inline-flex items-center justify-center p-1.5 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                                >
                                                    <Eye className="w-4 h-4" aria-hidden="true" />
                                                </button>
                                                {failed && (
                                                    <button
                                                        type="button"
                                                        onClick={() => retryMutation.mutate(row.id)}
                                                        disabled={retryMutation.isPending}
                                                        aria-label="Retry fax"
                                                        title="Retry fax"
                                                        className="inline-flex items-center justify-center p-1.5 rounded-md border border-red-600 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                                                    >
                                                        <RotateCw className="w-4 h-4" aria-hidden="true" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
                        <div className="text-gray-500">
                            Page {meta?.current_page ?? page} of {totalPages}
                            {isFetching && <Loader2 className="inline w-3 h-3 animate-spin ml-2" />}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                                aria-label="Next page"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <FaxDetailDrawer
                faxId={activeFaxId}
                open={Boolean(activeFaxId)}
                onClose={() => setActiveFaxId(null)}
            />
        </div>
    );
}
