import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    PenLine,
    Upload,
    FileText,
    Loader2,
    X,
    Phone,
    Users as UsersIcon,
    Search,
    Check,
    AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';
import {
    faxNumbersQueryOptions,
    faxSettingsQueryOptions,
    faxContactsQueryOptions,
    FAXES_NAMESPACE,
    FAX_COST_SUMMARY_NAMESPACE,
} from '../../queries/fax';
import logger from '../../utils/logger';

const FAX_TYPE_OPTIONS = [
    { value: 'refills', label: 'Refills' },
    { value: 'orders',  label: 'Orders' },
    { value: 'records', label: 'Records' },
];

// Loosely validate E.164: leading "+" plus 6–15 digits
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

const baseSchema = z.object({
    recipient_mode: z.enum(['contact', 'number']),
    to_contact_id: z.union([z.string(), z.number()]).optional().nullable(),
    to_number: z.string().optional().nullable(),
    from_number_id: z.union([z.string(), z.number()]).optional().nullable(),
    fax_type: z.enum(['refills', 'orders', 'records']),
    subject: z.string().max(255).optional().or(z.literal('')),
    resident_id: z.union([z.string(), z.number()]).optional().nullable(),
    cover_page_html: z.string().optional().or(z.literal('')),
});

function buildSchema(maxFileMb) {
    return baseSchema.superRefine((data, ctx) => {
        if (data.recipient_mode === 'contact') {
            if (!data.to_contact_id) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['to_contact_id'],
                    message: 'Pick a contact to send to',
                });
            }
        } else if (data.recipient_mode === 'number') {
            const num = String(data.to_number || '').trim();
            if (!num) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['to_number'],
                    message: 'Enter the destination fax number',
                });
            } else if (!E164_REGEX.test(num)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['to_number'],
                    message: 'Use E.164 format, e.g. +14155550100',
                });
            }
        }
    });
}

function FieldLabel({ htmlFor, children, required, hint }) {
    return (
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-700 mb-1.5">
            {children}
            {required && <span className="text-red-500 ml-0.5">*</span>}
            {hint && <span className="block text-xs font-normal text-gray-500 mt-0.5">{hint}</span>}
        </label>
    );
}

function ContactPicker({ value, onChange, error }) {
    const [search, setSearch] = useState('');
    const { data: contactsData, isFetching } = useQuery(
        faxContactsQueryOptions({ search, active: 1, per_page: 20 })
    );
    const contacts = contactsData?.data || [];
    const selected = useMemo(() => contacts.find((c) => c.id === value), [contacts, value]);

    return (
        <div>
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search contacts…"
                    className={`w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] ${
                        error ? 'border-red-400' : 'border-gray-300'
                    }`}
                />
            </div>
            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                {isFetching && contacts.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading contacts…
                    </div>
                )}
                {!isFetching && contacts.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500">No contacts found.</div>
                )}
                {contacts.map((c) => {
                    const isSel = value === c.id;
                    return (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => onChange(c.id)}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors ${
                                isSel
                                    ? 'bg-[var(--theme-primary-bg,#eef2ff)] text-[var(--theme-primary,#4338ca)]'
                                    : 'hover:bg-gray-50 text-gray-700'
                            }`}
                        >
                            <div className="min-w-0">
                                <div className="font-semibold truncate">{c.name}</div>
                                <div className="text-xs text-gray-500 truncate">
                                    {c.organization ? `${c.organization} · ` : ''}{c.fax_e164}
                                </div>
                            </div>
                            {isSel && <Check className="w-4 h-4 flex-shrink-0" />}
                        </button>
                    );
                })}
            </div>
            {selected && (
                <div className="mt-2 text-xs text-gray-500">
                    Sending to <span className="font-semibold text-gray-700">{selected.name}</span> at{' '}
                    <span className="tabular-nums">{selected.fax_e164}</span>
                </div>
            )}
        </div>
    );
}

function ResidentPicker({ value, onChange }) {
    const [search, setSearch] = useState('');
    const { data, isFetching } = useQuery({
        queryKey: ['residents-list', 'fax-compose', search],
        queryFn: async () => {
            const params = { per_page: 25 };
            if (search) params.search = search;
            const res = await api.get('/residents', { params });
            return res.data?.data || res.data || [];
        },
        staleTime: 30 * 1000,
    });
    const residents = Array.isArray(data) ? data : [];
    const selected = residents.find((r) => r.id === value);

    return (
        <div>
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search residents (optional)…"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                />
            </div>
            <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                        Clear selection
                    </button>
                )}
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
                    const isSel = value === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onChange(id)}
                            className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                                isSel
                                    ? 'bg-[var(--theme-primary-bg,#eef2ff)] text-[var(--theme-primary,#4338ca)] font-semibold'
                                    : 'hover:bg-gray-50 text-gray-700'
                            }`}
                        >
                            {name}
                        </button>
                    );
                })}
            </div>
            {selected && (
                <div className="mt-2 text-xs text-gray-500">
                    Attaching to{' '}
                    <span className="font-semibold text-gray-700">
                        {selected.full_name || `${selected.first_name || ''} ${selected.last_name || ''}`.trim()}
                    </span>
                </div>
            )}
        </div>
    );
}

