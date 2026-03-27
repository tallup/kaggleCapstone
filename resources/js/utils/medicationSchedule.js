import { toPacificDateFromTime, getPacificNow } from './pacificTime';

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

/**
 * Push one administration onto cached resident medication rows (all activeOnly variants).
 * Keeps the list in sync immediately for WebSocket events and after bulk POST responses.
 */
export function mergeAdministrationIntoResidentMedicationsCaches(queryClient, residentId, administration) {
    if (!residentId || !administration?.medication_id) return;
    const medId = administration.medication_id;
    const adminId = administration.id;
    queryClient.setQueriesData(
        { queryKey: ['resident-medications', residentId] },
        (old) => {
            if (!old?.data || !Array.isArray(old.data)) return old;
            return {
                ...old,
                data: old.data.map((med) => {
                    if (med.id !== medId) return med;
                    const admins = [...(med.administrations || [])];
                    if (adminId != null && admins.some((a) => a.id === adminId)) return med;
                    admins.push(administration);
                    return { ...med, administrations: admins };
                }),
            };
        },
    );
}

/**
 * Same merge for staff medications list (paginated under query key `medications`).
 */
export function mergeAdministrationIntoMedicationsListCaches(queryClient, administration) {
    if (!administration?.medication_id) return;
    const medId = administration.medication_id;
    const adminId = administration.id;
    queryClient.setQueriesData(
        { queryKey: ['medications'] },
        (old) => {
            if (!old?.data || !Array.isArray(old.data)) return old;
            return {
                ...old,
                data: old.data.map((med) => {
                    if (med.id !== medId) return med;
                    const admins = [...(med.administrations || [])];
                    if (adminId != null && admins.some((a) => a.id === adminId)) return med;
                    admins.push(administration);
                    return { ...med, administrations: admins };
                }),
            };
        },
    );
}

/** Build a minimal admin object from Laravel Echo `medication.administration.created` payload. */
export function administrationFromBroadcastPayload(payload) {
    if (!payload?.medication_id) return null;
    return {
        id: payload.id,
        medication_id: payload.medication_id,
        resident_id: payload.resident_id,
        branch_id: payload.branch_id,
        administered_at: payload.administered_at,
        status: payload.status,
        dosage_given: payload.dosage_given ?? null,
    };
}
