import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip as ChartTooltip,
    Legend,
} from 'chart.js';
import api from '../services/api';
import {
    Package, ShoppingCart, Truck, AlertTriangle, CheckCircle,
    TrendingUp, DollarSign, Activity, Building2, ArrowRight,
    Plus, Eye, Edit
} from 'lucide-react';
import { DashboardSkeleton } from '../components/ui/SkeletonLoader';
import ModuleProtectedRoute from '../components/ModuleProtectedRoute';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    ChartTooltip,
    Legend
);

function PharmacyDashboard() {
    const navigate = useNavigate();

    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['pharmacy-dashboard-stats'],
        queryFn: async () => {
            const response = await api.get('/pharmacy/dashboard/stats');
            return response.data?.data || response.data || {};
        },
        retry: 1,
        refetchInterval: 300000, // Refresh every 5 minutes
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
    };

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">Error loading pharmacy dashboard: {error.message}</p>
                </div>
            </div>
        );
    }

    const inventory = stats?.inventory || {};
    const orders = stats?.orders || {};
    const suppliers = stats?.suppliers || {};
    const inventoryByBranch = stats?.inventory_by_branch || [];

    // Chart data for orders by status
    const ordersByStatusData = {
        labels: Object.keys(orders?.by_status_last_30_days || {}),
        datasets: [{
            label: 'Orders',
            data: Object.values(orders?.by_status_last_30_days || {}).map(item => item.count || 0),
            backgroundColor: [
                'rgba(59, 130, 246, 0.8)', // pending - blue
                'rgba(34, 197, 94, 0.8)',  // received - green
                'rgba(251, 146, 60, 0.8)',  // draft - orange
            ],
            borderColor: [
                'rgb(59, 130, 246)',
                'rgb(34, 197, 94)',
                'rgb(251, 146, 60)',
            ],
            borderWidth: 1,
        }],
    };

    // Chart data for inventory by branch
    const inventoryByBranchData = {
        labels: inventoryByBranch.map(branch => branch.branch_name),
        datasets: [{
            label: 'Inventory Value',
            data: inventoryByBranch.map(branch => branch.total_value || 0),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: 'rgb(16, 185, 129)',
            borderWidth: 1,
        }],
    };

    // Stock status chart
    const stockStatusData = {
        labels: ['In Stock', 'Low Stock', 'Out of Stock'],
        datasets: [{
            data: [
                inventory?.in_stock_items || 0,
                inventory?.low_stock_count || 0,
                inventory?.out_of_stock_count || 0,
            ],
            backgroundColor: [
                'rgba(34, 197, 94, 0.8)',  // green
                'rgba(251, 146, 60, 0.8)', // orange
                'rgba(239, 68, 68, 0.8)',  // red
            ],
            borderColor: [
                'rgb(34, 197, 94)',
                'rgb(251, 146, 60)',
                'rgb(239, 68, 68)',
            ],
            borderWidth: 1,
        }],
    };

    const statCards = [
        {
            title: 'Total Inventory Value',
            value: formatCurrency(inventory?.total_value || 0),
            icon: DollarSign,
            color: 'blue',
            link: '/pharmacy/inventory',
        },
        {
            title: 'Total Items',
            value: inventory?.total_items || 0,
            icon: Package,
            color: 'green',
            link: '/pharmacy/inventory',
        },
        {
            title: 'Low Stock Items',
            value: inventory?.low_stock_count || 0,
            icon: AlertTriangle,
            color: 'orange',
            link: '/pharmacy/inventory?stock_status=low_stock',
        },
        {
            title: 'Out of Stock',
            value: inventory?.out_of_stock_count || 0,
            icon: AlertTriangle,
            color: 'red',
            link: '/pharmacy/inventory?stock_status=out_of_stock',
        },
        {
            title: 'Pending Orders',
            value: orders?.pending || 0,
            icon: ShoppingCart,
            color: 'blue',
            link: '/pharmacy/orders?status=pending',
        },
        {
            title: 'Pending Order Value',
            value: formatCurrency(orders?.pending_value || 0),
            icon: DollarSign,
            color: 'purple',
            link: '/pharmacy/orders?status=pending',
        },
        {
            title: 'Total Orders',
            value: orders?.total || 0,
            icon: Truck,
            color: 'indigo',
            link: '/pharmacy/orders',
        },
        {
            title: 'Active Suppliers',
            value: suppliers?.total_active || 0,
            icon: Building2,
            color: 'teal',
            link: '/pharmacy/suppliers',
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Pharmacy Dashboard</h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Comprehensive overview of pharmacy inventory, orders, and suppliers
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/pharmacy/orders/create')}
                                className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                New Order
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {statCards.map((card, index) => {
                        const Icon = card.icon;
                        const colorClasses = {
                            blue: 'bg-blue-100 text-blue-600',
                            green: 'bg-green-100 text-green-600',
                            orange: 'bg-orange-100 text-orange-600',
                            red: 'bg-red-100 text-red-600',
                            purple: 'bg-purple-100 text-purple-600',
                            indigo: 'bg-indigo-100 text-indigo-600',
                            teal: 'bg-teal-100 text-teal-600',
                        };
                        
                        return (
                            <div
                                key={index}
                                onClick={() => card.link && navigate(card.link)}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                                    </div>
                                    <div className={`p-3 rounded-lg ${colorClasses[card.color]}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Stock Status Chart */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Status Overview</h3>
                        <div className="h-64">
                            <Doughnut
                                data={stockStatusData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>

                    {/* Orders by Status Chart */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status (Last 30 Days)</h3>
                        <div className="h-64">
                            <Bar
                                data={ordersByStatusData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            display: false,
                                        },
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                stepSize: 1,
                                            },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Orders */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                            <button
                                onClick={() => navigate('/pharmacy/orders')}
                                className="text-sm text-[var(--theme-primary)] hover:underline flex items-center gap-1"
                            >
                                View All
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        {orders?.recent_orders && orders.recent_orders.length > 0 ? (
                            <div className="space-y-3">
                                {orders.recent_orders.map((order) => (
                                    <div
                                        key={order.id}
                                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/pharmacy/orders/${order.id}`)}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{order.order_number}</p>
                                            <p className="text-sm text-gray-600">{order.supplier_name}</p>
                                            <p className="text-xs text-gray-500">{order.branch_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                order.status === 'received' ? 'bg-green-100 text-green-700' :
                                                order.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {order.status}
                                            </span>
                                            <p className="text-sm font-semibold text-gray-900 mt-1">
                                                {formatCurrency(order.total)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No recent orders</p>
                            </div>
                        )}
                    </div>

                    {/* Inventory by Branch */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Branch</h3>
                        {inventoryByBranch.length > 0 ? (
                            <div className="space-y-3">
                                {inventoryByBranch.map((branch) => (
                                    <div key={branch.branch_id} className="p-3 border border-gray-200 rounded-lg">
                                        <p className="font-medium text-gray-900 mb-1">{branch.branch_name}</p>
                                        <p className="text-sm text-gray-600 mb-2">
                                            {formatCurrency(branch.total_value)} • {branch.item_count} items
                                        </p>
                                        <div className="flex gap-4 text-xs">
                                            {branch.low_stock_count > 0 && (
                                                <span className="text-orange-600">
                                                    {branch.low_stock_count} low stock
                                                </span>
                                            )}
                                            {branch.out_of_stock_count > 0 && (
                                                <span className="text-red-600">
                                                    {branch.out_of_stock_count} out of stock
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-sm text-gray-500">No inventory data</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Low Stock & Out of Stock Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    {/* Low Stock Items */}
                    <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-600" />
                                <h3 className="text-lg font-semibold text-gray-900">Low Stock Items</h3>
                            </div>
                            <button
                                onClick={() => navigate('/pharmacy/inventory?stock_status=low_stock')}
                                className="text-sm text-orange-600 hover:underline flex items-center gap-1"
                            >
                                View All
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        {inventory?.low_stock_items && inventory.low_stock_items.length > 0 ? (
                            <div className="space-y-2">
                                {inventory.low_stock_items.slice(0, 5).map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-2 border border-orange-100 rounded-lg hover:bg-orange-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/pharmacy/inventory/${item.id}`)}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 text-sm">{item.drug_name}</p>
                                            <p className="text-xs text-gray-600">{item.branch_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-orange-600">
                                                {item.quantity} / {item.minimum_stock_level}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No low stock items</p>
                        )}
                    </div>

                    {/* Out of Stock Items */}
                    <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                <h3 className="text-lg font-semibold text-gray-900">Out of Stock Items</h3>
                            </div>
                            <button
                                onClick={() => navigate('/pharmacy/inventory?stock_status=out_of_stock')}
                                className="text-sm text-red-600 hover:underline flex items-center gap-1"
                            >
                                View All
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                        {inventory?.out_of_stock_items && inventory.out_of_stock_items.length > 0 ? (
                            <div className="space-y-2">
                                {inventory.out_of_stock_items.slice(0, 5).map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-2 border border-red-100 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/pharmacy/inventory/${item.id}`)}
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 text-sm">{item.drug_name}</p>
                                            <p className="text-xs text-gray-600">{item.branch_name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-red-600">
                                                {item.quantity} in stock
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">No out of stock items</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PharmacyDashboardPage() {
    return (
        <ModuleProtectedRoute module="pharmacy">
            <PharmacyDashboard />
        </ModuleProtectedRoute>
    );
}

