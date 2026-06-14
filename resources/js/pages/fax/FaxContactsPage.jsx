import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Users,
    Plus,
    Search,
    Edit2,
    Trash2,
    Loader2,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import {
    faxContactsQueryOptions,
    FAX_NAMESPACE,
} from '../../queries/fax';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import logger from '../../utils/logger';

const CONTACT_TYPES = [
    { value: 'pharmacy',  label: 'Pharmacy' },
    { value: 'physician', label: 'Physician' },
    { value: 'agency',    label: 'Agency' },
    { value: 'hospital',  label: 'Hospital' },
    { value: 'other',     label: 'Other' },
];

const TYPE_FILTERS = [{ value: 'all', label: 'All types' }, ...CONTACT_TYPES];

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

const contactSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    organization: z.string().max(255).optional().or(z.literal('')),
    fax_e164: z.string().regex(E164_REGEX, 'Use E.164 format, e.g. +14155550100'),
    phone: z.string().max(50).optional().or(z.literal('')),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    address: z.string().max(500).optional().or(z.literal('')),
    contact_type: z.enum(['pharmacy', 'physician', 'agency', 'hospital', 'other']),
    notes: z.string().max(2000).optional().or(z.literal('')),
});

function ContactForm({ initial, onCancel, onSubmit, isPending, errorMessage }) {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(contactSchema),
        defaultValues: {
            name: initial?.name || '',
            organization: initial?.organization || '',
            fax_e164: initial?.fax_e164 || '',
            phone: initial?.phone || '',
            email: initial?.email || '',
            address: initial?.address || '',
            contact_type: initial?.contact_type || 'pharmacy',
            notes: initial?.notes || '',
        },
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {errorMessage}
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        {...register('name')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Organization</label>
                    <input
                        type="text"
                        {...register('organization')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Fax number (E.164) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="tel"
                        inputMode="tel"
                        placeholder="+14155550100"
                        {...register('fax_e164')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                    {errors.fax_e164 && <p className="mt-1 text-xs text-red-600">{errors.fax_e164.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                    <input
                        type="tel"
                        {...register('phone')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        {...register('email')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Type <span className="text-red-500">*</span>
                    </label>
                    <select
                        {...register('contact_type')}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    >
                        {CONTACT_TYPES.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                <input
                    type="text"
                    {...register('address')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                    rows={3}
                    {...register('notes')}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isPending}
                    className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-[var(--theme-text-on-primary,white)] text-sm font-semibold hover:bg-[var(--theme-primary-hover,var(--theme-primary))] disabled:opacity-60"
                >
                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {initial ? 'Update contact' : 'Create contact'}
                </button>
            </div>
        </form>
    );
}

export default function FaxContactsPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState(null); // null = closed; {} = new; {id, ...} = edit
    const [confirmDelete, setConfirmDelete] = useState(null);
    const [formError, setFormError] = useState(null);

    const params = useMemo(
        () => ({
            search: search || undefined,
            type: typeFilter !== 'all' ? typeFilter : undefined,
            active: 1,
            page,
            per_page: 25,
        }),
        [search, typeFilter, page]
    );

    const { data, isLoading } = useQuery(faxContactsQueryOptions(params));
    const rows = data?.data || [];
    const meta = data?.meta || null;
    const totalPages = meta?.last_page || 1;

    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: [...FAX_NAMESPACE, 'contacts'] });

    const createMutation = useMutation({
        mutationFn: async (values) => (await api.post('/fax/contacts', values)).data,
        onSuccess: () => {
            toast.success('Contact created');
            invalidate();
            setEditing(null);
            setFormError(null);
        },
        onError: (err) => {
            const msg = err?.response?.data?.message || 'Failed to create contact';
            setFormError(msg);
            logger.error('Create fax contact failed:', err);
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, values }) => (await api.patch(`/fax/contacts/${id}`, values)).data,
        onSuccess: () => {
            toast.success('Contact updated');
            invalidate();
            setEditing(null);
            setFormError(null);
        },
        onError: (err) => {
            const msg = err?.response?.data?.message || 'Failed to update contact';
            setFormError(msg);
            logger.error('Update fax contact failed:', err);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => { await api.delete(`/fax/contacts/${id}`); },
        onSuccess: () => {
            toast.success('Contact deleted');
            invalidate();
            setConfirmDelete(null);
        },
        onError: (err) => toast.error(err?.response?.data?.message || 'Delete failed'),
    });

    const isModalOpen = editing !== null;
    const isEditing = Boolean(editing?.id);

    return (
        <div className="space-y-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-sky-600" />
                        Fax contacts
                    </h1>
                    <p className="text-sm text-gray-500">
                        Pharmacies, physicians, and agencies you fax regularly.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => { setEditing({}); setFormError(null); }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-[var(--theme-text-on-primary,white)] text-sm font-semibold hover:bg-[var(--theme-primary-hover,var(--theme-primary))]"
                >
                    <Plus className="w-4 h-4" /> New contact
                </button>
            </header>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search name, organization, fax…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                >
                    {TYPE_FILTERS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Name</th>
                                <th className="px-4 py-3 text-left font-semibold">Organization</th>
                                <th className="px-4 py-3 text-left font-semibold">Fax</th>
                                <th className="px-4 py-3 text-left font-semibold">Type</th>
                                <th className="px-4 py-3 text-left font-semibold">Email</th>
                                <th className="px-4 py-3 text-right font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                                        <Loader2 className="inline w-5 h-5 animate-spin" />
                                    </td>
                                </tr>
                            )}
                            {!isLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-12">
                                        <EmptyState
                                            icon={Users}
                                            title="No contacts yet"
                                            description="Save the pharmacies and physicians you fax most often."
                                            action={
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditing({}); setFormError(null); }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--theme-primary)] text-[var(--theme-text-on-primary,white)] text-sm font-semibold"
                                                >
                                                    <Plus className="w-4 h-4" /> New contact
                                                </button>
                                            }
                                        />
                                    </td>
                                </tr>
                            )}
                            {rows.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-900 font-medium">{c.name}</td>
                                    <td className="px-4 py-3 text-gray-700">{c.organization || '—'}</td>
                                    <td className="px-4 py-3 text-gray-700 tabular-nums">{c.fax_e164}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 capitalize">
                                            {c.contact_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{c.email || '—'}</td>
                                    <td className="px-4 py-3 text-right space-x-1">
                                        <button
                                            type="button"
                                            onClick={() => { setEditing(c); setFormError(null); }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                        >
                                            <Edit2 className="w-3 h-3" /> Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirmDelete(c)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-red-200 bg-white text-xs font-semibold text-red-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-3 h-3" /> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-sm">
                        <div className="text-gray-500">Page {meta?.current_page ?? page} of {totalPages}</div>
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => { if (!createMutation.isPending && !updateMutation.isPending) setEditing(null); }}
                title={isEditing ? 'Edit contact' : 'New contact'}
                size="lg"
            >
                <ContactForm
                    key={editing?.id ?? 'new'}
                    initial={isEditing ? editing : null}
                    onCancel={() => setEditing(null)}
                    isPending={createMutation.isPending || updateMutation.isPending}
                    errorMessage={formError}
                    onSubmit={(values) => {
                        const payload = { ...values };
                        ['organization', 'phone', 'email', 'address', 'notes'].forEach((k) => {
                            if (payload[k] === '') payload[k] = null;
                        });
                        if (isEditing) {
                            updateMutation.mutate({ id: editing.id, values: payload });
                        } else {
                            createMutation.mutate(payload);
                        }
                    }}
                />
            </Modal>

            <ConfirmDialog
                isOpen={Boolean(confirmDelete)}
                onClose={() => setConfirmDelete(null)}
                onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
                title="Delete contact?"
                description={`Remove "${confirmDelete?.name}" from your fax address book? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
