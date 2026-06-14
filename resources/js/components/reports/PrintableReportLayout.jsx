import React from 'react';
import { Printer } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Print button to place beside Export/Refresh on report pages.
 */
export function ReportPrintButton() {
    return (
        <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition no-print"
        >
            <Printer className="h-4 w-4" />
            Print / Save as PDF
        </button>
    );
}

function residentDisplayName(resident) {
    if (!resident) return '';
    if (resident.name) return resident.name;
    const first = resident.first_name || '';
    const last = resident.last_name || '';
    return `${first} ${last}`.trim() || 'Resident';
}

function avatarFallbackUrl(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'R')}&background=25603E&color=fff&size=128`;
}

/**
 * Standard layout for printable reports and charts.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.title] — Report title (shown in print header only).
 * @param {string} [props.subtitle] — e.g. date range (print header only).
 * @param {{ name?: string, first_name?: string, last_name?: string, profile_image_url?: string }} [props.resident] — When set, print header shows resident photo + name.
 */
export default function PrintableReportLayout(props) {
    const { children, title, subtitle, resident } = props;
    const { theme } = useTheme();

    const facilityName = theme?.name || 'HomeLogic360';
    const logoSrc = theme?.logo || '/images/logonew.png';
    const logoUrl = React.useMemo(() => {
        if (!logoSrc) return '/images/logonew.png';
        if (logoSrc.startsWith('http://') || logoSrc.startsWith('https://')) return logoSrc;
        if (typeof window !== 'undefined') {
            try {
                return new URL(logoSrc, window.location.origin).href;
            } catch {
                return logoSrc;
            }
        }
        return logoSrc;
    }, [logoSrc]);

    const residentName = resident ? residentDisplayName(resident) : '';
    const residentPhoto = resident?.profile_image_url || null;

    return (
        <div className="print-report min-h-screen bg-slate-50/50">
            <div className="max-w-[1600px] mx-auto px-4 py-6 print:px-2 print:py-3">
                <div className="print-report-content bg-white rounded-xl shadow-sm border border-slate-200/80 p-4 sm:p-6 print:shadow-none print:border-0 print:p-0 print:bg-transparent">
                    <div
                        className="print-only report-brand-card print-report-header mb-0 pb-4 border-b border-gray-200"
                        aria-hidden="true"
                    >
                        <div className="flex flex-wrap items-center gap-4 justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 relative">
                                    <img
                                        src={logoUrl}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            e.target.classList.add('hidden');
                                            const next = e.target.nextElementSibling;
                                            if (next) next.classList.remove('hidden');
                                        }}
                                    />
                                    <div className="h-full w-full absolute inset-0 hidden flex items-center justify-center bg-slate-700 text-white text-lg font-bold">
                                        {facilityName.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-lg font-semibold text-gray-900 truncate">{facilityName}</p>
                                    {title ? (
                                        <p className="text-base font-medium text-gray-800 mt-0.5">{title}</p>
                                    ) : null}
                                    {subtitle ? (
                                        <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
                                    ) : null}
                                </div>
                            </div>
                            {resident && residentName ? (
                                <div className="flex items-center gap-3 border-l border-gray-200 pl-4 ml-auto">
                                    <div className="h-14 w-14 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                                        <img
                                            src={residentPhoto || avatarFallbackUrl(residentName)}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = avatarFallbackUrl(residentName);
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resident</p>
                                        <p className="text-sm font-semibold text-gray-900">{residentName}</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
