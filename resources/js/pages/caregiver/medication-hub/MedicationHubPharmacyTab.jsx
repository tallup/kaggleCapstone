import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Building2, AlertCircle, Package } from 'lucide-react';
import api from '../../../services/api';
import { formatPacificCalendarMedium } from '../../../utils/pacificTime';
import logger from '../../../utils/logger';

function statusBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s === 'received') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (s === 'cancelled') return 'bg-gray-100 text-gray-700 border-gray-200';
    if (s === 'pending' || s === 'confirmed') return 'bg-amber-50 text-amber-900 border-amber-200';
    if (s === 'partially_received') return 'bg-sky-50 text-sky-900 border-sky-200';
    return 'bg-gray-50 text-gray-800 border-gray-200';
}

export default function MedicationHubPharmacyTab() {
    const { residentId } = useParams();

    const { data: resident, isLoading: residentLoading } = useQuery({
        queryKey: ['med-hub-pharmacy-resident', residentId],
        queryFn: async () => {
            const res = await api.get(`/residents/${residentId}`);
            return res.data?.data ?? res.data;
        },
        enabled: !!residentId,
    });

    const { data: medsPage } = useQuery({
        queryKey: ['med-hub-pharmacy-meds', residentId],
        queryFn: async () =>
            (await api.get('/medications', { params: { resident_id: residentId, active_only: 'true', per_page: 100 } })).data,
        enabled: !!residentId,
    });

    const branchId = resident?.branch_id;

    const {
        data: ordersPage,
        isLoading: ordersLoading,
        error: ordersError,
    } = useQuery({
        queryKey: ['med-hub-pharmacy-orders', branchId],
        queryFn: async () =>
            (await api.get('/pharmacy-orders', { params: { branch_id: branchId, per_page: 50 } })).data,
        enabled: !!branchId,
    });

    const drugIds = useMemo(() => {
        const rows = medsPage?.data ?? [];
        const s = new Set();
        rows.forEach((m) => {
            if (m.drug_id != null) s.add(Number(m.drug_id));
        });
        return s;
    }, [medsPage]);

    const allOrders = ordersPage?.data ?? [];

    const { relevantOrders, matchingDrugsByOrderId } = useMemo(() => {
        const matchMap = new Map();
        if (drugIds.size === 0) {
            return { relevantOrders: [], matchingDrugsByOrderId: matchMap };
        }
        const rel = [];
        for (const o of allOrders) {
            const items = o.items || [];
            const hits = items.filter((it) => drugIds.has(Number(it.drug_id)));
            if (hits.length > 0) {
                rel.push(o);
                const names = [...new Set(hits.map((h) => h.drug?.name || `Drug #${h.drug_id}`).filter(Boolean))];
                matchMap.set(o.id, names);
            }
        }
        return { relevantOrders: rel, matchingDrugsByOrderId: matchMap };
    }, [allOrders, drugIds]);

    const displayOrders = relevantOrders.length > 0 ? relevantOrders : allOrders;
    const usingCorrelation = relevantOrders.length > 0 && drugIds.size > 0;
    const noDrugLinksOnMeds = drugIds.size === 0 && allOrders.length > 0;

    if (!residentId) {
        return <p className="text-sm text-gray-500">Missing resident.</p>;
    }

    if (residentLoading) {
        return (
            <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--theme-primary)]/30 border-t-[var(--theme-primary)]" />
            </div>
        );
    }

    if (ordersError) {
        const status = ordersError?.response?.status;
        logger.warn('Medication hub pharmacy orders load failed:', ordersError);
        return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex gap-3 text-amber-900">
                <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                <div>
                    <p className="font-bold text-sm">Could not load pharmacy orders</p>
                    <p className="text-sm mt-1 opacity-90">
                        {status === 403
                            ? 'Your role may not include the pharmacy module, or access was denied.'
                            : 'Something went wrong loading orders for this branch.'}
                    </p>
                    <Link to="/pharmacy/orders" className="inline-block mt-3 text-sm font-bold underline">
                        Open pharmacy orders (if you have access) →
                    </Link>
                </div>
            </div>
        );
    }

    const pharmacyLabel = resident?.pharmacy?.name || resident?.pharmacy_name;

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--theme-primary)]/10">
                        <Building2 className="h-5 w-5 text-[var(--theme-primary)]" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-bold text-gray-900">Pharmacy</h2>
                        {pharmacyLabel ? (
                            <p className="text-sm text-gray-600 mt-1">
                                <span className="font-semibold text-gray-800">Preferred pharmacy: </span>
                                {pharmacyLabel}
                            </p>
                        ) : (
                            <p className="text-sm text-gray-500 mt-1">No preferred pharmacy recorded on the resident profile.</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                            Facility purchase orders for this resident&apos;s branch are listed below. When active medications are linked to
                            drugs in the catalog, matching orders are highlighted.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-gray-900">
                    <Package className="w-5 h-5 text-[var(--theme-primary)]" aria-hidden="true" />
                    <h3 className="text-sm font-bold">
                        {usingCorrelation ? "Orders including this resident's medications" : 'Recent branch pharmacy orders'}
                    </h3>
                </div>
                <Link to="/pharmacy/orders" className="text-xs font-bold text-[var(--theme-primary)] hover:underline">
                    Full pharmacy workspace →
                </Link>
            </div>

            {noDrugLinksOnMeds && allOrders.length > 0 ? (
                <p className="text-xs text-gray-600 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    Active medications are not linked to catalog drugs, so orders cannot be auto-matched. Showing recent orders for this
                    branch instead.
                </p>
            ) : null}

            {!usingCorrelation && drugIds.size > 0 && allOrders.length > 0 ? (
                <p className="text-xs text-amber-900 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                    No open or recent orders include drugs that match this resident&apos;s linked medications. You can still review branch
                    activity below or create orders from the pharmacy workspace.
                </p>
            ) : null}

            {ordersLoading ? (
                <div className="flex justify-center py-12">
                    <div className="h-9 w-9 animate-spin rounded-full border-2 border-[var(--theme-primary)]/30 border-t-[var(--theme-primary)]" />
                </div>
            ) : displayOrders.length === 0 ? (
                <p className="text-sm text-gray-500 rounded-xl border border-gray-100 bg-white p-6">
                    No pharmacy orders found for this branch yet.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Order #</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Supplier</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {displayOrders.map((row) => {
                                const matched = matchingDrugsByOrderId.get(row.id);
                                const itemCount = row.items_count ?? (row.items?.length ?? 0);
                                return (
                                    <tr key={row.id} className="hover:bg-gray-50/80">
                                        <td className="px-4 py-3 font-semibold text-gray-900">{row.order_number || `#${row.id}`}</td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {row.order_date ? formatPacificCalendarMedium(row.order_date) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{row.supplier?.name || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusBadgeClass(row.status)}`}
                                            >
                                                {(row.status || '—').replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">
                                            {matched && matched.length > 0 ? (
                                                <span className="text-emerald-800 font-medium">Includes: {matched.join(', ')}</span>
                                            ) : (
                                                <span className="text-gray-500">{itemCount} line item{itemCount !== 1 ? 's' : ''}</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
