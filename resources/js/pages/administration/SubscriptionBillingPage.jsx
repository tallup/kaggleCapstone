import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import api from '../../services/api';
import { useToastContext } from '../../contexts/ToastContext';

function statusLabel(status) {
    if (!status) return '—';
    const s = String(status).toLowerCase();
    if (s === 'active') return 'Active';
    if (s === 'trialing') return 'Trialing';
    if (s === 'past_due') return 'Past due';
    if (s === 'canceled' || s === 'cancelled') return 'Canceled';
    if (s === 'incomplete' || s === 'incomplete_expired') return 'Incomplete';
    return status;
}

export default function SubscriptionBillingPage() {
    const { showToast } = useToastContext();

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['saas-billing'],
        queryFn: async () => {
            const res = await api.get('/saas-billing');
            return res.data?.data;
        },
    });

    const portalMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/saas-billing/portal');
            return res.data?.data?.url;
        },
        onSuccess: (url) => {
            if (typeof url === 'string' && url.startsWith('http')) {
                window.location.assign(url);
            } else {
                showToast('Could not open billing portal.', 'error');
            }
        },
        onError: (err) => {
            const msg = err.response?.data?.message || 'Could not open billing portal.';
            showToast(msg, 'error');
        },
    });

    if (isLoading) {
        return (
            <div className="max-w-4xl mx-auto w-full flex items-center justify-center min-h-[240px] text-gray-500 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
                <span>Loading billing…</span>
            </div>
        );
    }

    if (isError) {
        const msg = error?.response?.data?.message || 'You do not have access to subscription billing.';
        return (
            <div className="max-w-4xl mx-auto w-full rounded-xl border border-amber-100 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
                {msg}
            </div>
        );
    }

    const sub = data?.subscription;
    const contact = data?.billing_contact;
    const stripe = data?.stripe;

    return (
        <div className="space-y-6 max-w-4xl mx-auto w-full">
            <div>
                <h1 className="text-xl font-bold text-gray-900">Subscription &amp; billing</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Manage payment methods and invoices in Stripe. Subscription status is shown below.
                </p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-dark)]" aria-hidden />
                <div className="p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">Plan</span>
                            {sub?.status && (
                                <span
                                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                        sub.status === 'active' || sub.status === 'trialing'
                                            ? 'bg-emerald-50 text-emerald-800'
                                            : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    {statusLabel(sub.status)}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-700">
                            {sub?.plan_name || sub?.price_id || (data?.is_subscribed ? 'Subscribed' : 'No active subscription')}
                        </p>
                        {sub?.trial_ends_at && (
                            <p className="text-xs text-gray-500">Trial ends {new Date(sub.trial_ends_at).toLocaleDateString()}</p>
                        )}
                        {sub?.ends_at && sub.status !== 'active' && (
                            <p className="text-xs text-gray-500">Ends {new Date(sub.ends_at).toLocaleDateString()}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => portalMutation.mutate()}
                        disabled={portalMutation.isPending}
                        className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--theme-text-on-primary)] bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--theme-primary)] disabled:opacity-60 motion-safe:transition-colors"
                    >
                        {portalMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                        ) : (
                            <CreditCard className="w-4 h-4" aria-hidden />
                        )}
                        Payment methods &amp; invoices
                        <ExternalLink className="w-3.5 h-3.5 opacity-80" aria-hidden />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-900">Billing contact</h2>
                    <dl className="mt-3 space-y-2 text-sm text-gray-700">
                        <div>
                            <dt className="text-gray-500 text-xs">Name</dt>
                            <dd>{contact?.name || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500 text-xs">Email</dt>
                            <dd>{contact?.email || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500 text-xs">Phone</dt>
                            <dd>{contact?.phone || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500 text-xs">Address</dt>
                            <dd className="whitespace-pre-wrap">{contact?.address || '—'}</dd>
                        </div>
                    </dl>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-bold text-gray-900">Payment method on file</h2>
                    <p className="mt-3 text-sm text-gray-700">
                        {stripe?.pm_type && stripe?.pm_last_four
                            ? `${String(stripe.pm_type).toUpperCase()} ending in ${stripe.pm_last_four}`
                            : '—'}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                        Update cards and download invoices in Stripe via the button above.
                    </p>
                </div>
            </div>

            <p className="text-xs text-gray-400">
                <button type="button" className="underline hover:text-gray-600" onClick={() => refetch()}>
                    Refresh status
                </button>
            </p>
        </div>
    );
}
