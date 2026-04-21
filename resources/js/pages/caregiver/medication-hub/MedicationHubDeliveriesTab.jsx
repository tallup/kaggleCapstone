import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Truck, AlertCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../services/api';
import { formatPacificCalendarMedium, formatPacificDateTimeShort } from '../../../utils/pacificTime';
import logger from '../../../utils/logger';
import { isMedicationClinicalAdmin } from '../../../utils/medicationHubPermissions';
import Modal from '../../../components/ui/Modal';
import { MedicationDeliveryForm } from '../../MedicationDeliveries';

export default function MedicationHubDeliveriesTab() {
    const { residentId } = useParams();
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [formOpenSeq, setFormOpenSeq] = useState(0);

    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => (await api.get('/user')).data,
        staleTime: 60_000,
    });
    const isClinicalAdmin = isMedicationClinicalAdmin(currentUser);

    const isCaregiver = useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        const roleNormalized = role.replace(/[\s_]/g, '');
        return roleNormalized === 'caregiver' || (role.includes('care') && role.includes('giver'));
    }, [currentUser]);
    const isFacilityAdmin = useMemo(() => {
        if (!currentUser) return false;
        return currentUser.role?.toLowerCase().trim() === 'administrator';
    }, [currentUser]);
    const isBranchAdmin = useMemo(() => {
        if (!currentUser) return false;
        return currentUser.role?.toLowerCase().trim() === 'admin';
    }, [currentUser]);

    const { data: residentRecord } = useQuery({
        queryKey: ['med-hub-layout-resident', residentId],
        queryFn: async () => {
            const res = await api.get(`/residents/${residentId}`);
            return res.data?.data ?? res.data;
        },
        enabled: !!residentId,
    });

    const formDataEnabled = isClinicalAdmin;
    const { data: branchesData, isLoading: branchesLoading } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
        enabled: formDataEnabled,
    });
    const { data: residentsData, isLoading: residentsLoading } = useQuery({
        queryKey: ['residents-list'],
        queryFn: async () => (await api.get('/residents', { params: { per_page: 100 } })).data,
        enabled: formDataEnabled,
    });
    const { data: medicationsData, isLoading: medicationsLoading } = useQuery({
        queryKey: ['medications-list'],
        queryFn: async () => (await api.get('/medications', { params: { per_page: 1000 } })).data,
        enabled: formDataEnabled,
    });
    const { data: pharmacySuppliersData, error: pharmacySuppliersError } = useQuery({
        queryKey: ['pharmacy-suppliers'],
        queryFn: async () => (await api.get('/pharmacy-suppliers', { params: { per_page: 100, is_active: true } })).data,
        enabled: formDataEnabled,
    });
    const { data: pharmacyTemplatesData } = useQuery({
        queryKey: ['pharmacy-templates', residentRecord?.branch_id],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (residentRecord?.branch_id) params.branch_id = residentRecord.branch_id;
            return (await api.get('/pharmacy-templates', { params })).data;
        },
        enabled: formDataEnabled && !!residentId,
    });

    const createPharmacyTemplateMutation = useMutation({
        mutationFn: async (payload) => (await api.post('/pharmacy-templates', payload)).data,
        onSuccess: () => {
            toast.success('Pharmacy template saved', '', { isFormSubmission: true });
            queryClient.invalidateQueries(['pharmacy-templates']);
        },
        onError: (e) => {
            toast.error(e?.response?.data?.message || 'Failed to save template');
        },
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['med-hub-deliveries', residentId],
        queryFn: async () => (await api.get('/medication-deliveries', { params: { resident_id: residentId, per_page: 50 } })).data,
        enabled: !!residentId,
    });

    const rows = data?.data ?? [];

    const branches = branchesData?.data || [];
    const residents = residentsData?.data || [];
    const medications = medicationsData?.data || [];
    const pharmacySuppliers = pharmacySuppliersData?.data || [];
    const pharmacyTemplates = pharmacyTemplatesData?.data || [];
    const formOptionsLoading =
        formDataEnabled && (branchesLoading || residentsLoading || medicationsLoading);

    const openAddModal = () => {
        setFormOpenSeq((n) => n + 1);
        setShowAddModal(true);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--theme-primary)]/30 border-t-[var(--theme-primary)]" />
            </div>
        );
    }

    if (error) {
        logger.warn('Medication hub deliveries load failed:', error);
        return (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 flex gap-3 text-amber-900">
                <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                <div>
                    <p className="font-bold text-sm">Could not load deliveries</p>
                    <p className="text-sm mt-1 opacity-90">You may need pharmacy module access, or try again later.</p>
                    <Link to="/medication-deliveries" className="inline-block mt-3 text-sm font-bold underline">
                        Open full deliveries workspace
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <>
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="Add Medication Delivery"
                size="xl"
            >
                {formOptionsLoading || !currentUser ? (
                    <div className="flex justify-center py-12" aria-busy="true">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--theme-primary)]/30 border-t-[var(--theme-primary)]" />
                    </div>
                ) : (
                    <MedicationDeliveryForm
                        key={`hub-delivery-${formOpenSeq}-${residentId ?? '0'}`}
                        defaultResidentId={residentId || ''}
                        record={null}
                        branches={branches}
                        residents={residents}
                        medications={medications}
                        pharmacySuppliers={pharmacySuppliers}
                        pharmacySuppliersError={pharmacySuppliersError}
                        pharmacyTemplates={pharmacyTemplates}
                        onSaveTemplate={(payload) => createPharmacyTemplateMutation.mutateAsync(payload)}
                        isCaregiver={isCaregiver}
                        caregiverBranchId={currentUser?.assigned_branch_id}
                        currentUser={currentUser}
                        isFacilityAdmin={isFacilityAdmin}
                        isBranchAdmin={isBranchAdmin}
                        formMode="full"
                        inModal
                        onClose={() => setShowAddModal(false)}
                        onSuccess={() => {
                            queryClient.invalidateQueries(['med-hub-deliveries', residentId]);
                            queryClient.invalidateQueries(['medication-deliveries']);
                            setShowAddModal(false);
                        }}
                    />
                )}
            </Modal>
            <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-gray-900">
                    <Truck className="w-5 h-5 text-[var(--theme-primary)]" aria-hidden="true" />
                    <h2 className="text-base font-bold">Deliveries for this resident</h2>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {isClinicalAdmin && (
                        <button
                            type="button"
                            onClick={openAddModal}
                            disabled={!currentUser}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--theme-primary)] px-3 py-1.5 text-xs font-bold text-[var(--theme-text-on-primary)] shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            Add delivery
                        </button>
                    )}
                    <Link
                        to="/medication-deliveries"
                        className="text-xs font-bold text-[var(--theme-primary)] hover:underline"
                    >
                        All facility deliveries →
                    </Link>
                </div>
            </div>

            {rows.length === 0 ? (
                <div className="text-sm text-gray-500 rounded-xl border border-gray-100 bg-white p-6 space-y-3">
                    <p>No delivery records for this resident.</p>
                    {isClinicalAdmin && (
                        <button
                            type="button"
                            onClick={openAddModal}
                            disabled={!currentUser}
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--theme-primary)] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                            Add a delivery for this resident
                        </button>
                    )}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs font-bold uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Received</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Medication</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50/80">
                                    <td className="px-4 py-3 text-gray-700">
                                        {row.received_date ? formatPacificCalendarMedium(row.received_date) : '—'}
                                        {row.created_at ? (
                                            <span className="block text-xs text-gray-400">{formatPacificDateTimeShort(row.created_at)}</span>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{row.delivery_type || '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700">
                                            {row.status || '—'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{row.medication?.name || row.medication_id || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            </div>
        </>
    );
}
