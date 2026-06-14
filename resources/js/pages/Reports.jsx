import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
    Users,
    Search,
    ChevronRight,
    ClipboardList,
    Heart,
    AlertTriangle,
    FileText,
    Download,
    Loader2,
    Calendar,
} from 'lucide-react';
import Modal from '../components/ui/Modal';
import { useToastContext } from '../contexts/ToastContext';

/** Calendar date in the user's local timezone as Y-m-d (avoid UTC drift from toISOString). */
function formatLocalYmd(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getCurrentMonthRangeLocal() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { dateFrom: formatLocalYmd(start), dateTo: formatLocalYmd(end) };
}

export default function Reports() {
    const [search, setSearch] = useState('');
    const [selectedResident, setSelectedResident] = useState(null);
    const [marDateFrom, setMarDateFrom] = useState('');
    const [marDateTo, setMarDateTo] = useState('');
    const [marOrientation, setMarOrientation] = useState('landscape');
    const [marIncludeScheduled, setMarIncludeScheduled] = useState(true);
    const [marIncludePrn, setMarIncludePrn] = useState(true);
    const [marResidentCard, setMarResidentCard] = useState(true);
    const [marLegend, setMarLegend] = useState(true);
    const [marPrnNotes, setMarPrnNotes] = useState(true);
    /** all | taken (given) | missed (not given) */
    const [marAdminOutcomes, setMarAdminOutcomes] = useState('all');
    const [marMedFilterAll, setMarMedFilterAll] = useState(true);
    const [marMedSelectedIds, setMarMedSelectedIds] = useState(() => new Set());
    const [reportHubStep, setReportHubStep] = useState('grid');
    const [isExporting, setIsExporting] = useState(false);
    const toast = useToastContext();

    // Fetch residents
    const { data: residentsData, isLoading } = useQuery({
        queryKey: ['residents-list', search],
        queryFn: async () => {
            const res = await api.get('/residents', {
                params: {
                    search: search,
                    per_page: 50
                }
            });
            return res.data.data;
        }
    });

    const openMarReportStep = () => {
        const { dateFrom, dateTo } = getCurrentMonthRangeLocal();
        setMarDateFrom(dateFrom);
        setMarDateTo(dateTo);
        setMarOrientation('landscape');
        setMarIncludeScheduled(true);
        setMarIncludePrn(true);
        setMarResidentCard(true);
        setMarLegend(true);
        setMarPrnNotes(true);
        setMarAdminOutcomes('all');
        setMarMedFilterAll(true);
        setMarMedSelectedIds(new Set());
        setReportHubStep('mar');
    };

    const { data: marResidentDetail, isLoading: marResidentLoading } = useQuery({
        queryKey: ['resident-mar-builder', selectedResident?.id],
        queryFn: async () => {
            const res = await api.get(`/residents/${selectedResident.id}`);
            return res.data.data;
        },
        enabled: !!selectedResident?.id && reportHubStep === 'mar',
    });

    const marMedications = useMemo(() => marResidentDetail?.medications ?? [], [marResidentDetail]);

    const toggleMarMedId = (id) => {
        setMarMedSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAllMarMeds = () => {
        setMarMedSelectedIds(new Set(marMedications.map((m) => m.id)));
    };

    const resolveDownloadErrorMessage = async (error) => {
        const res = error.response;
        if (!res?.data) {
            return error.message || 'Failed to generate report.';
        }
        if (res.data instanceof Blob) {
            try {
                const text = await res.data.text();
                const parsed = JSON.parse(text);
                if (parsed.errors && typeof parsed.errors === 'object') {
                    const first = Object.values(parsed.errors).flat().find(Boolean);
                    if (first) {
                        return first;
                    }
                }
                return parsed.error || parsed.message || error.message || 'Failed to generate report.';
            } catch {
                return error.message || 'Failed to generate report.';
            }
        }
        const d = res.data;
        if (d?.errors && typeof d.errors === 'object') {
            const first = Object.values(d.errors).flat().find(Boolean);
            if (first) {
                return first;
            }
        }
        return d?.error || d?.message || error.message || 'Failed to generate report.';
    };

    const handleDownload = async (type, residentId, residentName, marRange = null) => {
        console.log(`Starting ${type} download for resident: ${residentId}`);
        setIsExporting(true);
        try {
            let endpoint = '';
            let params = {};

            switch(type) {
                case 'mar':
                    endpoint = `/residents/${residentId}/reports/medication-log`;
                    {
                        const range = marRange || getCurrentMonthRangeLocal();
                        if (range.dateFrom > range.dateTo) {
                            toast.error('The start date must be on or before the end date.');
                            setIsExporting(false);
                            return;
                        }
                        if (range.include_scheduled === false && range.include_prn === false) {
                            toast.error('Include at least scheduled medications or PRN on the MAR.');
                            setIsExporting(false);
                            return;
                        }
                        if (
                            range.medication_ids &&
                            Array.isArray(range.medication_ids) &&
                            range.medication_ids.length === 0
                        ) {
                            toast.error('Select at least one medication, or choose all medications.');
                            setIsExporting(false);
                            return;
                        }
                        params = {
                            date_from: range.dateFrom,
                            date_to: range.dateTo,
                            orientation: range.orientation ?? 'landscape',
                            include_scheduled: (range.include_scheduled ?? true) ? 1 : 0,
                            include_prn: (range.include_prn ?? true) ? 1 : 0,
                            include_resident_card: (range.include_resident_card ?? true) ? 1 : 0,
                            include_legend: (range.include_legend ?? true) ? 1 : 0,
                            include_prn_admin_notes: (range.include_prn_admin_notes ?? true) ? 1 : 0,
                        };
                        const outcomes = range.administration_outcomes ?? 'all';
                        if (outcomes && outcomes !== 'all') {
                            params.administration_outcomes = outcomes;
                        }
                        if (range.medication_ids?.length) {
                            params.medication_ids = range.medication_ids;
                        }
                    }
                    break;
                case 'vitals':
                    endpoint = `/residents/${residentId}/reports/vitals-log`;
                    break;
                case 'sleep':
                    endpoint = `/residents/${residentId}/reports/sleep-log`;
                    break;
                case 'appointments':
                    endpoint = `/residents/${residentId}/reports/appointments`;
                    break;
                case 'incidents':
                    endpoint = `/residents/${residentId}/reports/incidents`;
                    break;
                case 'assessments':
                    endpoint = `/residents/${residentId}/reports/assessments`;
                    break;
                default:
                    throw new Error('Invalid report type');
            }
            
            const res = await api.get(endpoint, {
                responseType: 'blob',
                params: params
            });

            if (!res.data || res.data.size === 0) {
                throw new Error('Retrieved an empty file.');
            }

            // Create blob from response data
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            const safeName = String(residentName || 'Resident').replace(/\s+/g, '_');
            const filenamePrefix =
                type === 'incidents'
                    ? 'Incident_History'
                    : type === 'assessments'
                      ? 'Assessment_Summary'
                      : `${type.toUpperCase()}_Log`;
            const filename = `${filenamePrefix}_${safeName}.pdf`;
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                link.remove();
            }, 100);
            
            toast.success('Report generated successfully');
        } catch (error) {
            console.error('Download error:', error);
            const message = await resolveDownloadErrorMessage(error);
            toast.error(message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header section with search */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Resident Reporting Hub</h1>
                            <p className="text-sm text-gray-500 mt-1">Select a resident to generate professional clinical reports.</p>
                        </div>
                        
                        <div className="relative w-full md:w-96">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all"
                                placeholder="Search by name or room number..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 text-teal-600 animate-spin" />
                        <p className="mt-4 text-gray-500 font-medium">Fetching residents...</p>
                    </div>
                ) : residentsData?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {residentsData.map((resident) => (
                            <div 
                                key={resident.id}
                                onClick={() => setSelectedResident(resident)}
                                className="group bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-xl hover:border-teal-300 transition-all cursor-pointer relative overflow-hidden"
                            >
                                {/* Active Badge */}
                                <div className="absolute top-3 right-3">
                                    <div className="h-2 w-2 rounded-full bg-teal-500 ring-4 ring-teal-50"></div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 font-bold text-xl border border-teal-100 group-hover:scale-110 transition-transform">
                                        {resident.name?.charAt(0) || 'R'}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-teal-600 transition-colors">
                                            {resident.name}
                                        </h3>
                                        <p className="text-xs text-gray-500 flex items-center mt-0.5">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            Room {resident.room || 'N/A'}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between text-sm">
                                    <span className="text-gray-400 group-hover:text-teal-500 font-medium transition-colors">
                                        View Reports
                                    </span>
                                    <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                        <ChevronRight className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <Users className="h-16 w-16 text-gray-200 mx-auto" />
                        <h3 className="mt-4 text-lg font-bold text-gray-900">No residents found</h3>
                        <p className="mt-2 text-gray-500 max-w-xs mx-auto">We couldn't find any residents matching your search criteria.</p>
                    </div>
                )}
            </div>

            {/* Resident Report Hub Modal */}
            <Modal
                isOpen={!!selectedResident}
                onClose={() => {
                    setSelectedResident(null);
                    setReportHubStep('grid');
                }}
                title={selectedResident ? `${selectedResident.name}'s Report Hub` : 'Report Hub'}
                size="lg"
            >
                <div className="p-6">
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                        <div className="h-16 w-16 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-2xl">
                            {selectedResident?.name?.charAt(0) || 'R'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{selectedResident?.name}</h2>
                            <p className="text-sm text-gray-500">
                                {reportHubStep === 'mar'
                                    ? 'Configure the MAR: dates, layout, sections, and medications, then generate the PDF.'
                                    : 'Pick a report module to generate a professional PDF.'}
                            </p>
                        </div>
                    </div>

                    {reportHubStep === 'mar' ? (
                        <div className="space-y-6 max-h-[min(70vh,520px)] overflow-y-auto pr-1">
                            <button
                                type="button"
                                onClick={() => setReportHubStep('grid')}
                                disabled={isExporting}
                                className="text-sm font-medium text-teal-700 hover:text-teal-900 disabled:opacity-50"
                            >
                                ← Back to reports
                            </button>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="mar-date-from" className="block text-xs font-semibold text-gray-600 mb-1.5">
                                        From
                                    </label>
                                    <input
                                        id="mar-date-from"
                                        type="date"
                                        value={marDateFrom}
                                        onChange={(e) => setMarDateFrom(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="mar-date-to" className="block text-xs font-semibold text-gray-600 mb-1.5">
                                        To
                                    </label>
                                    <input
                                        id="mar-date-to"
                                        type="date"
                                        value={marDateTo}
                                        onChange={(e) => setMarDateTo(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                    />
                                </div>
                            </div>

                            <fieldset className="space-y-2 border border-gray-100 rounded-xl p-4 bg-gray-50/80">
                                <legend className="text-xs font-bold text-gray-700 px-1">Page layout</legend>
                                <div className="flex flex-wrap gap-4">
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mar-orientation"
                                            checked={marOrientation === 'landscape'}
                                            onChange={() => setMarOrientation('landscape')}
                                            className="text-teal-600 focus:ring-teal-500"
                                        />
                                        Landscape (recommended for MAR grids)
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mar-orientation"
                                            checked={marOrientation === 'portrait'}
                                            onChange={() => setMarOrientation('portrait')}
                                            className="text-teal-600 focus:ring-teal-500"
                                        />
                                        Portrait
                                    </label>
                                </div>
                            </fieldset>

                            <fieldset className="space-y-3 border border-gray-100 rounded-xl p-4 bg-gray-50/80">
                                <legend className="text-xs font-bold text-gray-700 px-1">What to include</legend>
                                <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={marIncludeScheduled}
                                        onChange={(e) => setMarIncludeScheduled(e.target.checked)}
                                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <span>Scheduled medications (time-slot grid)</span>
                                </label>
                                <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={marIncludePrn}
                                        onChange={(e) => setMarIncludePrn(e.target.checked)}
                                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <span>PRN (as-needed) medications &amp; administrations</span>
                                </label>
                                <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={marResidentCard}
                                        onChange={(e) => setMarResidentCard(e.target.checked)}
                                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <span>Resident header (photo, room, DOB, diagnosis, allergies)</span>
                                </label>
                                <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={marLegend}
                                        onChange={(e) => setMarLegend(e.target.checked)}
                                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                                    />
                                    <span>Footer legend (given / missed key)</span>
                                </label>
                                <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={marPrnNotes}
                                        onChange={(e) => setMarPrnNotes(e.target.checked)}
                                        disabled={!marIncludePrn}
                                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 disabled:opacity-40"
                                    />
                                    <span>Show PRN administration notes column</span>
                                </label>
                            </fieldset>

                            <fieldset className="space-y-2 border border-gray-100 rounded-xl p-4 bg-gray-50/80">
                                <legend className="text-xs font-bold text-gray-700 px-1">Administrations in this date range</legend>
                                <p className="text-xs text-gray-600 -mt-1 mb-2">
                                    Limit the PDF to doses that were <strong>given</strong> (completed / pharmacy confirmed) or <strong>not given</strong> (missed, refused, etc.). Scheduled grids and PRN tables both respect this filter.
                                </p>
                                <div className="flex flex-col gap-2">
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mar-admin-outcomes"
                                            checked={marAdminOutcomes === 'all'}
                                            onChange={() => setMarAdminOutcomes('all')}
                                            className="text-teal-600 focus:ring-teal-500"
                                        />
                                        All (given and not given)
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mar-admin-outcomes"
                                            checked={marAdminOutcomes === 'taken'}
                                            onChange={() => setMarAdminOutcomes('taken')}
                                            className="text-teal-600 focus:ring-teal-500"
                                        />
                                        Given only
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="mar-admin-outcomes"
                                            checked={marAdminOutcomes === 'missed'}
                                            onChange={() => setMarAdminOutcomes('missed')}
                                            className="text-teal-600 focus:ring-teal-500"
                                        />
                                        Not given only (missed, refused, etc.)
                                    </label>
                                </div>
                            </fieldset>

                            <fieldset className="space-y-3 border border-gray-100 rounded-xl p-4 bg-gray-50/80">
                                <legend className="text-xs font-bold text-gray-700 px-1">Medications</legend>
                                {marResidentLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                                        Loading medication orders…
                                    </div>
                                ) : marMedications.length === 0 ? (
                                    <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                        No medication orders on file for this resident. The PDF will only show facility branding and any sections you enabled.
                                    </p>
                                ) : (
                                    <>
                                        <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="mar-med-scope"
                                                checked={marMedFilterAll}
                                                onChange={() => {
                                                    setMarMedFilterAll(true);
                                                    setMarMedSelectedIds(new Set());
                                                }}
                                                className="text-teal-600 focus:ring-teal-500"
                                            />
                                            All medication orders for this resident
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="mar-med-scope"
                                                checked={!marMedFilterAll}
                                                onChange={() => {
                                                    setMarMedFilterAll(false);
                                                    selectAllMarMeds();
                                                }}
                                                className="text-teal-600 focus:ring-teal-500"
                                            />
                                            Only selected medications
                                        </label>
                                        {!marMedFilterAll && (
                                            <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                                                {marMedications.map((m) => (
                                                    <label
                                                        key={m.id}
                                                        className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={marMedSelectedIds.has(m.id)}
                                                            onChange={() => toggleMarMedId(m.id)}
                                                            className="rounded text-teal-600 focus:ring-teal-500"
                                                        />
                                                        <span className="min-w-0 flex-1 truncate">
                                                            {m.name}
                                                            {m.instructions ? (
                                                                <span className="text-gray-500 font-normal"> — {m.instructions}</span>
                                                            ) : null}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </fieldset>

                            <button
                                type="button"
                                onClick={() => {
                                    const medicationIdsPayload = (() => {
                                        if (marMedFilterAll || marMedications.length === 0) {
                                            return undefined;
                                        }
                                        return Array.from(marMedSelectedIds);
                                    })();
                                    handleDownload('mar', selectedResident.id, selectedResident.name, {
                                        dateFrom: marDateFrom,
                                        dateTo: marDateTo,
                                        orientation: marOrientation,
                                        include_scheduled: marIncludeScheduled,
                                        include_prn: marIncludePrn,
                                        include_resident_card: marResidentCard,
                                        include_legend: marLegend,
                                        include_prn_admin_notes: marPrnNotes,
                                        administration_outcomes: marAdminOutcomes,
                                        medication_ids: medicationIdsPayload,
                                    });
                                }}
                                disabled={isExporting || !marDateFrom || !marDateTo}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isExporting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generating…
                                    </>
                                ) : (
                                    <>
                                        <Download className="h-4 w-4" />
                                        Generate PDF
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={openMarReportStep}
                            disabled={isExporting}
                            className="flex flex-col items-center justify-center p-8 bg-teal-50 hover:bg-teal-100 rounded-2xl border border-teal-100 transition-all group relative"
                        >
                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm text-teal-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <ClipboardList className="h-6 w-6" />
                            </div>
                            <span className="font-bold text-teal-900">Medication MAR</span>
                            <span className="text-xs text-teal-600 mt-1">Monthly log (landscape)</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleDownload('vitals', selectedResident.id, selectedResident.name)}
                            disabled={isExporting}
                            className="flex flex-col items-center justify-center p-8 bg-blue-50 hover:bg-blue-100 rounded-2xl border border-blue-100 transition-all group relative"
                        >
                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Heart className="h-6 w-6" />
                            </div>
                            <span className="font-bold text-blue-900">Vitals History</span>
                            <span className="text-xs text-blue-600 mt-1">Latest 60 readings log</span>
                            {isExporting && (
                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl">
                                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                                </div>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleDownload('sleep', selectedResident.id, selectedResident.name)}
                            disabled={isExporting}
                            className="flex flex-col items-center justify-center p-8 bg-indigo-50 hover:bg-indigo-100 rounded-2xl border border-indigo-100 transition-all group relative"
                        >
                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <FileText className="h-6 w-6" />
                            </div>
                            <span className="font-bold text-indigo-900">Sleep Log</span>
                            <span className="text-xs text-indigo-600 mt-1">Historical sleep tracking</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleDownload('appointments', selectedResident.id, selectedResident.name)}
                            disabled={isExporting}
                            className="flex flex-col items-center justify-center p-8 bg-orange-50 hover:bg-orange-100 rounded-2xl border border-orange-100 transition-all group relative"
                        >
                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm text-orange-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <span className="font-bold text-orange-900">Appointments</span>
                            <span className="text-xs text-orange-600 mt-1">Scheduled visit history</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => handleDownload('incidents', selectedResident.id, selectedResident.name)}
                            disabled={isExporting}
                            className="flex flex-col items-center justify-center p-8 bg-amber-50 hover:bg-amber-100 rounded-2xl border border-amber-100 transition-all group relative"
                        >
                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm text-amber-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <span className="font-bold text-amber-900">Incident History</span>
                            <span className="text-xs text-amber-700 mt-1">Resident incidents (default: last year)</span>
                            {isExporting && (
                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl">
                                    <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                                </div>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleDownload('assessments', selectedResident.id, selectedResident.name)}
                            disabled={isExporting}
                            className="flex flex-col items-center justify-center p-8 bg-purple-50 hover:bg-purple-100 rounded-2xl border border-purple-100 transition-all group relative"
                        >
                            <div className="h-12 w-12 bg-white rounded-xl shadow-sm text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <FileText className="h-6 w-6" />
                            </div>
                            <span className="font-bold text-purple-900">Assessments</span>
                            <span className="text-xs text-purple-600 mt-1">Summary list (default: last year)</span>
                            {isExporting && (
                                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-2xl">
                                    <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                                </div>
                            )}
                        </button>
                    </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-2 text-gray-400 text-xs italic">
                        <Download className="h-3 w-3" />
                        All reports include facility branding and professional formatting.
                    </div>
                </div>
            </Modal>
        </div>
    );
}
