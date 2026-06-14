import React from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import ResidentMedicationsPage from '../ResidentMedicationsPage';
import { getPacificISODate, formatPacificDate, parsePacificDateString } from '../../../utils/pacificTime';

function addCalendarDaysIso(isoYmd, deltaDays) {
    const inst = parsePacificDateString(isoYmd);
    if (!inst) return isoYmd;
    const y = inst.getUTCFullYear();
    const m = inst.getUTCMonth();
    const d = inst.getUTCDate();
    const next = new Date(Date.UTC(y, m, d + deltaDays));
    const yy = next.getUTCFullYear();
    const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(next.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

export default function MedicationHubMarTab() {
    const [marDate, setMarDate] = React.useState(() => getPacificISODate());
    const pacificToday = getPacificISODate();
    const isViewingToday = marDate === pacificToday;
    const formattedLabel = React.useMemo(() => {
        const inst = parsePacificDateString(marDate);
        return inst ? formatPacificDate(inst) : marDate;
    }, [marDate]);

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-5 h-5 text-[var(--theme-primary)] shrink-0" aria-hidden />
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Med pass / MAR</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{formattedLabel}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setMarDate((d) => addCalendarDaysIso(d, -1))}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
                    >
                        <ChevronLeft className="w-4 h-4" aria-hidden />
                        Previous
                    </button>
                    <button
                        type="button"
                        onClick={() => setMarDate(pacificToday)}
                        disabled={isViewingToday}
                        className="inline-flex items-center rounded-lg border border-[var(--theme-primary)]/30 bg-[var(--theme-primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/15 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={() => setMarDate((d) => addCalendarDaysIso(d, 1))}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)]"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" aria-hidden />
                    </button>
                </div>
            </div>
            <p className="text-xs text-gray-500 px-0.5">
                Times follow the same Pacific calendar rules as the Medications tab. On days other than today, this view is read-only for recording doses.
            </p>
            <ResidentMedicationsPage embedded variant="mar" marDate={marDate} />
        </div>
    );
}
