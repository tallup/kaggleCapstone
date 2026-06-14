import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Send,
    Inbox,
    PenLine,
    Users,
    Hash,
    Settings,
    ArrowRight,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Printer,
    BarChart3,
} from 'lucide-react';
import ScrollReveal from '../../components/ui/ScrollReveal';
import {
    faxSettingsQueryOptions,
    faxCostSummaryQueryOptions,
} from '../../queries/fax';

const TILES = [
    {
        id: 'sent',
        title: 'Sent',
        description: 'Track outbound faxes, delivery status, and retries.',
        icon: Send,
        path: '/fax/sent',
        accent: 'text-indigo-600',
        bg: 'bg-indigo-50',
    },
    {
        id: 'inbox',
        title: 'Inbox',
        description: 'Inbound faxes from pharmacies, physicians, and agencies.',
        icon: Inbox,
        path: '/fax/inbox',
        accent: 'text-emerald-600',
        bg: 'bg-emerald-50',
    },
    {
        id: 'compose',
        title: 'Compose',
        description: 'Send a new fax — refills, orders, records.',
        icon: PenLine,
        path: '/fax/compose',
        accent: 'text-amber-600',
        bg: 'bg-amber-50',
    },
    {
        id: 'contacts',
        title: 'Contacts',
        description: 'Address book of pharmacies, physicians, and agencies.',
        icon: Users,
        path: '/fax/contacts',
        accent: 'text-sky-600',
        bg: 'bg-sky-50',
    },
    {
        id: 'numbers',
        title: 'Numbers',
        description: 'Manage your facility\u2019s fax numbers and provision new ones.',
        icon: Hash,
        path: '/fax/numbers',
        accent: 'text-rose-600',
        bg: 'bg-rose-50',
    },
    {
        id: 'settings',
        title: 'Settings',
        description: 'Configure your fax provider, defaults, and webhooks.',
        icon: Settings,
        path: '/fax/settings',
        accent: 'text-slate-700',
        bg: 'bg-slate-100',
    },
];

function formatCents(cents) {
    if (cents == null) return '$0.00';
    return `$${(Number(cents) / 100).toFixed(2)}`;
}

function currentMonthYYYYMM() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function MonthLabel({ value }) {
    if (!value) return null;
    try {
        const [y, m] = value.split('-').map(Number);
        const d = new Date(y, (m || 1) - 1, 1);
        return <span>{d.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</span>;
    } catch {
        return <span>{value}</span>;
    }
}

export default function FaxHubPage() {
    const month = useMemo(() => currentMonthYYYYMM(), []);

    const { data: settings, isLoading: settingsLoading } = useQuery(faxSettingsQueryOptions);
    const { data: cost, isLoading: costLoading } = useQuery(faxCostSummaryQueryOptions(month));

    const testStatus = settings?.last_test_status;
    const needsAttention = !settings?.is_active || (testStatus && testStatus !== 'ok');

    return (
        <div className="space-y-6">
            {/* Cost banner */}
            <div className="bg-gradient-to-br from-[var(--theme-primary,#4338ca)] to-[var(--theme-primary-dark,#3730a3)] rounded-2xl p-6 text-white shadow-md">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm">
                            <Printer className="w-6 h-6" aria-hidden="true" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-tight">Fax</h1>
                            <p className="text-sm text-white/80">
                                <MonthLabel value={cost?.month || month} /> usage at a glance
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        {costLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin opacity-70" />
                        ) : (
                            <>
                                <div className="text-3xl font-bold tabular-nums">{formatCents(cost?.cost_cents)}</div>
                                <div className="mt-1 text-xs uppercase tracking-wider text-white/70 flex items-center gap-3 justify-end">
                                    <span><span className="font-semibold tabular-nums">{cost?.fax_count ?? 0}</span> faxes</span>
                                    <span><span className="font-semibold tabular-nums">{cost?.page_count ?? 0}</span> pages</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Provider status */}
            <div
                className={`rounded-2xl border p-4 sm:p-5 flex items-start gap-3 ${
                    needsAttention
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-emerald-200 bg-emerald-50'
                }`}
            >
                <div
                    className={`mt-0.5 w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        needsAttention ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                >
                    {needsAttention ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <div className="text-sm font-semibold text-gray-900">
                                Provider:{' '}
                                {settingsLoading ? (
                                    <span className="inline-block w-24 h-4 bg-gray-200 rounded animate-pulse align-middle" />
                                ) : (
                                    <span>{settings?.provider_display_name || settings?.provider || 'Not configured'}</span>
                                )}
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                                {needsAttention
                                    ? settings?.last_test_message ||
                                      (settings?.is_active === false
                                          ? 'Fax sending is currently disabled.'
                                          : 'Provider has not passed a connection test yet.')
                                    : `Last successful test: ${settings?.last_tested_at ? new Date(settings.last_tested_at).toLocaleString() : 'recently'}.`}
                            </div>
                        </div>
                        {needsAttention && (
                            <Link
                                to="/fax/settings"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                            >
                                Open settings
                                <ArrowRight className="w-3 h-3" />
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Cost breakdown by type */}
            {cost?.by_type && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-gray-400" />
                            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                                This month by type
                            </h2>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {Object.entries(cost.by_type).map(([type, stats]) => (
                            <div key={type} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                    {type}
                                </div>
                                <div className="mt-2 text-2xl font-bold tabular-nums text-gray-900">
                                    {formatCents(stats?.cost_cents)}
                                </div>
                                <div className="mt-1 text-xs text-gray-500 tabular-nums">
                                    {stats?.count ?? 0} faxes · {stats?.pages ?? 0} pages
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {TILES.map((tile, i) => {
                    const Icon = tile.icon;
                    return (
                        <ScrollReveal key={tile.id} animationType="fade" delay={i * 60}>
                            <Link
                                to={tile.path}
                                className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-gray-200 motion-safe:transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
                            >
                                <div className="flex items-start justify-between">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tile.bg}`}>
                                        <Icon className={`w-5 h-5 ${tile.accent}`} aria-hidden="true" />
                                    </div>
                                    <ArrowRight
                                        className="w-4 h-4 text-gray-300 group-hover:text-[var(--theme-primary)] group-hover:translate-x-0.5 motion-safe:transition-all mt-1"
                                        aria-hidden="true"
                                    />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-gray-900 group-hover:text-[var(--theme-primary)] motion-safe:transition-colors leading-tight">
                                        {tile.title}
                                    </h2>
                                    <p className="mt-1 text-sm text-gray-500 leading-snug">
                                        {tile.description}
                                    </p>
                                </div>
                            </Link>
                        </ScrollReveal>
                    );
                })}
            </div>
        </div>
    );
}
