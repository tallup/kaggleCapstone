import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Search, Filter, Edit, Trash2, Calendar, Clock, CheckCircle, AlertCircle, Package, List, Grid, TrendingUp, X, Sparkles } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import Card from '../components/Card';
import WeeklyCalendarView from '../components/WeeklyCalendarView';
import Select from '../components/ui/radix/Select';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function GroceryStatus() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState(() => localStorage.getItem('grocery-branch') || '');
    const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('grocery-status') || '');
    const [weekFilter, setWeekFilter] = useState(() => localStorage.getItem('grocery-week') || '');
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('grocery-view') || 'list'); // 'list' or 'calendar'
    const [selectedDate, setSelectedDate] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    // Fetch current user
    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/user');
                setCurrentUser(response.data);
            } catch (err) {
                console.error('Failed to fetch current user:', err);
            }
        };
        fetchUser();
    }, []);

    // Persist filters
    React.useEffect(() => {
        localStorage.setItem('grocery-branch', branchFilter || '');
    }, [branchFilter]);

    React.useEffect(() => {
        localStorage.setItem('grocery-status', statusFilter || '');
    }, [statusFilter]);

    React.useEffect(() => {
        localStorage.setItem('grocery-week', weekFilter || '');
    }, [weekFilter]);

    React.useEffect(() => {
        localStorage.setItem('grocery-view', viewMode || 'list');
    }, [viewMode]);

    // Check if user is a caregiver
    const isCaregiver = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        const roleNormalized = role.replace(/[\s_]/g, '');
        return roleNormalized === 'caregiver' || (role.includes('care') && role.includes('giver'));
    }, [currentUser]);

    // Auto-set branch filter for caregivers
    React.useEffect(() => {
        if (isCaregiver && currentUser?.assigned_branch_id) {
            setBranchFilter(String(currentUser.assigned_branch_id));
        }
    }, [isCaregiver, currentUser?.assigned_branch_id]);

    // Fetch branches
    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    // Fetch templates
    const { data: templatesData } = useQuery({
        queryKey: ['grocery-item-templates', branchFilter],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (branchFilter) params.branch_id = branchFilter;
            return (await api.get('/grocery-item-templates', { params })).data;
        },
    });

    const createTemplateMutation = useMutation({
        mutationFn: async (payload) => (await api.post('/grocery-item-templates', payload)).data,
        onSuccess: () => {
            toast.success('Template saved');
            queryClient.invalidateQueries(['grocery-item-templates']);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Failed to save template');
        },
    });

    // Build query params
    const queryParams = useMemo(() => {
        const params = { per_page: 50 };
        if (branchFilter) params.branch_id = branchFilter;
        if (statusFilter) params.status = statusFilter;
        if (weekFilter) params.week_start_date = weekFilter;
        return params;
    }, [branchFilter, statusFilter, weekFilter]);

    // Fetch grocery status updates
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['grocery-status-updates', queryParams],
        queryFn: async () => (await api.get('/grocery-status-updates', { params: queryParams })).data,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/grocery-status-updates/${id}`);
        },
        onSuccess: () => {
            toast.success('Update deleted');
            queryClient.invalidateQueries(['grocery-status-updates']);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Delete failed');
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            await api.patch(`/grocery-status-updates/{id}/status`.replace('{id}', id), { status });
        },
        onSuccess: () => {
            toast.success('Status updated');
            queryClient.invalidateQueries(['grocery-status-updates']);
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message || 'Update failed');
        },
    });

    const updates = data?.data || [];
    const templates = templatesData?.data || [];
    const branches = branchesData?.data || [];

    // Get current week's Monday
    const getCurrentWeekMonday = (date = null) => {
        const targetDate = date || new Date();
        const d = new Date(targetDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const monday = new Date(d.setDate(diff));
        return monday;
    };

    // Filter updates by search
    const filteredUpdates = useMemo(() => {
        let filtered = updates;
        
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(u => 
                u.branch?.name?.toLowerCase().includes(searchLower) ||
                u.items_needed?.toLowerCase().includes(searchLower) ||
                u.items_received?.toLowerCase().includes(searchLower) ||
                u.notes?.toLowerCase().includes(searchLower)
            );
        }

        // Group by week
        const grouped = {};
        filtered.forEach(update => {
            const weekKey = update.week_start_date;
            if (!grouped[weekKey]) {
                grouped[weekKey] = [];
            }
            grouped[weekKey].push(update);
        });

        return grouped;
    }, [updates, search]);

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this grocery status update?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleQuickStatusUpdate = (id, newStatus) => {
        updateStatusMutation.mutate({ id, status: newStatus });
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setEditing(null);
    };

    const handleEdit = (update) => {
        setEditing(update);
        setShowForm(true);
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-gray-100 text-gray-800',
            in_progress: 'bg-yellow-100 text-yellow-800',
            completed: 'bg-green-100 text-green-800',
            needs_attention: 'bg-red-100 text-red-800',
        };
        const icons = {
            pending: <Clock className="w-3 h-3" />,
            in_progress: <Package className="w-3 h-3" />,
            completed: <CheckCircle className="w-3 h-3" />,
            needs_attention: <AlertCircle className="w-3 h-3" />,
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
                {icons[status]}
                {status ? status.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'N/A'}
            </span>
        );
    };

    const formatWeekRange = (weekStartDate) => {
        const start = new Date(weekStartDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    // Get latest status for current week
    const currentWeekMonday = getCurrentWeekMonday().toISOString().split('T')[0];
    const currentWeekUpdate = useMemo(() => {
        if (!updates.length) return null;
        const weekUpdates = updates.filter(u => u.week_start_date === currentWeekMonday);
        return weekUpdates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;
    }, [updates, currentWeekMonday]);

    if (showForm) {
        return (
            <div>
                <GroceryStatusForm
                    record={editing}
                    branches={branches}
                    templates={templates}
                    isCaregiver={isCaregiver}
                    caregiverBranchId={currentUser?.assigned_branch_id}
                    onClose={handleCloseForm}
                    onSaveTemplate={(payload) => createTemplateMutation.mutateAsync(payload)}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['grocery-status-updates']);
                        queryClient.invalidateQueries(['grocery-item-templates']);
                        handleCloseForm();
                    }}
                />
            </div>
        );
    }

    return (
        <div>
            <SectionCard>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Grocery Status Updates</h2>
                        <p className="text-gray-600">Track weekly grocery status updates for each branch.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={() => {
                            setEditing(null);
                            setShowForm(true);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Update</span>
                    </button>
                        <button
                            onClick={() => {
                                setEditing({
                                    week_start_date: getCurrentWeekMonday().toISOString().split('T')[0],
                                });
                                setShowForm(true);
                            }}
                            className="w-full sm:w-auto px-4 py-2 border border-[var(--theme-primary)] text-[var(--theme-primary)] rounded-lg hover:bg-[var(--theme-primary-bg-light)] transition-colors flex items-center justify-center space-x-2"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Use Template</span>
                        </button>
                    </div>
                </div>

                {/* Current Week Status Highlight */}
                {currentWeekUpdate && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-blue-900 mb-1">Current Week Status</h3>
                                <p className="text-sm text-blue-700">
                                    Week of {formatWeekRange(currentWeekUpdate.week_start_date)} - {currentWeekUpdate.branch?.name}
                                </p>
                            </div>
                            {getStatusBadge(currentWeekUpdate.status)}
                        </div>
                    </div>
                )}

                {/* Progress Tracking Section */}
                {(() => {
                    const now = new Date();
                    const currentMonth = now.getMonth();
                    const currentYear = now.getFullYear();
                    
                    // Calculate statistics
                    const monthUpdates = updates.filter(u => {
                        const updateDate = new Date(u.week_start_date);
                        return updateDate.getMonth() === currentMonth && updateDate.getFullYear() === currentYear;
                    });
                    
                    const completedUpdates = monthUpdates.filter(u => u.status === 'completed');
                    const weeksCompleted = new Set(completedUpdates.map(u => u.week_start_date)).size;
                    const totalWeeks = Math.ceil(now.getDate() / 7);
                    const completionRate = totalWeeks > 0 ? Math.round((weeksCompleted / totalWeeks) * 100) : 0;
                    
                    // Status distribution
                    const statusCounts = {
                        pending: updates.filter(u => u.status === 'pending').length,
                        in_progress: updates.filter(u => u.status === 'in_progress').length,
                        completed: updates.filter(u => u.status === 'completed').length,
                        needs_attention: updates.filter(u => u.status === 'needs_attention').length,
                    };
                    
                    const totalStatuses = Object.values(statusCounts).reduce((a, b) => a + b, 0);
                    
                    // Average completion time (days from creation to completion)
                    const completedWithDates = updates.filter(u => u.status === 'completed' && u.completed_at && u.created_at);
                    const avgCompletionDays = completedWithDates.length > 0
                        ? Math.round(completedWithDates.reduce((sum, u) => {
                            const created = new Date(u.created_at);
                            const completed = new Date(u.completed_at);
                            return sum + (completed - created) / (1000 * 60 * 60 * 24);
                        }, 0) / completedWithDates.length)
                        : 0;
                    
                    const statusChartData = {
                        labels: ['Pending', 'In Progress', 'Completed', 'Needs Attention'],
                        datasets: [{
                            data: [
                                statusCounts.pending,
                                statusCounts.in_progress,
                                statusCounts.completed,
                                statusCounts.needs_attention,
                            ],
                            backgroundColor: [
                                '#fbbf24', // yellow for pending
                                '#3b82f6', // blue for in_progress
                                '#10b981', // green for completed
                                '#ef4444', // red for needs_attention
                            ],
                            borderWidth: 2,
                            borderColor: '#ffffff',
                        }],
                    };
                    
                    return (
                        <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Summary Cards */}
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="p-4 bg-green-50 border-green-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">Weeks Completed</p>
                                            <p className="text-2xl font-bold text-gray-900">{weeksCompleted}</p>
                                            <p className="text-xs text-gray-500 mt-1">This month</p>
                                        </div>
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                </Card>
                                <Card className="p-4 bg-blue-50 border-blue-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">Completion Rate</p>
                                            <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
                                            <p className="text-xs text-gray-500 mt-1">This month</p>
                                        </div>
                                        <TrendingUp className="w-8 h-8 text-blue-600" />
                                    </div>
                                </Card>
                                <Card className="p-4 bg-purple-50 border-purple-200">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-gray-600">Avg. Completion</p>
                                            <p className="text-2xl font-bold text-gray-900">{avgCompletionDays}</p>
                                            <p className="text-xs text-gray-500 mt-1">Days</p>
                                        </div>
                                        <Clock className="w-8 h-8 text-purple-600" />
                                    </div>
                                </Card>
                            </div>
                            
                            {/* Status Distribution Chart */}
                            <Card className="p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">Status Distribution</h3>
                                {totalStatuses > 0 ? (
                                    <div className="relative h-48">
                                        <Doughnut
                                            data={statusChartData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: {
                                                        position: 'bottom',
                                                        labels: {
                                                            padding: 10,
                                                            font: { size: 11 },
                                                        },
                                                    },
                                                    tooltip: {
                                                        callbacks: {
                                                            label: function(context) {
                                                                const label = context.label || '';
                                                                const value = context.parsed || 0;
                                                                const percentage = totalStatuses > 0 
                                                                    ? Math.round((value / totalStatuses) * 100) 
                                                                    : 0;
                                                                return `${label}: ${value} (${percentage}%)`;
                                                            },
                                                        },
                                                    },
                                                },
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="h-48 flex items-center justify-center text-gray-400">
                                        <p className="text-sm">No data available</p>
                                    </div>
                                )}
                            </Card>
                        </div>
                    );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search updates..."
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
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    >
                        <option value="">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="needs_attention">Needs Attention</option>
                    </select>

                    <input
                        type="week"
                        value={weekFilter}
                        onChange={(e) => setWeekFilter(e.target.value ? new Date(e.target.value).toISOString().split('T')[0] : '')}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        placeholder="Filter by week"
                    />
                </div>

                {/* View Toggle */}
                {!isLoading && Object.keys(filteredUpdates).length > 0 && (
                    <div className="mb-4 flex justify-end">
                        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <List className="w-4 h-4" />
                                List View
                            </button>
                            <button
                                onClick={() => setViewMode('calendar')}
                                className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    viewMode === 'calendar'
                                        ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Grid className="w-4 h-4" />
                                Calendar View
                            </button>
                        </div>
                    </div>
                )}

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
                ) : Object.keys(filteredUpdates).length === 0 ? (
                    <div className="text-center py-12">
                        <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No grocery status updates found.</p>
                    </div>
                ) : viewMode === 'calendar' ? (
                    <WeeklyCalendarView
                        selectedDate={selectedDate}
                        onDateSelect={(date) => {
                            setSelectedDate(date);
                            // Find updates for this date's week and open form
                            const selectedDateObj = new Date(date);
                            const monday = getCurrentWeekMonday(selectedDateObj);
                            const weekUpdates = updates.filter(u => u.week_start_date === monday.toISOString().split('T')[0]);
                            if (weekUpdates.length > 0) {
                                setEditing(weekUpdates.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]);
                                setShowForm(true);
                            } else {
                                setEditing({ week_start_date: monday.toISOString().split('T')[0] });
                                setShowForm(true);
                            }
                        }}
                        weekData={(() => {
                            const weekDataMap = {};
                            updates.forEach(update => {
                                const weekStart = new Date(update.week_start_date);
                                for (let i = 0; i < 7; i++) {
                                    const date = new Date(weekStart);
                                    date.setDate(weekStart.getDate() + i);
                                    const dateStr = date.toISOString().split('T')[0];
                                    if (!weekDataMap[dateStr]) {
                                        weekDataMap[dateStr] = {
                                            date: dateStr,
                                            status: update.status,
                                            count: 0,
                                            items_needed: update.items_needed,
                                            created_at: update.created_at,
                                        };
                                    }
                                    weekDataMap[dateStr].count++;
                                    if (new Date(update.created_at) > new Date(weekDataMap[dateStr].created_at || 0)) {
                                        weekDataMap[dateStr].status = update.status;
                                        weekDataMap[dateStr].items_needed = update.items_needed;
                                    }
                                }
                            });
                            return Object.values(weekDataMap);
                        })()}
                        onWeekChange={(mondayDate) => {
                            setWeekFilter(mondayDate);
                        }}
                    />
                ) : (
                    <div className="space-y-6">
                        {Object.entries(filteredUpdates)
                            .sort(([a], [b]) => new Date(b) - new Date(a))
                            .map(([weekStart, weekUpdates]) => (
                                <div key={weekStart} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-[var(--theme-primary)]" />
                                            <h3 className="font-semibold text-gray-900">
                                                Week of {formatWeekRange(weekStart)}
                                            </h3>
                                            <span className="text-sm text-gray-500">
                                                ({weekUpdates.length} update{weekUpdates.length !== 1 ? 's' : ''})
                                            </span>
                                        </div>
                                        {weekUpdates[0]?.branch && (
                                            <span className="text-sm text-gray-600">
                                                {weekUpdates[0].branch.name}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-3">
                                        {weekUpdates
                                            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                            .map((update) => (
                                                <Card key={update.id} className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {getStatusBadge(update.status)}
                                                                <span className="text-sm text-gray-500">
                                                                    Updated by {update.updated_by?.name || 'N/A'} on {new Date(update.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                                                {update.items_needed && (
                                                                    <div>
                                                                        <span className="font-medium text-gray-700">Items Needed:</span>
                                                                        <p className="text-gray-600 mt-1">{update.items_needed}</p>
                                                                    </div>
                                                                )}
                                                                {update.items_received && (
                                                                    <div>
                                                                        <span className="font-medium text-gray-700">Items Received:</span>
                                                                        <p className="text-gray-600 mt-1">{update.items_received}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            {update.notes && (
                                                                <div className="mt-3">
                                                                    <span className="font-medium text-gray-700">Notes:</span>
                                                                    <p className="text-gray-600 mt-1">{update.notes}</p>
                                                                </div>
                                                            )}
                                                            
                                                            {update.completed_at && (
                                                                <div className="mt-2 text-xs text-gray-500">
                                                                    Completed: {new Date(update.completed_at).toLocaleString()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2 ml-4 flex-col sm:flex-row">
                                                            {/* Quick Status Update Buttons */}
                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                {update.status !== 'pending' && (
                                                                    <button
                                                                        onClick={() => handleQuickStatusUpdate(update.id, 'pending')}
                                                                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                                                        title="Mark as Pending"
                                                                    >
                                                                        Pending
                                                                    </button>
                                                                )}
                                                                {update.status !== 'in_progress' && (
                                                                    <button
                                                                        onClick={() => handleQuickStatusUpdate(update.id, 'in_progress')}
                                                                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                                                        title="Mark as In Progress"
                                                                    >
                                                                        In Progress
                                                                    </button>
                                                                )}
                                                                {update.status !== 'completed' && (
                                                                    <button
                                                                        onClick={() => handleQuickStatusUpdate(update.id, 'completed')}
                                                                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                                                        title="Mark as Completed"
                                                                    >
                                                                        Complete
                                                                    </button>
                                                                )}
                                                                {update.status !== 'needs_attention' && (
                                                                    <button
                                                                        onClick={() => handleQuickStatusUpdate(update.id, 'needs_attention')}
                                                                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                                                        title="Mark as Needs Attention"
                                                                    >
                                                                        Needs Attention
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => handleEdit(update)}
                                                                    className="p-2 text-gray-600 hover:text-[var(--theme-primary)] transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                {(!isCaregiver || update.updated_by?.id === currentUser?.id) && (
                                                                    <button
                                                                        onClick={() => handleDelete(update.id)}
                                                                        className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}

function GroceryStatusForm({ record, branches, templates = [], isCaregiver, caregiverBranchId, onClose, onSuccess, onSaveTemplate }) {
    // Get current Monday
    const getCurrentMonday = () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diff));
        return monday.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        branch_id: record?.branch_id || caregiverBranchId || null,
        week_start_date: record?.week_start_date || getCurrentMonday(),
        status: record?.status || 'pending',
        items_needed: record?.items_needed || '',
        items_received: record?.items_received || '',
        notes: record?.notes || '',
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            const payload = { ...formData };
            
            if (record) {
                await api.put(`/grocery-status-updates/${record.id}`, payload);
            } else {
                await api.post('/grocery-status-updates', payload);
            }

            onSuccess();
        } catch (error) {
            console.error('Error saving grocery status update:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: [error.response?.data?.message || 'Failed to save grocery status update'] });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                    {record ? 'Edit Grocery Status Update' : 'Add Grocery Status Update'}
                </h2>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errors.general && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {errors.general[0]}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
                                <Select
                                    value={formData.branch_id?.toString() || undefined}
                                    onValueChange={(value) => setFormData({ ...formData, branch_id: value ? parseInt(value) : null })}
                                    placeholder="Select Branch"
                                    options={branches.map(branch => ({
                                        value: branch.id.toString(),
                                        label: branch.name,
                                    }))}
                                    disabled={isCaregiver}
                                    className="w-full"
                                />
                                {errors.branch_id && <p className="text-xs text-red-600 mt-1">{errors.branch_id[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Apply Template</label>
                                <div className="flex gap-2">
                                    <Select
                                        value={selectedTemplateId}
                                        onValueChange={(value) => setSelectedTemplateId(value || '')}
                                        placeholder="Choose a template"
                                        options={templates.map(t => ({
                                            value: t.id.toString(),
                                            label: t.name + (t.category ? ` (${t.category})` : ''),
                                        }))}
                                        className="w-full"
                                        disabled={!templates.length}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!selectedTemplateId) return;
                                            const tpl = templates.find(t => t.id === Number(selectedTemplateId));
                                            if (tpl) {
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    branch_id: tpl.branch_id || prev.branch_id,
                                                    items_needed: tpl.items_list || prev.items_needed,
                                                }));
                                                toast.success('Template applied');
                                            }
                                        }}
                                        className="px-3 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg disabled:opacity-50"
                                        disabled={!selectedTemplateId}
                                    >
                                        Apply
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Templates prefill items needed for a week.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Week Start Date (Monday) *</label>
                                <input
                                    type="date"
                                    value={formData.week_start_date}
                                    onChange={(e) => {
                                        const date = new Date(e.target.value);
                                        // adjust to Monday
                                        const day = date.getDay();
                                        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
                                        const monday = new Date(date.setDate(diff));
                                        setFormData({ ...formData, week_start_date: monday.toISOString().split('T')[0] });
                                    }}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1">Select any date in the week - it will be adjusted to Monday</p>
                                {errors.week_start_date && <p className="text-xs text-red-600 mt-1">{errors.week_start_date[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="needs_attention">Needs Attention</option>
                                </select>
                                {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status[0]}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Items Needed</label>
                            <textarea
                                value={formData.items_needed}
                                onChange={(e) => setFormData({ ...formData, items_needed: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                placeholder="List items that are needed..."
                            />
                            {errors.items_needed && <p className="text-xs text-red-600 mt-1">{errors.items_needed[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Items Received</label>
                            <textarea
                                value={formData.items_received}
                                onChange={(e) => setFormData({ ...formData, items_received: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                placeholder="List items that have been received..."
                            />
                            {errors.items_received && <p className="text-xs text-red-600 mt-1">{errors.items_received[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                placeholder="Enter any additional notes..."
                            />
                            {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes[0]}</p>}
                        </div>

                        {!isCaregiver && onSaveTemplate && (
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!formData.branch_id || !formData.items_needed) {
                                            toast.error('Branch and items needed are required to save a template.');
                                            return;
                                        }
                                        await onSaveTemplate({
                                            branch_id: Number(formData.branch_id),
                                            name: 'Grocery Template',
                                            items_list: formData.items_needed,
                                            category: 'general',
                                        });
                                    }}
                                    className="px-4 py-2 border border-[var(--theme-primary)] text-[var(--theme-primary)] rounded-lg hover:bg-[var(--theme-primary-bg-light)]"
                                >
                                    Save as Template
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
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

