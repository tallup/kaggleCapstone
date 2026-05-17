import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Hash,
    Star,
    StarOff,
    Trash2,
    Search,
    ShoppingCart,
    Loader2,
    Edit2,
    Check,
    X as XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import {
    faxNumbersQueryOptions,
    FAX_NAMESPACE,
} from '../../queries/fax';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import logger from '../../utils/logger';

function formatCents(cents) {
    if (cents == null) return '—';
    return `$${(Number(cents) / 100).toFixed(2)}`;
}

function formatDate(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleDateString();
    } catch {
        return value;
    }
}

function StatusPill({ active }) {
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}
        >
            {active ? 'Active' : 'Inactive'}
        </span>
    );
}

function FriendlyNameEditor({ number, onSave, isPending }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(number.friendly_name || '');

    if (!editing) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-gray-700">{number.friendly_name || <span className="text-gray-400">—</span>}</span>
                <button
                    type="button"
                    onClick={() => { setValue(number.friendly_name || ''); setEditing(true); }}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    aria-label="Edit friendly name"
                >
                    <Edit2 className="w-3 h-3" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1">
            <input
                autoFocus
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] w-40"
            />
            <button
                type="button"
                onClick={() => { onSave(value.trim() || null); setEditing(false); }}
                disabled={isPending}
                className="p-1 rounded text-emerald-600 hover:bg-emerald-50"
                aria-label="Save"
            >
                <Check className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => setEditing(false)}
                className="p-1 rounded text-gray-400 hover:bg-gray-100"
                aria-label="Cancel"
            >
                <XIcon className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function FaxNumbersPage() {
    const queryClient = useQueryClient();
    const [releaseConfirm, setReleaseConfirm] = useState(null);
    const [buyConfirm, setBuyConfirm] = useState(null);
    const [searchForm, setSearchForm] = useState({ area_code: '', country: 'US', limit: 10 });
    const [searchResults, setSearchResults] = useState([]);

    const { data: numbers, isLoading } = useQuery(faxNumbersQueryOptions);
    const list = Array.isArray(numbers) ? numbers : [];

    const invalidate = () => queryClient.invalidateQueries({ queryKey: [...FAX_NAMESPACE, 'numbers'] });

    const updateMutation = useMutation({
        mutationFn: async ({ id, payload }) => (await api.patch(`/fax/numbers/${id}`, payload)).data,
        onSuccess: () => {
            invalidate();
            queryClient.invalidateQueries({ queryKey: [...FAX_NAMESPACE, 'settings'] });
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Update failed'),
    });

    const releaseMutation = useMutation({
        mutationFn: async (id) => { await api.delete(`/fax/numbers/${id}`); },
        onSuccess: () => {
            toast.success('Number released');
            invalidate();
            setReleaseConfirm(null);
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || 'Release failed');
            setReleaseConfirm(null);
        },
    });

    const searchMutation = useMutation({
        mutationFn: async (form) => {
            const res = await api.post('/fax/numbers/search', {
                area_code: form.area_code || undefined,
                country: form.country || undefined,
                limit: Number(form.limit) || 10,
            });
            return res.data;
        },
        onSuccess: (data) => {
            const list = data?.data || [];
            setSearchResults(list);
            if (list.length === 0) toast.info('No available numbers matched your search.');
        },
        onError: (err) => {
            const msg = err?.response?.data?.message || 'Number search failed';
            toast.error(msg);
            logger.error('Fax number search failed:', err);
        },
    });

    const buyMutation = useMutation({
        mutationFn: async ({ e164_number, friendly_name }) => {
            const payload = { e164_number };
            if (friendly_name) payload.friendly_name = friendly_name;
            return (await api.post('/fax/numbers', payload)).data;
        },
        onSuccess: () => {
            toast.success('Number provisioned');
            invalidate();
            setBuyConfirm(null);
            setSearchResults((prev) => prev.filter((r) => r.e164_number !== buyConfirm?.e164_number));
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || 'Failed to provision number');
            setBuyConfirm(null);
        },
    });

    const handleSetDefault = (n) =>
        updateMutation.mutate({ id: n.id, payload: { is_default: true } });
    const handleToggleActive = (n) =>
        updateMutation.mutate({ id: n.id, payload: { is_active: !n.is_active } });
    const handleSaveFriendly = (n, friendly_name) =>
        updateMutation.mutate({ id: n.id, payload: { friendly_name } });

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Hash className="w-5 h-5 text-rose-600" />
                    Fax numbers
                </h1>
                <p className="text-sm text-gray-500">
                    Manage your provisioned fax numbers and provision new ones.
                </p>
            </header>

            {/* Existing numbers */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">Your numbers</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">E.164</th>
                                <th className="px-4 py-3 text-left font-semibold">Friendly name</th>
                                <th className="px-4 py-3 text-left font-semibold">Default</th>
                                <th className="px-4 py-3 text-left font-semibold">Status</th>
                                <th className="px-4 py-3 text-right font-semibold">Monthly cost</th>
                                <th className="px-4 py-3 text-left font-semibold">Provisioned</th>
                                <th className="px-4 py-3 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                        <Loader2 className="inline w-5 h-5 animate-spin" />
                                    </td>
                                </tr>
                            )}
                            {!isLoading && list.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12">
                                        <EmptyState
                                            icon={Hash}
                                            title="No fax numbers yet"
                                            description="Search and provision a number below to start sending and receiving faxes."
                                        />
                                    </td>
                                </tr>
                            )}
                            {list.map((n) => (
                                <tr key={n.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-900 font-medium tabular-nums">
                                        {n.e164_number}
                                    </td>
                                    <td className="px-4 py-3">
                                        <FriendlyNameEditor
                                            number={n}
                                            isPending={updateMutation.isPending}
                                            onSave={(v) => handleSaveFriendly(n, v)}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            type="button"
                                            disabled={n.is_default || updateMutation.isPending}
                                            onClick={() => handleSetDefault(n)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                                                n.is_default
                                                    ? 'border-amber-200 bg-amber-50 text-amber-700 cursor-default'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {n.is_default ? <Star className="w-3 h-3 fill-current" /> : <StarOff className="w-3 h-3" />}
                                            {n.is_default ? 'Default' : 'Set default'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(n)}
                                            disabled={updateMutation.isPending}
                                            className="rounded-md"
                                            aria-label={n.is_active ? 'Disable number' : 'Activate number'}
                                        >
                                            <StatusPill active={n.is_active} />
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                                        {formatCents(n.monthly_cost_cents)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(n.provisioned_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setReleaseConfirm(n)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-200 bg-white text-xs font-semibold text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-3 h-3" /> Release
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Search & buy */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <div className="px-5 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                        <Search className="w-4 h-4" /> Search and buy a number
                    </h2>
                </div>
                <form
                    onSubmit={(e) => { e.preventDefault(); searchMutation.mutate(searchForm); }}
                    className="p-5 grid grid-cols-1 sm:grid-cols-4 gap-3"
                >
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Area code</label>
                        <input
                            type="text"
                            value={searchForm.area_code}
                            onChange={(e) => setSearchForm((s) => ({ ...s, area_code: e.target.value }))}
                            placeholder="415"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Country</label>
                        <input
                            type="text"
                            value={searchForm.country}
                            onChange={(e) => setSearchForm((s) => ({ ...s, country: e.target.value.toUpperCase().slice(0, 2) }))}
                            placeholder="US"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Limit</label>
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={searchForm.limit}
                            onChange={(e) => setSearchForm((s) => ({ ...s, limit: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={searchMutation.isPending}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-[var(--theme-text-on-primary,white)] text-sm font-semibold hover:bg-[var(--theme-primary-hover,var(--theme-primary))] disabled:opacity-60"
                        >
                            {searchMutation.isPending ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Searching…</>
                            ) : (
                                <><Search className="w-4 h-4" /> Search</>
                            )}
                        </button>
                    </div>
                </form>

                {searchResults.length > 0 && (
                    <div className="border-t border-gray-100">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">Number</th>
                                    <th className="px-4 py-3 text-left font-semibold">Region</th>
                                    <th className="px-4 py-3 text-right font-semibold">Monthly cost</th>
                                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {searchResults.map((r) => (
                                    <tr key={r.e164_number} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-900 font-medium tabular-nums">
                                            {r.e164_number}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{r.region || '—'}</td>
                                        <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                                            {formatCents(r.monthly_cost_cents)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => setBuyConfirm(r)}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                                            >
                                                <ShoppingCart className="w-3 h-3" /> Buy
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <ConfirmDialog
                isOpen={Boolean(releaseConfirm)}
                onClose={() => setReleaseConfirm(null)}
                onConfirm={() => releaseConfirm && releaseMutation.mutate(releaseConfirm.id)}
                title="Release this number?"
                description={`Release ${releaseConfirm?.e164_number}? You will lose this number and can no longer receive faxes on it.`}
                confirmLabel="Release"
                variant="danger"
                isPending={releaseMutation.isPending}
            />

            <ConfirmDialog
                isOpen={Boolean(buyConfirm)}
                onClose={() => setBuyConfirm(null)}
                onConfirm={() => buyConfirm && buyMutation.mutate({ e164_number: buyConfirm.e164_number })}
                title="Provision this number?"
                description={
                    buyConfirm
                        ? `Provision ${buyConfirm.e164_number}? You'll be billed ${formatCents(buyConfirm.monthly_cost_cents)} / month.`
                        : ''
                }
                confirmLabel="Provision"
                variant="primary"
                isPending={buyMutation.isPending}
            />
        </div>
    );
}
