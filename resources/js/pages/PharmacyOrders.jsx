import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { ShoppingCart, Plus, Search, Edit, Trash2, Calendar, Package, CheckCircle, Clock, XCircle, Truck } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import Card from '../components/Card';

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

    const orders = data?.data || [];
    const branches = branchesData?.data || [];
    const suppliers = suppliersData?.data || [];
    const drugs = drugsData?.data || [];

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this order?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleViewItems = (order) => {
        setSelectedOrder(order);
        setShowItems(true);
    };

    const getStatusBadge = (status) => {
        const styles = {
            draft: 'bg-gray-100 text-gray-800',
            pending: 'bg-yellow-100 text-yellow-800',
            confirmed: 'bg-blue-100 text-blue-800',
            partially_received: 'bg-purple-100 text-purple-800',
            received: 'bg-green-100 text-green-800',
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
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'cancelled':
                return <XCircle className="w-5 h-5 text-red-500" />;
            case 'draft':
                return <Package className="w-5 h-5 text-gray-500" />;
            default:
                return <Clock className="w-5 h-5 text-yellow-500" />;
        }
    };

    if (showItems && selectedOrder) {
        return (
            <div>
                <SectionCard>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Order Items</h2>
                            <p className="text-sm text-gray-600">Order #: {selectedOrder.order_number}</p>
                        </div>
                        <button
                            onClick={() => { setShowItems(false); setSelectedOrder(null); }}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Back to Orders
                        </button>
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
                                                    {item.quantity_received || 0}
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
                                            {getStatusBadge(order.status)}
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
                                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            View Items
                                        </button>
                                        {order.status === 'draft' && (
                                            <>
                                                <button
                                                    onClick={() => handleDelete(order.id)}
                                                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
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
    );
}


