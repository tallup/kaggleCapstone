export const LIFECYCLE_STATUSES = ['active', 'discharged', 'transferred', 'deceased'];
export const TEMPORARY_STATUSES = ['out_of_facility', 'hospital', 'hospice', 'alert'];

const DEFAULT_BADGE_CLASS = 'border-slate-200 bg-slate-50 text-slate-700';

export const LIFECYCLE_STATUS_META = {
    active: {
        label: 'Active',
        shortLabel: 'Active',
        badgeClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        ringClassName: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    },
    discharged: {
        label: 'Discharged',
        shortLabel: 'Discharged',
        badgeClassName: 'border-amber-200 bg-amber-50 text-amber-800',
        ringClassName: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
    transferred: {
        label: 'Transferred',
        shortLabel: 'Transferred',
        badgeClassName: 'border-sky-200 bg-sky-50 text-sky-800',
        ringClassName: 'bg-sky-50 text-sky-700 ring-sky-200',
    },
    deceased: {
        label: 'Deceased',
        shortLabel: 'Deceased',
        badgeClassName: 'border-zinc-300 bg-zinc-100 text-zinc-800',
        ringClassName: 'bg-zinc-100 text-zinc-700 ring-zinc-300',
    },
    inactive: {
        label: 'Inactive',
        shortLabel: 'Inactive',
        badgeClassName: 'border-amber-200 bg-amber-50 text-amber-800',
        ringClassName: 'bg-amber-50 text-amber-700 ring-amber-200',
    },
};

export const TEMPORARY_STATUS_META = {
    out_of_facility: {
        label: 'Out of Facility',
        shortLabel: 'Out',
        badgeClassName: 'border-orange-200 bg-orange-50 text-orange-800',
        censusLabel: 'In facility census',
    },
    hospital: {
        label: 'Hospital',
        shortLabel: 'Hospital',
        badgeClassName: 'border-sky-200 bg-sky-50 text-sky-800',
        censusLabel: 'In facility census',
    },
    hospice: {
        label: 'Hospice',
        shortLabel: 'Hospice',
        badgeClassName: 'border-violet-200 bg-violet-50 text-violet-800',
        censusLabel: 'In facility census',
    },
    alert: {
        label: 'Alert',
        shortLabel: 'Alert',
        badgeClassName: 'border-red-200 bg-red-50 text-red-800',
        censusLabel: 'In census',
    },
};

function normalizeStatusValue(value) {
    if (value === null || value === undefined || value === '') return null;
    return String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function isTruthyActive(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
}

export function getResidentLifecycleStatus(resident) {
    const lifecycle = normalizeStatusValue(resident?.lifecycle_status);
    if (LIFECYCLE_STATUSES.includes(lifecycle)) return lifecycle;

    const legacyStatus = normalizeStatusValue(resident?.status);
    if (LIFECYCLE_STATUSES.includes(legacyStatus)) return legacyStatus;
    if (legacyStatus === 'inactive') return 'inactive';

    if (resident?.is_active === false || resident?.is_active === 0 || resident?.is_active === '0' || resident?.is_active === 'false') {
        return 'inactive';
    }

    return 'active';
}

export function getResidentTemporaryStatus(resident) {
    const temporary = normalizeStatusValue(resident?.temporary_status);
    return TEMPORARY_STATUSES.includes(temporary) ? temporary : null;
}

export function getLifecycleStatusMeta(status) {
    const normalized = normalizeStatusValue(status);
    return LIFECYCLE_STATUS_META[normalized] || {
        label: status ? String(status) : 'Unknown',
        shortLabel: status ? String(status) : 'Unknown',
        badgeClassName: DEFAULT_BADGE_CLASS,
        ringClassName: 'bg-slate-50 text-slate-700 ring-slate-200',
    };
}

export function getTemporaryStatusMeta(status) {
    const normalized = normalizeStatusValue(status);
    return TEMPORARY_STATUS_META[normalized] || null;
}

export function isResidentLifecycleActive(resident) {
    return getResidentLifecycleStatus(resident) === 'active';
}

export function isResidentInCensus(resident) {
    const lifecycleStatus = getResidentLifecycleStatus(resident);
    return lifecycleStatus === 'active';
}

export function getResidentStatusSummary(resident) {
    const lifecycleStatus = getResidentLifecycleStatus(resident);
    const temporaryStatus = getResidentTemporaryStatus(resident);
    const lifecycleMeta = getLifecycleStatusMeta(lifecycleStatus);
    const temporaryMeta = getTemporaryStatusMeta(temporaryStatus);

    return {
        lifecycleStatus,
        temporaryStatus,
        lifecycleMeta,
        temporaryMeta,
        isLifecycleActive: lifecycleStatus === 'active',
        isInCensus: isResidentInCensus(resident),
    };
}
