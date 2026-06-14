import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Download, FileArchive, Calendar, Building2 } from 'lucide-react';
import { getLocalDateString } from '../../utils/pacificTime';
import PrintableReportLayout from '../../components/reports/PrintableReportLayout';

export default function InspectionPackage() {
    const [dateFrom, setDateFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().slice(0, 10);
    });
    const [dateTo, setDateTo] = useState(() => getLocalDateString());
    const [branchId, setBranchId] = useState('');
    const [loading, setLoading] = useState(false);

    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const res = await api.get('/branches', { params: { per_page: 100 } });
            return res.data?.data || res.data || [];
        },
    });
    const branches = branchesData || [];

    const handleDownload = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo });
            if (branchId) params.set('branch_id', branchId);
            const res = await api.get(`/compliance/inspection-package?${params.toString()}`, {
                responseType: 'blob',
            });
            const blob = new Blob([res.data], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inspection_package_${dateFrom}_to_${dateTo}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PrintableReportLayout title="Inspection Package" subtitle="Compliance report bundle">
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="max-w-2xl mx-auto px-4 py-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <FileArchive className="h-8 w-8 text-brand-primary-dark" />
                            Inspection Package
                        </h1>
                        <p className="mt-2 text-gray-600">
                            Download a ZIP containing resident care logs, incident reports, resident list, medication report, and vitals summary for the selected date range.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl shadow border border-gray-200 p-6 space-y-4 no-print">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From date</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To date</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch (optional)</label>
                            <select
                                value={branchId}
                                onChange={(e) => setBranchId(e.target.value)}
                                className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                            >
                                <option value="">All branches</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleDownload}
                            disabled={loading}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-brand-primary-dark text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Download className="h-5 w-5" />
                                    Download ZIP
                                </>
                            )}
                        </button>
                    </div>

                    <div className="mt-6 text-sm text-gray-500">
                        <p>The ZIP file includes:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>resident_care_logs.csv</li>
                            <li>incident_reports.csv</li>
                            <li>resident_list.csv</li>
                            <li>medication_report.csv</li>
                            <li>vitals_summary.csv</li>
                        </ul>
                    </div>
                </div>
            </div>
        </PrintableReportLayout>
    );
}
