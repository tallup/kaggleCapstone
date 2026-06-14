import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useBranchUpdates } from '../hooks/useRealtimeUpdates';
import logger from '../utils/logger';
import { useToastContext } from '../contexts/ToastContext';
import {
    setPacificServerTime,
    getPacificDate,
    getPacificStartOfDay,
    getPacificISODate,
    formatPacificTime,
    formatPacificDate,
    getPacificNow,
    getPacificDateTimeLocalString,
    getPacificISODateTime,
    convertPacificLocalInputToISO,
    toPacificDateFromTime,
    formatPacificTimeValue,
    getPacificDayIdentifier,
    getPacificParts,
    parsePacificDateString,
} from '../utils/pacificTime';
import {
    Pill,
    Clock,
    User,
    Calendar,
    CheckCircle,
    XCircle,
    AlertCircle,
    Plus,
    Edit,
    Ban,
    RotateCcw,
    Trash2,
    Download,
    ChevronDown,
    ChevronRight,
    List,
    Grid,
    Building2,
    X,
    Search,
    Filter,
    RefreshCw,
} from 'lucide-react';
import CalendarView from '../components/CalendarView';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import {
    parseAdminTimeToPacific,
    isMedicationSlotCoveredToday,
    isNoScheduledTimeRowCoveredToday,
    canRecordCompletedAdministrationNow,
    canSelectMedicationRowForBulkAdministration,
    getMedicationAdministrations,
} from '../utils/medicationSchedule';
import { RESIDENT_CONTEXT_QUERY_KEY } from '../utils/headerResidentSwitcher';

/** Laravel paginator + filtered collections must return JSON arrays; normalize if keys are sparse. */
function normalizePaginatedList(payload) {
    const rows = payload?.data ?? payload;
    if (Array.isArray(rows)) {
        return rows;
    }
    if (rows && typeof rows === 'object') {
        return Object.values(rows);
    }
    return [];
}
import ResidentMedicationsPage from './caregiver/ResidentMedicationsPage';

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

const formatNumberUS = (value, formatOptions) => {
    if (value === null || value === undefined) {
        return '0';
    }

    const numberValue = typeof value === 'number' ? value : Number(value);

    if (Number.isNaN(numberValue)) {
        return typeof value === 'string' ? value : '0';
    }

    return new Intl.NumberFormat('en-US', formatOptions).format(numberValue);
};

