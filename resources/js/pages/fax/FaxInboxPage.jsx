import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Inbox,
    Search,
    Filter,
    Loader2,
    ChevronLeft,
    ChevronRight,
    UserPlus,
} from 'lucide-react';
import {
    faxesQueryOptions,
} from '../../queries/fax';
import { currentUserQueryOptions } from '../../queries/currentUser';
import useFaxUpdates from '../../hooks/useFaxUpdates';
import FaxDetailDrawer from '../../components/FaxDetailDrawer';
import EmptyState from '../../components/ui/EmptyState';

function formatDateTime(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

export default function FaxInboxPage() {
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [activeFaxId, setActiveFaxId] = useState(null);

    const { data: currentUser } = useQuery(currentUserQueryOptions);
    useFaxUpdates(currentUser?.facility_id);

    const params = useMemo(
        () => ({
            direction: 'inbound',
            from: dateFrom || undefined,
            to: dateTo || undefined,
            search: search || undefined,
            page,
            per_page: 25,
        }),
        [dateFrom, dateTo, search, page]
    );

    const { data, isLoading, isFetching } = useQuery(faxesQueryOptions(params));

    const rows = data?.data || [];
    const meta = data?.meta || null;
    const totalPages = meta?.last_page || 1;

    return (
        <div className="space-y-5">
            <header>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-emerald-600" />
                    Inbox
                </h1>
                <p className="text-sm text-gray-500">
                    Inbound faxes received on your facility numbers.
                </p>
            </header>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                    <Filter className="w-3.5 h-3.5" /> Filters
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="lg:col-span-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search number, subject, resident…"
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                            />
                        </div>
                    </div>
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

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">From</th>
                                <th className="px-4 py-3 text-left font-semibold">To (our number)</th>
                                <th className="px-4 py-3 text-right font-semibold">Pages</th>
                                <th className="px-4 py-3 text-left font-semibold">Received at</th>
                                <th className="px-4 py-3 text-left font-semibold">Resident</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                                        <Loader2 className="inline w-5 h-5 animate-spin" />
                                    </td>
                                </tr>
                            )}
                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-12">
                                        <EmptyState
                                            icon={Inbox}
                                            title="Inbox is empty"
                                            description="Inbound faxes will appear here as they arrive."
                                        />
                                    </td>
                                </tr>
                            )}
                            {rows.map((row) => (
                                <tr
                                    key={row.id}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => setActiveFaxId(row.id)}
                                >
                                    <td className="px-4 py-3 text-gray-900 font-medium tabular-nums">
                                        {row.from_number || '—'}
                                        {row.contact && (
                                            <div className="text-xs text-gray-500 font-normal">
                                                {row.contact.name}
                                                {row.contact.organization && (
                                                    <span> · {row.contact.organization}</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 tabular-nums">{row.to_number || '—'}</td>
                                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                                        {row.page_count ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700 text-xs">{formatDateTime(row.received_at || row.created_at)}</td>
                                    <td className="px-4 py-3">
                                        {row.resident ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                {row.resident.name}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                                <UserPlus className="w-3 h-3" /> Unassigned
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

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
