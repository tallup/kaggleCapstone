import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Printer } from 'lucide-react';

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
            Print
        </button>
    );
}

/**
 * Standard layout for printable reports and charts.
 * Renders a compact one-line header (facility, branch, title, date). Print button goes beside Export in each page.
 */
export default function PrintableReportLayout({ title, subtitle, branchName, children }) {
    const { data: user } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const res = await api.get('/user');
            return res.data;
        },
    });

    const ctx = user?.report_context;
    const facilityName = ctx?.facility_name || user?.facility_branding?.name || 'Facility';
    const defaultBranchName = ctx?.branch_name || user?.assigned_branch?.name;
    const displayBranch = branchName !== undefined && branchName !== null && branchName !== ''
        ? branchName
        : (defaultBranchName || 'All branches');
    const generatedAt = new Date().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    return (
        <div className="print-report min-h-screen">
            {/* Compact one-line header - visible only when printing */}
            <header className="print-report-header print-only border-b border-gray-200 pb-2 mb-4">
                <p className="text-xs text-gray-600">
                    <span className="font-semibold">{facilityName}</span>
                    {' · '}
                    <span>{displayBranch}</span>
                    {' · '}
                    <span className="font-medium text-gray-800">{title}</span>
                    {subtitle && <span> · {subtitle}</span>}
                    {' · '}
                    <span>Generated: {generatedAt}</span>
                </p>
            </header>

            <div className="print-report-content">
                {children}
            </div>
        </div>
    );
}
