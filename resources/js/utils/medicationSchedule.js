import { toPacificDateFromTime, getPacificNow, getPacificParts, parsePacificDateString } from './pacificTime';

const PACIFIC_TZ = 'America/Los_Angeles';

const adminTimeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

/** Same Pacific parsing as medication list badges (UTC components = Pacific clock). */
export function parseAdminTimeToPacific(administeredAt) {
    const raw = new Date(administeredAt);
    if (Number.isNaN(raw.getTime())) return null;
    const p = {};
    adminTimeFmt.formatToParts(raw).forEach(({ type, value }) => {
        if (type !== 'literal') p[type] = parseInt(value, 10);
    });
    return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second || 0));
}

/** Aligns with App\Services\MedicationService::getMedicationsWithStatus */
export const MEDICATION_SLOT_COVER_STATUSES = [
    'completed',
    'refused',
    'hospital_admission',
    'pharmacy_administration_confirm',
];

export function getMedicationAdministrations(medication) {
    const admins = medication?.administrations;
    return Array.isArray(admins) ? admins : [];
}

/**
 * True when today's loaded administrations include a dose within ±60 min of this slot
 * (same rule as backend "slot satisfied" for hiding fully-administered meds).
 */
export function isMedicationSlotCoveredToday(medication, slotTime) {
    if (!slotTime) return false;
    const scheduledTime = toPacificDateFromTime(slotTime, { referenceDate: getPacificNow() });
    if (!scheduledTime) return false;
    return getMedicationAdministrations(medication).some((admin) => {
        if (!MEDICATION_SLOT_COVER_STATUSES.includes(admin.status)) return false;
        const adminTime = parseAdminTimeToPacific(admin.administered_at);
        if (!adminTime) return false;
        const diffMs = Math.abs(adminTime.getTime() - scheduledTime.getTime());
        return diffMs <= 60 * 60 * 1000;
    });
}

/** Medications with no time_1–time_4: treat row as done if any covering administration exists today. */
export function isNoScheduledTimeRowCoveredToday(medication) {
    return getMedicationAdministrations(medication).some((admin) =>
        MEDICATION_SLOT_COVER_STATUSES.includes(admin.status),
    );
}

/** Matches caregiver/management medication list period checks. */
export function isMedicationPeriodActiveNow(medication, referenceDate = getPacificNow()) {
    if (!medication) {
        return false;
    }
    const referenceParts = getPacificParts(referenceDate);
    const referenceDateOnly = {
        year: referenceParts.year,
        month: referenceParts.month,
        day: referenceParts.day,
    };

    const buildBoundary = (value) => {
        if (!value) return null;
        const base = parsePacificDateString(value);
        if (!base || Number.isNaN(base.getTime())) {
            return null;
        }
        return {
            year: base.getUTCFullYear(),
            month: base.getUTCMonth() + 1,
            day: base.getUTCDate(),
        };
    };

    const compareDates = (date1, date2) => {
        if (date1.year !== date2.year) return date1.year - date2.year;
        if (date1.month !== date2.month) return date1.month - date2.month;
        return date1.day - date2.day;
    };

    const startBoundary = buildBoundary(medication.start_date);
    if (startBoundary && compareDates(referenceDateOnly, startBoundary) < 0) {
        return false;
    }

    const endBoundary = buildBoundary(medication.end_date);
    if (endBoundary && compareDates(referenceDateOnly, endBoundary) > 0) {
        return false;
    }

    return true;
}

export function isPrnMedication(medication) {
    const s = (medication?.instructions || '').toLowerCase().trim();
    return s.includes('prn');
}

/**
 * Whether a completed administration may be recorded now (open ±60 min window, slot not yet covered).
 * Aligns with QuickAdminister checkTimeWindow logic.
 */
export function canRecordCompletedAdministrationNow(medication, options = {}) {
    const { now = getPacificNow(), todayAdministrations = [] } = options;

    if (!medication) {
        return { ok: false, reason: 'Invalid medication' };
    }

    if (!isMedicationPeriodActiveNow(medication, now)) {
        return { ok: false, reason: 'Medication administration period has ended.' };
    }

    if (isPrnMedication(medication)) {
        return { ok: true };
    }

    const times = [medication.time_1, medication.time_2, medication.time_3, medication.time_4].filter(Boolean);
    if (times.length === 0) {
        return { ok: true };
    }

    const parseTimeToToday = (timeValue, dayOffset) =>
        toPacificDateFromTime(timeValue, { referenceDate: now, dayOffset });

    const hasAdminForWindow = (scheduledDate) => {
        const toleranceMs = 60 * 60 * 1000;
        return todayAdministrations.some((admin) => {
            if (admin.status === 'missed') return false;
            const adminTime = parseAdminTimeToPacific(admin.administered_at);
            if (!adminTime) return false;
            return Math.abs(adminTime.getTime() - scheduledDate.getTime()) <= toleranceMs;
        });
    };

    const windowBeforeMinutes = 60;
    const windowAfterMinutes = 60;

    const windows = times
        .flatMap((timeValue) => {
            const scheduledToday = parseTimeToToday(timeValue, 0);
            const scheduledTomorrow = parseTimeToToday(timeValue, 1);
            return [scheduledToday, scheduledTomorrow]
                .filter(Boolean)
                .map((scheduledDate) => {
                    const start = new Date(scheduledDate.getTime() - windowBeforeMinutes * 60 * 1000);
                    const end = new Date(scheduledDate.getTime() + windowAfterMinutes * 60 * 1000);
                    return { scheduledDate, start, end };
                });
        })
        .sort((a, b) => a.start - b.start);

    for (const window of windows) {
        if (now >= window.start && now <= window.end) {
            if (!hasAdminForWindow(window.scheduledDate)) {
                return { ok: true };
            }
        }
    }

    return { ok: false, reason: 'Outside the scheduled administration window.' };
}

/**
 * Bulk row checkbox: same window rules as completed administration, scoped to this row's slot when set.
 */
export function canSelectMedicationRowForBulkAdministration(medication, options = {}) {
    const { slotTime = null, todayAdministrations = [], now = getPacificNow() } = options;

    if (!medication) {
        return { ok: false, reason: 'Invalid medication' };
    }

    if (slotTime) {
        const medSlotOnly = {
            ...medication,
            time_1: slotTime,
            time_2: null,
            time_3: null,
            time_4: null,
        };
        return canRecordCompletedAdministrationNow(medSlotOnly, { todayAdministrations, now });
    }

    return canRecordCompletedAdministrationNow(medication, { todayAdministrations, now });
}
