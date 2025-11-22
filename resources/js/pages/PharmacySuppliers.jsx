import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Building2, Plus, Search, Edit, Trash2, Phone, Mail, MapPin, CheckCircle, XCircle } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import Card from '../components/Card';

export default function PharmacySuppliers() {
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
        city: '',
        state: '',
        zip: '',
        fax: '',
        license_number: '',
        notes: '',
        is_active: true,
        default_discount: '',
        payment_terms_days: 30,
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
        },
    });

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
            city: '',
            state: '',
            zip: '',
            fax: '',
            license_number: '',
            notes: '',
            is_active: true,
            default_discount: '',
            payment_terms_days: 30,
        });
        setErrors({});
    };

    const handleEdit = (supplier) => {
        setEditing(supplier);
        setFormData({
            name: supplier.name || '',
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            city: supplier.city || '',
            state: supplier.state || '',
            zip: supplier.zip || '',
            fax: supplier.fax || '',
            license_number: supplier.license_number || '',
            notes: supplier.notes || '',
            is_active: supplier.is_active ?? true,
            default_discount: supplier.default_discount || '',
            payment_terms_days: supplier.payment_terms_days || 30,
        });
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrors({});
        
        const submitData = {
            ...formData,
            default_discount: formData.default_discount ? parseFloat(formData.default_discount) : null,
            payment_terms_days: parseInt(formData.payment_terms_days) || 30,
        };

        if (editing) {
            updateMutation.mutate({ id: editing.id, data: submitData });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this supplier?')) {
            deleteMutation.mutate(id);
        }
    };

    if (showForm) {
        return (
            <div>
                <SectionCard>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-gray-900">
                            {editing ? 'Edit Supplier' : 'Add Supplier'}
                        </h2>
                        <button
                            onClick={handleCloseForm}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ✕
                        </button>
                    </div>

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
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    City
                                </label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    State
                                </label>
                                <input
                                    type="text"
                                    maxLength={2}
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                    placeholder="WA"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ZIP Code
                                </label>
                                <input
                                    type="text"
                                    value={formData.zip}
                                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fax
                                </label>
                                <input
                                    type="text"
                                    value={formData.fax}
                                    onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    License Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.license_number}
                                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Default Discount (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.default_discount}
                                    onChange={(e) => setFormData({ ...formData, default_discount: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payment Terms (Days)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.payment_terms_days}
                                    onChange={(e) => setFormData({ ...formData, payment_terms_days: e.target.value })}
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
                </SectionCard>
            </div>
        );
    }

    return (
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
                                    {(supplier.city || supplier.state) && (
                                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                                            <MapPin className="w-4 h-4" />
                                            <span>{supplier.city}{supplier.state ? `, ${supplier.state}` : ''}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div className="text-sm text-gray-600">
                                        {supplier.orders_count || 0} orders
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleEdit(supplier)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(supplier.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}





