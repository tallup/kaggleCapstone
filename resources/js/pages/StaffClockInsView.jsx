import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Clock, User, Calendar, Search, Filter, Download, MapPin } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/ui/EmptyState';
import { format } from 'date-fns';
import { useStaffClockUpdates } from '../hooks/useRealtimeUpdates';
import logger from '../utils/logger';

export default function StaffClockInsView() {
    const [search, setSearch] = useState('');
    const [selectedStaff, setSelectedStaff] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        api.get('/user')
            .then((r) => setCurrentUser(r.data))
            .catch((e) => logger.error('Failed to fetch user:', e));
    }, []);

    // Real-time: update table immediately when staff clock in or out
    useStaffClockUpdates(currentUser?.facility_id, { showToast: true });
    const controlClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]';
    const iconInputClass = 'w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]';

    // Fetch all staff members (for filter dropdown)
    const { data: staffData } = useQuery({
        queryKey: ['staff-list'],
        queryFn: async () => {
            const response = await api.get('/users', {
                params: { per_page: 1000 }
            });
            return response.data?.data || [];
        },
    });

    // Fetch all branches (for filter dropdown)
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches');
            return response.data?.data || [];
        },
    });

    // Fetch clock-ins with filters
    const { data: clockInsData, isLoading } = useQuery({
        queryKey: ['staff-clock-ins-all', page, selectedStaff, selectedBranch, statusFilter, dateFrom, dateTo, search],
        queryFn: async () => {
            const params = {
                per_page: 50,
                page: page,
            };
            
            if (selectedStaff) params.staff_id = selectedStaff;
            if (selectedBranch) params.branch_id = selectedBranch;
            if (statusFilter !== '') params.is_active = statusFilter === 'active';
            if (dateFrom) params.start_date = dateFrom;
            if (dateTo) params.end_date = dateTo;
            
            const response = await api.get('/staff/clock-ins', { params });
            return response.data;
        },
    });

    const clockIns = clockInsData?.data || [];
    const pagination = clockInsData || {};

    // Filter by search term (client-side for staff name)
    const filteredClockIns = search
        ? clockIns.filter(clockIn => 
            clockIn.staff?.name?.toLowerCase().includes(search.toLowerCase())
        )
        : clockIns;

    const clearFilters = () => {
        setSelectedStaff('');
        setSelectedBranch('');
        setStatusFilter('');
        setDateFrom('');
        setDateTo('');
        setSearch('');
        setPage(1);
    };

    const exportData = () => {
        // Simple CSV export
        const headers = ['Staff', 'Branch', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Method'];
        const rows = filteredClockIns.map(ci => [
            ci.staff?.name || '',
            ci.branch?.name || '',
            ci.clock_in_at ? format(new Date(ci.clock_in_at), 'MM/dd/yyyy HH:mm') : '',
            ci.clock_out_at ? format(new Date(ci.clock_out_at), 'MM/dd/yyyy HH:mm') : '',
            ci.total_hours || '0',
            ci.is_active ? 'Active' : 'Completed',
            ci.clock_method || ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `staff-clock-ins-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getStatusBadge = (isActive) => {
        if (isActive) {
            return (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                </span>
            );
        }
        return (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                Completed
            </span>
        );
    };

    const getMethodBadge = (method) => {
        if (method === 'public') {
            return (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Public
                </span>
            );
        }
        return (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    Authenticated
                </span>
        );
    };

    const formatDateTime = (value) => {
        if (!value) return 'N/A';
        try {
            return format(new Date(value), 'MM/dd/yyyy HH:mm');
        } catch (_) {
            return 'N/A';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Staff Clock-Ins</h1>
                    <p className="text-sm text-gray-600 mt-1">View and manage all staff clock-in/out records</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={exportData}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                    </button>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <SectionCard>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Search Staff
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name..."
                                    className={iconInputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Staff Member
                            </label>
                            <select
                                value={selectedStaff}
                                onChange={(e) => {
                                    setSelectedStaff(e.target.value);
                                    setPage(1);
                                }}
                                className={controlClass}
                            >
                                <option value="">All Staff</option>
                                {staffData?.map((staff) => (
                                    <option key={staff.id} value={staff.id}>
                                        {staff.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Branch
                            </label>
                            <select
                                value={selectedBranch}
                                onChange={(e) => {
                                    setSelectedBranch(e.target.value);
                                    setPage(1);
                                }}
                                className={controlClass}
                            >
                                <option value="">All Branches</option>
                                {branchesData?.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {branch.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                }}
                                className={controlClass}
                            >
                                <option value="">All Status</option>
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                From Date
                            </label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => {
                                    setDateFrom(e.target.value);
                                    setPage(1);
                                }}
                                className={controlClass}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                To Date
                            </label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => {
                                    setDateTo(e.target.value);
                                    setPage(1);
                                }}
                                className={controlClass}
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </SectionCard>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SectionCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Records</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {pagination.total || 0}
                            </p>
                        </div>
                        <Clock className="w-8 h-8 text-blue-500" />
                    </div>
                </SectionCard>
                <SectionCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Active Clock-Ins</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">
                                {filteredClockIns.filter(ci => ci.is_active).length}
                            </p>
                        </div>
                        <User className="w-8 h-8 text-green-500" />
                    </div>
                </SectionCard>
                <SectionCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Showing</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {filteredClockIns.length} of {pagination.total || 0}
                            </p>
                        </div>
                        <Calendar className="w-8 h-8 text-purple-500" />
                    </div>
                </SectionCard>
            </div>

            {/* Clock-Ins Table */}
            <SectionCard>
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)] mx-auto"></div>
                        <p className="text-gray-600 mt-4">Loading clock-ins...</p>
                    </div>
                ) : filteredClockIns.length === 0 ? (
                    <EmptyState
                        icon={Clock}
                        title="No Clock-Ins Found"
                        description="No clock-in records match your filters."
                    />
                ) : (
                    <>
                        <div className="md:hidden space-y-3">
                            {filteredClockIns.map((clockIn) => (
                                <div key={clockIn.id} className="border border-gray-200 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">{clockIn.staff?.name || 'N/A'}</p>
                                            <p className="text-xs text-gray-500">{clockIn.branch?.name || 'N/A'}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(clockIn.is_active)}
                                            {getMethodBadge(clockIn.clock_method)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Clock In</p>
                                            <p className="text-gray-900">{formatDateTime(clockIn.clock_in_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Clock Out</p>
                                            <p className="text-gray-900">{clockIn.clock_out_at ? formatDateTime(clockIn.clock_out_at) : '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Hours</p>
                                            <p className="font-medium text-gray-900">
                                                {clockIn.total_hours
                                                    ? `${clockIn.total_hours} hrs`
                                                    : clockIn.is_active
                                                        ? 'In Progress'
                                                        : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Staff</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Branch</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Clock In</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Clock Out</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hours</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Method</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClockIns.map((clockIn) => (
                                        <tr key={clockIn.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <span className="font-medium text-gray-900">
                                                        {clockIn.staff?.name || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {clockIn.branch?.name || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {formatDateTime(clockIn.clock_in_at)}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {clockIn.clock_out_at ? formatDateTime(clockIn.clock_out_at) : <span className="text-gray-400">-</span>}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                                {clockIn.total_hours 
                                                    ? `${clockIn.total_hours} hrs`
                                                    : clockIn.is_active 
                                                        ? <span className="text-blue-600">In Progress</span>
                                                        : 'N/A'
                                                }
                                            </td>
                                            <td className="py-3 px-4">
                                                {getStatusBadge(clockIn.is_active)}
                                            </td>
                                            <td className="py-3 px-4">
                                                {getMethodBadge(clockIn.clock_method)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.last_page > 1 && (
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                                <div className="text-sm text-gray-600">
                                    Showing {pagination.from || 0} to {pagination.to || 0} of {pagination.total || 0} results
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-600">
                                        Page {page} of {pagination.last_page || 1}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(pagination.last_page || 1, p + 1))}
                                        disabled={page >= (pagination.last_page || 1)}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </SectionCard>
        </div>
    );
}























