import React, { useState } from 'react';
import Modal from '../ui/Modal';
import ResidentStatusBadges from './ResidentStatusBadges';
import {
    LIFECYCLE_STATUSES,
    TEMPORARY_STATUSES,
    getLifecycleStatusMeta,
    getResidentLifecycleStatus,
    getResidentTemporaryStatus,
    getTemporaryStatusMeta,
} from '../../utils/residentStatus';

export default function ResidentStatusModal({ resident, isOpen, isPending, error, onClose, onSubmit, allowLifecycle = true }) {
    const [form, setForm] = useState(() => createStatusForm(resident, allowLifecycle));
    const [errors, setErrors] = useState({});

    React.useEffect(() => {
        setForm(createStatusForm(resident, allowLifecycle));
        setErrors({});
    }, [resident, allowLifecycle]);

    if (!resident) {
        return null;
    }

    const fullName = [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ');
    const selectedLifecycleMeta = getLifecycleStatusMeta(form.lifecycle_status);
    const selectedTemporaryMeta = form.temporary_status ? getTemporaryStatusMeta(form.temporary_status) : null;
    const isLifecycle = form.status_type === 'lifecycle';
    const requiresDischargeDetails = isLifecycle && form.lifecycle_status !== 'active';
    const serverErrors = error?.response?.data?.errors || {};
    const fieldErrors = { ...serverErrors, ...errors };
    const generalError = error?.response?.data?.message || errors.general;

    const setField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setErrors((prev) => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const handleStatusTypeChange = (statusType) => {
        if (statusType === 'lifecycle' && !allowLifecycle) {
            return;
        }

        setForm((prev) => ({
            ...prev,
            status_type: statusType,
            lifecycle_status: prev.lifecycle_status || 'active',
            temporary_status: prev.temporary_status || '',
        }));
        setErrors({});
    };

    const validate = () => {
        const nextErrors = {};

        if (requiresDischargeDetails) {
            if (!form.discharge_date) {
                nextErrors.discharge_date = ['Discharge date is required.'];
            }
            if (!form.discharge_reason.trim()) {
                nextErrors.discharge_reason = ['Discharge reason is required.'];
            }
        }

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (!validate()) return;

        const payload = {
            status_type: form.status_type,
            status: isLifecycle ? form.lifecycle_status : (form.temporary_status || null),
            effective_at: new Date().toISOString(),
        };

        if (isLifecycle && form.lifecycle_status !== 'active') {
            payload.discharge_date = form.discharge_date;
            payload.discharge_reason = form.discharge_reason.trim();
            payload.discharge_destination = form.discharge_destination.trim() || null;
            payload.discharge_notes = form.discharge_notes.trim() || null;
            payload.details = {
                discharge_notes: form.discharge_notes.trim() || null,
            };
        }

        if (!isLifecycle) {
            const temporaryNote = form.temporary_status_note.trim();
            payload.temporary_status_note = form.temporary_status ? (temporaryNote || null) : null;
            if (form.temporary_status && temporaryNote) {
                payload.details = { note: temporaryNote };
            }
        }

        onSubmit(payload);
    };

    const statusTypeButtonClass = (statusType) => (
        form.status_type === statusType
            ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] shadow-sm'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Update Resident Status"
            size="lg"
            closeOnBackdropClick={!isPending}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {generalError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="text-sm text-red-800">{generalError}</p>
                    </div>
                )}

                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                    <p className="text-sm font-semibold text-slate-900">{fullName || 'Resident'}</p>
                    <div className="mt-2">
                        <ResidentStatusBadges resident={resident} showCensus />
                    </div>
                </div>

                <div>
                    <p className="mb-2 text-sm font-semibold text-slate-700">Status type</p>
                    <div className={`grid grid-cols-1 gap-2 ${allowLifecycle ? 'sm:grid-cols-2' : ''}`}>
                        <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleStatusTypeChange('temporary')}
                            className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${statusTypeButtonClass('temporary')}`}
                        >
                            Temporary
                            <span className="mt-1 block text-xs font-normal opacity-80">
                                Out of facility, hospital, hospice, alert, or clear temporary status.
                            </span>
                        </button>
                        {allowLifecycle && (
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleStatusTypeChange('lifecycle')}
                                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${statusTypeButtonClass('lifecycle')}`}
                            >
                                Lifecycle
                                <span className="mt-1 block text-xs font-normal opacity-80">
                                    Active, discharged, transferred, or deceased.
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {isLifecycle ? (
                    <div className="space-y-5">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-lifecycle-status">
                                Lifecycle status *
                            </label>
                            <select
                                id="resident-lifecycle-status"
                                value={form.lifecycle_status}
                                disabled={isPending}
                                onChange={(event) => setField('lifecycle_status', event.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                            >
                                {LIFECYCLE_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {getLifecycleStatusMeta(status).label}
                                    </option>
                                ))}
                            </select>
                            <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${selectedLifecycleMeta.ringClassName}`}>
                                {selectedLifecycleMeta.label}
                            </p>
                            {fieldErrors.status && <p className="mt-1 text-xs text-red-600">{fieldErrors.status[0]}</p>}
                        </div>

                        {requiresDischargeDetails && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-discharge-date">
                                        Discharge date *
                                    </label>
                                    <input
                                        id="resident-discharge-date"
                                        type="date"
                                        value={form.discharge_date}
                                        disabled={isPending}
                                        onChange={(event) => setField('discharge_date', event.target.value)}
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                                    />
                                    {fieldErrors.discharge_date && <p className="mt-1 text-xs text-red-600">{fieldErrors.discharge_date[0]}</p>}
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-discharge-reason">
                                        Discharge reason *
                                    </label>
                                    <input
                                        id="resident-discharge-reason"
                                        type="text"
                                        value={form.discharge_reason}
                                        disabled={isPending}
                                        onChange={(event) => setField('discharge_reason', event.target.value)}
                                        placeholder="Reason for status change"
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                                    />
                                    {fieldErrors.discharge_reason && <p className="mt-1 text-xs text-red-600">{fieldErrors.discharge_reason[0]}</p>}
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-discharge-destination">
                                        Discharge destination
                                    </label>
                                    <input
                                        id="resident-discharge-destination"
                                        type="text"
                                        value={form.discharge_destination}
                                        disabled={isPending}
                                        onChange={(event) => setField('discharge_destination', event.target.value)}
                                        placeholder="Hospital, another facility, family home, etc."
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-discharge-notes">
                                        Notes / details
                                    </label>
                                    <textarea
                                        id="resident-discharge-notes"
                                        rows={3}
                                        value={form.discharge_notes}
                                        disabled={isPending}
                                        onChange={(event) => setField('discharge_notes', event.target.value)}
                                        placeholder="Optional details for the resident status event"
                                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-5">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-temporary-status">
                                Temporary status
                            </label>
                            <select
                                id="resident-temporary-status"
                                value={form.temporary_status}
                                disabled={isPending}
                                onChange={(event) => setField('temporary_status', event.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                            >
                                <option value="">Clear temporary status</option>
                                {TEMPORARY_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                        {getTemporaryStatusMeta(status).label}
                                    </option>
                                ))}
                            </select>
                            {selectedTemporaryMeta ? (
                                <p className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${selectedTemporaryMeta.badgeClassName}`}>
                                    {selectedTemporaryMeta.label}
                                </p>
                            ) : (
                                <p className="mt-2 text-xs text-slate-500">No temporary status will remain on this resident.</p>
                            )}
                            {fieldErrors.status && <p className="mt-1 text-xs text-red-600">{fieldErrors.status[0]}</p>}
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="resident-temporary-note">
                                Temporary status note
                            </label>
                            <textarea
                                id="resident-temporary-note"
                                rows={3}
                                value={form.temporary_status_note}
                                disabled={isPending || !form.temporary_status}
                                onChange={(event) => setField('temporary_status_note', event.target.value)}
                                placeholder="Optional details for this temporary status"
                                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[var(--theme-primary)] disabled:opacity-60"
                            />
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex min-w-[9rem] items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-text-on-primary)] shadow-md transition hover:bg-[var(--theme-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isPending ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--theme-text-on-primary)]/25 border-t-[var(--theme-text-on-primary)]" />
                                Saving...
                            </>
                        ) : (
                            'Update Status'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function createStatusForm(resident, allowLifecycle = true) {
    const lifecycleStatus = getResidentLifecycleStatus(resident);
    const temporaryStatus = getResidentTemporaryStatus(resident) || '';

    return {
        status_type: !allowLifecycle || temporaryStatus ? 'temporary' : 'lifecycle',
        lifecycle_status: lifecycleStatus === 'inactive' ? 'discharged' : lifecycleStatus,
        temporary_status: temporaryStatus,
        temporary_status_note: resident?.temporary_status_note || '',
        discharge_date: resident?.discharge_date || new Date().toISOString().split('T')[0],
        discharge_reason: resident?.discharge_reason || '',
        discharge_destination: resident?.discharge_destination || '',
        discharge_notes: resident?.discharge_notes || '',
    };
}
