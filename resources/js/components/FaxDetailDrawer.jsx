import React, { useState, useEffect, useMemo } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    X,
    Download,
    RotateCw,
    Trash2,
    UserPlus,
    Inbox,
    Send,
    Loader2,
    Clock,
    FileText,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';
import {
    faxDetailQueryOptions,
    FAX_NAMESPACE,
    FAXES_NAMESPACE,
    FAX_COST_SUMMARY_NAMESPACE,
} from '../queries/fax';
import ConfirmDialog from './ui/ConfirmDialog';
import logger from '../utils/logger';

function formatDateTime(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value;
    }
}

function formatCents(cents) {
    if (cents == null) return '—';
    return `$${(Number(cents) / 100).toFixed(2)}`;
}

function StatusBadge({ status, label }) {
    const palette = useMemo(() => {
        const s = String(status || '').toLowerCase();
        if (s.includes('fail') || s.includes('error') || s.includes('reject')) {
            return 'bg-red-100 text-red-800 border-red-200';
        }
        if (s.includes('sent') || s.includes('delivered') || s === 'ok' || s.includes('success') || s.includes('received')) {
            return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        }
        if (s.includes('queue') || s.includes('pending') || s.includes('sending') || s.includes('processing')) {
            return 'bg-amber-100 text-amber-800 border-amber-200';
        }
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }, [status]);
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${palette}`}>
            {label || status || 'Unknown'}
        </span>
    );
}

function DirectionBadge({ direction }) {
    const isInbound = direction === 'inbound';
    const Icon = isInbound ? Inbox : Send;
    return (
        <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                isInbound
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-[var(--theme-primary-bg,#eef2ff)] text-[var(--theme-primary,#4338ca)] border-[var(--theme-primary-light,#c7d2fe)]'
            }`}
        >
            <Icon className="w-3 h-3" aria-hidden="true" />
            {isInbound ? 'Inbound' : 'Outbound'}
        </span>
    );
}

function MetaCell({ label, children }) {
    return (
        <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
            <div className="mt-1 text-sm text-gray-900 break-words">{children ?? '—'}</div>
        </div>
    );
}

