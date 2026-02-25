import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
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
} from '../../utils/pacificTime';
import {
    Pill,
    Clock,
    Calendar,
    CheckCircle,
    XCircle,
    AlertCircle,
    ArrowLeft,
    User,
} from 'lucide-react';
import Select from '../../components/ui/radix/Select';
import logger from '../../utils/logger';

const PACIFIC_TZ = 'America/Los_Angeles';
const adminTimeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
});

const parseAdminTimeToPacific = (administeredAt) => {
    const raw = new Date(administeredAt);
    if (Number.isNaN(raw.getTime())) return null;
    const p = {};
    adminTimeFmt.formatToParts(raw).forEach(({ type, value }) => {
        if (type !== 'literal') p[type] = parseInt(value, 10);
    });
    return new Date(Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second || 0));
};

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

export default function ResidentMedicationsPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { residentId } = useParams();
    const [currentUser, setCurrentUser] = useState(null);

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

    // Real-time updates for medication administrations
    useResidentUpdates(
        residentId,
        ['medication.administration.created'],
        {
            queryKeys: [
                ['medications', residentId],
                ['medication-administrations', residentId],
                ['medication-administrations', 'today', residentId],
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
            return response.data;
        },
        enabled: !!residentId,
    });

    // Fetch medications for this resident
    const { data, isLoading } = useQuery({
        queryKey: ['resident-medications', residentId],
        queryFn: async () => {
            const response = await api.get('/medications', {
                params: {
                    resident_id: residentId,
                    per_page: 100,
                },
            });
            return response.data;
        },
        enabled: !!residentId,
    });

    const medicationsList = React.useMemo(() => data?.data ?? [], [data?.data]);
    const resident = residentData;
    const residentName = resident 
        ? [resident.first_name, resident.middle_names, resident.last_name].filter(Boolean).join(' ') 
        : 'Resident';

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

    const renderMedicationCard = (medication) => {
        const periodActive = isMedicationPeriodActiveNow(medication);

        return (
            <div
                key={medication.id}
                className={`bg-white rounded-lg shadow p-6 ${periodActive ? '' : 'border border-amber-200'}`}
            >
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {medication.name || 'Medication'}
                                </h3>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                {medication.is_active && periodActive && (
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                        Active
                                    </span>
                                )}
                                {!periodActive && (
                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                                        Period Ended
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            {medication.instructions && (
                                <div className="flex items-start space-x-2">
                                    <Pill className="w-4 h-4 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-xs text-gray-500">Instructions</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatInstructionDisplay(medication.instructions)}
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {medication.quantity && (
                                <div className="flex items-start space-x-2">
                                    <Pill className="w-4 h-4 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-xs text-gray-500">Quantity</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatNumberUS(medication.quantity)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {medication.start_date && (
                                <div className="flex items-start space-x-2">
                                    <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-xs text-gray-500">Start Date</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatPacificDate(parsePacificDateString(medication.start_date))}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {medication.end_date && (
                                <div className="flex items-start space-x-2">
                                    <Calendar className="w-4 h-4 text-gray-400 mt-1" />
                                    <div>
                                        <p className="text-xs text-gray-500">End Date</p>
                                        <p className={`text-sm font-medium ${periodActive ? 'text-gray-900' : 'text-amber-700'}`}>
                                            {formatPacificDate(parsePacificDateString(medication.end_date))}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Medication Times */}
                        {(medication.time_1 || medication.time_2 || medication.time_3 || medication.time_4) && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-xs font-medium text-gray-700">Administration Times:</p>
                                    {!periodActive && (
                                        <span className="text-xs text-amber-600 font-medium">
                                            Outside administration period
                                        </span>
                                    )}
                                </div>
                                <MedicationTimeBadges medication={medication} />

                                {/* Quick Administer */}
                                <QuickAdminister medication={medication} onSuccess={() => { 
                                    queryClient.invalidateQueries(['resident-medications', residentId]); 
                                    queryClient.invalidateQueries(['medication-administrations']); 
                                    queryClient.invalidateQueries(['medication-administrations-today', medication.id]);
                                    queryClient.invalidateQueries(['medication-administrations-today-check', medication.id]);
                                }} />
                            </div>
                        )}

                        {medication.diagnosis && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Diagnosis: </span>
                                    {medication.diagnosis}
                                </p>
                            </div>
                        )}

                        {medication.notes && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-700">
                                    <span className="font-medium">Notes: </span>
                                    {medication.notes}
                                </p>
                            </div>
                        )}

                        {!periodActive && medication.end_date && (
                            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <p className="text-sm text-amber-700">
                                    Medication period ended on {formatPacificDate(parsePacificDateString(medication.end_date))}.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    if (residentLoading || isLoading) {
        return (
            <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                <p className="mt-4 text-gray-600">Loading medications...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate('/medications')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Medications for {residentName}</h2>
                        <p className="text-gray-600">View and administer medications for this resident.</p>
                    </div>
                </div>
            </div>

            {medicationsList.length > 0 ? (
                <div className="space-y-8">
                    {activePeriodMedications.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-semibold text-gray-900">
                                    Active Medication Periods
                                </h3>
                                <span className="text-xs text-gray-500">
                                    Showing {formatNumberUS(activePeriodMedications.length)} medication{activePeriodMedications.length === 1 ? '' : 's'}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {activePeriodMedications.map(renderMedicationCard)}
                            </div>
                        </div>
                    )}

                    {endedPeriodMedications.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-base font-semibold text-gray-900">
                                    Completed Medication Periods
                                </h3>
                                <span className="text-xs text-gray-500">
                                    Showing {formatNumberUS(endedPeriodMedications.length)} medication{endedPeriodMedications.length === 1 ? '' : 's'}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {endedPeriodMedications.map(renderMedicationCard)}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center col-span-full">
                    <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg font-medium">No medications found</p>
                    <p className="text-gray-500 text-sm mt-2">
                        This resident does not have any medications assigned.
                    </p>
                </div>
            )}
        </div>
    );
}

// Medication Time Badges Component
function MedicationTimeBadges({ medication }) {
    const formatTime = (timeValue) => formatPacificTimeValue(timeValue);

    // Fetch today's administrations for this medication
    const { data: todayAdminData } = useQuery({
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

        const scheduledTime = parseScheduledTime(timeValue);
        if (!scheduledTime) return null;

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
                return null;
            }
            return matchingAdmin.status;
        }

        if (windowClosed && !windowEndedBeforeCreated()) {
            return 'missed';
        }

        return null;
    };

    const times = [
        { value: medication.time_1, label: 'Time 1' },
        { value: medication.time_2, label: 'Time 2' },
        { value: medication.time_3, label: 'Time 3' },
        { value: medication.time_4, label: 'Time 4' },
    ].filter(t => t.value).sort((a, b) => {
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
                        case 'pharmacy_administration_confirm':
                            return 'Pharmacy Confirm';
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
    const [hasClosedWindow, setHasClosedWindow] = useState(false);
    const [timeMessage, setTimeMessage] = useState('');
    const [isDailyLimitReached, setIsDailyLimitReached] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [nextWindowStart, setNextWindowStart] = useState(null);
    const [nextWindowCountdown, setNextWindowCountdown] = useState('');
    const [upcomingScheduledDisplay, setUpcomingScheduledDisplay] = useState('');
    const [isLateMode, setIsLateMode] = useState(false);
    const [isMedicationPeriodActive, setIsMedicationPeriodActive] = useState(true);

    const closeDosageModal = React.useCallback(() => {
        if (submitting) return;
        setIsDosageModalOpen(false);
        setDosageValidationError('');
        setError('');
        setDosageGiven('');
        setDosageNotes('');
        setIsLateMode(false);
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

        const admins = todayAdminData?.data?.filter(a => a.status !== 'missed') || [];
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
        if (!todayAdminData?.data?.length) return false;
        const toleranceMs = 60 * 60 * 1000;
        return todayAdminData.data.some((admin) => {
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
            setHasClosedWindow(false);
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
            setHasClosedWindow(false);
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

        const pastWindowExists = windows.some((window) => now > window.end);
        setHasClosedWindow(pastWindowExists);

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
        setHasClosedWindow(pastWindowExists);
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
    const showLateButton =
        !isPrnMedication &&
        !isWithinTimeWindow &&
        hasClosedWindow &&
        !isDailyLimitReached &&
        !submitting &&
        isMedicationPeriodActive;

    const openDosageModal = (late = false) => {
        if (late) {
            setIsLateMode(true);
        } else {
            setIsLateMode(false);
        }
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
                {showLateButton && (
                    <button
                        onClick={() => {
                            if (!isMedicationPeriodActive) {
                                setError('Medication administration period has ended.');
                                return;
                            }
                            openDosageModal(true);
                        }}
                        className="px-2 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 transition-colors"
                    >
                        Late Administer
                    </button>
                )}
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
            {isDosageModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <h3 className="text-lg font-semibold text-gray-900">Confirm Administration</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    closeDosageModal();
                                }}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                            >
                                ×
                            </button>
                        </div>
                        <div className="px-5 py-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Dosage Given *
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
                            {isLateMode && (
                                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                                    This will be recorded as a late administration outside the scheduled window.
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 border-t px-5 py-4">
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
                                    const trimmedDosage = dosageGiven.trim();
                                    if (!trimmedDosage) {
                                        setDosageValidationError('Dosage is required.');
                                        return;
                                    }

                                    const lateNoteMarker = '[Late Administration]';
                                    const trimmedNotes = dosageNotes.trim();
                                    const finalNotes = isLateMode
                                        ? `${trimmedNotes ? `${trimmedNotes}\n` : ''}${lateNoteMarker}`
                                        : trimmedNotes || undefined;

                                    const administeredAt = new Date().toISOString();
                                    const realUtcNow = new Date().toISOString();
                                    const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
                                    
                                    // Optimistically update the cache immediately
                                    const queryKey = ['medication-administrations-today', medication.id];
                                    const checkQueryKey = ['medication-administrations-today-check', medication.id];
                                    
                                    // Get current cache data
                                    const currentData = queryClient.getQueryData(queryKey);
                                    const currentCheckData = queryClient.getQueryData(checkQueryKey);
                                    
                                    // Create optimistic administration record
                                    // Use real UTC for administered_at so getPacificDate() parses correctly
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
                                    
                                    // Optimistically update cache for both query keys
                                    // Also update the MedicationTimeBadges query key to ensure badges update immediately
                                    const badgesQueryKey = ['medication-administrations-today', medication.id];
                                    
                                    queryClient.setQueryData(queryKey, (old) => {
                                        if (!old) {
                                            return {
                                                data: [optimisticAdmin],
                                                total: 1,
                                            };
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
                                        return {
                                            ...old,
                                            data: [...(old.data || []), optimisticAdmin],
                                            total: (old.total || 0) + 1,
                                        };
                                    });
                                    
                                    // Update badges query cache to show refused/missed immediately
                                    queryClient.setQueryData(badgesQueryKey, (old) => {
                                        if (!old) {
                                            return {
                                                data: [optimisticAdmin],
                                                total: 1,
                                            };
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
                                    const successText = isLateMode
                                        ? `Late administration (${statusLabel}) recorded successfully.`
                                        : `Medication ${statusLabel} recorded successfully.`;
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
                                        
                                        queryClient.setQueryData(queryKey, (old) => {
                                            if (!old) return old;
                                            const filtered = (old.data || []).filter(a => a.id !== optimisticAdmin.id);
                                            return {
                                                ...old,
                                                data: [...filtered, realAdmin],
                                            };
                                        });
                                        
                                        queryClient.setQueryData(checkQueryKey, (old) => {
                                            if (!old) return old;
                                            const filtered = (old.data || []).filter(a => a.id !== optimisticAdmin.id);
                                            return {
                                                ...old,
                                                data: [...filtered, realAdmin],
                                            };
                                        });
                                        
                                        // Update badges query with real data
                                        const badgesQueryKey = ['medication-administrations-today', medication.id];
                                        queryClient.setQueryData(badgesQueryKey, (old) => {
                                            if (!old) return old;
                                            const filtered = (old.data || []).filter(a => a.id !== optimisticAdmin.id);
                                            return {
                                                ...old,
                                                data: [...filtered, realAdmin],
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
                    </div>
                </div>
            )}
        </div>
    );
}







