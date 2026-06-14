import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Building2, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, CheckCircle, XCircle } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import Card from '../components/Card';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import { useToastContext } from '../contexts/ToastContext';

export default function PharmacySuppliers() {
    const toast = useToastContext();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        notes: '',
        is_active: true,
    });
    const [errors, setErrors] = useState({});

    const queryParams = React.useMemo(() => {
        const params = { per_page: 50 };
        if (statusFilter) params.is_active = statusFilter === 'active';
        if (search) params.search = search;
        return params;
    }, [statusFilter, search]);

    const { data, isLoading } = useQuery({
        queryKey: ['pharmacy-suppliers', queryParams],
        queryFn: async () => (await api.get('/pharmacy-suppliers', { params: queryParams })).data,
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            return (await api.post('/pharmacy-suppliers', data)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pharmacy-suppliers']);
            handleCloseForm();
        },
        onError: (error) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            return (await api.put(`/pharmacy-suppliers/${id}`, data)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pharmacy-suppliers']);
            handleCloseForm();
        },
        onError: (error) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/pharmacy-suppliers/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pharmacy-suppliers']);
            toast.showToast('Supplier removed.', 'success');
        },
        onError: (error) => {
            const msg =
                error.response?.data?.message ||
                error.response?.data?.error ||
                (typeof error.response?.data === 'string' ? error.response.data : null) ||
                error.message ||
                'Could not delete supplier.';
            toast.showToast(msg, 'error');
        },
    });

    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const suppliers = data?.data || [];

    const handleCloseForm = () => {
        setShowForm(false);
        setEditing(null);
        setFormData({
            name: '',
            contact_person: '',
            phone: '',
            email: '',
            address: '',
            notes: '',
            is_active: true,
        });
        setErrors({});
    };

    const handleDelete = (id) => {
        setDeleteConfirmId(id);
    };

    const handleEdit = (supplier) => {
        setEditing(supplier);
        setFormData({
            name: supplier.name || '',
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            notes: supplier.notes || '',
            is_active: supplier.is_active ?? true,
        });
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrors({});
        
        const submitData = {
            ...formData,
        };

        if (editing) {
            updateMutation.mutate({ id: editing.id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    return (
        <>
            <ConfirmDialog
                isOpen={deleteConfirmId != null}
                onClose={() => !deleteMutation.isPending && setDeleteConfirmId(null)}
                onConfirm={() => {
                    if (deleteConfirmId == null) return;
                    deleteMutation.mutate(deleteConfirmId, { onSuccess: () => setDeleteConfirmId(null) });
                }}
                title="Delete this supplier?"
                description="The supplier will be removed from your list. Existing pharmacy orders keep this supplier on file for history."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
            <Modal
                isOpen={showForm}
                onClose={handleCloseForm}
                title={editing ? 'Edit Supplier' : 'Add Supplier'}
                size="xl"
            >
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supplier Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Contact Person
                                </label>
                                <input
                                    type="text"
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone || ''}
                                    onChange={(e) => {
                                        const formatted = formatPhoneNumber(e.target.value);
                                        setFormData({ ...formData, phone: formatted });
                                    }}
                                    placeholder="(425) 555-0123"
                                    maxLength={14}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Address
                                </label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Active</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleCloseForm}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors"
                                disabled={createMutation.isPending || updateMutation.isPending}
                            >
                                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editing ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </form>
            </Modal>
        <div>
            <SectionCard>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Pharmacy Suppliers</h2>
                        <p className="text-gray-600">Manage pharmacy suppliers and vendors.</p>
                    </div>
                    <button
                        onClick={() => { setEditing(null); setShowForm(true); }}
                        className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Supplier</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search suppliers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-2 text-gray-500">Loading suppliers...</p>
                    </div>
                ) : suppliers.length === 0 ? (
                    <Card className="p-8 text-center">
                        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No suppliers found.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {suppliers.map((supplier) => (
                            <Card key={supplier.id} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{supplier.name}</h3>
                                        {supplier.contact_person && (
                                            <p className="text-sm text-gray-600">Contact: {supplier.contact_person}</p>
                                        )}
                                    </div>
                                    {supplier.is_active ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>

                                <div className="space-y-2 mb-4">
                                    {supplier.phone && (
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <Phone className="w-4 h-4" />
                                            <span>{supplier.phone}</span>
                                        </div>
                                    )}
                                    {supplier.email && (
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <Mail className="w-4 h-4" />
                                            <span>{supplier.email}</span>
                                        </div>
                                    )}
                                    {supplier.address && (
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <MapPin className="w-4 h-4" />
                                            <span>{supplier.address}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div className="text-sm text-gray-600">
                                        {supplier.orders_count || 0} orders
                                    </div>
                                    <div className="flex gap-2">
                                        <Tooltip content="Edit" position="top">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(supplier)}
                                                className="p-2.5 border-2 border-[var(--theme-primary)] bg-white text-[var(--theme-primary)] hover:bg-[var(--theme-primary-bg)] hover:border-[var(--theme-primary-dark)] rounded-lg transition-all shadow-sm"
                                                aria-label="Edit supplier"
                                            >
                                                <Edit className="w-4 h-4" strokeWidth={2.25} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Delete" position="top">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(supplier.id)}
                                                className="p-2.5 border-2 border-red-400 bg-white text-red-700 hover:bg-red-50 hover:border-red-500 rounded-lg transition-all shadow-sm"
                                                aria-label="Delete supplier"
                                            >
                                                <Trash2 className="w-4 h-4" strokeWidth={2.25} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </SectionCard>
        </div>
        </>
    );
}











