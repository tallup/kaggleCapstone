import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import logger from '../utils/logger';
import { ShoppingCart, Plus, Search, Edit, Trash2, Calendar, Package, CheckCircle, Clock, XCircle, Truck } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import Card from '../components/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';

export default function PharmacyOrders() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showItems, setShowItems] = useState(false);
    const [editingReceived, setEditingReceived] = useState(false);
    const [receivedQuantities, setReceivedQuantities] = useState({});
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
    
    // Check if user is a facility-level admin
    const isFacilityAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator' || role === 'admin' || role === 'facility_admin';
    }, [currentUser]);
    
    // Check if user is a branch-level admin (not super_admin)
    const isBranchAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return (role === 'administrator' || role === 'admin') && role !== 'super_admin';
    }, [currentUser]);
    
    const [formData, setFormData] = useState({
        branch_id: '',
        supplier_id: '',
        status: 'draft',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        notes: '',
        internal_notes: '',
        items: [],
    });
    
    // Auto-fill branch for admin users on mount
    React.useEffect(() => {
        if (isBranchAdmin && currentUser?.assigned_branch_id && !formData.branch_id) {
            setFormData(prev => ({ ...prev, branch_id: currentUser.assigned_branch_id }));
        }
    }, [isBranchAdmin, currentUser]);

    // Fetch branches
    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    // Fetch suppliers
    const { data: suppliersData } = useQuery({
        queryKey: ['pharmacy-suppliers-active'],
        queryFn: async () => (await api.get('/pharmacy-suppliers', { params: { is_active: true, per_page: 100 } })).data,
    });

    // Fetch drugs
    const { data: drugsData } = useQuery({
        queryKey: ['drugs-options'],
        queryFn: async () => (await api.get('/drugs', { params: { per_page: 1000 } })).data,
    });

    const queryParams = React.useMemo(() => {
        const params = { per_page: 50 };
        if (branchFilter) params.branch_id = branchFilter;
        if (supplierFilter) params.supplier_id = supplierFilter;
        if (statusFilter) params.status = statusFilter;
        if (search) params.search = search;
        return params;
    }, [branchFilter, supplierFilter, statusFilter, search]);

    const { data, isLoading } = useQuery({
        queryKey: ['pharmacy-orders', queryParams],
        queryFn: async () => (await api.get('/pharmacy-orders', { params: queryParams })).data,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/pharmacy-orders/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pharmacy-orders']);
        },
    });

    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            const response = await api.put(`/pharmacy-orders/${id}`, { status });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pharmacy-orders']);
        },
        onError: (error) => {
            logger.error('Failed to update order status:', error);
            alert(error.response?.data?.message || 'Failed to update order status. Please try again.');
        },
    });

    const markAsReceivedMutation = useMutation({
        mutationFn: async ({ orderId, items }) => {
            const response = await api.post(`/pharmacy-orders/${orderId}/mark-received`, { items });
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries(['pharmacy-orders']);
            setSelectedOrder(data);
            setEditingReceived(false);
            setReceivedQuantities({});
        },
        onError: (error) => {
            logger.error('Failed to update received quantities:', error);
            alert(error.response?.data?.message || 'Failed to update received quantities. Please try again.');
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/pharmacy-orders', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['pharmacy-orders']);
            setShowForm(false);
            setFormData({
                branch_id: '',
                supplier_id: '',
                status: 'draft',
                order_date: new Date().toISOString().split('T')[0],
                expected_delivery_date: '',
                notes: '',
                internal_notes: '',
                items: [],
            });
        },
        onError: (error) => {
            logger.error('Failed to create order:', error);
            alert(error.response?.data?.message || 'Failed to create order. Please try again.');
        },
    });

    const orders = data?.data || [];
    const branches = branchesData?.data || [];
    const suppliers = suppliersData?.data || [];
    const drugs = drugsData?.data || [];

    const handleViewItems = (order) => {
        setSelectedOrder(order);
        setShowItems(true);
        setEditingReceived(false);
        // Initialize received quantities from order items
        const quantities = {};
        if (order.items) {
            order.items.forEach(item => {
                quantities[item.id] = item.quantity_received || 0;
            });
        }
        setReceivedQuantities(quantities);
    };

    const handleReceivedQuantityChange = (itemId, value) => {
        setReceivedQuantities(prev => ({
            ...prev,
            [itemId]: parseInt(value) || 0
        }));
    };

    const handleSaveReceivedQuantities = () => {
        if (!selectedOrder) return;
        
        const items = Object.entries(receivedQuantities).map(([itemId, quantity]) => ({
            id: parseInt(itemId),
            quantity_received: quantity
        }));

        markAsReceivedMutation.mutate({
            orderId: selectedOrder.id,
            items
        });
    };

    const handleAddItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { drug_id: '', quantity_ordered: null, unit_cost: null, discount: 0, notes: '' }],
        });
    };

    const handleRemoveItem = (index) => {
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index),
        });
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setFormData({ ...formData, items: updatedItems });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.branch_id || !formData.supplier_id) {
            alert('Please select a branch and supplier.');
            return;
        }

        if (formData.items.length === 0) {
            alert('Please add at least one item to the order.');
            return;
        }

        // Validate all items have required fields (only drug_id is required)
        for (let i = 0; i < formData.items.length; i++) {
            const item = formData.items[i];
            if (!item.drug_id) {
                alert(`Please select a drug for item ${i + 1}.`);
                return;
            }
            // Quantity and unit_cost are optional, but if provided, they must be valid
            if (item.quantity_ordered !== null && item.quantity_ordered !== undefined && item.quantity_ordered < 0) {
                alert(`Please enter a valid quantity for item ${i + 1} (must be 0 or greater).`);
                return;
            }
            if (item.unit_cost !== null && item.unit_cost !== undefined && item.unit_cost < 0) {
                alert(`Please enter a valid unit cost for item ${i + 1} (must be 0 or greater).`);
                return;
            }
        }

        createMutation.mutate(formData);
    };

    const resetOrderFormData = () => ({
        branch_id: '',
        supplier_id: '',
        status: 'draft',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        notes: '',
        internal_notes: '',
        items: [],
    });
    const closeOrderForm = () => {
        setShowForm(false);
        setEditing(null);
        setFormData(resetOrderFormData());
    };

    const getStatusBadge = (status) => {
        const styles = {
            draft: 'bg-gray-100 text-gray-800',
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            partially_received: 'bg-purple-100 text-purple-800',
            received: 'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)]',
            cancelled: 'bg-red-100 text-red-800',
        };
        const labels = {
            draft: 'Draft',
            pending: 'Pending',
            confirmed: 'Confirmed',
            partially_received: 'Partially Received',
            received: 'Received',
            cancelled: 'Cancelled',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {labels[status] || status}
            </span>
        );
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'received':
                return <CheckCircle className="w-5 h-5 text-[var(--theme-primary)]" />;
            case 'cancelled':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'draft':
                return <Package className="w-5 h-5 text-gray-500" />;
            default:
                return <Clock className="w-5 h-5 text-yellow-500" />;
        }
    };

    const pharmacyOrderForm = (
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
                                    disabled={!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(branch => (
                                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Supplier *
                                </label>
                                <select
                                    required
                                    value={formData.supplier_id}
                                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                >
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(supplier => (
                                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status *
                                </label>
                                <select
                                    required
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                >
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Order Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.order_date}
                                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Expected Delivery Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.expected_delivery_date}
                                    onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
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
                        </div>

                        {/* Order Items */}
                        <div className="border-t pt-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="px-3 py-1.5 text-sm bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center space-x-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Item</span>
                                </button>
                            </div>

                            {formData.items.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-500">No items added. Click "Add Item" to start.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Drug *
                                                    </label>
                                                    <select
                                                        required
                                                        value={item.drug_id}
                                                        onChange={(e) => handleItemChange(index, 'drug_id', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                                    >
                                                        <option value="">Select Drug</option>
                                                        {drugs.map(drug => (
                                                            <option key={drug.id} value={drug.id}>
                                                                {drug.name} {drug.strength ? `(${drug.strength})` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Quantity
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={item.quantity_ordered || ''}
                                                        onChange={(e) => handleItemChange(index, 'quantity_ordered', e.target.value ? parseInt(e.target.value) : null)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Unit Cost
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={item.unit_cost || ''}
                                                        onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value ? parseFloat(e.target.value) : null)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                                    />
                                                </div>

                                                <div className="flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="w-full px-4 py-2.5 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors shadow-md hover:shadow-lg"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end space-x-3 border-t pt-6">
                            <button
                                type="button"
                                onClick={closeOrderForm}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create Order'}
                            </button>
                        </div>
                    </form>
    );

    if (showItems && selectedOrder) {
        return (
            <div>
                <SectionCard>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Order Items</h2>
                            <p className="text-sm text-gray-600">Order #: {selectedOrder.order_number}</p>
                            <p className="text-sm text-gray-500">Status: <span className="font-medium capitalize">{selectedOrder.status?.replace('_', ' ')}</span></p>
                        </div>
                        <div className="flex items-center gap-3">
                            {!editingReceived && selectedOrder.status !== 'received' && selectedOrder.status !== 'cancelled' && (
                                <button
                                    onClick={() => setEditingReceived(true)}
                                    className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors"
                                >
                                    Update Received Quantities
                                </button>
                            )}
                            {editingReceived && (
                                <>
                                    <button
                                        onClick={handleSaveReceivedQuantities}
                                        disabled={markAsReceivedMutation.isPending}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        {markAsReceivedMutation.isPending ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingReceived(false);
                                            // Reset to original values
                                            const quantities = {};
                                            selectedOrder.items.forEach(item => {
                                                quantities[item.id] = item.quantity_received || 0;
                                            });
                                            setReceivedQuantities(quantities);
                                        }}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => { 
                                    setShowItems(false); 
                                    setSelectedOrder(null);
                                    setEditingReceived(false);
                                    setReceivedQuantities({});
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                            >
                                Back to Orders
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {selectedOrder.items && selectedOrder.items.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Drug</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Line Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {selectedOrder.items.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{item.drug?.name || 'N/A'}</div>
                                                    {item.drug?.strength && (
                                                        <div className="text-sm text-gray-500">{item.drug.strength}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {item.quantity_ordered}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {editingReceived ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={item.quantity_ordered}
                                                            value={receivedQuantities[item.id] ?? item.quantity_received ?? 0}
                                                            onChange={(e) => handleReceivedQuantityChange(item.id, e.target.value)}
                                                            className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                                        />
                                                    ) : (
                                                        <span className={item.quantity_received === item.quantity_ordered ? 'text-green-600 font-medium' : item.quantity_received > 0 ? 'text-yellow-600' : ''}>
                                                            {item.quantity_received || 0}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    ${parseFloat(item.unit_cost || 0).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    ${parseFloat(item.line_total || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr>
                                            <td colSpan="4" className="px-6 py-4 text-right text-sm font-medium text-gray-700">
                                                Total:
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                ${parseFloat(selectedOrder.total || 0).toFixed(2)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        ) : (
                            <Card className="p-8 text-center">
                                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No items in this order.</p>
                            </Card>
                        )}
                    </div>
                </SectionCard>
            </div>
        );
    }

    return (
        <>
            <ConfirmDialog
                isOpen={deleteConfirmId != null}
                onClose={() => !deleteMutation.isPending && setDeleteConfirmId(null)}
                onConfirm={() => {
                    if (deleteConfirmId == null) return;
                    deleteMutation.mutate(deleteConfirmId, { onSuccess: () => setDeleteConfirmId(null) });
                }}
                title="Delete this order?"
                description="This order will be permanently removed."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
            <Modal
                isOpen={showForm}
                onClose={closeOrderForm}
                title={editing ? 'Edit Order' : 'Create Order'}
                size="xl"
            >
                {pharmacyOrderForm}
            </Modal>
        <div>
            <SectionCard>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Pharmacy Orders</h2>
                        <p className="text-gray-600">Manage purchase orders to suppliers.</p>
                    </div>
                    <button
                        onClick={() => { setEditing(null); setShowForm(true); }}
                        className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Order</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search orders..."
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
                        value={supplierFilter}
                        onChange={(e) => setSupplierFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    >
                        <option value="">All Suppliers</option>
                        {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    >
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="partially_received">Partially Received</option>
                        <option value="received">Received</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-2 text-gray-500">Loading orders...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <Card className="p-8 text-center">
                        <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No orders found.</p>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <Card key={order.id} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-lg font-semibold text-gray-900">{order.order_number}</h3>
                                            <select
                                                value={order.status}
                                                onChange={(e) => {
                                                    const newStatus = e.target.value;
                                                    if (newStatus !== order.status) {
                                                        updateStatusMutation.mutate({ id: order.id, status: newStatus });
                                                    }
                                                }}
                                                disabled={updateStatusMutation.isLoading}
                                                className="px-3 py-1 text-sm font-medium rounded-lg border bg-white hover:bg-gray-50 focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                                style={{
                                                    color: order.status === 'draft' ? '#6B7280' :
                                                           order.status === 'pending' ? '#D97706' :
                                                           order.status === 'confirmed' ? '#059669' :
                                                           order.status === 'partially_received' ? '#0284C7' :
                                                           order.status === 'received' ? '#16A34A' :
                                                           order.status === 'cancelled' ? '#DC2626' : '#6B7280',
                                                    borderColor: order.status === 'draft' ? '#D1D5DB' :
                                                                order.status === 'pending' ? '#FBBF24' :
                                                                order.status === 'confirmed' ? '#10B981' :
                                                                order.status === 'partially_received' ? '#0EA5E9' :
                                                                order.status === 'received' ? '#22C55E' :
                                                                order.status === 'cancelled' ? '#EF4444' : '#D1D5DB',
                                                }}
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="pending">Pending</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="partially_received">Partially Received</option>
                                                <option value="received">Received</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                            <div>
                                                <span className="font-medium">Branch:</span> {order.branch?.name || 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-medium">Supplier:</span> {order.supplier?.name || 'N/A'}
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>{new Date(order.order_date).toLocaleDateString()}</span>
                                            </div>
                                            <div>
                                                <span className="font-medium">Items:</span> {order.items_count || 0}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {getStatusIcon(order.status)}
                                        <span className="text-lg font-bold text-gray-900">
                                            ${parseFloat(order.total || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t">
                                    <div className="text-sm text-gray-600">
                                        Ordered by: {order.ordered_by?.name || 'N/A'}
                                    </div>
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleViewItems(order)}
                                            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                            <Package className="w-4 h-4" />
                                            View Items
                                        </button>
                                        {order.status === 'draft' && (
                                            <>
                                                <button
                                                    onClick={() => setDeleteConfirmId(order.id)}
                                                    className="px-4 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            </>
                                        )}
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





