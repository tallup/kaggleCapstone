import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Settings,
    Save,
    PlugZap,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Webhook,
    Copy,
    Check,
    RotateCw,
    Lock,
    Eye,
    EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import {
    faxProvidersQueryOptions,
    faxSettingsQueryOptions,
    faxNumbersQueryOptions,
    faxWebhookUrlQueryOptions,
    FAX_NAMESPACE,
} from '../../queries/fax';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import logger from '../../utils/logger';

const CONFIGURED_PLACEHOLDER = '\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf';

function FieldLabel({ children, required, help }) {
    return (
        <div className="mb-1">
            <label className="block text-sm font-semibold text-gray-700">
                {children}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {help && <div className="text-xs text-gray-500 mt-0.5">{help}</div>}
        </div>
    );
}

function SecretInput({ field, value, onChange, status }) {
    const [reveal, setReveal] = useState(false);
    const configured = status === 'configured';
    const placeholder = configured
        ? `configured (${CONFIGURED_PLACEHOLDER})`
        : field.placeholder || '';

    return (
        <div className="relative">
            <input
                type={reveal ? 'text' : 'password'}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete="off"
                className="w-full pl-9 pr-10 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] font-mono"
            />
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                aria-label={reveal ? 'Hide value' : 'Show value'}
            >
                {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );
}

function CredentialField({ field, value, onChange, status }) {
    const type = field.type;
    if (type === 'secret') {
        return <SecretInput field={field} value={value} onChange={onChange} status={status} />;
    }
    if (type === 'boolean') {
        return (
            <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => onChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                />
                <span className="text-sm text-gray-700">Enabled</span>
            </label>
        );
    }
    if (type === 'select') {
        const options = Array.isArray(field.options) ? field.options : [];
        return (
            <select
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
            >
                <option value="">{field.placeholder || 'Select an option…'}</option>
                {options.map((opt) => {
                    const v = typeof opt === 'object' ? opt.value : opt;
                    const l = typeof opt === 'object' ? opt.label : opt;
                    return (
                        <option key={String(v)} value={String(v)}>{l}</option>
                    );
                })}
            </select>
        );
    }
    const inputType = type === 'url' ? 'url' : 'text';
    return (
        <input
            type={inputType}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ''}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
        />
    );
}

function buildCredentialsPayload(schema, formValues, status) {
    const out = {};
    (schema || []).forEach((f) => {
        const value = formValues[f.name];
        if (f.type === 'boolean') {
            out[f.name] = Boolean(value);
            return;
        }
        const isEmpty = value == null || value === '';
        if (f.type === 'secret' && isEmpty && status?.[f.name] === 'configured') {
            return;
        }
        if (!isEmpty) {
            out[f.name] = value;
        }
    });
    return out;
}

function stableHash(obj) {
    try {
        return JSON.stringify(obj, Object.keys(obj || {}).sort());
    } catch {
        return '';
    }
}

