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
    ChevronDown,
    ChevronRight,
    Search,
    Filter,
    RefreshCw,
    X,
} from 'lucide-react';


import Select from '../../components/ui/radix/Select';
import logger from '../../utils/logger';
import {
    parseAdminTimeToPacific,
    isMedicationSlotCoveredToday,
    isNoScheduledTimeRowCoveredToday,
} from '../../utils/medicationSchedule';

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
    const [activeTab, setActiveTab] = useState('scheduled'); // 'scheduled', 'am', 'pm', 'prn'
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [search, setSearch] = useState('');
    const [activeOnly, setActiveOnly] = useState(true);
    const [selectedMeds, setSelectedMeds] = useState(new Set());
    const [isBulkAdministering, setIsBulkAdministering] = useState(false);


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
    const { data, isLoading, isFetching: isMedsFetching, refetch: refetchMeds } = useQuery({
        queryKey: ['resident-medications', residentId, activeOnly],
        queryFn: async () => {
            const response = await api.get('/medications', {
                params: {
                    resident_id: residentId,
                    per_page: 100,
                    active_only: activeOnly ? 'true' : 'false',
                    for_administration: 'true',
                    hide_administered: activeOnly ? 'true' : 'false',
                },
            });
            return response.data;
        },
        enabled: !!residentId,
    });

    const handleManualSync = async () => {
        // Trigger refetch for the resident list and medications
        await Promise.all([
            refetchMeds(),
            queryClient.invalidateQueries(['medication-administrations']),
        ]);
        // Also fire a global sync if available (app.js often handles this)
        window.dispatchEvent(new Event('online')); 
    };


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

        return { scheduledMeds: scheduled, amMeds: am, pmMeds: pm, prnMeds: prn };
    }, [medicationsList, activePeriodMedications, activeOnly, search]);

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
            if (med.uniqueId.startsWith('prn')) return 999999;
            if (!med.slotTime) return 888888;

            const now = getPacificNow();
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


    const renderMedicationRow = (medication, index) => {
        const periodActive = isMedicationPeriodActiveNow(medication);
        const isExpanded = expandedRows.has(medication.uniqueId);
        const isSelected = selectedMeds.has(medication.uniqueId);
        const instruction = (medication.instructions || '').toLowerCase().trim();
        const isPrn = instruction.includes('prn') || instruction.includes('as needed');
        const medName = (medication.name || medication.drug?.name || 'Medication').toUpperCase();

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
                            className="flex-shrink-0 mr-1"
                            onClick={(e) => {
                                e.stopPropagation();
                                const next = new Set(selectedMeds);
                                if (next.has(medication.uniqueId)) next.delete(medication.uniqueId);
                                else next.add(medication.uniqueId);
                                setSelectedMeds(next);
                            }}
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

                    {/* Detail Entry Button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(medication.id);
                        }}
                        className="flex-shrink-0 hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[var(--theme-primary)] rounded-md hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm"
                    >
                        Review & Administer
                        <ChevronRight className="w-3 h-3" />
                    </button>
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
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Status</h4>
                                <MedicationTimeBadges medication={medication} activeTab={activeTab} />
                                
                                <div className="pt-2 border-t border-gray-200">
                                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Record Administration</h4>
                                    <QuickAdminister 
                                        medication={medication} 
                                        onSuccess={() => { 
                                            queryClient.invalidateQueries(['resident-medications', residentId]); 
                                            queryClient.invalidateQueries(['medication-administrations']); 
                                            queryClient.invalidateQueries(['medication-administrations-today', medication.id]);
                                            queryClient.invalidateQueries(['medication-administrations-today-check', medication.id]);
                                        }} 
                                    />
                                </div>
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
                                        onClick={() => navigate(`/medications/history?medication_id=${medication.id}&resident_id=${residentId}`)}
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
        if (selectedMeds.size === 0) return;
        setIsBulkAdministering(true);
        
        try {
            const medsToAdmin = currentTabMedications.filter(m => selectedMeds.has(m.uniqueId));
            const now = new Date().toISOString();
            
            const promises = medsToAdmin.map(med => {
                return offlinePost('/medication-administrations', {
                    medication_id: med.id,
                    resident_id: med.resident_id,
                    branch_id: med.branch_id,
                    administered_at: now,
                    status: 'completed',
                    dosage_given: med.quantity ? `${med.quantity} ${med.form || ''}` : 'As prescribed',
                    notes: `Bulk administered from dashboard. Target slot: ${med.slotTime || 'N/A'}`,
                });
            });
            
            await Promise.all(promises);
            
            setSelectedMeds(new Set());
            await queryClient.invalidateQueries({ queryKey: ['resident-medications'] });
            await queryClient.invalidateQueries({ queryKey: ['medication-administrations'] });
            await queryClient.refetchQueries({ queryKey: ['resident-medications', residentId, activeOnly] });
            
            alert(`Successfully administered ${medsToAdmin.length} records.`);
        } catch (err) {
            logger.error('Bulk administration failed:', err);
            alert('Some medications could not be administered.');
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

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/medications/residents')}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
                        title="Back to Residents"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-[var(--theme-primary)]" />
                    </button>
                    <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-[var(--theme-primary)]" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Medications for {residentName}</h2>
                        <p className="text-sm text-gray-500 font-medium">View and administer medications for this resident.</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="text-right hidden lg:block">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Today's Date</p>
                        <p className="text-sm font-semibold text-gray-700">{formatPacificDate(getPacificNow())}</p>
                    </div>
                    <div className="h-10 w-px bg-gray-100 hidden lg:block mx-1"></div>
                    <button
                        onClick={handleManualSync}
                        disabled={isMedsFetching}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isMedsFetching ? 'animate-spin text-[var(--theme-primary)]' : 'text-gray-400'}`} />
                        {isMedsFetching ? 'Syncing...' : 'Sync Data'}
                    </button>

                    <button
                        onClick={() => navigate('/medications/history?resident_id=' + residentId)}
                        className="px-4 py-2 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-lg text-sm font-bold hover:bg-[var(--theme-primary)]/20 transition-all"
                    >
                        History
                    </button>
                </div>
            </div>

            {/* Filter & Bulk Actions Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by medication name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-[var(--theme-primary)] transition-all"
                        />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {selectedMeds.size > 0 && (
                            <div className="flex items-center gap-2 pr-2 border-r border-gray-100 mr-2">
                                <span className="text-xs font-bold text-gray-500">{selectedMeds.size} selected</span>
                                <button
                                    onClick={handleBulkAdminister}
                                    disabled={isBulkAdministering}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isBulkAdministering ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4" />
                                    )}
                                    Administer All
                                </button>
                                <button
                                    onClick={() => setSelectedMeds(new Set())}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Deselect All"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setActiveOnly(!activeOnly)}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                activeOnly ? 'bg-[var(--theme-primary)] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <Filter className="w-4 h-4" />
                            {activeOnly ? 'Active Only' : 'All Meds'}
                        </button>
                        <button
                            onClick={() => { setSearch(''); setActiveOnly(true); setSelectedMeds(new Set()); }}
                            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content with Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs Header */}
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
                                    {activeTab === tab.key && (
                                        <div className={`absolute bottom-0 left-4 right-4 h-1 rounded-t-full ${tab.color.replace('bg-', 'bg-')}`}></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* List Content */}
                <div className="min-h-[400px]">
                    {currentTabMedications.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                            {currentTabMedications.map((med, idx) => renderMedicationRow(med, idx))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                                <Pill className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">No medications found</h3>
                            <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                {search 
                                    ? `No medications matching "${search}" were found in the ${activeTab} tab.`
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
            
            {/* Footer Legend */}
            <div className="flex flex-wrap items-center justify-center gap-6 px-4 text-[10px] text-gray-400 uppercase font-black tracking-widest">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    Scheduled
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    AM Only
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    PM Only
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    PRN (As Needed)
                </div>
            </div>
        </div>
    );

}

// Medication Time Badges Component
function MedicationTimeBadges({ medication, activeTab }) {
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
                                    const trimmedDosage = dosageGiven.trim() || 'As prescribed';

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