function FileDropZone({ file, onFile, maxBytes, error }) {
    const inputRef = useRef(null);
    const [dragOver, setDragOver] = useState(false);
    const [localError, setLocalError] = useState(null);

    const validate = (f) => {
        if (!f) return 'Select a PDF to send';
        if (f.type !== 'application/pdf') return 'Only PDF files are accepted';
        if (maxBytes && f.size > maxBytes) {
            return `File exceeds ${Math.round(maxBytes / 1024 / 1024)} MB limit`;
        }
        return null;
    };

    const handleSelect = (f) => {
        const err = validate(f);
        setLocalError(err);
        if (!err) onFile(f);
        else onFile(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer?.files?.[0];
        if (f) handleSelect(f);
    };

    const displayError = localError || error;

    return (
        <div>
            <div
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
                    displayError
                        ? 'border-red-400 bg-red-50'
                        : dragOver
                            ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-bg,#eef2ff)]'
                            : 'border-gray-300 hover:border-[var(--theme-primary)] hover:bg-gray-50'
                }`}
            >
                {file ? (
                    <div className="flex items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">{file.name}</div>
                                <div className="text-xs text-gray-500 tabular-nums">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSelect(null); }}
                            className="p-1 text-gray-400 hover:text-red-600"
                            aria-label="Remove file"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Upload className="w-6 h-6" />
                        <div className="text-sm font-semibold text-gray-700">
                            Drop a PDF here, or click to browse
                        </div>
                        <div className="text-xs text-gray-500">
                            Only PDF · max {maxBytes ? `${Math.round(maxBytes / 1024 / 1024)} MB` : '25 MB'}
                        </div>
                    </div>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={(e) => handleSelect(e.target.files?.[0] || null)}
                />
            </div>
            {displayError && (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {displayError}
                </p>
            )}
        </div>
    );
}

export default function FaxComposePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: settings } = useQuery(faxSettingsQueryOptions);
    const { data: numbers, isLoading: numbersLoading } = useQuery(faxNumbersQueryOptions);

    const maxFileMb = settings?.max_file_mb ?? 25;
    const maxBytes = maxFileMb * 1024 * 1024;

    const schema = useMemo(() => buildSchema(maxFileMb), [maxFileMb]);

    const defaultFromId = useMemo(() => {
        if (settings?.default_from_number_id) return String(settings.default_from_number_id);
        const def = (numbers || []).find((n) => n.is_default);
        return def ? String(def.id) : '';
    }, [settings, numbers]);

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            recipient_mode: 'contact',
            to_contact_id: null,
            to_number: '',
            from_number_id: '',
            fax_type: 'refills',
            subject: '',
            resident_id: null,
            cover_page_html: '',
        },
    });

    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState(null);

    useEffect(() => {
        if (defaultFromId) {
            setValue('from_number_id', defaultFromId);
        }
    }, [defaultFromId, setValue]);

    const recipientMode = watch('recipient_mode');

    const sendMutation = useMutation({
        mutationFn: async (payload) => {
            const fd = new FormData();
            fd.append('file', payload.file);
            fd.append('fax_type', payload.fax_type);
            if (payload.recipient_mode === 'contact' && payload.to_contact_id) {
                fd.append('to_contact_id', String(payload.to_contact_id));
            } else if (payload.recipient_mode === 'number' && payload.to_number) {
                fd.append('to_number', payload.to_number);
            }
            if (payload.from_number_id) fd.append('from_number_id', String(payload.from_number_id));
            if (payload.subject) fd.append('subject', payload.subject);
            if (payload.resident_id) fd.append('resident_id', String(payload.resident_id));
            if (payload.cover_page_html) fd.append('cover_page_html', payload.cover_page_html);

            const res = await api.post('/fax/send', fd);
            return res.data;
        },
        onSuccess: () => {
            toast.success('Fax queued for delivery');
            queryClient.invalidateQueries({ queryKey: FAXES_NAMESPACE });
            queryClient.invalidateQueries({ queryKey: FAX_COST_SUMMARY_NAMESPACE });
            reset();
            setFile(null);
            navigate('/fax/sent');
        },
        onError: (err) => {
            const data = err?.response?.data;
            const message = data?.message || 'Failed to send fax';
            toast.error(message);
            logger.error('Fax send failed:', err);
            if (data?.errors && typeof data.errors === 'object') {
                Object.entries(data.errors).forEach(([_field, msgs]) => {
                    const m = Array.isArray(msgs) ? msgs.join(' ') : String(msgs);
                    toast.error(m, { duration: 5000 });
                });
            }
        },
    });

    const onSubmit = handleSubmit((values) => {
        if (!file) {
            setFileError('Select a PDF to send');
            return;
        }
        setFileError(null);
        sendMutation.mutate({ ...values, file });
    });

    const numberOptions = (numbers || []).map((n) => ({
        value: String(n.id),
        label: `${n.friendly_name ? `${n.friendly_name} · ` : ''}${n.e164_number}${n.is_default ? ' (default)' : ''}`,
    }));

    return (
        <div className="space-y-5 max-w-3xl">
            <header>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <PenLine className="w-5 h-5 text-amber-600" />
                    Compose fax
                </h1>
                <p className="text-sm text-gray-500">Upload a PDF and send to a contact or a raw fax number.</p>
            </header>

            <form
                onSubmit={onSubmit}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6"
            >
                {/* Recipient */}
                <section>
                    <FieldLabel required>To</FieldLabel>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 mb-3">
                        <button
                            type="button"
                            onClick={() => setValue('recipient_mode', 'contact', { shouldValidate: true })}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                                recipientMode === 'contact'
                                    ? 'bg-white text-[var(--theme-primary)] shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <UsersIcon className="w-3.5 h-3.5" /> Contact
                        </button>
                        <button
                            type="button"
                            onClick={() => setValue('recipient_mode', 'number', { shouldValidate: true })}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                                recipientMode === 'number'
                                    ? 'bg-white text-[var(--theme-primary)] shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            <Phone className="w-3.5 h-3.5" /> Raw number
                        </button>
                    </div>

                    {recipientMode === 'contact' ? (
                        <Controller
                            control={control}
                            name="to_contact_id"
                            render={({ field, fieldState }) => (
                                <>
                                    <ContactPicker
                                        value={field.value}
                                        onChange={field.onChange}
                                        error={fieldState.error?.message}
                                    />
                                    {fieldState.error && (
                                        <p className="mt-1.5 text-xs text-red-600">{fieldState.error.message}</p>
                                    )}
                                </>
                            )}
                        />
                    ) : (
                        <div>
                            <input
                                type="tel"
                                inputMode="tel"
                                placeholder="+14155550100"
                                {...register('to_number')}
                                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] ${
                                    errors.to_number ? 'border-red-400' : 'border-gray-300'
                                }`}
                            />
                            {errors.to_number && (
                                <p className="mt-1.5 text-xs text-red-600">{errors.to_number.message}</p>
                            )}
                        </div>
                    )}
                </section>

                {/* From + Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <FieldLabel htmlFor="from_number_id">From</FieldLabel>
                        <select
                            id="from_number_id"
                            {...register('from_number_id')}
                            disabled={numbersLoading}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        >
                            <option value="">
                                {numbersLoading ? 'Loading…' : 'Use facility default'}
                            </option>
                            {numberOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <FieldLabel htmlFor="fax_type" required>Type</FieldLabel>
                        <select
                            id="fax_type"
                            {...register('fax_type')}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                        >
                            {FAX_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Subject */}
                <div>
                    <FieldLabel htmlFor="subject">Subject</FieldLabel>
                    <input
                        id="subject"
                        type="text"
                        {...register('subject')}
                        placeholder="e.g. Refill request – Jane Doe"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                </div>

                {/* Resident */}
                <div>
                    <FieldLabel hint="Optional. Attaches this fax to the resident\u2019s chart.">
                        Resident
                    </FieldLabel>
                    <Controller
                        control={control}
                        name="resident_id"
                        render={({ field }) => (
                            <ResidentPicker value={field.value} onChange={field.onChange} />
                        )}
                    />
                </div>

                {/* File */}
                <div>
                    <FieldLabel required hint={`PDF only, max ${maxFileMb} MB`}>PDF file</FieldLabel>
                    <FileDropZone
                        file={file}
                        onFile={(f) => { setFile(f); setFileError(null); }}
                        maxBytes={maxBytes}
                        error={fileError}
                    />
                </div>

                {/* Cover page */}
                <div>
                    <FieldLabel htmlFor="cover_page_html" hint="Optional cover page HTML.">
                        Cover page HTML
                    </FieldLabel>
                    <textarea
                        id="cover_page_html"
                        rows={4}
                        {...register('cover_page_html')}
                        placeholder="<h1>Cover page</h1>"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)]"
                    />
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => { reset(); setFile(null); setFileError(null); }}
                        className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        disabled={isSubmitting || sendMutation.isPending}
                    >
                        Reset
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || sendMutation.isPending}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--theme-primary)] text-[var(--theme-text-on-primary,white)] text-sm font-semibold hover:bg-[var(--theme-primary-hover,var(--theme-primary))] disabled:opacity-60"
                    >
                        {sendMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending…
                            </>
                        ) : (
                            <>
                                <PenLine className="w-4 h-4" />
                                Send fax
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
