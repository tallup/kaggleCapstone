import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import { Truck, Plus, Search, Filter, Edit, Trash2, Calendar, Package, User, X, Sparkles } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import Card from '../components/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import EntityCardShell, { EntityCardHeader } from '../components/ui/EntityCardShell';
import CardIconButton from '../components/ui/CardIconButton';
import DataPill, { DataPillSection } from '../components/ui/DataPill';
import Select from '../components/ui/radix/Select';
import logger from '../utils/logger';
import { parseResidentContextId } from '../utils/headerResidentSwitcher';

export default function MedicationDeliveries() {
    const location = useLocation();
    const headerResidentId = useMemo(
        () => parseResidentContextId(location.search, location.pathname),
        [location.search, location.pathname],
    );
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState(() => {
        return localStorage.getItem('med-deliveries-branch') || '';
    });
    const [typeFilter, setTypeFilter] = useState(() => {
        return localStorage.getItem('med-deliveries-type') || '';
    });
    const [statusFilter, setStatusFilter] = useState(() => {
        return localStorage.getItem('med-deliveries-status') || '';
    });
    const [showForm, setShowForm] = useState(false);
    const [formMode, setFormMode] = useState('full'); // 'full', 'quick', or 'bulk'
    /** Bumps when opening the modal so form children remount with fresh state + header resident prefill. */
    const [formOpenSeq, setFormOpenSeq] = useState(0);
    const [editing, setEditing] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    // Fetch current user
    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/user');
                setCurrentUser(response.data);
            } catch (err) {
                logger.error('Failed to fetch current user:', err);
            }
        };
        fetchUser();
    }, []);

    // Persist filters
    React.useEffect(() => {
        localStorage.setItem('med-deliveries-branch', branchFilter || '');
        localStorage.setItem('med-deliveries-type', typeFilter || '');
        localStorage.setItem('med-deliveries-status', statusFilter || '');
    }, [branchFilter, typeFilter, statusFilter]);

    // Check if user is a caregiver
    const isCaregiver = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        const roleNormalized = role.replace(/[\s_]/g, '');
        return roleNormalized === 'caregiver' || (role.includes('care') && role.includes('giver'));
    }, [currentUser]);
    
    // Check if user is a facility administrator (can access all branches in facility)
    const isFacilityAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator';
    }, [currentUser]);
    
    // Check if user is a branch-level admin (restricted to assigned branch)
    const isBranchAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'admin';
    }, [currentUser]);

    // Fetch branches
    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    // Fetch residents
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list'],
        queryFn: async () => (await api.get('/residents', { params: { per_page: 100 } })).data,
    });

    // Fetch medications
    const { data: medicationsData } = useQuery({
        queryKey: ['medications-list'],
        queryFn: async () => (await api.get('/medications', { params: { per_page: 1000 } })).data,
    });

    // Fetch pharmacy suppliers
    const { data: pharmacySuppliersData, error: pharmacySuppliersError } = useQuery({
        queryKey: ['pharmacy-suppliers'],
        queryFn: async () => (await api.get('/pharmacy-suppliers', { params: { per_page: 100, is_active: true } })).data,
    });

    // Fetch pharmacy templates
    const { data: pharmacyTemplatesData } = useQuery({
        queryKey: ['pharmacy-templates', branchFilter],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (branchFilter) params.branch_id = branchFilter;
            return (await api.get('/pharmacy-templates', { params })).data;
        },
    });

    // Build query params
    const queryParams = React.useMemo(() => {
        const params = { per_page: 50 };
        if (branchFilter) params.branch_id = branchFilter;
        if (typeFilter) params.delivery_type = typeFilter;
        if (statusFilter) params.status = statusFilter;
        return params;
    }, [branchFilter, typeFilter, statusFilter]);

    // Fetch deliveries
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['medication-deliveries', queryParams],
        queryFn: async () => (await api.get('/medication-deliveries', { params: queryParams })).data,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/medication-deliveries/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['medication-deliveries']);
        },
    });

    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            await api.put(`/medication-deliveries/${id}`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['medication-deliveries']);
        },
    });

    const createPharmacyTemplateMutation = useMutation({
        mutationFn: async (payload) => (await api.post('/pharmacy-templates', payload)).data,
        onSuccess: () => {
            toast.success('Pharmacy template saved', '', { isFormSubmission: true });
            queryClient.invalidateQueries(['pharmacy-templates']);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Failed to save template');
        },
    });

    const deliveries = data?.data || [];
    const branches = branchesData?.data || [];
    const residents = residentsData?.data || [];
    const medications = medicationsData?.data || [];
    const pharmacySuppliers = pharmacySuppliersData?.data || [];
    const pharmacyTemplates = pharmacyTemplatesData?.data || [];

    // Filter deliveries by search
    const filteredDeliveries = React.useMemo(() => {
        if (!search) return deliveries;
        const searchLower = search.toLowerCase();
        return deliveries.filter(d => 
            d.pharmacy_name?.toLowerCase().includes(searchLower) ||
            d.resident?.name?.toLowerCase().includes(searchLower) ||
            d.medication?.name?.toLowerCase().includes(searchLower) ||
            d.branch?.name?.toLowerCase().includes(searchLower)
        );
    }, [deliveries, search]);

    const handleCloseForm = () => {
        setShowForm(false);
        setEditing(null);
    };

    const handleEdit = (delivery) => {
        setEditing(delivery);
        setShowForm(true);
    };

    const getStatusBadge = (status) => {
        const styles = {
            received: 'bg-yellow-100 text-yellow-800',
            verified: 'bg-blue-100 text-blue-800',
            stored: 'bg-green-100 text-green-800',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'N/A'}
            </span>
        );
    };

    const getTypeBadge = (type) => {
        const styles = {
            individual: 'bg-purple-100 text-purple-800',
            batch: 'bg-indigo-100 text-indigo-800',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
                {type ? type.charAt(0).toUpperCase() + type.slice(1) : 'N/A'}
            </span>
        );
    };

    const deliveryModalTitle =
        formMode === 'bulk'
            ? 'Bulk Medication Delivery Entry'
            : editing
              ? 'Edit Medication Delivery'
              : formMode === 'quick'
                ? 'Quick Entry'
                : 'Add Medication Delivery';

    return (
        <>
            <ConfirmDialog
                isOpen={deleteConfirmId != null}
                onClose={() => !deleteMutation.isPending && setDeleteConfirmId(null)}
                onConfirm={() => {
                    if (deleteConfirmId == null) return;
                    deleteMutation.mutate(deleteConfirmId, { onSuccess: () => setDeleteConfirmId(null) });
                }}
                title="Delete this medication delivery?"
                description="This delivery record will be permanently removed."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
            <Modal
                isOpen={showForm}
                onClose={handleCloseForm}
                title={deliveryModalTitle}
                size="xl"
            >
                {formMode === 'bulk' ? (
                    <BulkMedicationDeliveryForm
                        key={`bulk-${formOpenSeq}-${headerResidentId || '0'}`}
                        defaultResidentId={headerResidentId || ''}
                        branches={branches}
                        residents={residents}
                        medications={medications}
                        pharmacySuppliers={pharmacySuppliers}
                        pharmacyTemplates={pharmacyTemplates}
                        onSaveTemplate={(payload) => createPharmacyTemplateMutation.mutateAsync(payload)}
                        isCaregiver={isCaregiver}
                        caregiverBranchId={currentUser?.assigned_branch_id}
                        currentUser={currentUser}
                        isFacilityAdmin={isFacilityAdmin}
                        isBranchAdmin={isBranchAdmin}
                        inModal
                        onClose={handleCloseForm}
                        onSuccess={() => {
                            queryClient.invalidateQueries(['medication-deliveries']);
                            handleCloseForm();
                        }}
                    />
                ) : (
                    <MedicationDeliveryForm
                        key={editing?.id ?? `new-${formMode}-${formOpenSeq}-${headerResidentId || '0'}`}
                        record={editing}
                        defaultResidentId={headerResidentId || ''}
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
                        formMode={formMode}
                        inModal
                        onClose={handleCloseForm}
                        onSuccess={() => {
                            queryClient.invalidateQueries(['medication-deliveries']);
                            handleCloseForm();
                        }}
                    />
                )}
            </Modal>
        <div>
            <SectionCard>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Medication Deliveries</h2>
                        <p className="text-gray-600">Track medication deliveries from pharmacy.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => {
                                setEditing(null);
                                setFormOpenSeq((n) => n + 1);
                                setShowForm(true);
                                setFormMode('full');
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Delivery</span>
                        </button>
                        <button
                            onClick={() => {
                                setEditing(null);
                                setFormOpenSeq((n) => n + 1);
                                setShowForm(true);
                                setFormMode('quick');
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Quick Entry</span>
                        </button>
                        <button
                            onClick={() => {
                                setEditing(null);
                                setFormOpenSeq((n) => n + 1);
                                setShowForm(true);
                                setFormMode('bulk');
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
                        >
                            <Package className="w-4 h-4" />
                            <span>Bulk Entry</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search deliveries..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>

                    {!isCaregiver && (
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">All Branches</option>
                            {branches.map(branch => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                        </select>
                    )}

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    >
                        <option value="">All Types</option>
                        <option value="individual">Individual</option>
                        <option value="batch">Batch</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    >
                        <option value="">All Status</option>
                        <option value="received">Received</option>
                        <option value="verified">Verified</option>
                        <option value="stored">Stored</option>
                    </select>
                </div>

                {isLoading ? (
                    <div className="py-6 space-y-3">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                                <div className="h-3 bg-gray-200 rounded w-1/2 mb-1"></div>
                                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredDeliveries.length === 0 ? (
                    <div className="text-center py-12">
                        <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No medication deliveries found.</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <Card className="p-4 bg-blue-50 border-blue-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600">Total Today</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {filteredDeliveries.filter(d => {
                                                const today = new Date().toDateString();
                                                return new Date(d.received_date).toDateString() === today;
                                            }).length}
                                        </p>
                                    </div>
                                    <Calendar className="w-8 h-8 text-[var(--theme-primary)]" />
                                </div>
                            </Card>
                            <Card className="p-4 bg-yellow-50 border-yellow-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600">Pending Verification</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {filteredDeliveries.filter(d => d.status === 'received').length}
                                        </p>
                                    </div>
                                    <Package className="w-8 h-8 text-[var(--theme-primary)]" />
                                </div>
                            </Card>
                            <Card className="p-4 bg-green-50 border-green-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600">Stored</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {filteredDeliveries.filter(d => d.status === 'stored').length}
                                        </p>
                                    </div>
                                    <Truck className="w-8 h-8 text-[var(--theme-primary)]" />
                                </div>
                            </Card>
                        </div>

                        {/* Grouped Deliveries */}
                        {(() => {
                            const grouped = filteredDeliveries.reduce((acc, delivery) => {
                                const date = new Date(delivery.received_date).toDateString();
                                const today = new Date().toDateString();
                                const yesterday = new Date(Date.now() - 86400000).toDateString();
                                
                                let groupKey;
                                if (date === today) {
                                    groupKey = 'Today';
                                } else if (date === yesterday) {
                                    groupKey = 'Yesterday';
                                } else {
                                    const weekAgo = new Date(Date.now() - 7 * 86400000);
                                    if (new Date(delivery.received_date) >= weekAgo) {
                                        groupKey = 'This Week';
                                    } else {
                                        groupKey = new Date(delivery.received_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                                    }
                                }
                                
                                if (!acc[groupKey]) {
                                    acc[groupKey] = {};
                                }
                                
                                const pharmacy = delivery.pharmacy_name || 'Unknown Pharmacy';
                                if (!acc[groupKey][pharmacy]) {
                                    acc[groupKey][pharmacy] = [];
                                }
                                
                                acc[groupKey][pharmacy].push(delivery);
                                return acc;
                            }, {});
                            
                            const sortedGroups = Object.keys(grouped).sort((a, b) => {
                                const order = { 'Today': 0, 'Yesterday': 1, 'This Week': 2 };
                                return (order[a] ?? 99) - (order[b] ?? 99);
                            });
                            
                            return (
                                <div className="space-y-6">
                                    {sortedGroups.map((groupKey) => (
                                        <div key={groupKey}>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-[var(--theme-primary)]" />
                                                {groupKey}
                                                <span className="text-sm font-normal text-gray-500">
                                                    ({Object.values(grouped[groupKey]).flat().length} delivery{Object.values(grouped[groupKey]).flat().length !== 1 ? 'ies' : ''})
                                                </span>
                                            </h3>
                                            {Object.entries(grouped[groupKey]).map(([pharmacy, deliveries]) => (
                                                <div key={pharmacy} className="mb-4">
                                                    <h4 className="text-sm font-medium text-gray-900 mb-2 ml-2">
                                                        {pharmacy} ({deliveries.length})
                                                    </h4>
                                                    <div className="grid grid-cols-1 gap-3">
                                                        {deliveries.map((delivery) => (
                            <EntityCardShell key={delivery.id}>
                                <EntityCardHeader
                                    left={
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Truck className="h-5 w-5 shrink-0 text-[var(--theme-primary)]" />
                                            {getTypeBadge(delivery.delivery_type)}
                                            <select
                                                value={delivery.status || 'received'}
                                                onChange={(e) => {
                                                    updateStatusMutation.mutate({
                                                        id: delivery.id,
                                                        status: e.target.value,
                                                    });
                                                }}
                                                disabled={updateStatusMutation.isPending}
                                                className={`rounded-full border-0 px-2 py-1 text-xs font-medium transition-colors ${
                                                    delivery.status === 'received'
                                                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                                        : delivery.status === 'verified'
                                                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                          : delivery.status === 'stored'
                                                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                                } ${updateStatusMutation.isPending ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                            >
                                                <option value="received">Received</option>
                                                <option value="verified">Verified</option>
                                                <option value="stored">Stored</option>
                                            </select>
                                        </div>
                                    }
                                    right={
                                        <>
                                            <Tooltip content="Edit delivery" position="top">
                                                <CardIconButton
                                                    variant="edit"
                                                    icon={Edit}
                                                    aria-label="Edit"
                                                    onClick={() => handleEdit(delivery)}
                                                />
                                            </Tooltip>
                                            <Tooltip content="Delete delivery" position="top">
                                                <CardIconButton
                                                    variant="delete"
                                                    icon={Trash2}
                                                    aria-label="Delete"
                                                    onClick={() => setDeleteConfirmId(delivery.id)}
                                                />
                                            </Tooltip>
                                        </>
                                    }
                                />

                                <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                                    {delivery.pharmacy_name}
                                </h3>

                                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    <DataPill icon={Package}>
                                        <span className="font-normal text-slate-600">
                                            Branch: {delivery.branch?.name || 'N/A'}
                                        </span>
                                    </DataPill>
                                    {delivery.delivery_type === 'individual' && (
                                        <>
                                            <DataPill icon={User}>
                                                <span className="font-normal text-slate-600">
                                                    {delivery.resident?.name || 'N/A'}
                                                </span>
                                            </DataPill>
                                            <DataPill icon={Package} className="sm:col-span-2">
                                                <span className="font-normal text-slate-600 line-clamp-2">
                                                    {delivery.medication?.name || 'N/A'}
                                                </span>
                                            </DataPill>
                                        </>
                                    )}
                                    <DataPill icon={Package}>
                                        <span className="font-normal text-slate-600">
                                            Qty: {delivery.quantity_received}
                                        </span>
                                    </DataPill>
                                    <DataPill icon={Calendar}>
                                        <span className="font-normal text-slate-600">
                                            {new Date(delivery.received_date).toLocaleDateString()}{' '}
                                            {delivery.received_time || ''}
                                        </span>
                                    </DataPill>
                                    <DataPill icon={User} className="sm:col-span-2">
                                        <span className="font-normal text-slate-600">
                                            Received by: {delivery.received_by?.name || 'N/A'}
                                        </span>
                                    </DataPill>
                                </div>

                                {delivery.notes ? (
                                    <DataPillSection label="Notes">
                                        <p className="text-sm">{delivery.notes}</p>
                                    </DataPillSection>
                                ) : null}
                            </EntityCardShell>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </>
                )}
            </SectionCard>
        </div>
        </>
    );
}

export function MedicationDeliveryForm({
    record,
    defaultResidentId = '',
    branches,
    residents,
    medications,
    pharmacySuppliers = [],
    pharmacySuppliersError = null,
    pharmacyTemplates: initialPharmacyTemplates = [],
    onSaveTemplate,
    isCaregiver,
    caregiverBranchId,
    formMode = 'full',
    onClose,
    onSuccess,
    currentUser,
    isFacilityAdmin,
    isBranchAdmin,
    inModal = false,
}) {
    const [formData, setFormData] = useState({
        branch_id: record?.branch_id || caregiverBranchId || (isBranchAdmin && currentUser?.assigned_branch_id ? currentUser.assigned_branch_id : ''),
        delivery_type: record?.delivery_type || (formMode === 'quick' ? 'batch' : 'individual'),
        resident_id: record?.resident_id || (defaultResidentId ? String(defaultResidentId) : ''),
        medication_id: record?.medication_id || '',
        pharmacy_name: record?.pharmacy_name || '',
        quantity_received: record?.quantity_received || '',
        received_date: record?.received_date || new Date().toISOString().split('T')[0],
        received_time: record?.received_time || new Date().toTimeString().slice(0, 5),
        status: record?.status || 'received',
        notes: record?.notes || '',
    });
    
    // Auto-fill branch for admin users on mount
    React.useEffect(() => {
        if (isBranchAdmin && currentUser?.assigned_branch_id && !record && !formData.branch_id) {
            setFormData(prev => ({ ...prev, branch_id: currentUser.assigned_branch_id }));
        }
    }, [isBranchAdmin, currentUser, record]);

    // Match branch to header-selected resident (or prefilled resident) so the resident appears in the dropdown
    React.useEffect(() => {
        if (record) return;
        const rid = formData.resident_id;
        if (!rid || !residents?.length) return;
        const r = residents.find((x) => String(x.id) === String(rid));
        if (!r) return;
        setFormData((prev) => {
            if (String(prev.branch_id) === String(r.branch_id)) return prev;
            return { ...prev, branch_id: String(r.branch_id) };
        });
    }, [record, formData.resident_id, residents]);

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    React.useEffect(() => {
        if (formMode === 'quick' && !record) {
            setFormData((prev) => ({
                ...prev,
                delivery_type: 'batch',
                status: 'received',
            }));
        }
    }, [formMode, record]);

    const applyTemplate = (templateId) => {
        const tpl = pharmacyTemplates.find((t) => t.id === Number(templateId));
        if (!tpl) return;
        setFormData((prev) => ({
            ...prev,
            branch_id: tpl.branch_id?.toString() || prev.branch_id,
            pharmacy_name: tpl.name || prev.pharmacy_name,
            notes: tpl.default_notes || prev.notes,
        }));
        toast.success('Template applied');
    };

    const saveAsTemplate = async () => {
        if (!onSaveTemplate) return;
        try {
            const payload = {
                branch_id: Number(formData.branch_id),
                name: formData.pharmacy_name || 'Pharmacy',
                default_notes: formData.notes || null,
            };
            await onSaveTemplate(payload);
        } catch (e) {
            // error handled by mutation toast
        }
    };

    const availableSuppliers = pharmacySuppliers || [];

    // Filter residents by branch
    const filteredResidents = React.useMemo(() => {
        if (!residents || residents.length === 0) return [];
        if (!formData.branch_id) {
            // If no branch selected, show all residents
            return residents;
        }
        return residents.filter(r => r.branch_id == formData.branch_id);
    }, [residents, formData.branch_id]);

    // Fetch medications dynamically based on branch and resident
    const { data: medicationsQueryData } = useQuery({
        queryKey: ['medications-for-delivery', formData.branch_id, formData.resident_id],
        queryFn: async () => {
            if (!formData.branch_id || !formData.resident_id || formData.delivery_type !== 'individual') {
                return { data: [] };
            }
            const params = {
                branch_id: formData.branch_id,
                resident_id: formData.resident_id,
                active_only: 'true',
                per_page: 1000
            };
            const response = await api.get('/medications', { params });
            return response.data;
        },
        enabled: formData.delivery_type === 'individual' && !!formData.branch_id && !!formData.resident_id,
    });

    // Fetch pharmacy templates
    const { data: pharmacyTemplatesData, error: pharmacyTemplatesError } = useQuery({
        queryKey: ['pharmacy-templates', formData.branch_id],
        queryFn: async () => {
            try {
                const params = { per_page: 100 };
                if (formData.branch_id) {
                    params.branch_id = formData.branch_id;
                }
                const response = await api.get('/pharmacy-templates', { params });
                // API returns paginated data, so access response.data.data
                return response.data;
            } catch (error) {
                logger.error('Error fetching pharmacy templates:', error);
                return { data: [] };
            }
        },
        enabled: true, // Always enabled, but will filter by branch if provided
    });
    
    // Extract templates from paginated response
    const fetchedPharmacyTemplates = pharmacyTemplatesData?.data || [];
    const pharmacyTemplates = fetchedPharmacyTemplates.length ? fetchedPharmacyTemplates : initialPharmacyTemplates;

    // Use dynamically fetched medications or fallback to passed medications
    const availableMedications = medicationsQueryData?.data || medications || [];
    
    // Filter medications by resident and branch
    const filteredMedications = React.useMemo(() => {
        if (!formData.resident_id || formData.delivery_type !== 'individual') return [];
        return availableMedications.filter(m => 
            m.resident_id == formData.resident_id && 
            (!formData.branch_id || m.branch_id == formData.branch_id)
        );
    }, [availableMedications, formData.resident_id, formData.branch_id, formData.delivery_type]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            const payload = { ...formData };
            if (formData.delivery_type === 'batch') {
                payload.resident_id = null;
                payload.medication_id = null;
            }

            if (record) {
                await api.put(`/medication-deliveries/${record.id}`, payload);
            } else {
                await api.post('/medication-deliveries', payload);
            }

            onSuccess();
        } catch (error) {
            logger.error('Error saving medication delivery:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: [error.response?.data?.message || 'Failed to save medication delivery'] });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6'}>
            {!inModal && (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {record ? 'Edit Medication Delivery' : formMode === 'quick' ? 'Quick Entry' : 'Add Medication Delivery'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                        {errors.general && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {errors.general[0]}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Branch *</label>
                                <select
                                    value={formData.branch_id}
                                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value, resident_id: '', medication_id: '' })}
                                    required
                                    disabled={isCaregiver || (!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id)}
                                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white ${!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(branch => (
                                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                                    ))}
                                </select>
                                {errors.branch_id && <p className="text-xs text-red-600 mt-1">{errors.branch_id[0]}</p>}
                            </div>

                            {formMode === 'full' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Delivery Type *</label>
                                    <select
                                        value={formData.delivery_type}
                                        onChange={(e) => setFormData({ ...formData, delivery_type: e.target.value, resident_id: '', medication_id: '' })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                    >
                                        <option value="individual">Individual Medication</option>
                                        <option value="batch">Batch Delivery</option>
                                    </select>
                                    {errors.delivery_type && <p className="text-xs text-red-600 mt-1">{errors.delivery_type[0]}</p>}
                                </div>
                            )}

                            {formData.delivery_type === 'individual' && formMode === 'full' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-1">Resident</label>
                                        <select
                                            value={formData.resident_id}
                                            onChange={(e) => setFormData({ ...formData, resident_id: e.target.value, medication_id: '' })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                        >
                                            <option value="">Select Resident</option>
                                            {filteredResidents.map(resident => (
                                                <option key={resident.id} value={resident.id}>{resident.name}</option>
                                            ))}
                                        </select>
                                        {errors.resident_id && <p className="text-xs text-red-600 mt-1">{errors.resident_id[0]}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-900 mb-1">Medication *</label>
                                        <select
                                            value={formData.medication_id}
                                            onChange={(e) => setFormData({ ...formData, medication_id: e.target.value })}
                                            required
                                            disabled={!formData.resident_id}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 bg-white"
                                        >
                                            <option value="">
                                                {!formData.resident_id ? 'Select Resident First' : filteredMedications.length === 0 ? 'No medications found' : 'Select Medication'}
                                            </option>
                                            {filteredMedications.map(medication => {
                                                const drugName = medication.drug?.name || medication.name || 'Unknown Drug';
                                                const displayName = medication.name || drugName;
                                                return (
                                                    <option key={medication.id} value={medication.id}>
                                                        {displayName} {medication.drug?.name && medication.name !== medication.drug.name ? `(${medication.drug.name})` : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {errors.medication_id && <p className="text-xs text-red-600 mt-1">{errors.medication_id[0]}</p>}
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Pharmacy Supplier (Optional)</label>
                                <select
                                    value=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            const supplier = availableSuppliers.find(s => s.id == e.target.value);
                                            if (supplier) {
                                                setFormData({
                                                    ...formData,
                                                    pharmacy_name: supplier.name,
                                                    notes: supplier.notes || formData.notes,
                                                });
                                            }
                                        }
                                    }}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                >
                                    <option value="">Select a supplier...</option>
                                    {availableSuppliers && availableSuppliers.length > 0 ? (
                                        availableSuppliers.map(supplier => (
                                            <option key={supplier.id} value={supplier.id}>
                                                {supplier.name}
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>
                                            {pharmacySuppliersError ? 'Error loading suppliers' : 'No suppliers available'}
                                        </option>
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Pharmacy Name (optional)</label>
                                <input
                                    type="text"
                                    value={formData.pharmacy_name}
                                    onChange={(e) => setFormData({ ...formData, pharmacy_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                />
                                {errors.pharmacy_name && <p className="text-xs text-red-600 mt-1">{errors.pharmacy_name[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Quantity Received *</label>
                                <input
                                    type="text"
                                    value={formData.quantity_received}
                                    onChange={(e) => setFormData({ ...formData, quantity_received: e.target.value })}
                                    required
                                    placeholder="e.g., 30 tablets, 2 bottles"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                />
                                {errors.quantity_received && <p className="text-xs text-red-600 mt-1">{errors.quantity_received[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Received Date *</label>
                                <input
                                    type="date"
                                    value={formData.received_date}
                                    onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                />
                                {errors.received_date && <p className="text-xs text-red-600 mt-1">{errors.received_date[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Received Time *</label>
                                <input
                                    type="time"
                                    value={formData.received_time}
                                    onChange={(e) => setFormData({ ...formData, received_time: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                />
                                {errors.received_time && <p className="text-xs text-red-600 mt-1">{errors.received_time[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Status *</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                >
                                    <option value="received">Received</option>
                                    <option value="verified">Verified</option>
                                    <option value="stored">Stored</option>
                                </select>
                                {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status[0]}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                placeholder="Enter any additional notes..."
                            />
                            {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes[0]}</p>}
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 bg-white"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50"
                            >
                                {isSubmitting ? 'Saving...' : (record ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
        </div>
    );
}

function BulkMedicationDeliveryForm({ defaultResidentId = '', branches, residents, medications, pharmacySuppliers = [], pharmacyTemplates = [], onSaveTemplate, isCaregiver, caregiverBranchId, onClose, onSuccess, currentUser, isFacilityAdmin, isBranchAdmin, inModal = false }) {
    const [commonFields, setCommonFields] = useState({
        branch_id: caregiverBranchId || (isBranchAdmin && currentUser?.assigned_branch_id ? currentUser.assigned_branch_id : ''),
        pharmacy_name: '',
        received_date: new Date().toISOString().split('T')[0],
        received_time: new Date().toTimeString().slice(0, 5),
        status: 'received',
    });
    
    // Auto-fill branch for admin users on mount
    React.useEffect(() => {
        if (isBranchAdmin && currentUser?.assigned_branch_id && !commonFields.branch_id) {
            setCommonFields(prev => ({ ...prev, branch_id: currentUser.assigned_branch_id }));
        }
    }, [isBranchAdmin, currentUser]);
    const [deliveries, setDeliveries] = useState([
        {
            delivery_type: 'individual',
            resident_id: defaultResidentId ? String(defaultResidentId) : '',
            medication_id: '',
            quantity_received: '',
            notes: '',
        }
    ]);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [filteredResidents, setFilteredResidents] = React.useState([]);
    const [filteredMedications, setFilteredMedications] = React.useState({});
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    // Filter residents by branch
    React.useEffect(() => {
        if (commonFields.branch_id && residents?.length > 0) {
            setFilteredResidents(residents.filter(r => r.branch_id == commonFields.branch_id));
        } else {
            setFilteredResidents(residents || []);
        }
    }, [commonFields.branch_id, residents]);

    // Align branch with header-selected resident so the first row’s resident appears in the filtered list
    React.useEffect(() => {
        if (!defaultResidentId || !residents?.length) return;
        const r = residents.find((x) => String(x.id) === String(defaultResidentId));
        if (!r) return;
        setCommonFields((prev) => {
            if (String(prev.branch_id) === String(r.branch_id)) return prev;
            return { ...prev, branch_id: String(r.branch_id) };
        });
    }, [defaultResidentId, residents]);

    const applyTemplate = (templateId) => {
        const tpl = pharmacyTemplates.find(t => t.id === Number(templateId));
        if (!tpl) return;
        setCommonFields((prev) => ({
            ...prev,
            branch_id: tpl.branch_id?.toString() || prev.branch_id,
            pharmacy_name: tpl.name || prev.pharmacy_name,
            notes: tpl.default_notes || prev.notes,
        }));
        toast.success('Template applied to common fields');
    };

    const saveAsTemplate = async () => {
        if (!onSaveTemplate) return;
        try {
            await onSaveTemplate({
                branch_id: Number(commonFields.branch_id),
                name: commonFields.pharmacy_name || 'Pharmacy',
                default_notes: commonFields.notes || null,
            });
        } catch (e) {
            // handled by mutation toast
        }
    };

    // Fetch medications for each resident
    React.useEffect(() => {
        const fetchMedications = async () => {
            const medsMap = {};
            for (const delivery of deliveries) {
                if (delivery.delivery_type === 'individual' && delivery.resident_id && commonFields.branch_id) {
                    try {
                        const response = await api.get('/medications', {
                            params: {
                                branch_id: commonFields.branch_id,
                                resident_id: delivery.resident_id,
                                active_only: 'true',
                                per_page: 1000
                            }
                        });
                        medsMap[delivery.resident_id] = response.data.data || [];
                    } catch (err) {
                        logger.error('Failed to fetch medications:', err);
                        medsMap[delivery.resident_id] = [];
                    }
                }
            }
            setFilteredMedications(medsMap);
        };
        fetchMedications();
    }, [deliveries.map(d => `${d.resident_id}-${d.delivery_type}`).join(','), commonFields.branch_id]);

    const addRow = () => {
        setDeliveries([...deliveries, {
            delivery_type: 'individual',
            resident_id: '',
            medication_id: '',
            quantity_received: '',
            notes: '',
        }]);
    };

    const removeRow = (index) => {
        if (deliveries.length > 1) {
            setDeliveries(deliveries.filter((_, i) => i !== index));
        }
    };

    const updateDelivery = (index, field, value) => {
        const updated = [...deliveries];
        updated[index] = { ...updated[index], [field]: value };
        if (field === 'delivery_type' || field === 'resident_id') {
            updated[index].medication_id = '';
        }
        setDeliveries(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            const payload = deliveries.map(delivery => ({
                ...commonFields,
                ...delivery,
                // Clear resident/medication for batch deliveries
                resident_id: delivery.delivery_type === 'batch' ? null : delivery.resident_id,
                medication_id: delivery.delivery_type === 'batch' ? null : delivery.medication_id,
            }));

            const response = await api.post('/medication-deliveries/bulk', { deliveries: payload });
            
            if (response.data.error_count > 0) {
                toast.warning(`${response.data.success_count} deliveries created, ${response.data.error_count} failed. Check console for details.`);
                logger.error('Bulk creation errors:', response.data.errors);
            } else {
                toast.success(`Successfully created ${response.data.success_count} delivery(ies)!`, { isFormSubmission: true });
            }
            
            onSuccess();
        } catch (error) {
            logger.error('Bulk creation error:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                toast.error('Failed to create deliveries: ' + (error.response?.data?.message || error.message));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6'}>
            {!inModal && (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Bulk Medication Delivery Entry</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            )}

                    <form onSubmit={handleSubmit}>
                        {/* Common Fields */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Fields (Applied to All)</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Branch *</label>
                                    <Select
                                        value={commonFields.branch_id?.toString() || ''}
                                        onValueChange={(value) => setCommonFields({ ...commonFields, branch_id: value })}
                                        placeholder="Select Branch"
                                        options={branches?.map(branch => ({
                                            value: branch.id.toString(),
                                            label: branch.name,
                                        })) || []}
                                        disabled={isCaregiver || (!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id)}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Pharmacy (optional)</label>
                                    <Select
                                        value={commonFields.pharmacy_name || ''}
                                        onValueChange={(value) => setCommonFields({ ...commonFields, pharmacy_name: value })}
                                        placeholder="Select pharmacy (optional)"
                                        options={pharmacySuppliers?.map(supplier => ({
                                            value: supplier.name,
                                            label: supplier.name,
                                        })) || []}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Received Date *</label>
                                    <input
                                        type="date"
                                        value={commonFields.received_date}
                                        onChange={(e) => setCommonFields({ ...commonFields, received_date: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Received Time *</label>
                                    <input
                                        type="time"
                                        value={commonFields.received_time}
                                        onChange={(e) => setCommonFields({ ...commonFields, received_time: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Status *</label>
                                    <select
                                        value={commonFields.status}
                                        onChange={(e) => setCommonFields({ ...commonFields, status: e.target.value })}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-gray-900 bg-white"
                                    >
                                        <option value="received">Received</option>
                                        <option value="verified">Verified</option>
                                        <option value="stored">Stored</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Rows */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Deliveries</h3>
                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="px-3 py-1.5 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] text-sm rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Row
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Type</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Resident</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Medication</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Quantity *</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Notes</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deliveries.map((delivery, index) => (
                                            <tr key={index}>
                                                <td className="border border-gray-300 px-3 py-2">
                                                    <select
                                                        value={delivery.delivery_type}
                                                        onChange={(e) => updateDelivery(index, 'delivery_type', e.target.value)}
                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm text-gray-900 bg-white"
                                                    >
                                                        <option value="individual">Individual</option>
                                                        <option value="batch">Batch</option>
                                                    </select>
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2">
                                                    {delivery.delivery_type === 'individual' ? (
                                                        <select
                                                            value={delivery.resident_id}
                                                            onChange={(e) => updateDelivery(index, 'resident_id', e.target.value)}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm text-gray-900 bg-white"
                                                        >
                                                            <option value="">Select Resident</option>
                                                            {filteredResidents.map(resident => (
                                                                <option key={resident.id} value={resident.id}>
                                                                    {resident.first_name} {resident.last_name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">N/A</span>
                                                    )}
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2">
                                                    {delivery.delivery_type === 'individual' ? (
                                                        <select
                                                            value={delivery.medication_id}
                                                            onChange={(e) => updateDelivery(index, 'medication_id', e.target.value)}
                                                            disabled={!delivery.resident_id}
                                                            required={delivery.delivery_type === 'individual'}
                                                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm disabled:bg-gray-100 text-gray-900 bg-white"
                                                        >
                                                            <option value="">
                                                                {!delivery.resident_id ? 'Select Resident First' : 'Select Medication'}
                                                            </option>
                                                            {(filteredMedications[delivery.resident_id] || []).map(medication => {
                                                                const drugName = medication.drug?.name || medication.name || 'Unknown';
                                                                const displayName = medication.name || drugName;
                                                                return (
                                                                    <option key={medication.id} value={medication.id}>
                                                                        {displayName}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    ) : (
                                                        <span className="text-sm text-gray-500">N/A</span>
                                                    )}
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={delivery.quantity_received}
                                                        onChange={(e) => updateDelivery(index, 'quantity_received', e.target.value)}
                                                        required
                                                        placeholder="e.g., 30 tablets"
                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm text-gray-900 bg-white"
                                                    />
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={delivery.notes}
                                                        onChange={(e) => updateDelivery(index, 'notes', e.target.value)}
                                                        placeholder="Optional notes"
                                                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-sm text-gray-900 bg-white"
                                                    />
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2">
                                                    {deliveries.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRow(index)}
                                                            className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                                        >
                                                            <X className="w-4 h-4" />
                                                            Remove
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Creating...' : `Create ${deliveries.length} Delivery(ies)`}
                            </button>
                        </div>
                    </form>
        </div>
    );
}

