import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams, Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { toast } from 'sonner';
import { offlinePost } from '../../services/offlineApi';
import { useResidentUpdates } from '../../hooks/useRealtimeUpdates';
import {
    setPacificServerTime,
    getPacificDate,
    getPacificISODate,
    formatPacificTime,
    formatPacificDate,
    getPacificNow,
    getPacificISODateTime,
    toPacificDateFromTime,
    formatPacificTimeValue,
    getPacificDayIdentifier,
    getPacificParts,
    parsePacificDateString,
    formatPacificTimeFromInstant,
    getPacificHourFromInstant,
    calculateAgeFromPacificBirthDate,
} from '../../utils/pacificTime';
import {
    Pill,
    Clock,
    Calendar,
    CheckCircle,
    XCircle,
    AlertCircle,
    User,
    ChevronDown,
    ChevronRight,
    RefreshCw,
    X,
    BellRing,
    FileText,
    Heart,
    ShieldAlert,
    Utensils,
    MapPin,
    ExternalLink,
    Stethoscope,
    ClipboardList,
} from 'lucide-react';


import Select from '../../components/ui/radix/Select';
import Tooltip from '../../components/ui/Tooltip';
import Modal from '../../components/ui/Modal';
import { RESIDENT_CONTEXT_QUERY_KEY } from '../../utils/headerResidentSwitcher';
import ResidentSafetyStrip from '../../components/residents/ResidentSafetyStrip';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import logger from '../../utils/logger';
import {
    parseAdminTimeToPacific,
    isMedicationSlotCoveredToday,
    isNoScheduledTimeRowCoveredToday,
    canRecordCompletedAdministrationNow,
    canSelectMedicationRowForBulkAdministration,
    getMedicationAdministrations,
} from '../../utils/medicationSchedule';

function getInitials(first = '', last = '') {
    return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function getResidentAvatarInitials(resident, displayName) {
    const fromFl = getInitials(resident?.first_name, resident?.last_name);
    if (fromFl) return fromFl;
    if (!displayName || displayName === 'Resident') return '';
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return displayName.slice(0, 2).toUpperCase();
}

/** Documents / care-plan links from medication views (hub uses `/my-residents/:id?tab=`). */
function residentHubTabPath(residentId, tab, pathname, embedded) {
    if (residentId == null || residentId === '') {
        return '#';
    }
    const id = String(residentId);
    const path = pathname || '';
    if (path.includes('/my-residents/') || (embedded && path.startsWith('/medications'))) {
        return `/my-residents/${id}?tab=${encodeURIComponent(tab)}`;
    }
    return `/residents/${id}/detail`;
}

const INSTRUCTION_DISPLAY_MAP = {
    'q.i.d': 'Four times a day',
    'q.i.d.': 'Four times a day',
    'qid': 'Four times a day',
    't.i.d': 'Thrice daily',
    't.i.d.': 'Thrice daily',
    'tid': 'Thrice daily',
    'b.i.d': 'Twice daily',
    'b.i.d.': 'Twice daily',
    'bid': 'Twice daily',
    'prn': 'As needed',
    'h.s': 'Hour of sleep',
    'h.s.': 'Hour of sleep',
    'hs': 'Hour of sleep',
    'a.m': 'Morning',
    'a.m.': 'Morning',
    'am': 'Morning',
    'p.m': 'Evening',
    'p.m.': 'Evening',
    'pm': 'Evening',
};

const formatInstructionDisplay = (value) => {
    if (!value) return '';
    const normalized = value.toLowerCase().trim();
    return INSTRUCTION_DISPLAY_MAP[normalized] ?? value;
};

const formatNumberUS = (value) => {
    if (value === null || value === undefined) {
        return '0';
    }
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(numberValue)) {
        return typeof value === 'string' ? value : '0';
    }
    return new Intl.NumberFormat('en-US').format(numberValue);
};

const isMedicationPeriodActiveNow = (medication, referenceDate = getPacificNow()) => {
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
};

/** Match server mark-administered payload for optimistic MAR cache updates. */
function applyOptimisticMarkAdministeredRow(row) {
    if (!row) return row;
    const med = row.medication;
    const fromMed = med ? [med.quantity, med.form].filter(Boolean).join(' ').trim() : '';
    const hasDosage = row.dosage_given != null && String(row.dosage_given).trim() !== '';

    return {
        ...row,
        status: 'completed',
        notes: 'Administered',
        dosage_given: hasDosage ? row.dosage_given : (fromMed || 'Administered'),
    };
}