function ResidentPickerInline({ value, onChange, disabled }) {
    const [search, setSearch] = useState('');
    const { data, isFetching } = useQuery({
        queryKey: ['residents-list', 'fax-attach', search],
        queryFn: async () => {
            const params = { per_page: 25 };
            if (search) params.search = search;
            const res = await api.get('/residents', { params });
            return res.data?.data || res.data || [];
        },
        staleTime: 30 * 1000,
    });
    const residents = Array.isArray(data) ? data : [];
    return (
        <div className="space-y-2">
            <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search residents…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                disabled={disabled}
            />
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                {isFetching && residents.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading…
                    </div>
                )}
                {!isFetching && residents.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500">No residents found.</div>
                )}
                {residents.map((r) => {
                    const id = r.id;
                    const name = r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || `Resident #${id}`;
                    const isSelected = value === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onChange(id)}
                            disabled={disabled}
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                isSelected
                                    ? 'bg-[var(--theme-primary-bg,#eef2ff)] text-[var(--theme-primary,#4338ca)] font-semibold'
                                    : 'hover:bg-gray-50 text-gray-700'
                            }`}
                        >
                            {name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function FaxDetailDrawer({ faxId, open, onClose }) {
    const queryClient = useQueryClient();
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [confirmRetry, setConfirmRetry] = useState(false);
    const [attachResidentId, setAttachResidentId] = useState(null);

    const enabled = Boolean(open && faxId);
    const { data: fax, isLoading, error } = useQuery({
        ...faxDetailQueryOptions(faxId),
        enabled,
    });

    useEffect(() => {
        if (!open) {
            setConfirmDelete(false);
            setConfirmRetry(false);
            setAttachResidentId(null);
        }
    }, [open]);

    useEffect(() => {
        if (fax?.resident?.id) {
            setAttachResidentId(fax.resident.id);
        } else {
            setAttachResidentId(null);
        }
    }, [fax?.resident?.id]);

    const retryMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post(`/fax/${faxId}/retry`);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Fax retry queued');
            queryClient.invalidateQueries({ queryKey: FAXES_NAMESPACE });
            queryClient.invalidateQueries({ queryKey: [...FAX_NAMESPACE, faxId] });
            setConfirmRetry(false);
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || 'Retry failed');
            logger.error('Fax retry failed:', err);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await api.delete(`/fax/${faxId}`);
        },
        onSuccess: () => {
            toast.success('Fax deleted');
            queryClient.invalidateQueries({ queryKey: FAXES_NAMESPACE });
            queryClient.invalidateQueries({ queryKey: FAX_COST_SUMMARY_NAMESPACE });
            setConfirmDelete(false);
            onClose?.();
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || 'Delete failed');
            logger.error('Fax delete failed:', err);
        },
    });

    const attachResidentMutation = useMutation({
        mutationFn: async (residentId) => {
            const res = await api.post(`/fax/${faxId}/attach-resident`, { resident_id: residentId });
            return res.data;
        },
        onSuccess: () => {
            toast.success('Resident attached');
            queryClient.invalidateQueries({ queryKey: FAXES_NAMESPACE });
            queryClient.invalidateQueries({ queryKey: [...FAX_NAMESPACE, faxId] });
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || 'Failed to attach resident');
        },
    });

    const handleDownload = () => {
        if (!faxId) return;
        const url = `/api/v1/fax/${faxId}/download`;
        window.open(url, '_blank', 'noopener');
    };

    const isInbound = fax?.direction === 'inbound';
    const isFailed = useMemo(() => {
        const s = String(fax?.status || '').toLowerCase();
        return s.includes('fail') || s.includes('error') || s.includes('reject');
    }, [fax?.status]);

    return (
        <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose?.()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-slate-900/30 backdrop-blur-sm" />
                <DialogPrimitive.Content
                    className="fixed right-0 top-0 z-[210] h-full w-full max-w-xl bg-white shadow-2xl flex flex-col focus:outline-none"
                    aria-describedby={undefined}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-gray-200 flex-shrink-0">
                        <div className="min-w-0 flex-1">
                            <DialogPrimitive.Title className="text-lg font-bold text-gray-900 truncate">
                                {fax?.subject || (isInbound ? 'Inbound fax' : 'Outbound fax')}
                            </DialogPrimitive.Title>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                                {fax && <DirectionBadge direction={fax.direction} />}
                                {fax && <StatusBadge status={fax.status} label={fax.status_label} />}
                                {fax?.fax_type && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                        {fax.fax_type_label || fax.fax_type}
                                    </span>
                                )}
                            </div>
                        </div>
                        <DialogPrimitive.Close
                            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            aria-label="Close drawer"
                        >
                            <X className="w-5 h-5" />
                        </DialogPrimitive.Close>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                        {isLoading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-[var(--theme-primary)]" />
                            </div>
                        )}
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span>{error?.response?.data?.message || 'Failed to load fax details.'}</span>
                            </div>
                        )}

                        {fax && (
                            <>
                                {/* Metadata grid */}
                                <section>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                                        Details
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl border border-gray-200 p-4">
                                        <MetaCell label="From">{fax.from_number}</MetaCell>
                                        <MetaCell label="To">{fax.to_number}</MetaCell>
                                        <MetaCell label="Contact">
                                            {fax.contact ? (
                                                <span>
                                                    {fax.contact.name}
                                                    {fax.contact.organization ? (
                                                        <span className="text-gray-500"> · {fax.contact.organization}</span>
                                                    ) : null}
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </MetaCell>
                                        <MetaCell label="Resident">{fax.resident?.name || '—'}</MetaCell>
                                        <MetaCell label="Pages">{fax.page_count ?? '—'}</MetaCell>
                                        <MetaCell label="Cost">{formatCents(fax.cost_cents)}</MetaCell>
                                        <MetaCell label="Sent at">{formatDateTime(fax.sent_at)}</MetaCell>
                                        <MetaCell label="Received at">{formatDateTime(fax.received_at)}</MetaCell>
                                        <MetaCell label="Created at">{formatDateTime(fax.created_at)}</MetaCell>
                                        <MetaCell label="Sent by">{fax.sent_by?.name || '—'}</MetaCell>
                                    </div>
                                </section>

                                {/* Download */}
                                <section className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-[var(--theme-text-on-primary,white)] text-sm font-semibold hover:bg-[var(--theme-primary-hover,var(--theme-primary))] transition-colors"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download PDF
                                    </button>
                                    {!isInbound && isFailed && (
                                        <button
                                            type="button"
                                            onClick={() => setConfirmRetry(true)}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
                                        >
                                            <RotateCw className="w-4 h-4" />
                                            Retry send
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDelete(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-white text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                </section>

                                {/* Attach resident (mostly for inbound) */}
                                <section>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                                        <UserPlus className="w-3.5 h-3.5" /> Attach to resident
                                    </h3>
                                    <ResidentPickerInline
                                        value={attachResidentId}
                                        onChange={setAttachResidentId}
                                        disabled={attachResidentMutation.isPending}
                                    />
                                    <div className="mt-2 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => attachResidentId && attachResidentMutation.mutate(attachResidentId)}
                                            disabled={!attachResidentId || attachResidentMutation.isPending || attachResidentId === fax.resident?.id}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {attachResidentMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                            Attach resident
                                        </button>
                                    </div>
                                </section>

                                {/* Events timeline */}
                                <section>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5" /> Event history
                                    </h3>
                                    {Array.isArray(fax.events) && fax.events.length > 0 ? (
                                        <ol className="space-y-3">
                                            {fax.events.map((evt) => (
                                                <li
                                                    key={evt.id}
                                                    className="rounded-lg border border-gray-200 bg-white p-3"
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-sm font-semibold text-gray-900">
                                                            {evt.event_type}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {formatDateTime(evt.received_at || evt.created_at)}
                                                        </span>
                                                    </div>
                                                    {evt.event_payload && Object.keys(evt.event_payload || {}).length > 0 && (
                                                        <pre className="mt-2 text-[11px] leading-relaxed text-gray-700 bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto">
                                                            {JSON.stringify(evt.event_payload, null, 2)}
                                                        </pre>
                                                    )}
                                                </li>
                                            ))}
                                        </ol>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-500 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            No events recorded yet.
                                        </div>
                                    )}
                                </section>
                            </>
                        )}
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>

            <ConfirmDialog
                isOpen={confirmRetry}
                onClose={() => setConfirmRetry(false)}
                onConfirm={() => retryMutation.mutate()}
                title="Retry fax?"
                description="Re-send this fax through your provider. You will be charged again on success."
                confirmLabel="Retry"
                variant="primary"
                isPending={retryMutation.isPending}
            />
            <ConfirmDialog
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={() => deleteMutation.mutate()}
                title="Delete fax?"
                description="This will permanently remove the fax record and its stored PDF."
                confirmLabel="Delete"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
        </DialogPrimitive.Root>
    );
}