export default function FaxSettingsPage() {
    const queryClient = useQueryClient();

    const { data: providers, isLoading: providersLoading } = useQuery(faxProvidersQueryOptions);
    const { data: settings, isLoading: settingsLoading } = useQuery(faxSettingsQueryOptions);
    const { data: numbers } = useQuery(faxNumbersQueryOptions);
    const { data: webhook, isLoading: webhookLoading } = useQuery(faxWebhookUrlQueryOptions);

    const [selectedProviderKey, setSelectedProviderKey] = useState('');
    const [credentialValues, setCredentialValues] = useState({});
    const [defaults, setDefaults] = useState({
        default_from_number_id: '',
        cost_per_page_cents: 5,
        max_file_mb: 25,
        retention_days: 30,
        cover_page_html: '',
        is_active: true,
    });
    const [lastOkHash, setLastOkHash] = useState(null);
    const [testResult, setTestResult] = useState(null);
    const [copied, setCopied] = useState(false);
    const [confirmRotate, setConfirmRotate] = useState(false);

    useEffect(() => {
        if (!settings) return;
        setSelectedProviderKey((prev) => prev || settings.provider || '');
        setDefaults((prev) => ({
            default_from_number_id: settings.default_from_number_id != null ? String(settings.default_from_number_id) : '',
            cost_per_page_cents: settings.cost_per_page_cents ?? 5,
            max_file_mb: settings.max_file_mb ?? 25,
            retention_days: settings.retention_days ?? 30,
            cover_page_html: settings.cover_page_html ?? '',
            is_active: settings.is_active ?? true,
        }));
        if (settings.last_test_status === 'ok') {
            const initialPayload = buildCredentialsPayload(
                getProviderSchema(providers, settings.provider),
                {},
                settings.credentials_status || {}
            );
            setLastOkHash(
                stableHash({ provider: settings.provider, credentials: initialPayload })
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings, providers]);

    function getProviderSchema(providersList, providerKey) {
        if (!providerKey || !providersList) return [];
        const found = providersList.find((p) => p.key === providerKey);
        return found?.credential_schema || [];
    }

    const selectedProvider = useMemo(
        () => (providers || []).find((p) => p.key === selectedProviderKey) || null,
        [providers, selectedProviderKey]
    );
    const credentialSchema = selectedProvider?.credential_schema || [];

    useEffect(() => {
        if (!selectedProvider) return;
        if (settings && settings.provider === selectedProvider.key) {
            setCredentialValues((prev) => {
                const next = { ...prev };
                credentialSchema.forEach((f) => {
                    if (next[f.name] === undefined) {
                        if (f.type === 'boolean') {
                            next[f.name] = false;
                        } else {
                            next[f.name] = '';
                        }
                    }
                });
                return next;
            });
        } else {
            const initial = {};
            credentialSchema.forEach((f) => {
                initial[f.name] = f.type === 'boolean' ? false : '';
            });
            setCredentialValues(initial);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedProvider?.key]);

    const credentialsStatus = settings?.credentials_status || {};

    const currentTestPayload = useMemo(() => {
        const credentials = buildCredentialsPayload(credentialSchema, credentialValues, credentialsStatus);
        return { provider: selectedProviderKey, credentials };
    }, [credentialSchema, credentialValues, credentialsStatus, selectedProviderKey]);

    const currentHash = useMemo(() => stableHash(currentTestPayload), [currentTestPayload]);
    const testIsCurrent = lastOkHash && lastOkHash === currentHash;

    useEffect(() => {
        if (testResult && !testIsCurrent) {
            setTestResult(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentHash]);

    const setCred = (name, value) =>
        setCredentialValues((prev) => ({ ...prev, [name]: value }));

    const setDefault = (name, value) =>
        setDefaults((prev) => ({ ...prev, [name]: value }));

    const testMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post('/fax/settings/test-connection', currentTestPayload);
            return res.data;
        },
        onSuccess: (data) => {
            setTestResult(data);
            if (data?.ok) {
                setLastOkHash(currentHash);
                toast.success(data?.message || 'Connection successful');
            } else {
                toast.error(data?.message || 'Connection test failed');
            }
        },
        onError: (err) => {
            const msg = err?.response?.data?.message || 'Test failed';
            setTestResult({ ok: false, message: msg });
            toast.error(msg);
            logger.error('Fax test connection failed:', err);
        },
    });

    const saveMutation = useMutation({
        mutationFn: async () => {
            const body = {
                provider: selectedProviderKey,
                credentials: buildCredentialsPayload(credentialSchema, credentialValues, credentialsStatus),
                default_from_number_id: defaults.default_from_number_id
                    ? Number(defaults.default_from_number_id)
                    : null,
                cost_per_page_cents: Number(defaults.cost_per_page_cents) || 0,
                max_file_mb: Number(defaults.max_file_mb) || 25,
                retention_days: Number(defaults.retention_days) || 30,
                cover_page_html: defaults.cover_page_html || null,
                is_active: Boolean(defaults.is_active),
            };
            const res = await api.put('/fax/settings', body);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Settings saved');
            queryClient.invalidateQueries({ queryKey: [...FAX_NAMESPACE, 'settings'] });
            setCredentialValues((prev) => {
                const next = { ...prev };
                credentialSchema.forEach((f) => {
                    if (f.type === 'secret') next[f.name] = '';
                });
                return next;
            });
        },
        onError: (err) => {
            const msg = err?.response?.data?.message || 'Save failed';
            toast.error(msg);
            const errors = err?.response?.data?.errors;
            if (errors && typeof errors === 'object') {
                Object.values(errors).forEach((arr) => {
                    const m = Array.isArray(arr) ? arr.join(' ') : String(arr);
                    toast.error(m);
                });
            }
        },
    });

    const rotateMutation = useMutation({
        mutationFn: async () => (await api.post('/fax/settings/rotate-webhook')).data,
        onSuccess: () => {
            toast.success('Webhook secret rotated');
            queryClient.invalidateQueries({ queryKey: [...FAX_NAMESPACE, 'webhook-url'] });
            setConfirmRotate(false);
        },
        onError: (err) => {
            toast.error(err?.response?.data?.message || 'Rotate failed');
            setConfirmRotate(false);
        },
    });

    const copyWebhook = async () => {
        const url = webhook?.url;
        if (!url) return;
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success('Webhook URL copied');
        } catch {
            toast.error('Could not copy to clipboard');
        }
    };

    const numberOptions = (numbers || []).map((n) => ({
        value: String(n.id),
        label: `${n.friendly_name ? `${n.friendly_name} · ` : ''}${n.e164_number}${n.is_default ? ' (default)' : ''}`,
    }));

    const providerOptions = (providers || []).map((p) => ({
        value: p.key,
        label: p.display_name || p.key,
    }));

    const canSave = Boolean(selectedProviderKey) && Boolean(testIsCurrent);

    return (
        <div className="space-y-6 max-w-4xl">
            <header>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-slate-700" />
                    Fax settings
                </h1>
                <p className="text-sm text-gray-500">
                    Configure your fax provider, defaults, and webhook endpoint.
                </p>
            </header>

            {/* Section 1: Provider */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <header className="px-5 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
                        Provider
                    </h2>
                </header>
                <div className="p-5 space-y-5">
                    <div>
                        <FieldLabel required help="Pick your fax provider. Credentials below adapt to the provider you choose.">
                            Provider
                        </FieldLabel>
                        <select
                            value={selectedProviderKey}
                            onChange={(e) => setSelectedProviderKey(e.target.value)}
                            disabled={providersLoading}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        >
                            <option value="">
                                {providersLoading ? 'Loading providers…' : 'Select a provider'}
                            </option>
                            {providerOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {selectedProvider?.description && (
                            <p className="mt-2 text-xs text-gray-500">{selectedProvider.description}</p>
                        )}
                    </div>

                    {selectedProvider && credentialSchema.length > 0 && (
                        <div className="space-y-4">
                            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Credentials
                            </div>
                            {credentialSchema.map((field) => (
                                <div key={field.name}>
                                    <FieldLabel required={Boolean(field.required)} help={field.help}>
                                        {field.label || field.name}
                                    </FieldLabel>
                                    <CredentialField
                                        field={field}
                                        value={credentialValues[field.name]}
                                        onChange={(v) => setCred(field.name, v)}
                                        status={credentialsStatus[field.name]}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Section 2: Test connection */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <header className="px-5 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
                        Test connection
                    </h2>
                </header>
                <div className="p-5 space-y-3">
                    <p className="text-sm text-gray-600">
                        Run a credential test before saving. Save stays disabled until the current values pass.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => testMutation.mutate()}
                            disabled={!selectedProviderKey || testMutation.isPending}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50"
                        >
                            {testMutation.isPending ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Testing…</>
                            ) : (
                                <><PlugZap className="w-4 h-4" /> Test connection</>
                            )}
                        </button>
                        {testIsCurrent && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="w-4 h-4" /> Current values verified
                            </span>
                        )}
                    </div>

                    {testResult && (
                        <div
                            className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-2 ${
                                testResult.ok
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-red-200 bg-red-50 text-red-800'
                            }`}
                        >
                            {testResult.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold">
                                    {testResult.ok ? 'Connection successful' : 'Connection failed'}
                                </div>
                                {testResult.message && <div className="mt-0.5 text-xs">{testResult.message}</div>}
                                {testResult.details && (
                                    <pre className="mt-2 text-[11px] bg-white/60 border border-current/20 rounded p-2 overflow-x-auto">
                                        {typeof testResult.details === 'string'
                                            ? testResult.details
                                            : JSON.stringify(testResult.details, null, 2)}
                                    </pre>
                                )}
                            </div>
                        </div>
                    )}

                    {!testIsCurrent && settings?.last_test_status === 'ok' && (
                        <div className="text-xs text-gray-500">
                            Last successful test:{' '}
                            {settings.last_tested_at ? new Date(settings.last_tested_at).toLocaleString() : 'recently'}.
                            Values changed since then — re-test before saving.
                        </div>
                    )}
                </div>
            </section>

            {/* Section 3: Defaults */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <header className="px-5 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
                        Defaults
                    </h2>
                </header>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <FieldLabel help="Used when Compose doesn\u2019t specify a sender.">
                                Default from number
                            </FieldLabel>
                            <select
                                value={defaults.default_from_number_id || ''}
                                onChange={(e) => setDefault('default_from_number_id', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                            >
                                <option value="">None</option>
                                {numberOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FieldLabel help="Tracked in your monthly fax spend.">
                                Cost per page (cents)
                            </FieldLabel>
                            <input
                                type="number"
                                min={0}
                                value={defaults.cost_per_page_cents}
                                onChange={(e) => setDefault('cost_per_page_cents', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                            />
                        </div>
                        <div>
                            <FieldLabel>Max file size (MB)</FieldLabel>
                            <input
                                type="number"
                                min={1}
                                value={defaults.max_file_mb}
                                onChange={(e) => setDefault('max_file_mb', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                            />
                        </div>
                        <div>
                            <FieldLabel help="How long faxes are kept before purging.">
                                Retention (days)
                            </FieldLabel>
                            <input
                                type="number"
                                min={1}
                                value={defaults.retention_days}
                                onChange={(e) => setDefault('retention_days', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        <input
                            id="is_active"
                            type="checkbox"
                            checked={Boolean(defaults.is_active)}
                            onChange={(e) => setDefault('is_active', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                        />
                        <label htmlFor="is_active" className="text-sm text-gray-700">
                            Fax module is active
                        </label>
                    </div>
                    <div>
                        <FieldLabel help="Optional HTML template prepended to every outbound fax.">
                            Default cover page HTML
                        </FieldLabel>
                        <textarea
                            rows={5}
                            value={defaults.cover_page_html || ''}
                            onChange={(e) => setDefault('cover_page_html', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        />
                    </div>
                </div>
            </section>

            {/* Section 4: Webhook */}
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm">
                <header className="px-5 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                        <Webhook className="w-4 h-4" /> Webhook
                    </h2>
                </header>
                <div className="p-5 space-y-4">
                    <div>
                        <FieldLabel help="Point your provider\u2019s inbound and status webhooks at this URL.">
                            Per-facility webhook URL
                        </FieldLabel>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                readOnly
                                value={webhookLoading ? 'Loading…' : (webhook?.url || '—')}
                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 font-mono"
                            />
                            <button
                                type="button"
                                onClick={copyWebhook}
                                disabled={!webhook?.url}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                            {webhook?.secret_present ? (
                                <>
                                    <Lock className="w-3 h-3" />
                                    Signing secret is configured.
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-3 h-3 text-amber-600" />
                                    No signing secret on file — rotate to generate one.
                                </>
                            )}
                        </div>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setConfirmRotate(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100"
                        >
                            <RotateCw className="w-4 h-4" /> Rotate secret
                        </button>
                    </div>
                </div>
            </section>

            {/* Save */}
            <div className="sticky bottom-0 -mx-2 sm:mx-0 z-10 bg-white border-t border-gray-200 sm:rounded-2xl sm:border sm:shadow-md px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-gray-500">
                    {canSave
                        ? 'Ready to save — your provider configuration has been verified.'
                        : 'Test the connection successfully to enable saving.'}
                </div>
                <button
                    type="button"
                    onClick={() => saveMutation.mutate()}
                    disabled={!canSave || saveMutation.isPending || settingsLoading}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--theme-primary)] text-[var(--theme-text-on-primary,white)] text-sm font-semibold hover:bg-[var(--theme-primary-hover,var(--theme-primary))] disabled:opacity-60"
                >
                    {saveMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    ) : (
                        <><Save className="w-4 h-4" /> Save settings</>
                    )}
                </button>
            </div>

            <ConfirmDialog
                isOpen={confirmRotate}
                onClose={() => setConfirmRotate(false)}
                onConfirm={() => rotateMutation.mutate()}
                title="Rotate webhook secret?"
                description="Existing webhook requests using the old secret will start failing immediately. Update your provider with the new secret value before rotating."
                confirmLabel="Rotate"
                variant="danger"
                isPending={rotateMutation.isPending}
            />
        </div>
    );
}