const isMedicationPeriodActiveNow = (medication, referenceDate = getPacificNow()) => {
    if (!medication) {
        return false;
    }

    // Get reference date components - parse it the same way we parse medication dates
    // This ensures consistent comparison (both use UTC components = Pacific components)
    const referenceDateParsed = referenceDate instanceof Date
        ? referenceDate
        : parsePacificDateString(getPacificISODate(referenceDate)) || getPacificNow();

    // Extract UTC components directly (treating UTC = Pacific in our system)
    const referenceDateOnly = {
        year: referenceDateParsed.getUTCFullYear(),
        month: referenceDateParsed.getUTCMonth() + 1,
        day: referenceDateParsed.getUTCDate(),
    };

    const buildBoundary = (value) => {
        if (!value) return null;
        // Parse the date string as a Pacific date directly (not through UTC conversion)
        const base = parsePacificDateString(value);
        if (!base || Number.isNaN(base.getTime())) {
            return null;
        }
        // Extract UTC components directly (since parsePacificDateString creates UTC = Pacific)
        // createPacificInstant creates a UTC date where UTC components = Pacific components
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

    // Check end_date - if null/undefined, medication has no end period (active indefinitely)
    const endBoundary = buildBoundary(medication.end_date);
    if (endBoundary && compareDates(referenceDateOnly, endBoundary) > 0) {
        return false; // Current date is after end_date
    }
    // If end_date is null, endBoundary is null, so this check is skipped
    // Medication without end_date is active indefinitely (as long as start_date has passed)

    return true;
};

export default function Medications() {
    const toast = useToastContext();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeOnly, setActiveOnly] = useState(true);
    const [search, setSearch] = useState('');
    const [residentFilter, setResidentFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [selectedMedication, setSelectedMedication] = useState(null);
    const [showAdminForm, setShowAdminForm] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentUser, setCurrentUser] = useState(null);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar' - default to list (calendar hidden)
    /** { type: 'enable'|'disable'|'delete', id: number, medName: string, residentName: string } | null */
    const [medConfirm, setMedConfirm] = useState(null);
    const [activeTab, setActiveTab] = useState('scheduled'); // 'scheduled', 'am', 'pm', 'prn'
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [selectedMeds, setSelectedMeds] = useState(new Set());
    const [isBulkAdministering, setIsBulkAdministering] = useState(false);

    React.useEffect(() => {
        const rid =
            searchParams.get(RESIDENT_CONTEXT_QUERY_KEY) ||
            searchParams.get('resident_id') ||
            '';
        setResidentFilter(rid);
    }, [searchParams]);

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

    // Real-time: refresh medication and administration data when any administration is recorded
    useBranchUpdates(
        currentUser?.branch_id || currentUser?.assigned_branch_id,
        ['medication.administration.created'],
        {
            queryKeys: [
                ['medications'],
                ['medication-administrations'],
            ],
            showToast: true,
            getToastMessage: (_event, data) =>
                `${data.medication?.name || 'Medication'} administered to ${data.resident?.name || 'resident'}`,
        }
    );

    // Check if user is a caregiver
    const isCaregiver = React.useMemo(() => {
        if (!currentUser) {
            return false;
        }

        if (typeof currentUser.is_caregiver === 'boolean') {
            return currentUser.is_caregiver;
        }

        const candidates = [];
        const addCandidate = (value) => {
            if (value !== null && value !== undefined) {
                candidates.push(String(value));
            }
        };

        addCandidate(currentUser.role);
        addCandidate(currentUser.position);
        addCandidate(currentUser.primary_role);
        addCandidate(currentUser.job_title);

        const roles = currentUser.roles;
        if (Array.isArray(roles)) {
            roles.forEach((roleItem) => {
                if (typeof roleItem === 'string') {
                    addCandidate(roleItem);
                } else if (roleItem?.name) {
                    addCandidate(roleItem.name);
                }
            });
        } else if (roles?.data && Array.isArray(roles.data)) {
            roles.data.forEach((roleItem) => {
                if (typeof roleItem === 'string') {
                    addCandidate(roleItem);
                } else if (roleItem?.name) {
                    addCandidate(roleItem.name);
                }
            });
        }

        return candidates.some((value) => {
            const lower = value.toLowerCase().trim();
            if (!lower) return false;
            const normalized = lower.replace(/[\s_-]/g, '');
            return normalized === 'caregiver' || (lower.includes('care') && lower.includes('giver'));
        });
    }, [currentUser]);
    
    // Check if user is a facility administrator (can access all branches in facility)
    const isFacilityAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator';
    }, [currentUser]);
    
    // Check if user is a branch-level admin (restricted to assigned branch)
    const isBranchAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'admin';
    }, [currentUser]);

    const clinicalScopedResidentId =
        searchParams.get(RESIDENT_CONTEXT_QUERY_KEY) || searchParams.get('resident_id') || '';

    // Redirect caregivers to the resident picker unless Clinical hub already scoped a resident (?residentId=)
    React.useEffect(() => {
        if (isCaregiver && currentUser && !clinicalScopedResidentId) {
            navigate('/medications/residents', { replace: true });
        }
    }, [isCaregiver, currentUser, navigate, clinicalScopedResidentId]);

    const isResidentScoped = Boolean(residentFilter);

    const { data, isLoading } = useQuery({
        queryKey: ['medications', activeOnly, search, residentFilter, branchFilter, currentPage],
        queryFn: async () => {
            const response = await api.get('/medications', {
                params: {
                    active_only: activeOnly ? 'true' : 'false',
                    search: search || undefined,
                    resident_id: residentFilter || undefined,
                    branch_id: branchFilter || undefined,
                    // Single-resident views need the full med list (caregiver hub uses 100)
                    per_page: isResidentScoped ? 100 : 20,
                    page: currentPage,
                    for_administration: 'true',
                    hide_administered: activeOnly ? 'true' : 'false',
                },
            });
            return response.data;
        },
        enabled: !isCaregiver, // Skip query for caregivers (they'll be redirected)
    });

    const paginationMeta = React.useMemo(() => {
        const meta = data?.meta ?? data;
        if (!meta) {
            return null;
        }
        return {
            from: meta.from ?? 0,
            to: meta.to ?? 0,
            total: meta.total ?? 0,
            current_page: meta.current_page ?? 1,
            last_page: meta.last_page ?? 1,
            prev_page_url: meta.prev_page_url ?? null,
            next_page_url: meta.next_page_url ?? null,
        };
    }, [data]);

    const medicationsList = React.useMemo(() => normalizePaginatedList(data), [data]);
    const { activePeriodMedications, endedPeriodMedications } = React.useMemo(() => {
        const now = getPacificNow();
        const active = [];
        const ended = [];

        medicationsList.forEach((medication) => {
            if (isMedicationPeriodActiveNow(medication, now)) {
                active.push(medication);
            } else {
                ended.push(medication);
            }
        });

        return { activePeriodMedications: active, endedPeriodMedications: ended };
    }, [medicationsList]);

    // Categorize medications into tabs: Scheduled, AM, PM, PRN
    const { scheduledMeds, amMeds, pmMeds, prnMeds } = React.useMemo(() => {
        const displayList = activeOnly ? activePeriodMedications : medicationsList;
        const scheduled = [];
        const am = [];
        const pm = [];
        const prn = [];

        displayList.forEach((medication) => {
            const instruction = (medication.instructions || '').toLowerCase().trim();
            const isPrn = instruction.includes('prn') || instruction.includes('as needed');
            const times = [
                medication.time_1,
                medication.time_2,
                medication.time_3,
                medication.time_4,
            ].filter(Boolean);

            if (isPrn) {
                // PRNs are usually listed once
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

                // If no times scheduled but not PRN, put in scheduled
                if (times.length === 0 && !isNoScheduledTimeRowCoveredToday(medication)) {
                    scheduled.push({ ...medication, slotTime: null, uniqueId: `sc-${medication.id}` });
                }
            }
        });

        return { scheduledMeds: scheduled, amMeds: am, pmMeds: pm, prnMeds: prn };
    }, [medicationsList, activePeriodMedications, activeOnly]);

    // Get current tab's medications with smart sorting (prioritizing next due)
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
            if (med.uniqueId.startsWith('prn')) return 999999;
            if (!med.slotTime) return 888888;

            const now = getPacificNow();
            const scheduled = toPacificDateFromTime(med.slotTime, { referenceDate: now });
            if (!scheduled) return 777777;

            const diff = scheduled.getTime() - now.getTime();
            const windowStart = scheduled.getTime() - 60 * 60 * 1000;
            const windowEnd = scheduled.getTime() + 60 * 60 * 1000;

            if (now.getTime() >= windowStart && now.getTime() <= windowEnd) {
                return -1000000 + Math.abs(diff); // Open windows first, closest to scheduled top
            }
            
            return diff > -60 * 60 * 1000 ? diff : 555555 + Math.abs(diff);
        };

        return list.sort((a, b) => getSortWeight(a) - getSortWeight(b));
    }, [activeTab, scheduledMeds, amMeds, pmMeds, prnMeds]);

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

    // Generate calendar events - must be at top level (not conditional)
    const calendarEvents = React.useMemo(() => {
        if (!activePeriodMedications || activePeriodMedications.length === 0 || viewMode !== 'calendar') {
            return [];
        }

        const events = [];
        const now = getPacificNow();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7); // Show past 7 days
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() + 30); // Show next 30 days

        activePeriodMedications.forEach(medication => {
            if (!isMedicationPeriodActiveNow(medication)) return;

            const times = [
                medication.time_1,
                medication.time_2,
                medication.time_3,
                medication.time_4,
            ].filter(Boolean);

            if (times.length === 0) return;

            const residentName = [
                medication.resident?.first_name,
                medication.resident?.last_name,
            ].filter(Boolean).join(' ') || medication.resident?.name || 'Resident';

            // Generate events for each day in the range
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const date = parsePacificDateString(dateStr) || new Date(dateStr);

                // Check if medication is active on this date
                if (!isMedicationPeriodActiveNow(medication, date)) continue;

                times.forEach((time, idx) => {
                    if (!time) return;
                    const [hours, minutes] = time.split(':').map(Number);
                    const eventStart = new Date(date);
                    eventStart.setHours(hours || 9, minutes || 0, 0, 0);
                    const eventEnd = new Date(eventStart);
                    eventEnd.setMinutes(eventEnd.getMinutes() + 30); // 30 min duration

                    events.push({
                        id: `${medication.id}-${dateStr}-${idx}`,
                        title: `${residentName} - ${medication.name || medication.drug?.name || 'Medication'}`,
                        start: eventStart,
                        end: eventEnd,
                        color: medication.is_active ? 'var(--theme-primary)' : '#9ca3af',
                        borderColor: medication.is_active ? 'var(--theme-primary)' : '#9ca3af',
                        textColor: '#ffffff',
                        resource: medication,
                        time: time,
                    });
                });
            }
        });

        return events;
    }, [activePeriodMedications, viewMode]);

    const renderMedicationRow = (medication, index) => {
        const isSelected = selectedMeds.has(medication.uniqueId);
        const residentName = [
            medication.resident?.first_name,
            medication.resident?.last_name,
        ]
            .filter(Boolean)
            .join(' ')
            || medication.resident?.name
            || 'Resident';
        const branchName = medication.branch?.name;
        const periodActive = isMedicationPeriodActiveNow(medication);
        const isExpanded = expandedRows.has(medication.uniqueId);
        const instruction = (medication.instructions || '').toLowerCase().trim();
        const isPrn = instruction.includes('prn') || instruction.includes('as needed');
        const hasTimes = Boolean(
            medication.time_1 || medication.time_2 || medication.time_3 || medication.time_4,
        );
        const medName = (medication.name || medication.drug?.name || 'Medication').toUpperCase();

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
                    {activeTab !== 'prn' && (
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

                    {/* Medication Name + Resident */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-gray-900 truncate">
                                {medName}
                            </h3>
                            {/* Window Status Badge */}
                            <MedicationWindowBadge medication={medication} slotTime={medication.slotTime} />

                            {/* Type badges */}
                            {typeBadges.map((badge, i) => (
                                <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
                                    {badge}
                                </span>
                            ))}
                            {/* Schedule type badge */}
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${isPrn ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-700'}`}>
                                {isPrn ? 'PRN' : 'Scheduled'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {residentName}{branchName ? ` • ${branchName}` : ''}
                        </p>
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

                    {/* Detail Entry Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(medication.uniqueId);
                        }}
                        className="flex-shrink-0 hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[var(--theme-primary)] rounded-md hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm"
                    >
                        Detail Entry
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-200 px-4 py-4 sm:px-8" style={{ animation: 'fadeSlideIn 0.2s ease-out' }}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Left Column: Medication Details */}
                            <div className="space-y-3">
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

                                {medication.quantity && (
                                    <div className="flex items-start gap-2">
                                        <Pill className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Give Amount / Quantity</p>
                                            <p className="text-sm text-gray-900">{formatNumberUS(medication.quantity)}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-2">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Start Date</p>
                                        <p className="text-sm text-gray-900">
                                            {medication.start_date
                                                ? formatPacificDate(parsePacificDateString(medication.start_date))
                                                : '—'}
                                        </p>
                                    </div>
                                </div>

                                {medication.end_date && (
                                    <div className="flex items-start gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">End Date</p>
                                            <p className={`text-sm ${periodActive ? 'text-gray-900' : 'text-amber-700'}`}>
                                                {formatPacificDate(parsePacificDateString(medication.end_date))}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {medication.diagnosis && (
                                    <div className="mt-2 p-2.5 bg-white rounded-md border border-gray-200">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Instruction/Comments</p>
                                        <p className="text-sm text-gray-700">{medication.diagnosis}</p>
                                    </div>
                                )}

                                {medication.notes && (
                                    <div className="p-2.5 bg-white rounded-md border border-gray-200">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                                        <p className="text-sm text-gray-700">{medication.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Middle Column: Administration Times & Status */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administration</h4>

                                {(hasTimes || isPrn) && (
                                    <div className="bg-white rounded-md border border-gray-200 p-3">
                                        {hasTimes && (
                                            <div className="mb-2">
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Administration Times</p>
                                                <MedicationTimeBadges medication={medication} activeTab={activeTab} />
                                            </div>
                                        )}

                                        {/* Quick Administer */}
                                        <QuickAdminister medication={medication} onSuccess={() => {
                                            queryClient.invalidateQueries(['medications']);
                                            queryClient.invalidateQueries(['medication-administrations']);
                                            queryClient.invalidateQueries(['medication-administrations-today', medication.id]);
                                            queryClient.invalidateQueries(['medication-administrations-today-check', medication.id]);
                                        }} />
                                    </div>
                                )}

                                {/* Medication History Link */}
                                <button
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        if (medication?.id) params.set('medication', medication.id);
                                        if (medication?.resident_id) params.set('resident', medication.resident_id);
                                        navigate(`/medication-history?${params.toString()}`);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-semibold text-white bg-[var(--theme-primary)] border border-[var(--theme-primary)] rounded-md hover:bg-[var(--theme-primary-hover)] hover:border-[var(--theme-primary-hover)] transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    <Calendar className="w-3.5 h-3.5" />
                                    Medication History
                                </button>

                                {!periodActive && medication.end_date && (
                                    <div className="p-2.5 bg-amber-50 rounded-md border border-amber-200">
                                        <p className="text-xs text-amber-700">
                                            Medication period ended on {formatPacificDate(parsePacificDateString(medication.end_date))}.
                                        </p>
                                        {medication.is_active && (
                                            <p className="text-[10px] text-amber-600 mt-1">
                                                Still marked Active — review if period should remain closed.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Actions */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</h4>

                                {(() => {
                                    const isSuperAdmin = currentUser?.role === 'super_admin';
                                    const isAdmin = currentUser?.role === 'administrator' || currentUser?.role === 'admin';
                                    const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
                                    const canEdit = isSuperAdmin || isAdmin || permissions.includes('edit_medications');
                                    const canDisable = isSuperAdmin || isAdmin || permissions.includes('edit_medications') || permissions.includes('delete_medications');
                                    const canDeletePermanently = isSuperAdmin || isAdmin || permissions.includes('delete_medications');
                                    if (isCaregiver || (!canEdit && !canDisable && !canDeletePermanently)) {
                                        return <p className="text-xs text-gray-400 italic">No actions available</p>;
                                    }
                                    return (
                                        <div className="flex flex-col gap-2">
                                            {!medication.is_active && (
                                                <p className="text-xs text-gray-600 leading-snug">
                                                    This medication is <strong>disabled</strong> (inactive). The Disable button only appears while an order is still active. Use{' '}
                                                    <strong>Re-enable</strong> below or <strong>Edit</strong> and turn on &quot;Active&quot; to show it on active lists again.
                                                </p>
                                            )}
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditing(medication);
                                                        setShowForm(true);
                                                    }}
                                                    className="w-full px-3 py-2 text-sm font-medium text-[var(--theme-text-on-white)] border border-[var(--theme-primary-dark)] rounded-lg bg-white hover:bg-[var(--theme-primary)] hover:text-[var(--theme-text-on-primary)] hover:border-[var(--theme-primary)] transition-colors flex items-center justify-center gap-1.5 [&_svg]:shrink-0"
                                                >
                                                    <Edit className="w-4 h-4" aria-hidden />
                                                    <span>Edit</span>
                                                </button>
                                            )}
                                            {canEdit && !medication.is_active && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const medName2 = medication.name || 'Medication';
                                                        setMedConfirm({
                                                            type: 'enable',
                                                            id: medication.id,
                                                            medName: medName2,
                                                            residentName,
                                                        });
                                                    }}
                                                    disabled={enableMutation.isPending}
                                                    className="w-full px-3 py-2 text-sm font-medium text-emerald-900 border border-emerald-700 rounded-lg bg-white hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:shrink-0"
                                                >
                                                    <RotateCcw className="w-4 h-4" aria-hidden />
                                                    <span>{enableMutation.isPending ? 'Enabling...' : 'Re-enable'}</span>
                                                </button>
                                            )}
                                            {canDisable && medication.is_active && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const medName2 = medication.name || 'Medication';
                                                        setMedConfirm({
                                                            type: 'disable',
                                                            id: medication.id,
                                                            medName: medName2,
                                                            residentName,
                                                        });
                                                    }}
                                                    disabled={disableMutation.isPending}
                                                    className="w-full px-3 py-2 text-sm font-medium text-amber-950 border border-amber-700 rounded-lg bg-white hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:shrink-0"
                                                >
                                                    <Ban className="w-4 h-4" aria-hidden />
                                                    <span>{disableMutation.isPending ? 'Disabling...' : 'Disable'}</span>
                                                </button>
                                            )}
                                            {canDeletePermanently && (
                                                <>
                                                    <div className="border-t border-gray-200 pt-2 mt-1" />
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const medName2 = medication.name || 'Medication';
                                                            setMedConfirm({
                                                                type: 'delete',
                                                                id: medication.id,
                                                                medName: medName2,
                                                                residentName,
                                                            });
                                                        }}
                                                        disabled={deleteMedicationMutation.isPending}
                                                        className="w-full px-3 py-2 text-sm font-medium text-red-900 border border-red-700 rounded-lg bg-white hover:bg-red-600 hover:text-white hover:border-red-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:shrink-0"
                                                    >
                                                        <Trash2 className="w-4 h-4" aria-hidden />
                                                        <span>{deleteMedicationMutation.isPending ? 'Deleting...' : 'Delete permanently'}</span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };


    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [activeOnly, search, residentFilter, branchFilter]);

    React.useEffect(() => {
        if (isCaregiver && showForm) {
            setShowForm(false);
            setEditing(null);
        }
    }, [isCaregiver, showForm]);

    // Fetch administrations for selected medication
    const { data: administrationsData } = useQuery({
        queryKey: ['medication-administrations', selectedMedication],
        queryFn: async () => {
            if (!selectedMedication) return null;
            const response = await api.get('/medication-administrations', {
                params: {
                    medication_id: selectedMedication,
                    per_page: 50,
                },
            });
            return response.data;
        },
        enabled: !!selectedMedication && !isCaregiver,
    });

    // Filter options
    const { data: residentsData } = useQuery({
        queryKey: ['residents-options'],
        queryFn: async () => (await api.get('/residents', { params: { per_page: 100 } })).data,
        enabled: !isCaregiver,
    });
    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
        enabled: !isCaregiver,
    });

    const handleBulkAdminister = async () => {
        if (selectedMeds.size === 0) return;
        setIsBulkAdministering(true);
        try {
            const medsToAdmin = currentTabMedications.filter(m => selectedMeds.has(m.uniqueId));
            const today = getPacificISODate();
            const uniqueResidentIds = [...new Set(medsToAdmin.map((m) => m.resident_id))];
            const adminResponses = await Promise.all(
                uniqueResidentIds.map((rid) =>
                    api.get('/medication-administrations', {
                        params: { resident_id: rid, date_from: today, date_to: today, per_page: 500 },
                    }),
                ),
            );
            const byMedId = new Map();
            uniqueResidentIds.forEach((rid, i) => {
                const rows = adminResponses[i].data?.data ?? adminResponses[i].data ?? [];
                const list = Array.isArray(rows) ? rows : [];
                for (const a of list) {
                    if (!byMedId.has(a.medication_id)) byMedId.set(a.medication_id, []);
                    byMedId.get(a.medication_id).push(a);
                }
            });
            const allowed = medsToAdmin.filter((m) =>
                canRecordCompletedAdministrationNow(m, { todayAdministrations: byMedId.get(m.id) || [] }).ok,
            );
            if (allowed.length === 0) {
                toast.warning(
                    'Cannot administer',
                    'None of the selected medications can be administered right now. Completed doses can only be recorded during an open administration window (±60 minutes of a scheduled time).',
                );
                return;
            }
            if (allowed.length < medsToAdmin.length) {
                toast.warning(
                    'Partial administration',
                    `Only ${allowed.length} of ${medsToAdmin.length} selected medications are within an open administration window. Those doses will be recorded.`,
                );
            }
            const now = new Date().toISOString();

            await Promise.all(
                allowed.map((med) =>
                    api.post('/medication-administrations', {
                        medication_id: med.id,
                        resident_id: med.resident_id,
                        branch_id: med.branch_id,
                        administered_at: now,
                        status: 'completed',
                        dosage_given: med.quantity ? `${med.quantity} ${med.form || ''}` : 'As prescribed',
                        notes: `Bulk administered from medications list. Target slot: ${med.slotTime || 'N/A'}`,
                    }),
                ),
            );

            setSelectedMeds(new Set());
            await queryClient.refetchQueries({ queryKey: ['medications'], exact: false });
            await Promise.all(
                allowed.flatMap((med) => [
                    queryClient.invalidateQueries({ queryKey: ['medication-administrations-today', med.id], exact: true }),
                    queryClient.invalidateQueries({ queryKey: ['medication-administrations-today-check', med.id], exact: true }),
                ]),
            );
            
            toast.success('Success', `Successfully administered ${allowed.length} records.`, { isFormSubmission: true });
        } catch (err) {
            logger.error('Bulk administration failed:', err);
            toast.error('Error', 'Bulk administration failed.');
        } finally {
            setIsBulkAdministering(false);
        }
    };

    const disableMutation = useMutation({
        mutationFn: async (id) => api.patch(`/medications/${id}`, { is_active: false }),
        onSuccess: () => queryClient.invalidateQueries(['medications']),
    });

    const enableMutation = useMutation({
        mutationFn: async (id) => api.patch(`/medications/${id}`, { is_active: true }),
        onSuccess: () => queryClient.invalidateQueries(['medications']),
    });

    const deleteMedicationMutation = useMutation({
        mutationFn: async (id) => api.delete(`/medications/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['medications']),
    });

    const medActionPending =
        (medConfirm?.type === 'enable' && enableMutation.isPending) ||
        (medConfirm?.type === 'disable' && disableMutation.isPending) ||
        (medConfirm?.type === 'delete' && deleteMedicationMutation.isPending);

    const handleMedConfirmAction = () => {
        if (!medConfirm) return;
        const done = () => setMedConfirm(null);
        if (medConfirm.type === 'enable') {
            enableMutation.mutate(medConfirm.id, { onSuccess: done });
        } else if (medConfirm.type === 'disable') {
            disableMutation.mutate(medConfirm.id, { onSuccess: done });
        } else if (medConfirm.type === 'delete') {
            deleteMedicationMutation.mutate(medConfirm.id, { onSuccess: done });
        }
    };

    const medConfirmCopy =
        medConfirm?.type === 'enable'
            ? {
                  title: 'Re-enable medication?',
                  description: `Re-enable "${medConfirm.medName}" for ${medConfirm.residentName}? It will appear on active medication lists again.`,
                  confirmLabel: 'Re-enable',
                  variant: 'primary',
              }
            : medConfirm?.type === 'disable'
              ? {
                    title: 'Disable medication?',
                    description: `Disable "${medConfirm.medName}" for ${medConfirm.residentName}? It will be hidden from active lists but history is kept. You can turn it back on by editing the medication.`,
                    confirmLabel: 'Disable',
                    variant: 'neutral',
                }
              : medConfirm?.type === 'delete'
                ? {
                      title: 'Permanently delete medication?',
                      description: `Permanently delete "${medConfirm.medName}" for ${medConfirm.residentName}? This removes the medication order from the system. Related administration (MAR) rows for this order are also removed. This cannot be undone.`,
                      confirmLabel: 'Delete permanently',
                      variant: 'danger',
                  }
                : { title: '', description: '', confirmLabel: 'Confirm', variant: 'neutral' };

    const formatTime = (timeValue) => formatPacificTimeValue(timeValue);

    // Caregivers: Clinical hub /medications?residentId= shows the per-resident MAR here; otherwise redirect to picker
    if (isCaregiver) {
        if (clinicalScopedResidentId) {
            return <ResidentMedicationsPage embedded />;
        }
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                <p className="mt-4 text-gray-600">Redirecting...</p>
            </div>
        );
    }

    return (
        <>
            <ConfirmDialog
                isOpen={medConfirm != null}
                onClose={() => !medActionPending && setMedConfirm(null)}
                onConfirm={handleMedConfirmAction}
                title={medConfirmCopy.title}
                description={medConfirmCopy.description}
                confirmLabel={medConfirmCopy.confirmLabel}
                cancelLabel="Cancel"
                variant={medConfirmCopy.variant}
                isPending={medActionPending}
            />
            <Modal
                isOpen={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditing(null);
                }}
                title={editing ? 'Edit Medication' : 'Add Medication'}
                size="xl"
            >
                <MedicationForm
                    key={editing?.id ?? 'new'}
                    record={editing}
                    residents={residentsData?.data || []}
                    branches={branchesData?.data || []}
                    currentUser={currentUser}
                    isCaregiver={isCaregiver}
                    isFacilityAdmin={isFacilityAdmin}
                    isBranchAdmin={isBranchAdmin}
                    inModal
                    onClose={() => {
                        setShowForm(false);
                        setEditing(null);
                    }}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditing(null);
                        queryClient.invalidateQueries(['medications']);
                    }}
                />
            </Modal>
            <Modal
                isOpen={showAdminForm}
                onClose={() => {
                    setShowAdminForm(false);
                    setSelectedMedication(null);
                }}
                title="Record Medication Administration"
                size="lg"
            >
                <MedicationAdministrationForm
                    key={selectedMedication ?? 'none'}
                    medication={data?.data?.find((m) => m.id === selectedMedication)}
                    inModal
                    onClose={() => {
                        setShowAdminForm(false);
                        setSelectedMedication(null);
                    }}
                    onSuccess={() => {
                        setShowAdminForm(false);
                        setSelectedMedication(null);
                        queryClient.invalidateQueries(['medications']);
                        queryClient.invalidateQueries(['medication-administrations']);
                    }}
                />
            </Modal>
        <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Medication Management</h2>
                        <p className="text-gray-600">View and track resident medications.</p>
                    </div>
                    {!isCaregiver && currentUser && (() => {
                        const isSuperAdmin = currentUser?.role === 'super_admin';
                        const isAdmin = currentUser?.role === 'administrator' || currentUser?.role === 'admin';
                        const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
                        const canCreate = isSuperAdmin || isAdmin || permissions.includes('create_medications');
                        return canCreate ? (
                            <button
                                onClick={() => { setEditing(null); setShowForm(true); }}
                                className="flex-shrink-0 w-full sm:w-auto px-6 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base font-semibold shadow-md hover:shadow-lg"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Add Medication</span>
                            </button>
                        ) : null;
                    })()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Search:</label>
                        <input
                            type="text"
                            placeholder="Search by medication name, resident..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Filter:</label>
                        <button
                            onClick={() => setActiveOnly(!activeOnly)}
                            className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeOnly
                                ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {activeOnly ? 'Active Only' : 'All Medications'}
                        </button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Resident</label>
                        <select
                            value={residentFilter}
                            onChange={(e) => setResidentFilter(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">All</option>
                            {residentsData?.data?.map(r => (
                                <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Branch</label>
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg text-sm border border-gray-300 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">All</option>
                            {branchesData?.data?.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading medications...</p>
                </div>
            ) : (
                <div>
                    {/* View Mode Toggle + Reset */}
                    <div className="mb-4 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Today: <span className="font-semibold text-gray-700">{formatPacificDate(getPacificNow())}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {medicationsList.length > 0 && (
                                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'list'
                                            ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                            : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <List className="w-4 h-4" />
                                        List View
                                    </button>
                                    <button
                                        onClick={() => setViewMode('calendar')}
                                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'calendar'
                                            ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                            : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Grid className="w-4 h-4" />
                                        Calendar View
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => { setSearch(''); setResidentFilter(''); setBranchFilter(''); setActiveOnly(true); }}
                                className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>

                    {medicationsList.length > 0 ? (
                        viewMode === 'calendar' ? (
                            <CalendarView
                                events={calendarEvents}
                                onSelectEvent={(event) => {
                                    if (event.resource) {
                                        setSelectedMedication(event.resource);
                                        setShowAdminForm(true);
                                    }
                                }}
                                views={['month', 'week', 'day']}
                            />
                        ) : (
                            <div className="space-y-4">
                                {/* Bulk Actions Bar */}
                                {selectedMeds.size > 0 && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <span className="text-sm font-bold text-green-800">{selectedMeds.size} medications selected</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setSelectedMeds(new Set())}
                                                className="text-sm font-semibold text-gray-500 hover:text-gray-700"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleBulkAdminister}
                                                disabled={isBulkAdministering}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-all shadow-md flex items-center gap-2"
                                            >
                                                {isBulkAdministering ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-4 h-4" />
                                                )}
                                                Administer All
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                                    {/* Modern Tabs */}
                                    <div className="px-4 pt-4 border-b border-gray-100 bg-gray-50/50">
                                        <div className="max-w-full overflow-x-auto">
                                            <div className="flex items-center gap-1 min-w-max pb-1">
                                                {[
                                                    { key: 'scheduled', label: 'Scheduled', count: scheduledMeds.length, color: 'bg-blue-500' },
                                                    { key: 'am', label: 'AM', count: amMeds.length, color: 'bg-amber-500' },
                                                    { key: 'pm', label: 'PM', count: pmMeds.length, color: 'bg-indigo-500' },
                                                    { key: 'prn', label: 'PRN', count: prnMeds.length, color: 'bg-purple-500' },
                                                ].map(tab => (
                                                    <button
                                                        key={tab.key}
                                                        onClick={() => { setActiveTab(tab.key); setExpandedRows(new Set()); setSelectedMeds(new Set()); }}
                                                        className={`relative flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-xl transition-all ${
                                                            activeTab === tab.key
                                                                ? 'bg-white text-gray-900 border-x border-t border-gray-100 -mb-px shadow-[0_-2px_10px_rgba(0,0,0,0.02)]'
                                                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                                                        }`}
                                                    >
                                                        {tab.label}
                                                        <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black text-white ${
                                                            activeTab === tab.key ? tab.color : 'bg-gray-300'
                                                        }`}>
                                                            {tab.count}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table-style Header */}
                                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                        {activeTab !== 'prn' && <div className="w-5 flex-shrink-0" />}
                                        <div className="w-4 flex-shrink-0" />
                                        <div className="w-8 flex-shrink-0" />
                                        <div className="flex-1">Medication</div>
                                        <div className="hidden md:block w-[150px] flex-shrink-0">Schedule</div>
                                        <div className="w-[60px] flex-shrink-0 text-center">Status</div>
                                        <div className="hidden sm:block w-[120px] flex-shrink-0" />
                                    </div>

                                    {/* Medication Rows */}
                                    <div className="divide-y divide-gray-50 min-h-[400px]">
                                        {currentTabMedications.length > 0 ? (
                                            currentTabMedications.map((medication, index) => renderMedicationRow(medication, index))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                                                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                                    <Pill className="w-8 h-8 text-gray-300" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-1">No medications found</h3>
                                                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                                    There are currently no medications in the {activeTab} category.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="bg-white rounded-lg shadow p-12 text-center col-span-full">
                            <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg font-medium">No medications found</p>
                            <p className="text-gray-500 text-sm mt-2">
                                {activeOnly
                                    ? 'No active medications found.'
                                    : 'Try adjusting your search or filters.'}
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    {data?.data?.length > 0 && paginationMeta && paginationMeta.last_page > 1 && (
                        <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                Showing {formatNumberUS(paginationMeta.from)} to {formatNumberUS(paginationMeta.to)} of {formatNumberUS(paginationMeta.total)} medications
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || !paginationMeta.prev_page_url}
                                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Previous
                                </button>
                                <span className="px-3 py-1 text-sm">
                                    Page {formatNumberUS(paginationMeta.current_page)} of {formatNumberUS(paginationMeta.last_page)}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    disabled={currentPage >= paginationMeta.last_page || !paginationMeta.next_page_url}
                                    className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Per-Resident Report Button */}
                    <div className="mt-4 bg-white rounded-lg shadow p-4">
                        <button
                            onClick={() => {
                                const meds = data?.data || [];
                                const grouped = meds.reduce((acc, m) => {
                                    const rId = m.resident_id;
                                    if (!acc[rId]) acc[rId] = { resident: m.resident, medications: [] };
                                    acc[rId].medications.push(m);
                                    return acc;
                                }, {});
                                const report = Object.values(grouped).map(g => ({
                                    Resident: `${g.resident?.first_name || ''} ${g.resident?.last_name || ''}`,
                                    Branch: g.resident?.branch?.name || '',
                                    'Total Medications': g.medications.length,
                                    'Active Medications': g.medications.filter(m => m.is_active).length,
                                    'Medications': g.medications.map(m => m.name).join('; '),
                                }));
                                const header = ['Resident', 'Branch', 'Total Medications', 'Active Medications', 'Medications'];
                                const csv = [header.join(',')].concat(report.map(r => [
                                    r.Resident.replace(/,/g, ';'),
                                    r.Branch.replace(/,/g, ';'),
                                    r['Total Medications'],
                                    r['Active Medications'],
                                    r.Medications.replace(/,/g, ';'),
                                ].join(',')));
                                const blob = new Blob(["\uFEFF" + csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'medications_by_resident_report.csv';
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                        >
                            <Download className="w-4 h-4" />
                            <span>Export Medications Report by Resident</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
        </>
    );
}

// Medication Administration Form Component
function MedicationAdministrationForm({ medication, onClose, onSuccess, inModal = false }) {
    const [formData, setFormData] = useState({
        medication_id: medication?.id || '',
        resident_id: medication?.resident_id || '',
        branch_id: medication?.branch_id || '',
        administered_at: getPacificDateTimeLocalString(),
        status: 'completed',
        dosage_given: '',
        notes: '',
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                medication_id: parseInt(formData.medication_id),
                resident_id: parseInt(formData.resident_id),
                branch_id: parseInt(formData.branch_id),
                administered_at: convertPacificLocalInputToISO(formData.administered_at),
            };

            await api.post('/medication-administrations', payload);
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: error.response?.data?.message || 'Failed to record administration' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6'}>
            {!inModal && (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Record Medication Administration</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}

            {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{errors.general}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                        Medication
                    </label>
                    <input
                        type="text"
                        value={medication?.name || ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                        Resident
                    </label>
                    <input
                        type="text"
                        value={medication?.resident ? `${medication.resident.first_name} ${medication.resident.last_name}` : ''}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                        Administered At *
                    </label>
                    <input
                        type="datetime-local"
                        value={formData.administered_at}
                        onChange={(e) => setFormData({ ...formData, administered_at: e.target.value })}
                        required
                        max={getPacificDateTimeLocalString()}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    />
                    {errors.administered_at && <p className="text-xs text-red-600 mt-1">{errors.administered_at[0]}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                        Status *
                    </label>
                    <div className="flex gap-2 mb-2">
                        {['completed', 'missed', 'refused', 'hospital_admission'].map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setFormData({ ...formData, status: s })}
                                className={`px-3 py-1 rounded-lg text-xs border ${formData.status === s ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] border-[var(--theme-primary)]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                            >
                                {s === 'hospital_admission' ? 'Hospital' : s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                    <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    >
                        <option value="completed">Completed</option>
                        <option value="missed">Missed</option>
                        <option value="refused">Refused</option>
                        <option value="hospital_admission">Hospital Admission</option>
                    </select>
                    {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status[0]}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                        Dosage Given
                    </label>
                    <input
                        type="text"
                        value={formData.dosage_given}
                        onChange={(e) => setFormData({ ...formData, dosage_given: e.target.value })}
                        placeholder="e.g., 1 tablet, 5ml"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    />
                    {errors.dosage_given && <p className="text-xs text-red-600 mt-1">{errors.dosage_given[0]}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                        Notes
                    </label>
                    <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        placeholder="Additional notes about the administration..."
                    />
                    {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes[0]}</p>}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Recording...' : 'Record Administration'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// Medication Create/Edit Form Component
function MedicationForm({ record, residents, branches, currentUser, isCaregiver, isFacilityAdmin, isBranchAdmin, onClose, onSuccess, inModal = false }) {
    // Filter branches and residents for caregivers and branch admin users (facility admins see all)
    const filteredBranches = React.useMemo(() => {
        if (isFacilityAdmin) return branches; // Facility admins see all branches
        if ((!isCaregiver && !isBranchAdmin) || !currentUser?.assigned_branch_id) return branches;
        return branches.filter(b => b.id === currentUser.assigned_branch_id);
    }, [branches, isCaregiver, isFacilityAdmin, isBranchAdmin, currentUser]);

    const filteredResidents = React.useMemo(() => {
        if (isFacilityAdmin) return residents; // Facility admins see all residents
        if ((!isCaregiver && !isBranchAdmin) || !currentUser?.assigned_branch_id) return residents;
        return residents.filter(r => r.branch_id === currentUser.assigned_branch_id);
    }, [residents, isCaregiver, isFacilityAdmin, isBranchAdmin, currentUser]);

    // Helper to convert date to YYYY-MM-DD format for date inputs
    const formatDateForInput = (dateValue) => {
        if (!dateValue) return '';
        // If it's already in YYYY-MM-DD format, return as is
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
        }
        // Parse and extract date part
        const parsed = parsePacificDateString(dateValue);
        if (!parsed) return '';
        return getPacificISODate(parsed);
    };

    const [formData, setFormData] = useState({
        resident_id: record?.resident_id || '',
        branch_id: record?.branch_id || ((isCaregiver || isBranchAdmin) && currentUser?.assigned_branch_id ? currentUser.assigned_branch_id : ''),
        drug_id: record?.drug_id || '',
        name: record?.name || '',
        instructions: record?.instructions || '',
        quantity: record?.quantity || '',
        diagnosis: record?.diagnosis || '',
        prescription_date: formatDateForInput(record?.prescription_date) || '',
        start_date: formatDateForInput(record?.start_date) || '', // Will be set in useEffect
        end_date: formatDateForInput(record?.end_date) || '',
        notes: record?.notes || '',
        is_active: record?.is_active ?? true,
        time_1: record?.time_1 || '',
        time_2: record?.time_2 || '',
        time_3: record?.time_3 || '',
        time_4: record?.time_4 || '',
    });

    // Auto-select branch for caregivers and branch admin users on mount (not facility admins)
    React.useEffect(() => {
        if ((isCaregiver || isBranchAdmin) && currentUser?.assigned_branch_id && !record && !formData.branch_id) {
            setFormData(prev => ({ ...prev, branch_id: currentUser.assigned_branch_id }));
        }
    }, [isCaregiver, isBranchAdmin, currentUser, record]);

    // Set default start_date (if not editing existing record)
    // This runs after component mount to ensure server time is available, or uses formatter fallback
    React.useEffect(() => {
        if (!record && !formData.start_date) {
            // Set the default start date (will use server time if available, otherwise formatter)
            const today = getPacificISODate();
            setFormData(prev => ({ ...prev, start_date: today }));
        }
    }, [record, formData.start_date]); // Run when record changes or if start_date is empty

    // Determine how many time fields to display based on instruction
    const getTimesNeeded = (instruction) => {
        switch (instruction) {
            case 'q.i.d':
                return 4; // four times daily
            case 't.i.d':
                return 3; // thrice daily
            case 'b.i.d':
                return 2; // twice daily
            case 'h.s':
            case 'a.m':
            case 'p.m':
                return 1; // once
            case 'PRN':
            default:
                return 0; // as needed or unspecified: no scheduled times
        }
    };

    // Clear unused time fields when instruction changes
    React.useEffect(() => {
        const needed = getTimesNeeded(formData.instructions);
        setFormData((prev) => ({
            ...prev,
            time_1: needed >= 1 ? prev.time_1 : '',
            time_2: needed >= 2 ? prev.time_2 : '',
            time_3: needed >= 3 ? prev.time_3 : '',
            time_4: needed >= 4 ? prev.time_4 : '',
        }));
    }, [formData.instructions]);

    // Fetch drugs
    const { data: drugsData } = useQuery({
        queryKey: ['drugs-options'],
        queryFn: async () => (await api.get('/drugs', { params: { active_only: 'true', per_page: 1000 } })).data,
    });

    // Deduplicate drugs by ID to prevent duplicates in dropdown
    const uniqueDrugs = React.useMemo(() => {
        if (!drugsData?.data) return [];
        const seenIds = new Set();
        const unique = [];
        for (const drug of drugsData.data) {
            if (!seenIds.has(drug.id)) {
                seenIds.add(drug.id);
                unique.push(drug);
            }
        }
        return unique;
    }, [drugsData?.data]);

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            // Ensure dates are sent in YYYY-MM-DD format (no time component to avoid timezone shifts)
            const startDate = formData.start_date ? formData.start_date.split('T')[0] : formData.start_date;

            const payload = {
                ...formData,
                resident_id: parseInt(formData.resident_id),
                branch_id: parseInt(formData.branch_id),
                drug_id: formData.drug_id ? parseInt(formData.drug_id) : null,
                is_active: Boolean(formData.is_active),
                // Ensure dates are in YYYY-MM-DD format (date inputs already provide this)
                start_date: startDate,
                end_date: formData.end_date ? formData.end_date.split('T')[0] : formData.end_date,
                prescription_date: formData.prescription_date ? formData.prescription_date.split('T')[0] : formData.prescription_date,
            };

            if (record) {
                await api.put(`/medications/${record.id}`, payload);
            } else {
                await api.post('/medications', payload);
            }
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: error.response?.data?.message || 'Failed to save medication' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6'}>
            {!inModal && (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">{record ? 'Edit Medication' : 'Add Medication'}</h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}

            {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{errors.general}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Branch *</label>
                        <select
                            value={formData.branch_id}
                            onChange={(e) => {
                                // Clear resident when branch changes
                                setFormData({
                                    ...formData,
                                    branch_id: e.target.value,
                                    resident_id: '' // Clear resident selection when branch changes
                                });
                            }}
                            required
                            disabled={!isFacilityAdmin && (isCaregiver || isBranchAdmin) && currentUser?.assigned_branch_id}
                            className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${!isFacilityAdmin && (isCaregiver || isBranchAdmin) && currentUser?.assigned_branch_id ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                        >
                            <option value="">Select Branch</option>
                            {filteredBranches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                        {errors.branch_id && <p className="text-xs text-red-600 mt-1">{errors.branch_id[0]}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Resident *</label>
                        <select
                            value={formData.resident_id}
                            onChange={(e) => setFormData({ ...formData, resident_id: e.target.value })}
                            required
                            disabled={!formData.branch_id}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value="">
                                {formData.branch_id ? 'Select Resident' : 'Select Branch First'}
                            </option>
                            {filteredResidents
                                .filter(r => !formData.branch_id || r.branch_id == formData.branch_id)
                                .map(r => (
                                    <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
                                ))}
                        </select>
                        {errors.resident_id && <p className="text-xs text-red-600 mt-1">{errors.resident_id[0]}</p>}
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-900 mb-2">Drug *</label>
                        <select
                            value={formData.drug_id}
                            onChange={(e) => {
                                const selectedDrug = uniqueDrugs.find(d => d.id == e.target.value);
                                setFormData({
                                    ...formData,
                                    drug_id: e.target.value,
                                    name: selectedDrug ? selectedDrug.name : formData.name
                                });
                            }}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">Select Drug</option>
                            {uniqueDrugs.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.name}{d.generic_name ? ` (${d.generic_name})` : ''}
                                </option>
                            ))}
                        </select>
                        {errors.drug_id && <p className="text-xs text-red-600 mt-1">{errors.drug_id[0]}</p>}
                    </div>
                    {formData.drug_id && (
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-900 mb-2">Medication Name (Optional - auto-filled from drug)</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                placeholder="Will use drug name if not provided"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Quantity</label>
                        <input
                            type="text"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            placeholder="e.g., 30 tablets"
                        />
                        {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity[0]}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Select Instructions *</label>
                        <select
                            value={formData.instructions}
                            onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">Choose dosage instructions</option>
                            <option value="t.i.d">t.i.d — Thrice daily</option>
                            <option value="q.i.d">q.i.d — Four times a day</option>
                            <option value="b.i.d">b.i.d — Twice daily</option>
                            <option value="PRN">PRN — As needed</option>
                            <option value="h.s">h.s — Hour of sleep</option>
                            <option value="a.m">a.m — Morning</option>
                            <option value="p.m">p.m — Evening</option>
                        </select>
                        {errors.instructions && <p className="text-xs text-red-600 mt-1">{errors.instructions[0]}</p>}
                    </div>

                    <div className="col-span-2">
                        <p className="text-xs text-gray-500 mb-1">
                            {(() => {
                                const needed = getTimesNeeded(formData.instructions);
                                if (needed === 0) return 'No scheduled times required for PRN/unspecified.';
                                if (needed === 1) return 'Select one time for administration.';
                                return `Select ${needed} times spread across the day.`;
                            })()}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Start Date *</label>
                        <input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                        {errors.start_date && <p className="text-xs text-red-600 mt-1">{errors.start_date[0]}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">End Date</label>
                        <input
                            type="date"
                            value={formData.end_date}
                            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                            min={formData.start_date || ''}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                        {errors.end_date && <p className="text-xs text-red-600 mt-1">{errors.end_date[0]}</p>}
                    </div>

                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-900 mb-2">Diagnosis</label>
                        <input
                            type="text"
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            placeholder="Enter diagnosis or condition for this medication"
                        />
                        {errors.diagnosis && <p className="text-xs text-red-600 mt-1">{errors.diagnosis[0]}</p>}
                    </div>

                </div>

                <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Administration Times</h3>
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].slice(0, getTimesNeeded(formData.instructions)).map((idx) => (
                            <div key={idx}>
                                <label className="block text-sm font-medium text-gray-900 mb-2">Time {idx}</label>
                                <TimePicker
                                    value={formData[`time_${idx}`] || ''}
                                    onChange={(value) => setFormData({ ...formData, [`time_${idx}`]: value })}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                    <label className="inline-flex items-center space-x-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={!!formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        />
                        <span>Active</span>
                    </label>

                    <div className="space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50">
                            {isSubmitting ? 'Saving...' : (record ? 'Update Medication' : 'Create Medication')}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}

// Medication Time Badges Component
function MedicationTimeBadges({ medication, activeTab }) {
    const formatTime = (timeValue) => formatPacificTimeValue(timeValue);

    // Fetch today's administrations for this medication
    const { data: todayAdminData, refetch: refetchTodayAdmins } = useQuery({
        queryKey: ['medication-administrations-today', medication.id],
        queryFn: async () => {
            const today = getPacificISODate();
            const response = await api.get('/medication-administrations', {
                params: {
                    medication_id: medication.id,
                    date_from: today,
                    date_to: today,
                    per_page: 100,
                },
            });
            return response.data;
        },
    });

    // Helper to get the status of a time (completed, missed, refused, or null if not administered)
    const parseScheduledTime = (timeValue) => toPacificDateFromTime(timeValue, { referenceDate: getPacificNow() });

    const getTimeStatus = (timeValue) => {
        if (!timeValue) return null;

        const now = getPacificNow();

        // Parse scheduled time for today (dayOffset = 0) and yesterday (dayOffset = -1)
        // We need to check both to see if yesterday's window has closed
        const scheduledTimeToday = toPacificDateFromTime(timeValue, { referenceDate: getPacificNow(), dayOffset: 0 });
        const scheduledTimeYesterday = toPacificDateFromTime(timeValue, { referenceDate: getPacificNow(), dayOffset: -1 });

        if (!scheduledTimeToday) return null;

        // Use the same window as checkTimeWindow: 60 minutes after scheduled time
        const windowAfterMinutes = 60;
        const windowAfterMs = windowAfterMinutes * 60 * 1000;

        // Tolerance for matching administrations (60 minutes to match the administration window)
        // This ensures administrations within the 60-minute window are matched correctly
        const toleranceMinutes = 60;
        const toleranceMs = toleranceMinutes * 60 * 1000;

        // Find the administration that matches this scheduled time
        // We need to check all administrations and find the one closest to this scheduled time
        let matchingAdmin = null;
        let closestTimeDiff = Infinity;

        const todayAdmins = normalizePaginatedList(todayAdminData);
        if (todayAdmins.length && scheduledTimeToday) {
            todayAdmins.forEach((admin) => {
                // Parse the administered_at time - Laravel returns it as UTC ISO string
                // The backend stores it in Pacific timezone, but Laravel serializes as UTC
                // We need to convert the UTC time back to Pacific for comparison
                const adminTimeRaw = new Date(admin.administered_at);

                // Convert UTC time to Pacific time components
                // Laravel stores Pacific time but serializes as UTC, so we need to extract Pacific components
                const pacificFormatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'America/Los_Angeles',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                });

                const parts = pacificFormatter.formatToParts(adminTimeRaw);
                const partsMap = {};
                parts.forEach(({ type, value }) => {
                    if (type !== 'literal') {
                        partsMap[type] = parseInt(value, 10);
                    }
                });

                // Create a date where UTC components = Pacific components (for comparison with scheduledTimeToday)
                const adminTime = new Date(Date.UTC(
                    partsMap.year,
                    partsMap.month - 1,
                    partsMap.day,
                    partsMap.hour,
                    partsMap.minute,
                    partsMap.second || 0
                ));

                // Check against both today and yesterday's scheduled times
                const timeDiffToday = scheduledTimeToday ? Math.abs(adminTime.getTime() - scheduledTimeToday.getTime()) : Infinity;
                const timeDiffYesterday = scheduledTimeYesterday ? Math.abs(adminTime.getTime() - scheduledTimeYesterday.getTime()) : Infinity;
                const minTimeDiff = Math.min(timeDiffToday, timeDiffYesterday);

                // Check if within tolerance and is the closest match so far
                if (minTimeDiff <= toleranceMs && minTimeDiff < closestTimeDiff) {
                    matchingAdmin = admin;
                    closestTimeDiff = minTimeDiff;
                }

            });
        }

        const windowEndTimeToday = scheduledTimeToday.getTime() + windowAfterMs;
        const todayWindowClosed = now.getTime() > windowEndTimeToday;

        // Helper: window for this slot ended before medication was created (same day)?
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
            const todayParts = {};
            pacificFmt.formatToParts(now).forEach(({ type, value }) => {
                if (type !== 'literal') todayParts[type] = parseInt(value, 10);
            });
            const sameDay = todayParts.year === createdParts.year &&
                todayParts.month === createdParts.month && todayParts.day === createdParts.day;
            if (!sameDay) return false;
            const [schedH, schedM] = timeValue.split(':').map(Number);
            const windowEndMin = (schedH * 60 + (schedM || 0)) + windowAfterMinutes;
            const createdMin = createdParts.hour * 60 + createdParts.minute;
            return windowEndMin < createdMin;
        };

        if (matchingAdmin) {
            if (matchingAdmin.status === 'missed' && (!todayWindowClosed || windowEndedBeforeCreated())) {
                return null;
            }
            return matchingAdmin.status;
        }

        // Do not show "missed" for slots whose window ended before the medication was created
        if (todayWindowClosed && windowEndedBeforeCreated()) {
            return null;
        }

        if (todayWindowClosed) {
            return 'missed';
        }

        return null;
    };

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

    return (
        <div className="flex flex-wrap gap-2">
            {times.map((time, idx) => {
                const timeStr = formatTime(time.value);
                const status = getTimeStatus(time.value);

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
                        case 'hospital_admission':
                            return <Building2 className="w-3 h-3 ml-1" />;
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
                        default:
                            return '';
                    }
                };

                return timeStr ? (
                    <span
                        key={idx}
                        className={`inline-flex items-center px-2 py-1 rounded text-xs ${getStatusStyles(status)}`}
                        title={status ? `${getStatusLabel(status)} at ${timeStr}` : `Scheduled for ${timeStr}`}
                    >
                        <Clock className="w-3 h-3 mr-1" />
                        {timeStr}
                        {getStatusIcon(status)}
                        {status && (
                            <span className="ml-1 text-xs font-medium">{getStatusLabel(status)}</span>
                        )}
                    </span>
                ) : null;
            })}
        </div>
    );
}

// Quick Administer Component
function QuickAdminister({ medication, onSuccess }) {
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
    const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
    const [hospitalNotes, setHospitalNotes] = useState('');
    const [hospitalDocument, setHospitalDocument] = useState(null);
    const [hospitalDocumentPreview, setHospitalDocumentPreview] = useState(null);
    const [isMedicationPeriodActive, setIsMedicationPeriodActive] = useState(true);

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
        () => normalizedInstruction.includes('prn'),
        [normalizedInstruction]
    );

    // Fetch today's administrations to check daily limit
    const { data: todayAdminData } = useQuery({
        queryKey: ['medication-administrations-today-check', medication.id],
        queryFn: async () => {
            const today = getPacificISODate();
            const response = await api.get('/medication-administrations', {
                params: {
                    medication_id: medication.id,
                    date_from: today,
                    date_to: today,
                    per_page: 100,
                },
            });
            return response.data;
        },
    });

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

        const admins = normalizePaginatedList(todayAdminData).filter(a => a.status !== 'missed');
        if (admins.length === 0) {
            setIsDailyLimitReached(false);
            return;
        }

        const toleranceMs = 2 * 60 * 60 * 1000;
        const pacificFmt = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false,
        });

        let administeredSlots = 0;
        for (const slot of timeSlots) {
            const scheduledTime = toPacificDateFromTime(slot, { referenceDate: getPacificNow() });
            if (!scheduledTime) continue;

            const matched = admins.some(admin => {
                const raw = new Date(admin.administered_at);
                if (Number.isNaN(raw.getTime())) return false;
                const p = {};
                pacificFmt.formatToParts(raw).forEach(({ type, value }) => {
                    if (type !== 'literal') p[type] = parseInt(value, 10);
                });
                const adminTime = new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second || 0));
                return Math.abs(adminTime.getTime() - scheduledTime.getTime()) <= toleranceMs;
            });

            if (matched) administeredSlots++;
        }

        setIsDailyLimitReached(administeredSlots >= timeSlots.length);
    }, [todayAdminData, isPrnMedication, medication.time_1, medication.time_2, medication.time_3, medication.time_4]);

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

    const computeMedicationPeriodActive = React.useCallback(
        () => isMedicationPeriodActiveNow(medication),
        [medication.start_date, medication.end_date]
    );

    const hasAdminForWindow = React.useCallback((scheduledDate) => {
        const todayAdmins = normalizePaginatedList(todayAdminData);
        if (!todayAdmins.length) return false;
        const toleranceMs = 60 * 60 * 1000;
        return todayAdmins.some((admin) => {
            if (admin.status === 'missed') return false;
            const adminTime = parseAdminTimeToPacific(admin.administered_at);
            if (!adminTime) return false;
            return Math.abs(adminTime.getTime() - scheduledDate.getTime()) <= toleranceMs;
        });
    }, [todayAdminData]);

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
                <select
                    value={status}
                    onChange={async (e) => {
                        const newStatus = e.target.value;
                        if (newStatus === 'hospital_admission') {
                            setIsHospitalModalOpen(true);
                        } else if (newStatus === 'missed' || newStatus === 'refused') {
                            // Automatically log missed/refused medications without requiring dosage modal
                            setStatus(newStatus);
                            setSubmitting(true);
                            setError('');
                            
                            try {
                                // Find the scheduled time that should be marked as missed/refused
                                const now = getPacificNow();
                                const times = [
                                    medication.time_1,
                                    medication.time_2,
                                    medication.time_3,
                                    medication.time_4,
                                ].filter(t => t);
                                
                                // Get scheduled times for today
                                const scheduledTimes = times
                                    .map(timeValue => toPacificDateFromTime(timeValue, { referenceDate: now, dayOffset: 0 }))
                                    .filter(t => t)
                                    .sort((a, b) => a.getTime() - b.getTime());
                                
                                // Find the first scheduled time that hasn't been administered yet
                                // Priority: past scheduled times that haven't been administered
                                let targetScheduledTime = null;
                                const windowAfterMs = 60 * 60 * 1000; // 60 minutes
                                
                                // First, try to find a past scheduled time that hasn't been administered
                                for (const scheduledTime of scheduledTimes) {
                                    const windowStart = scheduledTime.getTime() - (60 * 60 * 1000); // 1 hour before
                                    const windowEnd = scheduledTime.getTime() + windowAfterMs;
                                    
                                    const hasAdministration = normalizePaginatedList(todayAdminData).some(admin => {
                                        const adminTime = new Date(admin.administered_at);
                                        const adminTimeMs = adminTime.getTime();
                                        return adminTimeMs >= windowStart && adminTimeMs <= windowEnd;
                                    });
                                    
                                    // If this scheduled time has passed and has no administration, use it
                                    if (!hasAdministration && scheduledTime.getTime() < now.getTime()) {
                                        targetScheduledTime = scheduledTime;
                                        break;
                                    }
                                }
                                
                                // If no past unadministered time found, use the next upcoming scheduled time
                                if (!targetScheduledTime) {
                                    for (const scheduledTime of scheduledTimes) {
                                        const windowStart = scheduledTime.getTime() - (60 * 60 * 1000);
                                        const windowEnd = scheduledTime.getTime() + windowAfterMs;
                                        
                                        const hasAdministration = normalizePaginatedList(todayAdminData).some(admin => {
                                            const adminTime = new Date(admin.administered_at);
                                            const adminTimeMs = adminTime.getTime();
                                            return adminTimeMs >= windowStart && adminTimeMs <= windowEnd;
                                        });
                                        
                                        if (!hasAdministration) {
                                            targetScheduledTime = scheduledTime;
                                            break;
                                        }
                                    }
                                }
                                
                                // If still no time found, use the first scheduled time for today (or current time for PRN)
                                if (!targetScheduledTime) {
                                    targetScheduledTime = scheduledTimes.length > 0 ? scheduledTimes[0] : now;
                                }
                                
                                // Create the administration record
                                const administeredAt = targetScheduledTime.toISOString();
                                
                                const payload = {
                                    medication_id: medication.id,
                                    resident_id: medication.resident_id,
                                    branch_id: medication.branch_id,
                                    administered_at: administeredAt,
                                    status: newStatus,
                                    dosage_given: newStatus === 'missed' ? 'N/A - Missed' : (newStatus === 'refused' ? 'N/A - Refused' : ''),
                                    notes: newStatus === 'missed' ? 'Marked as missed' : (newStatus === 'refused' ? 'Marked as refused' : ''),
                                };
                                
                                // Make API call
                                await api.post('/medication-administrations', payload);
                                
                                // Invalidate queries to refresh the UI
                                queryClient.invalidateQueries({ queryKey: ['medication-administrations-today', medication.id] });
                                queryClient.invalidateQueries({ queryKey: ['medication-administrations-today-check', medication.id] });
                                queryClient.invalidateQueries({ queryKey: ['medications'] });
                                
                                // Show success message
                                const statusLabel = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                                setSuccessMessage(`Medication marked as ${statusLabel.toLowerCase()} and logged in history.`);
                                
                                // Reset status to completed for next use
                                setTimeout(() => {
                                    setStatus('completed');
                                    setSuccessMessage('');
                                }, 3000);
                                
                                if (onSuccess) {
                                    onSuccess();
                                }
                            } catch (error) {
                                logger.error('Error logging missed/refused medication:', error);
                                setError(error.response?.data?.message || 'Failed to log medication status');
                                setStatus('completed'); // Reset on error
                            } finally {
                                setSubmitting(false);
                            }
                        } else {
                            setStatus(newStatus);
                        }
                    }}
                    className="px-2 py-1 text-xs border rounded"
                    disabled={submitting}
                >
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                    <option value="refused">Refused</option>
                    <option value="hospital_admission">Hospital Admission</option>
                </select>
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
                                <label className="block text-sm font-medium text-gray-900 mb-2">
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
                                <label className="block text-sm font-medium text-gray-900 mb-2">
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
                                    // Prevent double-clicks: check if already submitting
                                    if (submitting) {
                                        return;
                                    }

                                    // Set submitting state immediately to prevent double-clicks
                                    setSubmitting(true);
                                    setError('');

                                    const trimmedDosage = dosageGiven.trim() || 'As prescribed';

                                    const trimmedNotes = dosageNotes.trim();
                                    const finalNotes = trimmedNotes || undefined;

                                    const administeredAt = new Date().toISOString();
                                    const realUtcNow = administeredAt;
                                    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

                                    // Optimistically update the cache immediately
                                    const today = getPacificISODate();
                                    const queryKey = ['medication-administrations-today', medication.id];
                                    const checkQueryKey = ['medication-administrations-today-check', medication.id];

                                    // Get current cache data
                                    const currentData = queryClient.getQueryData(queryKey);
                                    const currentCheckData = queryClient.getQueryData(checkQueryKey);

                                    // Create optimistic administration record with unique temp ID
                                    // Use real UTC for administered_at so getPacificDate() parses correctly
                                    const tempId = `temp-${Date.now()}-${Math.random()}`;
                                    const optimisticAdmin = {
                                        id: tempId,
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

                                    // Optimistically update cache
                                    queryClient.setQueryData(queryKey, (old) => {
                                        if (!old) {
                                            return {
                                                data: [optimisticAdmin],
                                                total: 1,
                                            };
                                        }
                                        // Check if optimistic admin already exists to prevent duplicates
                                        const exists = (old.data || []).some(a => a.id === tempId);
                                        if (exists) {
                                            return old;
                                        }
                                        return {
                                            ...old,
                                            data: [...(old.data || []), optimisticAdmin],
                                            total: (old.total || 0) + 1,
                                        };
                                    });

                                    queryClient.setQueryData(checkQueryKey, (old) => {
                                        if (!old) {
                                            return {
                                                data: [optimisticAdmin],
                                                total: 1,
                                            };
                                        }
                                        // Check if optimistic admin already exists to prevent duplicates
                                        const exists = (old.data || []).some(a => a.id === tempId);
                                        if (exists) {
                                            return old;
                                        }
                                        return {
                                            ...old,
                                            data: [...(old.data || []), optimisticAdmin],
                                            total: (old.total || 0) + 1,
                                        };
                                    });

                                    // Close modal immediately
                                    closeDosageModal();
                                    checkTimeWindow();

                                    // Show success message
                                    const successText = `Medication ${statusLabel} recorded successfully.`;
                                    setSuccessMessage(successText);

                                    // Make API call in background
                                    try {
                                        const response = await api.post('/medication-administrations', {
                                            medication_id: medication.id,
                                            resident_id: medication.resident_id,
                                            branch_id: medication.branch_id,
                                            administered_at: administeredAt,
                                            status,
                                            dosage_given: trimmedDosage,
                                            notes: finalNotes,
                                        });

                                        // Replace optimistic update with real data
                                        const realAdmin = response.data?.data || response.data;

                                        // Remove all temp records with the same medication and time, then add real one
                                        queryClient.setQueryData(queryKey, (old) => {
                                            if (!old) return old;
                                            // Filter out all temp records and any existing real records with same medication_id and administered_at
                                            const filtered = (old.data || []).filter(a => {
                                                // Keep if it's a real record (numeric ID) and different from the new one
                                                if (typeof a.id === 'number') {
                                                    // Only keep if it's not a duplicate of the new record
                                                    return !(a.medication_id === realAdmin.medication_id &&
                                                        a.administered_at === realAdmin.administered_at &&
                                                        a.status === realAdmin.status);
                                                }
                                                // Remove all temp records
                                                return false;
                                            });
                                            // Check if real admin already exists in filtered list
                                            const exists = filtered.some(a =>
                                                a.id === realAdmin.id ||
                                                (a.medication_id === realAdmin.medication_id &&
                                                    a.administered_at === realAdmin.administered_at &&
                                                    a.status === realAdmin.status)
                                            );
                                            if (!exists) {
                                                filtered.push(realAdmin);
                                            }
                                            return {
                                                ...old,
                                                data: filtered,
                                                total: filtered.length,
                                            };
                                        });

                                        queryClient.setQueryData(checkQueryKey, (old) => {
                                            if (!old) return old;
                                            // Filter out all temp records and duplicates
                                            const filtered = (old.data || []).filter(a => {
                                                if (typeof a.id === 'number') {
                                                    return !(a.medication_id === realAdmin.medication_id &&
                                                        a.administered_at === realAdmin.administered_at &&
                                                        a.status === realAdmin.status);
                                                }
                                                return false;
                                            });
                                            const exists = filtered.some(a =>
                                                a.id === realAdmin.id ||
                                                (a.medication_id === realAdmin.medication_id &&
                                                    a.administered_at === realAdmin.administered_at &&
                                                    a.status === realAdmin.status)
                                            );
                                            if (!exists) {
                                                filtered.push(realAdmin);
                                            }
                                            return {
                                                ...old,
                                                data: filtered,
                                                total: filtered.length,
                                            };
                                        });

                                        // Invalidate other related queries
                                        queryClient.invalidateQueries(['medication-administrations']);

                                        onSuccess?.();
                                    } catch (e) {
                                        // Revert optimistic update on error
                                        queryClient.setQueryData(queryKey, currentData);
                                        queryClient.setQueryData(checkQueryKey, currentCheckData);

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
                isOpen={isHospitalModalOpen}
                onClose={() => {
                    if (submitting) return;
                    setIsHospitalModalOpen(false);
                    setHospitalNotes('');
                    setHospitalDocument(null);
                    setHospitalDocumentPreview(null);
                }}
                title="Hospital admission details"
                size="md"
            >
                <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Notes *
                                </label>
                                <textarea
                                    value={hospitalNotes}
                                    onChange={(e) => setHospitalNotes(e.target.value)}
                                    rows={4}
                                    placeholder="Enter details about the hospital admission..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Attach Document (Optional)
                                </label>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setHospitalDocument(file);
                                            // Create preview for images
                                            if (file.type.startsWith('image/')) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    setHospitalDocumentPreview(reader.result);
                                                };
                                                reader.readAsDataURL(file);
                                            } else {
                                                setHospitalDocumentPreview(null);
                                            }
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm"
                                />
                                {hospitalDocument && (
                                    <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700 truncate">{hospitalDocument.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setHospitalDocument(null);
                                                    setHospitalDocumentPreview(null);
                                                }}
                                                className="text-red-600 hover:text-red-800 text-sm ml-2"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        {hospitalDocumentPreview && (
                                            <img src={hospitalDocumentPreview} alt="Preview" className="mt-2 max-h-32 rounded" />
                                        )}
                                    </div>
                                )}
                            </div>
                </div>
                <div className="flex justify-end space-x-3 border-t border-gray-200 pt-4 mt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsHospitalModalOpen(false);
                                    setHospitalNotes('');
                                    setHospitalDocument(null);
                                    setHospitalDocumentPreview(null);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!hospitalNotes.trim()) {
                                        setError('Please enter notes about the hospital admission');
                                        return;
                                    }

                                    setSubmitting(true);
                                    setError('');
                                    try {
                                        const formData = new FormData();
                                        formData.append('medication_id', medication.id);
                                        formData.append('resident_id', medication.resident_id);
                                        formData.append('branch_id', medication.branch_id);
                                        formData.append('administered_at', new Date().toISOString());
                                        formData.append('status', 'hospital_admission');
                                        formData.append('notes', hospitalNotes);

                                        if (hospitalDocument) {
                                            formData.append('document', hospitalDocument);
                                        }

                                        await api.post('/medication-administrations', formData, {
                                            headers: {
                                                'Content-Type': 'multipart/form-data',
                                            },
                                        });

                                        setSuccessMessage('Hospital admission recorded successfully');
                                        setIsHospitalModalOpen(false);
                                        setHospitalNotes('');
                                        setHospitalDocument(null);
                                        setHospitalDocumentPreview(null);
                                        onSuccess();
                                    } catch (err) {
                                        setError(err.response?.data?.message || 'Failed to record hospital admission');
                                    } finally {
                                        setSubmitting(false);
                                    }
                                }}
                                disabled={submitting || !hospitalNotes.trim()}
                                className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Recording...' : 'Record Hospital Admission'}
                            </button>
                        </div>
            </Modal>
        </div>
    );
}

// TimePicker Component
function TimePicker({ value, onChange, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hours, setHours] = useState(() => {
        if (value) {
            const [h] = value.split(':');
            return parseInt(h) || 12;
        }
        return 12;
    });
    const [minutes, setMinutes] = useState(() => {
        if (value) {
            const [, m] = value.split(':');
            return parseInt(m) || 0;
        }
        return 0;
    });
    const [period, setPeriod] = useState(() => {
        if (value) {
            const [h] = value.split(':');
            const hour = parseInt(h) || 0;
            return hour >= 12 ? 'PM' : 'AM';
        }
        return 'AM';
    });

    React.useEffect(() => {
        if (value) {
            const [h, m] = value.split(':');
            const hour = parseInt(h) || 0;
            const min = parseInt(m) || 0;
            setHours(hour % 12 || 12);
            setMinutes(min);
            setPeriod(hour >= 12 ? 'PM' : 'AM');
        }
    }, [value]);

    const formatTime = (h, m, p) => {
        let hour24 = h;
        if (p === 'PM' && h !== 12) hour24 = h + 12;
        if (p === 'AM' && h === 12) hour24 = 0;
        return `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const handleTimeChange = (newHours, newMinutes, newPeriod) => {
        const timeValue = formatTime(newHours, newMinutes, newPeriod);
        onChange(timeValue);
        setIsOpen(false);
    };

    const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
    const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

    const displayValue = value
        ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`
        : '--:-- --';

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent bg-white text-left flex items-center justify-between text-xs ${className}`}
            >
                <span className={`${value ? 'text-gray-900' : 'text-gray-400'} font-medium`}>
                    {displayValue}
                </span>
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute z-20 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-2 w-full min-w-[140px]">
                        <div className="flex items-center justify-center gap-1">
                            {/* Hours */}
                            <select
                                value={hours}
                                onChange={(e) => {
                                    const newHours = parseInt(e.target.value);
                                    handleTimeChange(newHours, minutes, period);
                                }}
                                className="px-1.5 py-1 border border-gray-300 rounded text-center text-xs font-medium w-12"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {hourOptions.map(h => (
                                    <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                                ))}
                            </select>

                            <span className="text-sm font-bold text-gray-700">:</span>

                            {/* Minutes */}
                            <select
                                value={minutes}
                                onChange={(e) => {
                                    const newMinutes = parseInt(e.target.value);
                                    handleTimeChange(hours, newMinutes, period);
                                }}
                                className="px-1.5 py-1 border border-gray-300 rounded text-center text-xs font-medium w-12"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {minuteOptions.map(m => (
                                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                ))}
                            </select>

                            {/* AM/PM */}
                            <select
                                value={period}
                                onChange={(e) => {
                                    const newPeriod = e.target.value;
                                    handleTimeChange(hours, minutes, newPeriod);
                                }}
                                className="px-1.5 py-1 border border-gray-300 rounded text-center text-xs font-medium w-14"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                            </select>
                        </div>
                    </div>
                </>
            )}
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