export default function ResidentMedicationsPage({ embedded = false, variant = 'list', marDate = null }) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const residentId =
        params.residentId ||
        searchParams.get(RESIDENT_CONTEXT_QUERY_KEY) ||
        searchParams.get('resident_id') ||
        undefined;
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState(() => (variant === 'prn' ? 'prn' : 'scheduled')); // 'scheduled', 'am', 'pm', 'prn'
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [search, setSearch] = useState('');
    const [activeOnly, setActiveOnly] = useState(true);
    const [selectedMeds, setSelectedMeds] = useState(new Set());
    const [isBulkAdministering, setIsBulkAdministering] = useState(false);
    const [prnFollowupCompletingId, setPrnFollowupCompletingId] = useState(null);
    const [showMissedOnly, setShowMissedOnly] = useState(false);

    const isMar = variant === 'mar';
    const isPrnHub = variant === 'prn';
    const resolvedMarDate = isMar ? (marDate || getPacificISODate()) : null;
    const isAdministrator = React.useMemo(() => {
        const role = currentUser?.role;
        return role === 'administrator' || role === 'super_admin';
    }, [currentUser?.role]);

    React.useEffect(() => {
        if (isPrnHub) {
            setActiveTab('prn');
        }
    }, [isPrnHub]);
    const medsQueryKey = isMar
        ? ['resident-medications', residentId, activeOnly, 'mar', resolvedMarDate]
        : ['resident-medications', residentId, activeOnly];
    const todayResidentAdminsQueryKey = isMar
        ? ['medication-administrations', 'resident-day', residentId, resolvedMarDate]
        : ['medication-administrations', 'today', residentId];
    const pacificTodayIso = getPacificISODate();
    const isMarRecordingDay = !isMar || resolvedMarDate === pacificTodayIso;
    const periodReferenceDate = React.useMemo(() => {
        if (isMar && resolvedMarDate) {
            return parsePacificDateString(resolvedMarDate) || getPacificNow();
        }
        return getPacificNow();
    }, [isMar, resolvedMarDate]);

    React.useEffect(() => {
        if (!isMarRecordingDay) {
            setSelectedMeds(new Set());
        }
    }, [isMarRecordingDay, resolvedMarDate]);

    // Fetch current user
    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/user');
                setCurrentUser(response.data);
                setPacificServerTime(response.data?.app_current_time, response.data?.app_timezone_offset);
            } catch (err) {
                logger.error('Failed to fetch current user:', err);
            }
        };
        fetchUser();
    }, []);

    React.useEffect(() => {
        if (currentUser?.app_current_time) {
            setPacificServerTime(currentUser.app_current_time, currentUser.app_timezone_offset);
        }
    }, [currentUser?.app_current_time]);

    // Real-time: must match queryKey `resident-medications` (not `medications`) so cache refetches.

    useResidentUpdates(
        residentId,
        ['medication.administration.created'],
        {
            queryKeys: [
                ['resident-medications', residentId],
                ['medication-administrations', residentId],
                todayResidentAdminsQueryKey,
            ],
            showToast: true,
            getToastMessage: (eventName, data) => {
                return `${data.medication?.name || 'Medication'} was administered to ${data.resident?.name || 'resident'}`;
            },
        }
    );

    // Fetch resident details
    const { data: residentData, isLoading: residentLoading } = useQuery({
        queryKey: ['resident', residentId],
        queryFn: async () => {
            const response = await api.get(`/residents/${residentId}`);
            // API wraps payload in { data: { ...resident } } (see BaseApiController::success)
            return response.data?.data ?? response.data;
        },
        enabled: !!residentId,
    });

    // Fetch medications for this resident
    const { data, isLoading, refetch: refetchMeds } = useQuery({
        queryKey: medsQueryKey,
        queryFn: async () => {
            const params = {
                resident_id: residentId,
                per_page: 100,
                active_only: activeOnly ? 'true' : 'false',
                for_administration: 'true',
                hide_administered: isMar ? 'false' : (activeOnly ? 'true' : 'false'),
            };
            if (isMar && resolvedMarDate) {
                params.administration_date = resolvedMarDate;
            }
            const response = await api.get('/medications', { params });
            return response.data;
        },
        enabled: !!residentId,
    });

    /** Administrations for the selected Pacific calendar day (MAR) or today (list). */
    const { data: todayResidentAdminsPage } = useQuery({
        queryKey: todayResidentAdminsQueryKey,
        queryFn: async () => {
            const day = isMar ? resolvedMarDate : getPacificISODate();
            const response = await api.get('/medication-administrations', {
                params: {
                    resident_id: residentId,
                    date_from: day,
                    date_to: day,
                    per_page: 500,
                },
            });
            return response.data;
        },
        enabled: !!residentId && (!isMar || !!resolvedMarDate),
        staleTime: 30 * 1000,
    });

    const pacificTodayForFollowups = getPacificISODate();
    const { data: prnFollowupPayload } = useQuery({
        queryKey: ['resident-prn-followups', residentId, pacificTodayForFollowups],
        queryFn: async () => {
            const response = await api.get(`/reminders/prn-followups/resident/${residentId}`);
            return response.data?.data ?? [];
        },
        enabled: !!residentId,
        staleTime: 60 * 1000,
    });

    const todayAdminsList = React.useMemo(() => {
        const rows = todayResidentAdminsPage?.data ?? todayResidentAdminsPage ?? [];
        return Array.isArray(rows) ? rows : [];
    }, [todayResidentAdminsPage]);

    // PRN history: 7-day past administrations (fetched only when on PRN tab)
    const { data: prnHistoryData, isLoading: prnHistoryLoading } = useQuery({
        queryKey: ['prn-history', residentId],
        queryFn: async () => {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            const today = getPacificISODate();
            const response = await api.get('/medication-administrations', {
                params: { resident_id: residentId, date_from: sevenDaysAgo, date_to: today, per_page: 50 },
            });
            return response.data;
        },
        enabled: !!residentId,
        staleTime: 5 * 60 * 1000,
    });

    const prnHistoryList = React.useMemo(() => {
        const rows = prnHistoryData?.data ?? prnHistoryData ?? [];
        if (!Array.isArray(rows)) return [];
        // Keep only PRN medication administrations (instructions contain prn/as needed)
        return rows.filter(a =>
            a.medication?.instructions
                ? /prn|as needed/i.test(a.medication.instructions)
                : false
        );
    }, [prnHistoryData]);

    const medicationsList = React.useMemo(() => data?.data ?? [], [data?.data]);
    const resident = residentData;
    const residentDisplayName = React.useMemo(() => {
        if (!resident) return 'Resident';
        const fromName = (resident.name || '').trim();
        if (fromName) return fromName;
        const fromParts = [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ').trim();
        if (fromParts) return fromParts;
        return 'Resident';
    }, [resident]);

    const { activePeriodMedications, endedPeriodMedications } = React.useMemo(() => {
        const active = [];
        const ended = [];

        medicationsList.forEach((medication) => {
            if (isMedicationPeriodActiveNow(medication, periodReferenceDate)) {
                active.push(medication);
            } else {
                ended.push(medication);
            }
        });

        return { activePeriodMedications: active, endedPeriodMedications: ended };
    }, [medicationsList, periodReferenceDate]);

    const { scheduledMeds, amMeds, pmMeds, prnMeds } = React.useMemo(() => {
        const displayList = activeOnly ? activePeriodMedications : medicationsList;
        const filteredList = search 
            ? displayList.filter(m => (m.name || m.drug?.name || '').toLowerCase().includes(search.toLowerCase()))
            : displayList;

        const scheduled = [];
        const am = [];
        const pm = [];
        const prn = [];

        filteredList.forEach((medication) => {
            const instruction = (medication.instructions || '').toLowerCase().trim();
            const isPrn = instruction.includes('prn') || instruction.includes('as needed');
            const times = [
                medication.time_1,
                medication.time_2,
                medication.time_3,
                medication.time_4,
            ].filter(Boolean);

            if (isPrn) {
                prn.push({ ...medication, slotTime: null, uniqueId: `prn-${medication.id}` });
            } else {
                times.forEach((time, index) => {
                    if (isMedicationSlotCoveredToday(medication, time)) {
                        return;
                    }
                    const [h] = time.split(':').map(Number);
                    const isAm = h < 12;
                    const entry = { 
                        ...medication, 
                        slotTime: time, 
                        uniqueId: `${medication.id}-${time}`,
                        timeIndex: index + 1
                    };

                    scheduled.push(entry);
                    if (isAm) am.push(entry);
                    else pm.push(entry);
                });

                if (times.length === 0 && !isNoScheduledTimeRowCoveredToday(medication)) {
                    scheduled.push({ ...medication, slotTime: null, uniqueId: `sc-${medication.id}` });
                }
            }
        });

        const rawFollowups = Array.isArray(prnFollowupPayload) ? prnFollowupPayload : [];
        const followupsFiltered = search
            ? rawFollowups.filter((r) => (r.medication_name || '').toLowerCase().includes(search.toLowerCase()))
            : rawFollowups;
        for (const r of followupsFiltered) {
            const row = {
                isPrnFollowupReminder: true,
                uniqueId: `prnfu-${r.reminder_event_id}`,
                reminderId: r.reminder_id,
                reminderEventId: r.reminder_event_id,
                scheduledFor: r.scheduled_for,
                medicationId: r.medication_id,
                medicationName: r.medication_name || 'Medication',
                assigneeName: r.assignee_name,
                assigneeUserId: r.assignee_user_id,
                title: r.title,
                description: r.description,
                resident_id: Number(residentId),
                is_active: true,
                name: r.medication_name,
                drug: null,
                instructions: 'PRN (as needed)',
            };
            scheduled.push(row);
            const hour = getPacificHourFromInstant(r.scheduled_for);
            if (hour < 12) {
                am.push(row);
            } else {
                pm.push(row);
            }
        }

        return { scheduledMeds: scheduled, amMeds: am, pmMeds: pm, prnMeds: prn };
    }, [medicationsList, activePeriodMedications, activeOnly, search, prnFollowupPayload, residentId]);

    // Get current tab's medications with smart sorting
    const currentTabMedications = React.useMemo(() => {
        let list = [];
        switch (activeTab) {
            case 'scheduled': list = [...scheduledMeds]; break;
            case 'am': list = [...amMeds]; break;
            case 'pm': list = [...pmMeds]; break;
            case 'prn': list = [...prnMeds]; break;
            default: list = [...scheduledMeds]; break;
        }

        const now = getPacificNow();
        const getSortWeight = (med) => {
            if (med.uniqueId.startsWith('prn-')) return 999999;
            if (med.isPrnFollowupReminder && med.scheduledFor) {
                const scheduled = new Date(med.scheduledFor);
                if (Number.isNaN(scheduled.getTime())) return 777777;
                const diff = scheduled.getTime() - now.getTime();
                const windowStart = scheduled.getTime() - 60 * 60 * 1000;
                const windowEnd = scheduled.getTime() + 60 * 60 * 1000;
                if (now.getTime() >= windowStart && now.getTime() <= windowEnd) {
                    return -1000000 + Math.abs(diff);
                }
                return diff > -60 * 60 * 1000 ? diff : 555555 + Math.abs(diff);
            }
            if (!med.slotTime) return 888888;

            const scheduled = toPacificDateFromTime(med.slotTime, { referenceDate: now });
            if (!scheduled) return 777777;

            const diff = scheduled.getTime() - now.getTime();
            const windowStart = scheduled.getTime() - 60 * 60 * 1000;
            const windowEnd = scheduled.getTime() + 60 * 60 * 1000;

            if (now.getTime() >= windowStart && now.getTime() <= windowEnd) {
                return -1000000 + Math.abs(diff); // Open windows first
            }
            
            return diff > -60 * 60 * 1000 ? diff : 555555 + Math.abs(diff);
        };

        return list.sort((a, b) => getSortWeight(a) - getSortWeight(b));
    }, [activeTab, scheduledMeds, amMeds, pmMeds, prnMeds]);

    // Overdue counts — used to colour-code tab badges
    const overdueTabCounts = React.useMemo(() => {
        const now = getPacificNow();
        const isSlotOverdue = (med) => {
            if (!med.slotTime) return false;
            const scheduled = toPacificDateFromTime(med.slotTime, { referenceDate: now });
            if (!scheduled) return false;
            return now.getTime() > scheduled.getTime() + 60 * 60 * 1000;
        };
        return {
            scheduled: scheduledMeds.filter(isSlotOverdue).length,
            am: amMeds.filter(isSlotOverdue).length,
            pm: pmMeds.filter(isSlotOverdue).length,
            prn: 0,
        };
    }, [scheduledMeds, amMeds, pmMeds]);

    const [bulkSelectTick, setBulkSelectTick] = useState(0);
    React.useEffect(() => {
        const id = setInterval(() => setBulkSelectTick((t) => t + 1), 15000);
        return () => clearInterval(id);
    }, []);

    React.useEffect(() => {
        setSelectedMeds((prev) => {
            const next = new Set(prev);
            let changed = false;
            for (const uid of [...prev]) {
                const med = currentTabMedications.find((m) => m.uniqueId === uid);
                if (!med) {
                    next.delete(uid);
                    changed = true;
                    continue;
                }
                const admins = getMedicationAdministrations(med);
                const { ok } = canSelectMedicationRowForBulkAdministration(med, {
                    slotTime: med.slotTime,
                    todayAdministrations: admins,
                });
                if (!ok) {
                    next.delete(uid);
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [currentTabMedications, bulkSelectTick]);

    // Toggle row expansion
    const toggleRow = React.useCallback((id) => {
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    /**
     * Administrator-only: flip a persisted missed row to completed.
     * Optimistically updates the MAR so the slot shows completed immediately; rolls back on error.
     */
    const markMissedAsAdministered = React.useCallback(async (target) => {
        const adminId = target?.administrationId;
        if (!adminId || !residentId) return;

        const queryKey = todayResidentAdminsQueryKey;
        const previous = queryClient.getQueryData(queryKey);

        queryClient.setQueryData(queryKey, (old) => {
            if (!old || !Array.isArray(old.data)) return old;
            return {
                ...old,
                data: old.data.map((row) =>
                    (row.id === adminId || String(row.id) === String(adminId))
                        ? applyOptimisticMarkAdministeredRow(row)
                        : row
                ),
            };
        });

        try {
            await api.patch(`/medication-administrations/${adminId}/mark-administered`);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey }),
                queryClient.invalidateQueries({ queryKey: ['resident-medications', residentId] }),
            ]);
        } catch (err) {
            queryClient.setQueryData(queryKey, previous);
            const msg = err?.response?.data?.message || err?.message || 'Failed to mark dose as administered.';
            toast.error(msg);
        }
    }, [queryClient, todayResidentAdminsQueryKey, residentId]);

    const renderMedicationRow = (medication, index) => {
        if (medication.isPrnFollowupReminder) {
            const isExpanded = expandedRows.has(medication.uniqueId);
            const medLabel = (medication.medicationName || medication.name || 'Medication').toUpperCase();
            const followupTimeDisplay = medication.scheduledFor
                ? formatPacificTimeFromInstant(medication.scheduledFor)
                : '';
            const completing = prnFollowupCompletingId === medication.reminderEventId;
            const completeFollowup = async (e) => {
                e.stopPropagation();
                if (!medication.reminderEventId || completing) return;
                setPrnFollowupCompletingId(medication.reminderEventId);
                try {
                    await api.post(`/reminder-events/${medication.reminderEventId}/acknowledge`);
                    await queryClient.invalidateQueries({ queryKey: ['resident-prn-followups', residentId] });
                    queryClient.invalidateQueries({ queryKey: ['reminders', 'upcoming'] });
                } catch (err) {
                    logger.error('Failed to complete PRN follow-up:', err);
                    const msg = err?.response?.data?.message || 'Could not mark follow-up complete.';
                    toast.error(msg);
                } finally {
                    setPrnFollowupCompletingId(null);
                }
            };
            return (
                <div key={medication.uniqueId} className={`${index > 0 ? 'border-t border-gray-100' : ''}`}>
                    <div
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-sky-50/60 ${isExpanded ? 'bg-sky-50/50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}`}
                        onClick={() => toggleRow(medication.uniqueId)}
                    >
                        {activeTab !== 'prn' && <div className="flex-shrink-0 w-9 mr-1" aria-hidden />}
                        <div className="flex-shrink-0 text-gray-400">
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-sky-600" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </div>
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-sky-100">
                            <BellRing className="w-4 h-4 text-sky-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-gray-900 truncate">{medLabel}</h3>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-200">
                                    PRN follow-up
                                </span>
                            </div>
                            <p className="text-xs text-sky-900/70 mt-0.5">
                                Follow-up for this PRN — check whether the dose is working as expected
                            </p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                            {followupTimeDisplay ? (
                                <div className="px-2 py-1 bg-sky-100 rounded text-xs font-black text-sky-900 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {followupTimeDisplay}
                                </div>
                            ) : null}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                type="button"
                                onClick={completeFollowup}
                                disabled={completing || !isMarRecordingDay}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:opacity-95 disabled:opacity-50"
                            >
                                {completing ? 'Saving…' : 'Mark complete'}
                            </button>
                            <span className="hidden sm:inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800">
                                Scheduled
                            </span>
                        </div>
                    </div>
                    {isExpanded && (
                        <div className="bg-sky-50/40 border-t border-sky-100 px-4 py-4 sm:px-8">
                            <div className="max-w-xl space-y-3 text-sm text-gray-700">
                                <p>
                                    <span className="font-semibold text-gray-900">PRN medication: </span>
                                    {medication.medicationName || medication.name || 'Medication'}
                                </p>
                                <p>
                                    <span className="font-semibold text-gray-900">Reminder assigned to: </span>
                                    {medication.assigneeName || 'Staff'}
                                </p>
                                {medication.description ? (
                                    <p className="text-gray-600 italic border-l-2 border-sky-200 pl-3">{medication.description}</p>
                                ) : null}
                                <div className="flex flex-wrap gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={completeFollowup}
                                        disabled={completing || !isMarRecordingDay}
                                        className="px-4 py-2 rounded-lg text-sm font-bold bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:opacity-95 disabled:opacity-50"
                                    >
                                        {completing ? 'Saving…' : 'Mark follow-up complete'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/reminders');
                                        }}
                                        className="px-4 py-2 rounded-lg text-sm font-semibold border border-sky-300 text-sky-900 hover:bg-white"
                                    >
                                        Open reminders
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        const periodActive = isMedicationPeriodActiveNow(medication, periodReferenceDate);
        const isExpanded = expandedRows.has(medication.uniqueId);
        const isSelected = selectedMeds.has(medication.uniqueId);
        const instruction = (medication.instructions || '').toLowerCase().trim();
        const isPrn = instruction.includes('prn') || instruction.includes('as needed');
        const medName = (medication.name || medication.drug?.name || 'Medication').toUpperCase();

        const adminsForMedFromApi = todayAdminsList.filter((a) => Number(a.medication_id) === Number(medication.id));
        const todayAdminDataForRow = { data: adminsForMedFromApi };

        const todayAdministrations = getMedicationAdministrations(medication);
        const canBulkSelect = canSelectMedicationRowForBulkAdministration(medication, {
            slotTime: medication.slotTime,
            todayAdministrations,
        });

        // Determine type badges
        const typeBadges = [];
        if (medication.quantity) typeBadges.push(formatNumberUS(medication.quantity));
        if (medication.form) typeBadges.push(medication.form);
        if (medication.route) typeBadges.push(medication.route);

        // Schedule label
        const scheduleLabel = isPrn ? 'PRN' : formatInstructionDisplay(medication.instructions) || 'Scheduled';

        // Slot specific time
        const slotTimeDisplay = medication.slotTime ? formatPacificTimeValue(medication.slotTime) : null;

        return (
            <div key={medication.uniqueId} className={`${index > 0 ? 'border-t border-gray-100' : ''}`}>
                {/* Compact Row */}
                <div
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${isExpanded ? 'bg-blue-50/40' : (isSelected ? 'bg-blue-100/50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'))} ${!periodActive ? 'opacity-70' : ''}`}
                    onClick={() => toggleRow(medication.uniqueId)}
                >
                    {/* Checkbox for Bulk Administration */}
                    {activeTab !== 'prn' && isMarRecordingDay && (
                        <div
                            className={`flex-shrink-0 mr-1 ${canBulkSelect.ok ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!canBulkSelect.ok) return;
                                const next = new Set(selectedMeds);
                                if (next.has(medication.uniqueId)) next.delete(medication.uniqueId);
                                else next.add(medication.uniqueId);
                                setSelectedMeds(next);
                            }}
                            title={
                                canBulkSelect.ok
                                    ? 'Select for bulk administration'
                                    : (canBulkSelect.reason || 'Only available during an open administration window (±60 minutes of scheduled time)')
                            }
                            aria-disabled={!canBulkSelect.ok}
                        >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)]' : 'border-gray-300 bg-white'}`}>
                                {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            </div>
                        </div>
                    )}
                    {activeTab !== 'prn' && !isMarRecordingDay && (
                        <div className="flex-shrink-0 w-9 mr-1" aria-hidden />
                    )}

                    {/* Expand/Collapse Icon */}
                    <div className="flex-shrink-0 text-gray-400">
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[var(--theme-primary)]" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </div>

                    {/* Pill Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${periodActive ? 'bg-[var(--theme-primary)]/10' : 'bg-gray-100'}`}>
                        <Pill className={`w-4 h-4 ${periodActive ? 'text-[var(--theme-primary)]' : 'text-gray-400'}`} />
                    </div>

                    {/* Medication Name */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-sm font-bold text-gray-900 truncate">
                                {medName}
                            </h3>
                            {/* Window Status Badge */}
                            <MedicationWindowBadge medication={medication} slotTime={medication.slotTime} />
                            
                            {/* Type badges */}
                            <div className="flex items-center gap-1">
                                {typeBadges.map((badge, i) => (
                                    <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>


                    {/* Slot Time Info */}
                    <div className="hidden md:flex items-center gap-4 flex-shrink-0">
                        {slotTimeDisplay && (
                            <div className="px-2 py-1 bg-gray-100 rounded text-xs font-black text-gray-700 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {slotTimeDisplay}
                            </div>
                        )}
                        {medication.instructions && (
                            <div className="text-xs text-gray-600 max-w-[150px] truncate">
                                {scheduleLabel}
                            </div>
                        )}
                    </div>

                    {/* Status Badge */}
                    <div className="flex-shrink-0">
                        {medication.is_active && periodActive ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                Active
                            </span>
                        ) : !periodActive ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                                Ended
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500">
                                Inactive
                            </span>
                        )}
                    </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-200 px-4 py-4 sm:px-8" style={{ animation: 'fadeSlideIn 0.2s ease-out' }}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Section 1: Medication Details */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Medication Details</h4>

                                {medication.instructions && (
                                    <div className="flex items-start gap-2">
                                        <Pill className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Instructions</p>
                                            <p className="text-sm text-gray-900">{formatInstructionDisplay(medication.instructions)}</p>
                                        </div>
                                    </div>
                                )}

                                {medication.diagnosis && (
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Diagnosis / Goal</p>
                                            <p className="text-sm text-gray-900 line-clamp-2" title={medication.diagnosis}>{medication.diagnosis}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Period</p>
                                        <p className="text-sm text-gray-900">
                                            {medication.start_date ? formatPacificDate(parsePacificDateString(medication.start_date)) : '—'} 
                                            {medication.end_date ? ` to ${formatPacificDate(parsePacificDateString(medication.end_date))}` : ' (Ongoing)'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Administration Status */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {isMar
                                        ? `This day's status${periodReferenceDate ? ` · ${formatPacificDate(periodReferenceDate)}` : ''}`
                                        : "Today's Status"}
                                </h4>
                                <MedicationTimeBadges
                                    medication={medication}
                                    activeTab={activeTab}
                                    todayAdminData={todayAdminDataForRow}
                                    isAdministrator={isAdministrator}
                                    canLateMark={isMar && isAdministrator}
                                    showOnlyMissed={isMar && showMissedOnly}
                                    onAdminLateMark={markMissedAsAdministered}
                                />
                                
                                {isMarRecordingDay ? (
                                    <div className="pt-2 border-t border-gray-200">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Record Administration</h4>
                                        <QuickAdminister
                                            medication={medication}
                                            residentId={residentId}
                                            residentName={residentDisplayName}
                                            currentUser={currentUser}
                                            todayResidentAdminsQueryKey={todayResidentAdminsQueryKey}
                                            todayAdminData={todayAdminDataForRow}
                                            periodReferenceDate={periodReferenceDate}
                                            onSuccess={() => {
                                                queryClient.invalidateQueries({ queryKey: ['resident-medications', residentId] });
                                                queryClient.invalidateQueries({ queryKey: todayResidentAdminsQueryKey });
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <p className="pt-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                        This date is read-only. Switch Med pass to <span className="font-semibold">Today</span> to record new administrations.
                                    </p>
                                )}
                            </div>

                            {/* Section 3: Notes & Actions */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes & History</h4>
                                {medication.notes ? (
                                    <div className="bg-white p-3 rounded border border-gray-200 text-sm text-gray-600 italic">
                                        {medication.notes}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No additional notes provided.</p>
                                )}
                                <div className="pt-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/medication-history?resident=${residentId}&medication=${medication.id}`);
                                        }}
                                        className="w-full text-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        View Full Administration History
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const handleBulkAdminister = async () => {
        if (!isMarRecordingDay) return;
        if (selectedMeds.size === 0) return;
        setIsBulkAdministering(true);
        
        try {
            const medsToAdmin = currentTabMedications.filter(m => selectedMeds.has(m.uniqueId));
            const byMedId = new Map();
            for (const a of todayAdminsList) {
                if (!byMedId.has(a.medication_id)) byMedId.set(a.medication_id, []);
                byMedId.get(a.medication_id).push(a);
            }
            const allowed = medsToAdmin.filter((m) =>
                canRecordCompletedAdministrationNow(m, { todayAdministrations: byMedId.get(m.id) || [] }).ok,
            );
            if (allowed.length === 0) {
                toast.warning(
                    'None of the selected medications can be administered right now. Completed doses can only be recorded during an open administration window (±60 minutes of a scheduled time).',
                );
                return;
            }
            if (allowed.length < medsToAdmin.length) {
                toast.warning(
                    `Only ${allowed.length} of ${medsToAdmin.length} selected medications are within an open administration window. Those doses will be recorded.`,
                );
            }
            const now = new Date().toISOString();

            const items = allowed.map((med) => ({
                medication_id: med.id,
                resident_id: med.resident_id,
                branch_id: med.branch_id,
                administered_at: now,
                status: 'completed',
                dosage_given: med.quantity ? `${med.quantity} ${med.form || ''}` : 'As prescribed',
                notes: `Bulk administered from dashboard. Target slot: ${med.slotTime || 'N/A'}`,
            }));

            await api.post('/medication-administrations/bulk', { items });

            setSelectedMeds(new Set());
            await Promise.all([
                refetchMeds(),
                queryClient.invalidateQueries({ queryKey: todayResidentAdminsQueryKey }),
            ]);

            toast.success(`Successfully administered ${allowed.length} records.`);
        } catch (err) {
            logger.error('Bulk administration failed:', err);
            toast.error('Some medications could not be administered.');
        } finally {
            setIsBulkAdministering(false);
        }
    };


    if (residentLoading || isLoading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                <p className="mt-4 text-gray-600">Loading medications...</p>
            </div>
        );
    }

    const carePlanPath = residentHubTabPath(residentId, 'care', location.pathname, embedded);
    const documentsPath = residentHubTabPath(residentId, 'documents', location.pathname, embedded);

    const medGrid = (
        <div className={`grid grid-cols-1 ${embedded ? 'lg:grid-cols-[1fr_272px]' : 'lg:grid-cols-[220px_1fr_272px]'} gap-4 items-start`}>

            {/* ── LEFT: Resident profile panel (standalone only) ── */}
            {!embedded && (
                <ResidentProfilePanel
                    resident={resident}
                    isLoading={residentLoading}
                    residentId={residentId}
                    carePlanPath={carePlanPath}
                    documentsPath={documentsPath}
                />
            )}

                {/* ── CENTRE: Medication content ── */}
                <div className="space-y-4 min-w-0">
                    {isMar && !isMarRecordingDay ? (
                        <div
                            className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                            role="status"
                        >
                            <span className="font-semibold">Viewing another day.</span>{' '}
                            Administration recording and bulk select are available only when Med pass is set to today's date ({pacificTodayIso}).
                            {isAdministrator ? (
                                <span className="block mt-1 text-xs text-amber-900">
                                    As an administrator you can still mark missed doses on this day as administered using the checkmark control beside each missed time.
                                </span>
                            ) : null}
                        </div>
                    ) : null}

                    {isMar ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setShowMissedOnly((v) => !v)}
                                aria-pressed={showMissedOnly}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] ${
                                    showMissedOnly
                                        ? 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                }`}
                                title="Filter the day's view to medications with missed doses"
                            >
                                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                {showMissedOnly ? 'Showing missed only' : 'Show missed only'}
                            </button>
                            {showMissedOnly ? (
                                <span className="text-xs text-gray-500">Filtering time-slot badges to status “Missed”.</span>
                            ) : null}
                        </div>
                    ) : null}

                    {/* Bulk actions — only rendered when items are selected */}
                    {selectedMeds.size > 0 && (
                        <div className="bg-blue-50 rounded-xl border border-blue-100 px-4 py-3 flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-bold text-blue-700">{selectedMeds.size} selected</span>
                            <button
                                onClick={handleBulkAdminister}
                                disabled={isBulkAdministering || !isMarRecordingDay}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isBulkAdministering
                                    ? <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                                    : <CheckCircle className="w-4 h-4" aria-hidden="true" />
                                }
                                Administer All
                            </button>
                            <Tooltip content="Deselect all" position="top">
                                <button
                                    type="button"
                                    onClick={() => setSelectedMeds(new Set())}
                                    className="p-2 text-blue-400 hover:text-red-500 transition-colors"
                                    aria-label="Deselect all"
                                >
                                    <X className="w-4 h-4" strokeWidth={2.25} />
                                </button>
                            </Tooltip>
                        </div>
                    )}

                    {/* Tabs + medication list card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Pacific Time notice */}
                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50/60 border-b border-blue-100/80 text-xs text-blue-600" role="note" aria-label="Timezone notice">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                            <span>All administration windows and timestamps are in <strong>Pacific Time (PT)</strong>.</span>
                        </div>

                        {/* Tabs — hidden on dedicated PRN hub; list stays PRN-only */}
                        {isPrnHub ? (
                            <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-gradient-to-r from-purple-50/90 to-white">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h2 className="text-sm font-bold text-gray-900">PRN (as needed)</h2>
                                        <p className="text-xs text-gray-500 mt-1 max-w-xl">
                                            {prnMeds.length === 0
                                                ? 'No PRN orders on file for this resident. Scheduled medications are on the Medications tab.'
                                                : `${prnMeds.length} PRN item${prnMeds.length !== 1 ? 's' : ''} (orders and follow-ups). Expand a row to record a dose or schedule a follow-up.`}
                                        </p>
                                    </div>
                                    {residentId ? (
                                        <Link
                                            to={`/my-residents/${residentId}/medications/list`}
                                            className="text-xs font-bold text-[var(--theme-primary)] hover:underline shrink-0"
                                        >
                                            Open all medications →
                                        </Link>
                                    ) : null}
                                </div>
                            </div>
                        ) : (
                            <div className="px-4 pt-4 border-b border-gray-100 bg-gray-50/50">
                                <div className="max-w-full overflow-x-auto">
                                    <div className="flex items-center gap-1 min-w-max pb-1">
                                        {[
                                            { key: 'scheduled', label: 'Scheduled', count: scheduledMeds.length, defaultColor: 'bg-blue-500' },
                                            { key: 'am', label: 'AM', count: amMeds.length, defaultColor: 'bg-amber-500' },
                                            { key: 'pm', label: 'PM', count: pmMeds.length, defaultColor: 'bg-indigo-500' },
                                            { key: 'prn', label: 'PRN', count: prnMeds.length, defaultColor: 'bg-purple-500' },
                                        ].map(tab => {
                                            const overdueCount = overdueTabCounts[tab.key] ?? 0;
                                            const activeBadgeColor = tab.count === 0
                                                ? 'bg-emerald-500'
                                                : overdueCount > 0 ? 'bg-red-500' : tab.defaultColor;
                                            const inactiveBadgeColor = tab.count === 0 ? 'bg-emerald-400' : overdueCount > 0 ? 'bg-red-400' : 'bg-gray-300';
                                            return (
                                                <button
                                                    key={tab.key}
                                                    type="button"
                                                    onClick={() => { setActiveTab(tab.key); setExpandedRows(new Set()); setSelectedMeds(new Set()); }}
                                                    aria-selected={activeTab === tab.key}
                                                    className={`relative flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] ${
                                                        activeTab === tab.key
                                                            ? 'bg-white text-gray-900 border-x border-t border-gray-100 -mb-px shadow-[0_-2px_10px_rgba(0,0,0,0.02)]'
                                                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                                                    }`}
                                                >
                                                    {tab.label}
                                                    {overdueCount > 0 && activeTab !== tab.key && (
                                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" aria-label="Overdue items" />
                                                    )}
                                                    <span
                                                        className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black text-white transition-colors ${
                                                            activeTab === tab.key ? activeBadgeColor : inactiveBadgeColor
                                                        }`}
                                                        aria-label={`${tab.count} ${tab.label} medication${tab.count !== 1 ? 's' : ''}${overdueCount > 0 ? `, ${overdueCount} overdue` : ''}`}
                                                    >
                                                        {tab.count}
                                                    </span>
                                                    {activeTab === tab.key && (
                                                        <div className={`absolute bottom-0 left-4 right-4 h-1 rounded-t-full ${activeBadgeColor}`} aria-hidden="true" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Medication list */}
                        <div className="min-h-[400px]">
                            {currentTabMedications.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {currentTabMedications.map((med, idx) => renderMedicationRow(med, idx))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4" aria-hidden="true">
                                        <Pill className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">No medications found</h3>
                                    <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                        {search
                                            ? `No medications matching "${search}" were found.`
                                            : isPrnHub
                                                ? 'No PRN medications found. Add or update orders on the Medications tab if PRN is documented in instructions (PRN / as needed).'
                                                : `There are currently no medications in the ${activeTab} category.`}
                                    </p>
                                    {search && (
                                        <button
                                            onClick={() => setSearch('')}
                                            className="mt-4 text-sm font-bold text-[var(--theme-primary)] hover:underline"
                                        >
                                            Clear search
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer legend */}
                    {!isPrnHub ? (
                        <div className="flex flex-wrap items-center justify-center gap-5 px-4 text-[10px] text-gray-400 uppercase font-black tracking-widest">
                            {[
                                { color: 'bg-blue-500', label: 'Scheduled' },
                                { color: 'bg-amber-500', label: 'AM Only' },
                                { color: 'bg-indigo-500', label: 'PM Only' },
                                { color: 'bg-purple-500', label: 'PRN' },
                            ].map(({ color, label }) => (
                                <div key={label} className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${color}`} aria-hidden="true" />
                                    {label}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                {/* ── RIGHT: Orders + PRN history ── */}
                <div className="space-y-4">
                    <PhysicianOrderPanel documentsPath={documentsPath} navigate={navigate} />
                    <PrnRightPanel entries={prnHistoryList} isLoading={prnHistoryLoading} />
                </div>

            </div>
    );

    if (embedded) return medGrid;

    return (
        <div className="space-y-4">
            <Breadcrumbs items={[
                { label: 'My Residents', path: '/my-residents' },
                { label: residentDisplayName !== 'Resident' ? residentDisplayName : 'Resident', path: residentId ? `/my-residents/${residentId}` : '/my-residents' },
                { label: 'Medications', path: '' },
            ]} />
            {medGrid}
        </div>
    );

}

// Medication Time Badges Component (todayAdminData supplied by parent — one API call per resident, not per row)
function MedicationTimeBadges({
    medication,
    activeTab,
    todayAdminData,
    isAdministrator = false,
    canLateMark = false,
    onAdminLateMark = null,
    showOnlyMissed = false,
}) {
    const formatTime = (timeValue) => formatPacificTimeValue(timeValue);

    // Resolve the slot's status AND the underlying admin record (so admins can flip the right row).
    const parseScheduledTime = (timeValue) => toPacificDateFromTime(timeValue, { referenceDate: getPacificNow() });

    const getTimeSlotInfo = (timeValue) => {
        if (!timeValue) return { status: null, admin: null };

        const scheduledTime = parseScheduledTime(timeValue);
        if (!scheduledTime) return { status: null, admin: null };

        // Use a wider tolerance (2 hours) to match administrations that were recorded as refused/missed
        // This ensures they show up on the card even if recorded at a slightly different time
        const toleranceMinutes = 120;
        const toleranceMs = toleranceMinutes * 60 * 1000;

        // First, try to find an exact match or close match within tolerance
        let matchingAdmin = todayAdminData?.data?.find((admin) => {
            const adminTime = parseAdminTimeToPacific(admin.administered_at);
            if (!adminTime) return false;
            const timeDiff = Math.abs(adminTime.getTime() - scheduledTime.getTime());
            return timeDiff <= toleranceMs;
        });

        // If no match found within tolerance, match by hour:minute within 15 minutes
        if (!matchingAdmin && todayAdminData?.data?.length > 0) {
            const scheduledTotalMinutes = scheduledTime.getUTCHours() * 60 + scheduledTime.getUTCMinutes();

            matchingAdmin = todayAdminData.data.find((admin) => {
                const adminTime = parseAdminTimeToPacific(admin.administered_at);
                if (!adminTime) return false;
                const adminTotalMinutes = adminTime.getUTCHours() * 60 + adminTime.getUTCMinutes();
                return Math.abs(adminTotalMinutes - scheduledTotalMinutes) <= 15;
            });
        }

        const now = getPacificNow();
        const windowClosed = now.getTime() > scheduledTime.getTime() + (60 * 60 * 1000);
        const windowAfterMinutes = 60;

        const windowEndedBeforeCreated = () => {
            if (!medication.created_at) return false;
            const pacificFmt = new Intl.DateTimeFormat('en-US', {
                timeZone: 'America/Los_Angeles',
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', hour12: false,
            });
            const createdDate = new Date(medication.created_at);
            const createdParts = {};
            pacificFmt.formatToParts(createdDate).forEach(({ type, value }) => {
                if (type !== 'literal') createdParts[type] = parseInt(value, 10);
            });
            const nowParts = {};
            pacificFmt.formatToParts(now).forEach(({ type, value }) => {
                if (type !== 'literal') nowParts[type] = parseInt(value, 10);
            });
            const sameDay = nowParts.year === createdParts.year &&
                nowParts.month === createdParts.month && nowParts.day === createdParts.day;
            if (!sameDay) return false;
            const [schedH, schedM] = timeValue.split(':').map(Number);
            const windowEndMin = (schedH * 60 + (schedM || 0)) + windowAfterMinutes;
            const createdMin = createdParts.hour * 60 + createdParts.minute;
            return windowEndMin < createdMin;
        };

        if (matchingAdmin) {
            if (matchingAdmin.status === 'missed' && (!windowClosed || windowEndedBeforeCreated())) {
                return { status: null, admin: null };
            }
            return { status: matchingAdmin.status, admin: matchingAdmin, scheduledTime, windowClosed };
        }

        if (windowClosed && !windowEndedBeforeCreated()) {
            // Predicted missed — no persisted row yet, so admin cannot flip it until the cron creates one.
            return { status: 'missed', admin: null, scheduledTime, windowClosed };
        }

        return { status: null, admin: null, scheduledTime, windowClosed };
    };

    // Backwards-compat shim for any consumers reading only the status string.
    const getTimeStatus = (timeValue) => getTimeSlotInfo(timeValue).status;

    const times = [
        { value: medication.time_1, label: 'Time 1' },
        { value: medication.time_2, label: 'Time 2' },
        { value: medication.time_3, label: 'Time 3' },
        { value: medication.time_4, label: 'Time 4' },
    ].filter(t => {
        if (!t.value) return false;
        if (activeTab === 'am') {
            const [h] = t.value.split(':').map(Number);
            return h < 12;
        }
        if (activeTab === 'pm') {
            const [h] = t.value.split(':').map(Number);
            return h >= 12;
        }
        return true;
    }).sort((a, b) => {
        const toMin = (v) => { const [h, m] = v.split(':').map(Number); return h * 60 + (m || 0); };
        return toMin(a.value) - toMin(b.value);
    });

    const getStatusStyles = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-500 text-white';
            case 'missed':
                return 'bg-red-500 text-white';
            case 'refused':
                return 'bg-yellow-500 text-white';
            case 'hospital_admission':
                return 'bg-blue-500 text-white';
            case 'pharmacy_administration_confirm':
                return 'bg-purple-500 text-white';
            default:
                return 'bg-green-100 text-[var(--theme-primary)]';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-3 h-3 ml-1" />;
            case 'missed':
                return <XCircle className="w-3 h-3 ml-1" />;
            case 'refused':
                return <AlertCircle className="w-3 h-3 ml-1" />;
            default:
                return null;
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'completed':
                return 'Taken';
            case 'missed':
                return 'Missed';
            case 'refused':
                return 'Refused';
            case 'hospital_admission':
                return 'Hospital';
            case 'pharmacy_administration_confirm':
                return 'Pharmacy Confirm';
            default:
                return '';
        }
    };

    // Format a richer tooltip with caregiver name, dose status, and notes.
    const buildSlotTooltip = (timeStr, status, admin) => {
        const lines = [];
        if (status) {
            lines.push(`${getStatusLabel(status)} · ${timeStr}`);
        } else {
            lines.push(`Scheduled for ${timeStr}`);
        }
        if (admin?.administered_by_name || admin?.administeredBy) {
            const u = admin.administeredBy || {};
            const first = u.first_name || '';
            const last = u.last_name || '';
            const fullName = (admin.administered_by_name || `${first} ${last}`.trim() || u.name || '').trim();
            const role = u.role ? ` (${u.role.replace(/_/g, ' ')})` : '';
            if (fullName) lines.push(`By: ${fullName}${role}`);
        }
        if (admin?.administered_at) {
            const t = parseAdminTimeToPacific(admin.administered_at);
            if (t) {
                lines.push(`Recorded: ${t.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit', hour12: true })}`);
            }
        }
        if (admin?.notes) {
            lines.push(`Notes: ${String(admin.notes).slice(0, 140)}`);
        }
        return lines.join('\n');
    };

    return (
        <div className="flex flex-wrap gap-2">
            {times.map((time, idx) => {
                const timeStr = formatTime(time.value);
                const { status, admin } = getTimeSlotInfo(time.value);

                if (!timeStr) return null;
                if (showOnlyMissed && status !== 'missed') return null;

                // An administrator may flip a persisted missed row to completed. We require an actual
                // admin record (admin.id) so we have something concrete to PATCH.
                const showLateMarkAction = canLateMark
                    && isAdministrator
                    && status === 'missed'
                    && !!admin?.id
                    && typeof onAdminLateMark === 'function';

                return (
                    <span key={idx} className="inline-flex items-center gap-1">
                        <span
                            className={`inline-flex items-center px-2 py-1 rounded text-xs ${getStatusStyles(status)}`}
                            title={buildSlotTooltip(timeStr, status, admin)}
                        >
                            <Clock className="w-3 h-3 mr-1" />
                            {timeStr}
                            {getStatusIcon(status)}
                            {status && (
                                <span className="ml-1 text-xs font-medium">{getStatusLabel(status)}</span>
                            )}
                        </span>
                        {showLateMarkAction ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAdminLateMark({
                                        administrationId: admin.id,
                                        medicationName: medication?.drug?.name || medication?.name || 'Medication',
                                        timeLabel: timeStr,
                                        scheduledAt: admin.administered_at,
                                    });
                                }}
                                className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-700/90 bg-emerald-600 !text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-95 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:!text-white"
                                title="Mark this missed dose as administered (administrator)"
                                aria-label={`Mark ${timeStr} dose as administered`}
                            >
                                <CheckCircle aria-hidden="true" />
                            </button>
                        ) : null}
                    </span>
                );
            })}
        </div>
    );
}

// Quick Administer Component
function QuickAdminister({
    medication,
    onSuccess,
    residentId,
    residentName,
    currentUser,
    todayResidentAdminsQueryKey,
    todayAdminData,
    periodReferenceDate: periodReferenceDateProp = null,
}) {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState('completed');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isDosageModalOpen, setIsDosageModalOpen] = useState(false);
    const [dosageGiven, setDosageGiven] = useState('');
    const [dosageNotes, setDosageNotes] = useState('');
    const [dosageValidationError, setDosageValidationError] = useState('');
    const [isWithinTimeWindow, setIsWithinTimeWindow] = useState(false);
    const [timeMessage, setTimeMessage] = useState('');
    const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [nextWindowStart, setNextWindowStart] = useState(null);
    const [nextWindowCountdown, setNextWindowCountdown] = useState('');
    const [upcomingScheduledDisplay, setUpcomingScheduledDisplay] = useState('');
    const [isMedicationPeriodActive, setIsMedicationPeriodActive] = useState(true);
    const [prnFollowupOpen, setPrnFollowupOpen] = useState(false);
    const [followupDate, setFollowupDate] = useState('');
    const [followupTime, setFollowupTime] = useState('09:00');
    const [assigneeUserId, setAssigneeUserId] = useState('');
    const [followupComments, setFollowupComments] = useState('');
    const [followupSubmitting, setFollowupSubmitting] = useState(false);
    const [followupError, setFollowupError] = useState('');
    const [lastAdministrationId, setLastAdministrationId] = useState(null);

    const closeDosageModal = React.useCallback(() => {
        if (submitting) return;
        setIsDosageModalOpen(false);
        setDosageValidationError('');
        setError('');
        setDosageGiven('');
        setDosageNotes('');
    }, [submitting]);

    const normalizedInstruction = React.useMemo(
        () => (medication.instructions || '').toLowerCase().trim(),
        [medication.instructions]
    );
    const isPrnMedication = React.useMemo(
        () => normalizedInstruction.includes('prn') || normalizedInstruction.includes('as needed'),
        [normalizedInstruction]
    );

    const openPrnFollowupModal = React.useCallback((administrationId) => {
        setFollowupDate(getPacificISODate(getPacificNow()));
        setFollowupTime('09:00');
        setAssigneeUserId(currentUser?.id != null ? String(currentUser.id) : '');
        setFollowupComments('');
        setFollowupError('');
        setLastAdministrationId(administrationId ?? null);
        setPrnFollowupOpen(true);
    }, [currentUser]);

    const { data: branchStaffPage } = useQuery({
        queryKey: ['branch-users-prn-followup', medication.branch_id],
        queryFn: async () => (await api.get('/users', { params: { branch_id: medication.branch_id, active_only: 'true', per_page: 100 } })).data,
        enabled: prnFollowupOpen && Boolean(medication.branch_id),
    });

    const branchStaffOptions = React.useMemo(() => {
        const rows = branchStaffPage?.data ?? [];
        const mapped = Array.isArray(rows)
            ? rows.map((u) => ({ value: String(u.id), label: u.name || u.email || `User ${u.id}` }))
            : [];
        if (mapped.length === 0 && currentUser?.id) {
            return [{ value: String(currentUser.id), label: currentUser.name || currentUser.email || 'Current user' }];
        }
        return mapped;
    }, [branchStaffPage, currentUser]);

    // Today's administrations for this medication (from parent single-resident query)
    const todayAdminDataResolved = todayAdminData ?? { data: [] };

    // Check if daily limit is reached by counting unique administered time slots
    React.useEffect(() => {
        if (isPrnMedication) {
            setIsDailyLimitReached(false);
            return;
        }

        const timeSlots = [medication.time_1, medication.time_2, medication.time_3, medication.time_4].filter(Boolean);
        if (timeSlots.length === 0) {
            setIsDailyLimitReached(false);
            return;
        }

        const admins = todayAdminDataResolved?.data?.filter(a => a.status !== 'missed') || [];
        if (admins.length === 0) {
            setIsDailyLimitReached(false);
            return;
        }

        const toleranceMs = 2 * 60 * 60 * 1000;
        let administeredSlots = 0;
        for (const slot of timeSlots) {
            const scheduledTime = toPacificDateFromTime(slot, { referenceDate: getPacificNow() });
            if (!scheduledTime) continue;

            const matched = admins.some(admin => {
                const adminTime = parseAdminTimeToPacific(admin.administered_at);
                if (!adminTime) return false;
                return Math.abs(adminTime.getTime() - scheduledTime.getTime()) <= toleranceMs;
            });

            if (matched) administeredSlots++;
        }

        setIsDailyLimitReached(administeredSlots >= timeSlots.length);
    }, [todayAdminDataResolved, isPrnMedication, medication.time_1, medication.time_2, medication.time_3, medication.time_4]);

    // Helper function to parse time and convert to today's date with an optional day offset
    const parseTimeToToday = React.useCallback(
        (timeValue, dayOffset = 0) =>
            toPacificDateFromTime(timeValue, { referenceDate: getPacificNow(), dayOffset }),
        []
    );

    const formatScheduledTime = React.useCallback(
        (timeValue) => {
            if (!timeValue) {
                return '';
            }

            const parsed = parseTimeToToday(timeValue, 0);
            return parsed ? formatPacificTime(parsed) : '';
        },
        [parseTimeToToday]
    );

    const periodRefForMed = periodReferenceDateProp || getPacificNow();
    const computeMedicationPeriodActive = React.useCallback(
        () => isMedicationPeriodActiveNow(medication, periodRefForMed),
        [medication.start_date, medication.end_date, periodRefForMed]
    );

    const hasAdminForWindow = React.useCallback((scheduledDate) => {
        if (!todayAdminDataResolved?.data?.length) return false;
        const toleranceMs = 60 * 60 * 1000;
        return todayAdminDataResolved.data.some((admin) => {
            if (admin.status === 'missed') return false;
            const adminTime = parseAdminTimeToPacific(admin.administered_at);
            if (!adminTime) return false;
            return Math.abs(adminTime.getTime() - scheduledDate.getTime()) <= toleranceMs;
        });
    }, [todayAdminDataResolved]);

    // Check if current time is within 60 minutes before or after any scheduled time
    const checkTimeWindow = React.useCallback(() => {
        const windowBeforeMinutes = 60;
        const windowAfterMinutes = 60;
        const times = [
            medication.time_1,
            medication.time_2,
            medication.time_3,
            medication.time_4,
        ].filter(Boolean);

        const periodActive = computeMedicationPeriodActive();
        setIsMedicationPeriodActive(periodActive);

        if (!periodActive) {
            setIsWithinTimeWindow(false);
            setTimeMessage('Medication administration period has ended.');
            setNextWindowStart(null);
            setNextWindowCountdown('');
            setUpcomingScheduledDisplay('');
            return;
        }

        if (isPrnMedication || times.length === 0) {
            setIsWithinTimeWindow(true);
            setTimeMessage('');
            setNextWindowStart(null);
            setNextWindowCountdown('');
            setUpcomingScheduledDisplay('');
            return;
        }

        const now = getPacificNow();

        const windows = times
            .flatMap((timeValue) => {
                const scheduledToday = parseTimeToToday(timeValue, 0);
                const scheduledTomorrow = parseTimeToToday(timeValue, 1);
                return [scheduledToday, scheduledTomorrow]
                    .filter(Boolean)
                    .map((scheduledDate) => {
                        const start = new Date(scheduledDate.getTime() - windowBeforeMinutes * 60 * 1000);
                        const end = new Date(scheduledDate.getTime() + windowAfterMinutes * 60 * 1000);
                        const label =
                            formatPacificTime(scheduledDate);
                        return { scheduledDate, start, end, label };
                    });
            })
            .sort((a, b) => a.start - b.start);

        for (const window of windows) {
            if (now >= window.start && now <= window.end) {
                if (hasAdminForWindow(window.scheduledDate)) {
                    continue;
                }
                setIsWithinTimeWindow(true);
                setTimeMessage('');
                setNextWindowStart(null);
                setNextWindowCountdown('');
                setUpcomingScheduledDisplay(window.label || '');
                setError('');
                return;
            }

            if (now < window.start) {
                const nowDay = getPacificDayIdentifier(now);
                const scheduledDay = getPacificDayIdentifier(window.scheduledDate);
                const sameDay =
                    nowDay.year === scheduledDay.year &&
                    nowDay.month === scheduledDay.month &&
                    nowDay.day === scheduledDay.day;
                const formattedDate = formatPacificDate(window.scheduledDate);
                const datePhrase = sameDay ? 'today' : `on ${formattedDate}`;
                setIsWithinTimeWindow(false);
                setTimeMessage(
                    `Next scheduled dose ${datePhrase} at ${window.label}`
                );
                setNextWindowStart(window.start);
                setUpcomingScheduledDisplay(
                    sameDay ? `Today · ${window.label}` : `${formattedDate} · ${window.label}`
                );
                return;
            }
        }

        setIsWithinTimeWindow(false);
        setTimeMessage('No upcoming scheduled times found.');
        setNextWindowStart(null);
        setNextWindowCountdown('');
        setUpcomingScheduledDisplay('');
    }, [
        formatScheduledTime,
        computeMedicationPeriodActive,
        isPrnMedication,
        medication.time_1,
        medication.time_2,
        medication.time_3,
        medication.time_4,
        parseTimeToToday,
        hasAdminForWindow,
    ]);

    // Check time window on mount and update every minute
    React.useEffect(() => {
        checkTimeWindow();
        const interval = setInterval(checkTimeWindow, 60000);
        return () => clearInterval(interval);
    }, [checkTimeWindow]);

    React.useEffect(() => {
        if (!successMessage) {
            return;
        }
        const timeout = setTimeout(() => setSuccessMessage(''), 5000);
        return () => clearTimeout(timeout);
    }, [successMessage]);

    React.useEffect(() => {
        if (!nextWindowStart) {
            setNextWindowCountdown('');
            return;
        }

        const updateCountdown = () => {
            const diffMs = nextWindowStart - getPacificNow();
            if (diffMs <= 0) {
                setNextWindowCountdown('');
                checkTimeWindow();
                return true;
            }

            const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const parts = [];
            if (hours > 0) {
                parts.push(`${hours}h`);
            }
            parts.push(`${minutes.toString().padStart(2, '0')}m`);
            parts.push(`${seconds.toString().padStart(2, '0')}s`);
            setNextWindowCountdown(parts.join(' '));
            return false;
        };

        if (updateCountdown()) {
            return;
        }

        const interval = setInterval(() => {
            if (updateCountdown()) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [nextWindowStart, checkTimeWindow]);

    const isButtonDisabled =
        submitting || isDailyLimitReached || !isMedicationPeriodActive || (!isWithinTimeWindow && !isPrnMedication);

    const openDosageModal = () => {
        setDosageGiven('');
        setDosageNotes('');
        setDosageValidationError('');
        setError('');
        setSuccessMessage('');
        setIsDosageModalOpen(true);
    };

    return (
        <div className="mt-3">
            <div className="flex items-center gap-2">
                <Select
                    value={status}
                    onValueChange={setStatus}
                    options={[
                        { value: 'completed', label: 'Completed' },
                        { value: 'missed', label: 'Missed' },
                        { value: 'refused', label: 'Refused' },
                        { value: 'pharmacy_administration_confirm', label: 'Pharmacy Administration Confirm' },
                    ]}
                    className="w-32"
                />
                <button 
                    onClick={() => {
                        if (!isMedicationPeriodActive) {
                            setError('Medication administration period has ended.');
                            return;
                        }
                        if (!isWithinTimeWindow && !isPrnMedication) {
                            return;
                        }
                        openDosageModal(false);
                    }} 
                    disabled={isButtonDisabled} 
                    className="px-2 py-1 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded text-xs hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                        isDailyLimitReached 
                            ? 'Daily administration limit reached for this medication'
                            : (!isMedicationPeriodActive
                                ? 'Medication administration period has ended.'
                                : (!isWithinTimeWindow && !isPrnMedication
                                ? (timeMessage || (nextWindowCountdown ? `Next window in ${nextWindowCountdown}` : 'Outside scheduled window'))
                                : ''))
                    }
                >
                    {submitting ? 'Administering...' : 'Administer'}
                </button>
            </div>
            {successMessage && (
                <p className="mt-2 text-xs text-green-600">{successMessage}</p>
            )}
            {error && (
                <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
            {isDailyLimitReached && (
                <p className="mt-2 text-xs text-red-600">Daily administration limit reached for this medication.</p>
            )}
            {!isMedicationPeriodActive && timeMessage && (
                <p className="mt-1 text-xs text-red-600">{timeMessage}</p>
            )}
            {isMedicationPeriodActive && !isWithinTimeWindow && !isPrnMedication && !isDailyLimitReached && (timeMessage || nextWindowCountdown) && (
                <p className="mt-1 text-xs text-amber-600">
                    {timeMessage}
                    {upcomingScheduledDisplay && timeMessage ? ` (${upcomingScheduledDisplay})` : upcomingScheduledDisplay}
                    {nextWindowCountdown && ` • Next window in ${nextWindowCountdown}`}
                </p>
            )}
            <Modal
                isOpen={isDosageModalOpen}
                onClose={closeDosageModal}
                title="Confirm administration"
                size="sm"
            >
                <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dosage Given
                                </label>
                                <input
                                    type="text"
                                    value={dosageGiven}
                                    onChange={(e) => {
                                        setDosageGiven(e.target.value);
                                        if (dosageValidationError) {
                                            setDosageValidationError('');
                                        }
                                    }}
                                    placeholder="e.g., 1 tablet, 5 ml"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    disabled={submitting}
                                />
                                {(dosageValidationError || error) && (
                                    <p className="mt-1 text-xs text-red-600">
                                        {dosageValidationError || error}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notes (optional)
                                </label>
                                <textarea
                                    value={dosageNotes}
                                    onChange={(e) => setDosageNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Enter any additional notes..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    disabled={submitting}
                                />
                            </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 mt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    closeDosageModal();
                                }}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    const trimmedDosage = dosageGiven.trim() || 'As prescribed';

                                    const trimmedNotes = dosageNotes.trim();
                                    const finalNotes = trimmedNotes || undefined;

                                    const administeredAt = new Date().toISOString();
                                    const realUtcNow = new Date().toISOString();
                                    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
                                    
                                    const sharedKey = todayResidentAdminsQueryKey;
                                    const currentShared = sharedKey ? queryClient.getQueryData(sharedKey) : undefined;

                                    const optimisticAdmin = {
                                        id: `temp-${Date.now()}`,
                                        medication_id: medication.id,
                                        resident_id: medication.resident_id,
                                        branch_id: medication.branch_id,
                                        administered_at: realUtcNow,
                                        status,
                                        dosage_given: trimmedDosage,
                                        notes: finalNotes,
                                        created_at: realUtcNow,
                                        updated_at: realUtcNow,
                                    };

                                    if (sharedKey) {
                                        queryClient.setQueryData(sharedKey, (old) => {
                                            if (!old) {
                                                return {
                                                    data: [optimisticAdmin],
                                                    total: 1,
                                                    current_page: 1,
                                                };
                                            }
                                            return {
                                                ...old,
                                                data: [...(old.data || []), optimisticAdmin],
                                                total: (old.total || (old.data?.length ?? 0)) + 1,
                                            };
                                        });
                                    }
                                    
                                    // Close modal immediately
                                    closeDosageModal();
                                    checkTimeWindow();
                                    
                                    // Show success message
                                    const successText = `Medication ${statusLabel} recorded successfully.`;
                                    setSuccessMessage(successText);
                                    
                                    // Make API call in background (with offline support)
                                    try {
                                        setSubmitting(true);
                                        setError('');
                                        
                                        const result = await offlinePost('/medication-administrations', {
                                            medication_id: medication.id,
                                            resident_id: medication.resident_id,
                                            branch_id: medication.branch_id,
                                            administered_at: administeredAt,
                                            status,
                                            dosage_given: trimmedDosage,
                                            notes: finalNotes,
                                        });
                                        
                                        // Handle offline response
                                        if (!result.online) {
                                            // Show offline message
                                            setSuccessMessage(successText + ' (Saved offline - will sync when online)');
                                            onSuccess?.();
                                            return;
                                        }
                                        
                                        // Replace optimistic update with real data
                                        const realAdmin = result.data?.data || result.data;

                                        if (sharedKey) {
                                            queryClient.setQueryData(sharedKey, (old) => {
                                                if (!old) return old;
                                                const filtered = (old.data || []).filter((a) => a.id !== optimisticAdmin.id);
                                                return {
                                                    ...old,
                                                    data: [...filtered, realAdmin],
                                                };
                                            });
                                        }

                                        onSuccess?.();

                                        if (isPrnMedication && status === 'completed' && realAdmin?.id) {
                                            openPrnFollowupModal(realAdmin.id);
                                        }
                                    } catch (e) {
                                        if (sharedKey) {
                                            queryClient.setQueryData(sharedKey, currentShared);
                                        }
                                        
                                        const msg = e?.response?.data?.message || 'Unable to record administration.';
                                        setError(msg);
                                    } finally {
                                        setSubmitting(false);
                                    }
                                }}
                                className="px-4 py-2 text-sm bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={submitting}
                            >
                                {submitting ? 'Saving...' : 'Confirm'}
                            </button>
                        </div>
            </Modal>
            <Modal
                isOpen={prnFollowupOpen}
                onClose={() => {
                    if (!followupSubmitting) setPrnFollowupOpen(false);
                }}
                title="Schedule followup"
                size="md"
            >
                <p className="text-sm text-slate-600 mb-4">
                    PRN dose recorded — optionally remind staff when to check back.
                </p>
                <div className="space-y-4 min-h-0">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <span className="text-red-500">*</span> Schedule Date
                                </label>
                                <input
                                    type="date"
                                    value={followupDate}
                                    onChange={(e) => setFollowupDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    disabled={followupSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <span className="text-red-500">*</span> Schedule Time
                                </label>
                                <input
                                    type="time"
                                    value={followupTime}
                                    onChange={(e) => setFollowupTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    disabled={followupSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <span className="text-red-500">*</span> Schedule For
                                </label>
                                <Select
                                    value={assigneeUserId}
                                    onValueChange={setAssigneeUserId}
                                    options={branchStaffOptions}
                                    placeholder="Select staff member"
                                    className="w-full"
                                    contentClassName="z-[220]"
                                    disabled={followupSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                                <textarea
                                    value={followupComments}
                                    onChange={(e) => setFollowupComments(e.target.value)}
                                    rows={3}
                                    placeholder="Optional context for the follow-up..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    disabled={followupSubmitting}
                                />
                            </div>
                            {followupError && (
                                <p className="text-xs text-red-600">{followupError}</p>
                            )}
                </div>
                <div className="flex justify-end gap-2 border-t border-gray-200 pt-4 mt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!followupSubmitting) setPrnFollowupOpen(false);
                                }}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                disabled={followupSubmitting}
                            >
                                Skip
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!followupDate || !followupTime) {
                                        setFollowupError('Schedule date and time are required.');
                                        return;
                                    }
                                    if (!assigneeUserId) {
                                        setFollowupError('Choose who should receive this reminder.');
                                        return;
                                    }
                                    setFollowupSubmitting(true);
                                    setFollowupError('');
                                    try {
                                        const medLabel = medication.name || medication.drug?.name || 'Medication';
                                        await api.post('/reminders', {
                                            title: `PRN follow-up: ${medLabel} — ${residentName || 'Resident'}`,
                                            category: 'medication',
                                            schedule_type: 'one_time',
                                            due_at_local_date: followupDate,
                                            due_at_local_time: followupTime,
                                            description: followupComments.trim() || null,
                                            channel: 'in_app',
                                            branch_id: medication.branch_id,
                                            assignee_user_id: parseInt(assigneeUserId, 10),
                                            metadata: {
                                                type: 'prn_followup',
                                                resident_id: parseInt(residentId, 10),
                                                medication_id: medication.id,
                                                medication_administration_id: lastAdministrationId,
                                            },
                                            action_url: `/my-residents/${residentId}/medications/list`,
                                        });
                                        setPrnFollowupOpen(false);
                                        setSuccessMessage((prev) => (prev ? `${prev} Follow-up scheduled.` : 'Follow-up scheduled.'));
                                        queryClient.invalidateQueries({ queryKey: ['resident-prn-followups', residentId] });
                                    } catch (err) {
                                        const msg = err?.response?.data?.message || 'Could not schedule follow-up.';
                                        setFollowupError(msg);
                                    } finally {
                                        setFollowupSubmitting(false);
                                    }
                                }}
                                className="px-4 py-2 text-sm bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                                disabled={followupSubmitting}
                            >
                                {followupSubmitting ? 'Saving...' : 'Schedule'}
                            </button>
                        </div>
            </Modal>
        </div>
    );
}

// Medication Window Badge Component
function MedicationWindowBadge({ medication, slotTime }) {
    const [status, setStatus] = useState({ isOpen: false, nextStart: null, label: '' });
    const [countdown, setCountdown] = useState('');

    const calculateStatus = React.useCallback(() => {
        const instruction = (medication.instructions || '').toLowerCase().trim();
        const isPrn = instruction.includes('prn') || instruction.includes('as needed');
        const periodActive = isMedicationPeriodActiveNow(medication);

        if (!periodActive) {
            return { isOpen: false, nextStart: null, label: 'Period Ended' };
        }

        if (isPrn) {
            return { isOpen: true, nextStart: null, label: 'PRN Open' };
        }

        const times = slotTime ? [slotTime] : [
            medication.time_1,
            medication.time_2,
            medication.time_3,
            medication.time_4,
        ].filter(Boolean);

        if (times.length === 0) {
            return { isOpen: false, nextStart: null, label: 'No Schedule' };
        }

        const now = getPacificNow();
        let closestFutureWindow = null;
        let isOpen = false;

        times.forEach(timeValue => {
            const scheduled = toPacificDateFromTime(timeValue, { referenceDate: now });
            if (!scheduled) return;

            const windowStart = new Date(scheduled.getTime() - 60 * 60 * 1000);
            const windowEnd = new Date(scheduled.getTime() + 60 * 60 * 1000);

            if (now >= windowStart && now <= windowEnd) {
                isOpen = true;
            } else if (now < windowStart) {
                if (!closestFutureWindow || windowStart < closestFutureWindow.start) {
                    closestFutureWindow = { start: windowStart, scheduled };
                }
            }
        });

        if (isOpen) {
            return { isOpen: true, nextStart: null, label: 'Window Open' };
        }

        if (closestFutureWindow) {
            return { isOpen: false, nextStart: closestFutureWindow.start, label: `Opens at ${formatPacificTime(closestFutureWindow.scheduled)}` };
        }

        // Check tomorrow's first window if no more windows today
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        let firstTomorrow = null;
        
        times.forEach(timeValue => {
            const scheduled = toPacificDateFromTime(timeValue, { referenceDate: tomorrow });
            if (!scheduled) return;
            const windowStart = new Date(scheduled.getTime() - 60 * 60 * 1000);
            if (!firstTomorrow || windowStart < firstTomorrow.start) {
                firstTomorrow = { start: windowStart, scheduled };
            }
        });

        if (firstTomorrow) {
            return { isOpen: false, nextStart: firstTomorrow.start, label: `Tomorrow at ${formatPacificTime(firstTomorrow.scheduled)}` };
        }

        return { isOpen: false, nextStart: null, label: 'Closed' };
    }, [medication]);

    const updateCountdown = React.useCallback((nextStart) => {
        if (!nextStart) {
            setCountdown('');
            return;
        }

        const diffMs = nextStart - getPacificNow();
        if (diffMs <= 0) {
            setCountdown('');
            const newStatus = calculateStatus();
            setStatus(newStatus);
            return;
        }

        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        if (hours > 0) {
            setCountdown(`in ${hours}h ${minutes}m`);
        } else if (minutes > 0) {
            setCountdown(`in ${minutes}m`);
        } else {
            setCountdown('any moment');
        }
    }, [calculateStatus]);

    React.useEffect(() => {
        const initialStatus = calculateStatus();
        setStatus(initialStatus);
        updateCountdown(initialStatus.nextStart);

        const interval = setInterval(() => {
            const currentStatus = calculateStatus();
            setStatus(currentStatus);
            updateCountdown(currentStatus.nextStart);
        }, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, [calculateStatus, updateCountdown]);

    if (status.isOpen) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold bg-green-500 text-white shadow-sm animate-pulse">
                <Clock className="w-3 h-3" />
                WINDOW OPEN
            </span>
        );
    }

    if (status.nextStart) {
        const isVerySoon = (status.nextStart - getPacificNow()) < 30 * 60 * 1000;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border ${isVerySoon ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <Clock className="w-3 h-3" />
                {isVerySoon ? 'DUE SOON: ' : 'Opens '} {countdown || status.label}
            </span>
        );
    }

    return null;
}

// ─── Resident Profile Panel (left column) ─────────────────────────────────────

function ResidentProfilePanel({ resident, isLoading, residentId, carePlanPath, documentsPath }) {
    if (isLoading) {
        return (
            <aside className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3" aria-label="Resident profile loading">
                <div className="flex flex-col items-center gap-3 pb-3 border-b border-gray-100">
                    <div className="w-20 h-20 rounded-full bg-gray-100 animate-pulse" />
                    <div className="h-4 w-32 rounded bg-gray-100 animate-pulse" />
                    <div className="h-3 w-20 rounded bg-gray-100 animate-pulse" />
                </div>
                {[1, 2, 3, 4].map(i => <div key={i} className="h-10 rounded-lg bg-gray-50 animate-pulse" />)}
            </aside>
        );
    }

    if (!resident) return null;

    const fullName = [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ') || resident.name || 'Resident';
    const initials = [resident.first_name?.[0], resident.last_name?.[0]].filter(Boolean).join('').toUpperCase();
    const age = resident.date_of_birth ? calculateAgeFromPacificBirthDate(resident.date_of_birth) : null;
    const dobFormatted = resident.date_of_birth
        ? new Date(resident.date_of_birth).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
        : null;
    const room = resident.room_number || resident.room;

    const codeStatusColor =
        (resident.code_status || '').toLowerCase().includes('full') ? 'bg-red-500' :
        (resident.code_status || '').toLowerCase().includes('dnr') ? 'bg-amber-500' :
        (resident.code_status || '').toLowerCase().includes('comfort') ? 'bg-blue-500' :
        'bg-gray-400';

    const allergies = Array.isArray(resident.allergies)
        ? resident.allergies.join(', ')
        : (typeof resident.allergies === 'string' ? resident.allergies : null)
          || resident.allergies_text
          || null;

    const quickLinks = [
        { label: 'T-Logs', path: `/t-logs?resident_id=${residentId}`, icon: FileText },
        { label: 'Vitals', path: `/vitals?resident_id=${residentId}`, icon: Heart },
        { label: 'Care Plans', path: carePlanPath, icon: ClipboardList },
        { label: 'Documents', path: documentsPath, icon: FileText },
    ];

    return (
        <aside
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            aria-label="Resident clinical profile"
        >
            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-2 px-4 pt-5 pb-4 border-b border-gray-100 bg-gradient-to-b from-[var(--theme-primary-bg)] to-white">
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-md bg-[var(--theme-primary)]/10">
                    {resident.profile_image_url || resident.profile_image ? (
                        <img
                            src={resident.profile_image_url || `/storage/${resident.profile_image}`}
                            alt={fullName}
                            className="w-full h-full object-cover"
                            onError={e => { e.target.style.display = 'none'; e.target.nextElementSibling.style.display = 'flex'; }}
                        />
                    ) : null}
                    <div className={`absolute inset-0 ${resident.profile_image_url || resident.profile_image ? 'hidden' : 'flex'} items-center justify-center text-[var(--theme-primary)] text-xl font-bold`}>
                        {initials || <User className="w-8 h-8" />}
                    </div>
                </div>
                <div className="text-center">
                    <h2 className="text-sm font-bold text-gray-900 leading-tight">{fullName.toUpperCase()}</h2>
                    {dobFormatted && (
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            {dobFormatted}{age !== null ? ` (${age} y.o.)` : ''}
                        </p>
                    )}
                </div>
                {/* Room + Gender pills */}
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    {resident.gender && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">
                            {resident.gender}
                        </span>
                    )}
                    {room && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center gap-1">
                            <MapPin className="w-3 h-3" aria-hidden="true" /> Rm {room}
                        </span>
                    )}
                </div>
            </div>

            {/* Clinical details */}
            <dl className="divide-y divide-gray-50 text-xs">
                {/* Code Status */}
                {resident.code_status && (
                    <div className="flex items-start gap-2 px-3 py-2.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Code Status</dt>
                            <dd className="flex items-center gap-1.5 mt-0.5">
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${codeStatusColor}`} aria-hidden="true" />
                                <span className="font-semibold text-gray-800">{resident.code_status}</span>
                            </dd>
                        </div>
                    </div>
                )}

                {/* Allergies */}
                <div className="flex items-start gap-2 px-3 py-2.5">
                    <AlertCircle className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                        <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Allergies</dt>
                        <dd className={`mt-0.5 font-medium ${allergies ? 'text-red-700' : 'text-gray-400 italic'}`}>
                            {allergies || 'None recorded'}
                        </dd>
                    </div>
                </div>

                {/* Diet */}
                {(resident.diet || resident.dietary_restrictions) && (
                    <div className="flex items-start gap-2 px-3 py-2.5">
                        <Utensils className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Diet</dt>
                            <dd className="mt-0.5 font-medium text-gray-800">{resident.diet || resident.dietary_restrictions}</dd>
                        </div>
                    </div>
                )}

                {/* General medication instructions */}
                {resident.general_medication_instructions && (
                    <div className="flex items-start gap-2 px-3 py-2.5">
                        <Pill className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Med Instructions</dt>
                            <dd className="mt-0.5 text-gray-700 leading-relaxed line-clamp-4">{resident.general_medication_instructions}</dd>
                        </div>
                    </div>
                )}

                {/* Diagnosis */}
                {resident.diagnosis && (
                    <div className="flex items-start gap-2 px-3 py-2.5">
                        <Stethoscope className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Diagnosis</dt>
                            <dd className="mt-0.5 text-gray-700 leading-relaxed line-clamp-3">{resident.diagnosis}</dd>
                        </div>
                    </div>
                )}
            </dl>

            {/* Quick links */}
            <div className="border-t border-gray-100 px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Quick Links</p>
                <div className="space-y-0.5">
                    {quickLinks.map(({ label, path, icon: Icon }) => (
                        <Link
                            key={label}
                            to={path}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
                        >
                            <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                            {label}
                            <ExternalLink className="w-3 h-3 ml-auto text-gray-300" aria-hidden="true" />
                        </Link>
                    ))}
                </div>
            </div>
        </aside>
    );
}

// ─── Physician's Order Panel (right column top) ────────────────────────────────

function PhysicianOrderPanel({ documentsPath, navigate }) {
    return (
        <section
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            aria-label="Physician's order"
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-gray-900">Physician's Order</h3>
                </div>
                <button
                    type="button"
                    onClick={() => navigate(documentsPath)}
                    className="text-xs font-semibold text-[var(--theme-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] rounded"
                >
                    View All →
                </button>
            </div>
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3" aria-hidden="true">
                    <FileText className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-900">Medication Orders</p>
                <p className="text-xs text-gray-400 mt-1">View physician orders in the resident's documents tab.</p>
                <button
                    type="button"
                    onClick={() => navigate(documentsPath)}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] shadow-sm hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2 transition-colors"
                >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[var(--theme-text-on-primary)]" aria-hidden="true" />
                    Open Documents
                </button>
            </div>
        </section>
    );
}

// ─── PRN History Right Panel (right column, always expanded) ──────────────────

function PrnRightPanel({ entries, isLoading }) {
    if (isLoading) {
        return (
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" aria-label="PRN medication history loading">
                <div className="px-4 py-3 border-b border-gray-100">
                    <div className="h-4 w-36 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="p-4 space-y-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-50" />)}
                </div>
            </section>
        );
    }

    return (
        <section
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            aria-label="PRN medication history"
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" aria-hidden="true" />
                    <h3 className="text-sm font-bold text-gray-900">PRN Medication</h3>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Last 7 days</span>
            </div>

            <div className="px-3 py-1.5 bg-gray-50/50 border-b border-gray-100">
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <span>Drug</span>
                    <span>Effective</span>
                    <span>Date & Time</span>
                </div>
            </div>

            {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                    <Pill className="w-8 h-8 text-gray-200 mb-2" aria-hidden="true" />
                    <p className="text-xs text-gray-400">No PRN administrations in the last 7 days.</p>
                </div>
            ) : (
                <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto" role="list">
                    {entries.map(entry => {
                        const medName = (entry.medication?.name || 'Medication').toUpperCase();
                        const dateStr = entry.administered_at
                            ? new Date(entry.administered_at).toLocaleDateString('en-US', {
                                month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles',
                            })
                            : '—';
                        const timeStr = entry.administered_at
                            ? new Date(entry.administered_at).toLocaleTimeString('en-US', {
                                hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles',
                            })
                            : '';
                        const isEffective = entry.status === 'completed';
                        return (
                            <li key={entry.id} className="grid grid-cols-3 gap-2 px-3 py-2.5 text-xs hover:bg-gray-50/60 transition-colors">
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 truncate text-[11px]">{medName}</p>
                                    {entry.dosage_given && (
                                        <p className="text-[10px] text-gray-400 truncate">{entry.dosage_given}</p>
                                    )}
                                </div>
                                <div>
                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                        isEffective ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {isEffective ? 'Effective' : (entry.status || '—')}
                                    </span>
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    <p>{dateStr}</p>
                                    <p className="text-gray-400">{timeStr}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

// ─── PRN History Panel (collapsed, used nowhere now — kept for reference) ──────

function PrnHistoryPanel({ entries, isLoading }) {
    const [collapsed, setCollapsed] = React.useState(false);

    if (isLoading) {
        return (
            <div className="border-t border-gray-100 px-4 py-4">
                <div className="h-4 w-48 animate-pulse rounded bg-gray-100 mb-3" />
                {[1, 2, 3].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-50 mb-2" />)}
            </div>
        );
    }

    return (
        <div className="border-t border-purple-100 bg-purple-50/30">
            <button
                type="button"
                onClick={() => setCollapsed(c => !c)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-purple-800 hover:bg-purple-50/60 transition-colors"
                aria-expanded={!collapsed}
            >
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" aria-hidden="true" />
                    PRN Dose History (last 7 days)
                    {entries.length > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black text-white bg-purple-500">
                            {entries.length}
                        </span>
                    )}
                </div>
                {collapsed
                    ? <ChevronRight className="w-4 h-4 text-purple-400" aria-hidden="true" />
                    : <ChevronDown className="w-4 h-4 text-purple-400" aria-hidden="true" />
                }
            </button>

            {!collapsed && (
                entries.length === 0 ? (
                    <div className="px-4 pb-4 text-sm text-purple-700/70">
                        No PRN administrations recorded in the last 7 days.
                    </div>
                ) : (
                    <div className="px-4 pb-4 space-y-2">
                        {entries.map(entry => {
                            const medName = (entry.medication?.name || 'Medication').toUpperCase();
                            const dateStr = entry.administered_at
                                ? new Date(entry.administered_at).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                                    timeZone: 'America/Los_Angeles',
                                })
                                : '—';
                            const administeredBy = entry.administered_by?.name
                                || entry.administered_by_name
                                || 'Staff';
                            const statusColor = entry.status === 'completed'
                                ? 'text-emerald-700 bg-emerald-50'
                                : entry.status === 'refused'
                                    ? 'text-amber-700 bg-amber-50'
                                    : 'text-gray-600 bg-gray-100';

                            return (
                                <div
                                    key={entry.id}
                                    className="flex items-start gap-3 rounded-lg border border-purple-100 bg-white px-3 py-2.5 text-sm"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{medName}</p>
                                        <p className="text-xs text-gray-400">{dateStr} · {administeredBy}</p>
                                        {entry.dosage_given && (
                                            <p className="text-xs text-gray-500 mt-0.5">Dose: {entry.dosage_given}</p>
                                        )}
                                        {entry.notes && (
                                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{entry.notes}</p>
                                        )}
                                    </div>
                                    <span className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusColor}`}>
                                        {entry.status || 'recorded'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}




