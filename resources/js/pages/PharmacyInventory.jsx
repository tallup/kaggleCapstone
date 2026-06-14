import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Package, Plus, Search, Edit, Trash2, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, MapPin } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import Card from '../components/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import CardIconButton from '../components/ui/CardIconButton';

export default function PharmacyInventory() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({
        branch_id: '',
        drug_id: '',
        quantity: 0,
        minimum_stock_level: 0,
        maximum_stock_level: '',
        unit_cost: '',
        location: '',
        requires_refrigeration: false,
        is_controlled_substance: false,
        storage_notes: '',
    });
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    // Fetch branches
    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    // Fetch drugs
    const { data: drugsData } = useQuery({
        queryKey: ['drugs-options'],
        queryFn: async () => (await api.get('/drugs', { params: { per_page: 1000 } })).data,
    });

    const queryParams = React.useMemo(() => {
        const params = { per_page: 50 };
        if (branchFilter) params.branch_id = branchFilter;
        if (statusFilter) params.stock_status = statusFilter;
        if (search) params.search = search;
        return params;
    }, [branchFilter, statusFilter, search]);

    const { data, isLoading } = useQuery({
        queryKey: ['pharmacy-inventory', queryParams],
        queryFn: async () => (await api.get('/pharmacy-inventory', { params: queryParams })).data,
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            return (await api.post('/pharmacy-inventory', data)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pharmacy-inventory']);
            handleCloseForm();
        },
        onError: (error) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            if (error.response?.data?.message) {
                setErrorMessage(error.response.data.message);
            } else {
                setErrorMessage('Failed to create inventory item. Please check the form for errors.');
            }
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            return (await api.put(`/pharmacy-inventory/${id}`, data)).data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pharmacy-inventory']);
            handleCloseForm();
        },
        onError: (error) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
            if (error.response?.data?.message) {
                setErrorMessage(error.response.data.message);
            } else {
                setErrorMessage('Failed to create inventory item. Please check the form for errors.');
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/pharmacy-inventory/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pharmacy-inventory']);
        },
    });

    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const inventory = data?.data || [];
    const branches = branchesData?.data || [];
    const drugs = drugsData?.data || [];

    const handleCloseForm = () => {
        setShowForm(false);
        setEditing(null);
        setFormData({
            branch_id: '',
            drug_id: '',
            quantity: 0,
            minimum_stock_level: 0,
            maximum_stock_level: '',
            unit_cost: '',
            location: '',
            requires_refrigeration: false,
            is_controlled_substance: false,
            storage_notes: '',
        });
        setErrors({});
        setErrorMessage('');
    };

    const handleEdit = (item) => {
        setEditing(item);
        setFormData({
            branch_id: item.branch_id || '',
            drug_id: item.drug_id || '',
            quantity: item.quantity || 0,
            minimum_stock_level: item.minimum_stock_level || 0,
            maximum_stock_level: item.maximum_stock_level || '',
            unit_cost: item.unit_cost || '',
            location: item.location || '',
            requires_refrigeration: item.requires_refrigeration || false,
            is_controlled_substance: item.is_controlled_substance || false,
            storage_notes: item.storage_notes || '',
        });
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrors({});
        setErrorMessage('');
        
        if (editing) {
            // For updates, exclude branch_id and drug_id (they can't be changed)
            const submitData = {
                quantity: parseInt(formData.quantity) || 0,
                minimum_stock_level: parseInt(formData.minimum_stock_level) || 0,
                maximum_stock_level: formData.maximum_stock_level ? parseInt(formData.maximum_stock_level) : null,
                unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
                location: formData.location && formData.location.trim() ? formData.location.trim() : null,
                requires_refrigeration: Boolean(formData.requires_refrigeration),
                is_controlled_substance: Boolean(formData.is_controlled_substance),
                storage_notes: formData.storage_notes && formData.storage_notes.trim() ? formData.storage_notes.trim() : null,
            };
            updateMutation.mutate({ id: editing.id, data: submitData });
        } else {
            // For creates, include all required fields
            const submitData = {
                branch_id: formData.branch_id || '',
                drug_id: formData.drug_id || '',
                quantity: parseInt(formData.quantity) || 0,
                minimum_stock_level: parseInt(formData.minimum_stock_level) || 0,
                maximum_stock_level: formData.maximum_stock_level ? parseInt(formData.maximum_stock_level) : null,
                unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
                location: formData.location && formData.location.trim() ? formData.location.trim() : null,
                requires_refrigeration: Boolean(formData.requires_refrigeration),
                is_controlled_substance: Boolean(formData.is_controlled_substance),
                storage_notes: formData.storage_notes && formData.storage_notes.trim() ? formData.storage_notes.trim() : null,
            };
            createMutation.mutate(submitData);
        }
    };

    const getStockStatusBadge = (item) => {
        const quantity = item.quantity || 0;
        const minLevel = item.minimum_stock_level || 0;
        
        if (quantity <= 0) {
            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Out of Stock</span>;
        }
        if (quantity <= minLevel) {
            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Low Stock</span>;
        }
        if (item.maximum_stock_level && quantity >= item.maximum_stock_level) {
            return <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Overstock</span>;
        }
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">In Stock</span>;
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
                title="Delete inventory item?"
                description="This inventory item will be permanently removed."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
            <Modal
                isOpen={showForm}
                onClose={handleCloseForm}
                title={editing ? 'Edit Inventory Item' : 'Add Inventory Item'}
                size="xl"
            >
                    {errorMessage && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{errorMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Branch *
                                </label>
                                <select
                                    required
                                    value={formData.branch_id}
                                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                                    disabled={!!editing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent disabled:bg-gray-100"
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(branch => (
                                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                                    ))}
                                </select>
                                {errors.branch_id && <p className="text-xs text-red-600 mt-1">{errors.branch_id[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Drug *
                                </label>
                                <select
                                    required
                                    value={formData.drug_id}
                                    onChange={(e) => setFormData({ ...formData, drug_id: e.target.value })}
                                    disabled={!!editing}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent disabled:bg-gray-100"
                                >
                                    <option value="">Select Drug</option>
                                    {drugs.map(drug => (
                                        <option key={drug.id} value={drug.id}>
                                            {drug.name} {drug.strength ? `(${drug.strength})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.drug_id && <p className="text-xs text-red-600 mt-1">{errors.drug_id[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Current Quantity *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                                {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Minimum Stock Level *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={formData.minimum_stock_level}
                                    onChange={(e) => setFormData({ ...formData, minimum_stock_level: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                                {errors.minimum_stock_level && <p className="text-xs text-red-600 mt-1">{errors.minimum_stock_level[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Maximum Stock Level
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.maximum_stock_level}
                                    onChange={(e) => setFormData({ ...formData, maximum_stock_level: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Unit Cost ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.unit_cost}
                                    onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Storage Location
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="e.g., Room A, Shelf 3"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Storage Notes
                                </label>
                                <textarea
                                    rows={3}
                                    value={formData.storage_notes}
                                    onChange={(e) => setFormData({ ...formData, storage_notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.requires_refrigeration}
                                        onChange={(e) => setFormData({ ...formData, requires_refrigeration: e.target.checked })}
                                        className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Requires Refrigeration</span>
                                </label>
                            </div>

                            <div>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_controlled_substance}
                                        onChange={(e) => setFormData({ ...formData, is_controlled_substance: e.target.checked })}
                                        className="rounded border-gray-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Controlled Substance</span>
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
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Pharmacy Inventory</h2>
                        <p className="text-gray-600">Manage pharmacy inventory and stock levels.</p>
                    </div>
                    <button
                        onClick={() => { setEditing(null); setShowForm(true); }}
                        className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Inventory Item</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search inventory..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>

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

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    >
                        <option value="">All Status</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-2 text-gray-500">Loading inventory...</p>
                    </div>
                ) : inventory.length === 0 ? (
                    <Card className="p-8 text-center">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No inventory items found.</p>
                    </Card>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drug</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Level</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {inventory.map((item) => (
                                    <tr key={item.id} className={item.quantity <= (item.minimum_stock_level || 0) ? 'bg-red-50' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {item.branch?.name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{item.drug?.name || 'N/A'}</div>
                                            {item.drug?.strength && (
                                                <div className="text-sm text-gray-500">{item.drug.strength}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{item.quantity || 0}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.minimum_stock_level || 0}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStockStatusBadge(item)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.location ? (
                                                <div className="flex items-center space-x-1">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{item.location}</span>
                                                </div>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {item.unit_cost ? `$${parseFloat(item.unit_cost).toFixed(2)}` : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <Tooltip content="Edit" position="top">
                                                    <CardIconButton
                                                        variant="primary"
                                                        type="button"
                                                        onClick={() => handleEdit(item)}
                                                        aria-label="Edit"
                                                    >
                                                        <Edit className="h-4 w-4" strokeWidth={2.5} />
                                                    </CardIconButton>
                                                </Tooltip>
                                                <Tooltip content="Delete" position="top">
                                                    <CardIconButton
                                                        variant="delete"
                                                        type="button"
                                                        onClick={() => setDeleteConfirmId(item.id)}
                                                        aria-label="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                                    </CardIconButton>
                                                </Tooltip>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>
        </div>
        </>
    );
}


























