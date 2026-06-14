import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Pill, Truck, FileText, ClipboardList, ExternalLink } from 'lucide-react';
import api from '../../../services/api';

function StatCard({ icon: Icon, label, value, to, hint }) {
    const inner = (
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-[var(--theme-primary)]" aria-hidden="true" />
            </div>
            <div className="min-w-0 text-left">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
                {hint ? <p className="text-xs text-gray-500 mt-1">{hint}</p> : null}
            </div>
            {to ? <ExternalLink className="w-4 h-4 text-gray-300 shrink-0 ml-auto" aria-hidden="true" /> : null}
        </div>
    );
    if (to) {
        return <Link to={to} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] rounded-xl">{inner}</Link>;
    }
    return inner;
}

export default function MedicationHubOverviewTab() {
    const { residentId } = useParams();
    const { data: medsData } = useQuery({
        queryKey: ['med-hub-overview-meds', residentId],
        queryFn: async () => (await api.get('/medications', { params: { resident_id: residentId, active_only: 'true', per_page: 100 } })).data,
        enabled: !!residentId,
    });

    const { data: deliveriesData } = useQuery({
        queryKey: ['med-hub-overview-deliveries', residentId],
        queryFn: async () => (await api.get('/medication-deliveries', { params: { resident_id: residentId, per_page: 100 } })).data,
        enabled: !!residentId,
    });

    const meds = medsData?.data ?? [];
    const deliveries = deliveriesData?.data ?? [];
    const openDeliveries = deliveries.filter((d) => d.status && String(d.status).toLowerCase() !== 'received').length;

    const base = `/my-residents/${residentId}/medications`;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Pill} label="Active medications" value={meds.length} to={`${base}/list`} />
                <StatCard
                    icon={Truck}
                    label="Deliveries (recent)"
                    value={deliveries.length}
                    hint={openDeliveries ? `${openDeliveries} not fully received` : null}
                    to={`${base}/deliveries`}
                />
                <StatCard icon={FileText} label="Physician orders" value="Documents" to={`${base}/orders`} />
                <StatCard
                    icon={ClipboardList}
                    label="Administration history"
                    value="View log"
                    to={`/medication-history?resident=${residentId}`}
                />
            </div>

            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900">Quick snapshot</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Medication-focused overview — open tabs above for full detail.</p>
                </div>
                <div className="p-4">
                    {meds.length === 0 ? (
                        <p className="text-sm text-gray-500">No active medications on file. Use <strong>Medications</strong> to add or review.</p>
                    ) : (
                        <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                            {meds.slice(0, 8).map((m) => (
                                <li key={m.id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm">
                                    <span className="font-medium text-gray-900">{m.name || m.drug?.name || 'Medication'}</span>
                                    <span className="text-gray-500 text-xs sm:text-sm">{m.instructions || m.frequency || '—'}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {meds.length > 8 ? (
                        <Link to={`${base}/list`} className="inline-block mt-3 text-xs font-bold text-[var(--theme-primary)] hover:underline">
                            View all medications →
                        </Link>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
