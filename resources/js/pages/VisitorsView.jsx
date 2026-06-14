import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { UserPlus, User, Calendar, Search, Filter, Download, MapPin, Clock, AlertCircle } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/ui/EmptyState';
import { format } from 'date-fns';

export default function VisitorsView() {
    const [search, setSearch] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);
    const controlClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]';
    const iconInputClass = 'w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]';

    // Fetch all branches (for filter dropdown)
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches');
            return response.data?.data || [];
        },
    });

    // Fetch visitors with filters
    const { data: visitorsData, isLoading, error } = useQuery({
        queryKey: ['visitors-all', page, selectedBranch, statusFilter, dateFrom, dateTo, search],
        queryFn: async () => {
            const params = {
                per_page: 50,
                page: page,
            };
            
            if (selectedBranch) params.branch_id = selectedBranch;
            if (statusFilter !== '') params.is_active = statusFilter === 'active';
            if (dateFrom) params.start_date = dateFrom;
            if (dateTo) params.end_date = dateTo;
            if (search) params.search = search;
            
            const response = await api.get('/visitors', { params });
            // Handle paginated response - Laravel pagination returns data in 'data' key and meta separately
            if (response.data && Array.isArray(response.data)) {
                // If it's a direct array (non-paginated)
                return {
                    data: response.data,
                    meta: { total: response.data.length, from: 1, to: response.data.length, last_page: 1, current_page: 1 },
                };
            }
            // Standard Laravel pagination format
            return {
                data: response.data?.data || [],
                meta: {
                    total: response.data?.total || 0,
                    from: response.data?.from || 0,
                    to: response.data?.to || 0,
                    last_page: response.data?.last_page || 1,
                    current_page: response.data?.current_page || 1,
                },
            };
        },
        retry: 1,
    });

    const visitors = visitorsData?.data || [];
    const pagination = visitorsData?.meta || { total: 0, from: 0, to: 0, last_page: 1, current_page: 1 };

    const clearFilters = () => {
        setSelectedBranch('');
        setStatusFilter('');
        setDateFrom('');
        setDateTo('');
        setSearch('');
        setPage(1);
    };

    const exportData = () => {
        const headers = ['Visitor Name', 'Email', 'Phone', 'Branch', 'Visiting', 'Purpose', 'Check In', 'Check Out', 'Duration', 'Status'];
        const rows = visitors.map(v => {
            const checkIn = v.check_in_at ? format(new Date(v.check_in_at), 'MM/dd/yyyy HH:mm') : '';
            const checkOut = v.check_out_at ? format(new Date(v.check_out_at), 'MM/dd/yyyy HH:mm') : '';
            let duration = 'N/A';
            if (v.check_in_at && v.check_out_at) {
                const hours = Math.floor((new Date(v.check_out_at) - new Date(v.check_in_at)) / (1000 * 60 * 60));
                const minutes = Math.floor(((new Date(v.check_out_at) - new Date(v.check_in_at)) % (1000 * 60 * 60)) / (1000 * 60));
                duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            } else if (v.check_in_at && v.is_active) {
                const hours = Math.floor((new Date() - new Date(v.check_in_at)) / (1000 * 60 * 60));
                const minutes = Math.floor(((new Date() - new Date(v.check_in_at)) % (1000 * 60 * 60)) / (1000 * 60));
                duration = hours > 0 ? `${hours}h ${minutes}m (ongoing)` : `${minutes}m (ongoing)`;
            }
            
            return [
                `${v.first_name} ${v.last_name}`,
                v.email || '',
                v.phone || '',
                v.branch?.name || '',
                v.visiting_resident?.name || v.visiting_staff?.name || 'N/A',
                v.visit_purpose || '',
                checkIn,
                checkOut || '-',
                duration,
                v.is_active ? 'Active' : 'Checked Out'
            ];
        });

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visitors-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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
                Checked Out
            </span>
        );
    };

    const getDuration = (visitor) => {
        if (visitor.check_in_at && visitor.check_out_at) {
            const hours = Math.floor((new Date(visitor.check_out_at) - new Date(visitor.check_in_at)) / (1000 * 60 * 60));
            const minutes = Math.floor(((new Date(visitor.check_out_at) - new Date(visitor.check_in_at)) % (1000 * 60 * 60)) / (1000 * 60));
            return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        } else if (visitor.check_in_at && visitor.is_active) {
            const hours = Math.floor((new Date() - new Date(visitor.check_in_at)) / (1000 * 60 * 60));
            const minutes = Math.floor(((new Date() - new Date(visitor.check_in_at)) % (1000 * 60 * 60)) / (1000 * 60));
            return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
        return 'N/A';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">All Visitors</h1>
                    <p className="text-sm text-gray-600 mt-1">View and manage all visitor check-in/out records</p>
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
                                Search
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    placeholder="Search by name, email, phone..."
                                    className={iconInputClass}
                                />
                            </div>
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
                                <option value="completed">Checked Out</option>
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
                        <UserPlus className="w-8 h-8 text-blue-500" />
                    </div>
                </SectionCard>
                <SectionCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Active Visitors</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">
                                {visitors.filter(v => v.is_active).length}
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
                                {visitors.length} of {pagination.total || 0}
                            </p>
                        </div>
                        <Calendar className="w-8 h-8 text-purple-500" />
                    </div>
                </SectionCard>
            </div>

            {/* Visitors Table */}
            <SectionCard>
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)] mx-auto"></div>
                        <p className="text-gray-600 mt-4">Loading visitors...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-gray-900 mb-2">Error Loading Visitors</p>
                        <p className="text-sm text-gray-600">
                            {error.response?.data?.message || error.message || 'An error occurred while loading visitor records.'}
                        </p>
                    </div>
                ) : visitors.length === 0 ? (
                    <EmptyState
                        icon={UserPlus}
                        title="No Visitors Found"
                        description="No visitor records match your filters. Try adjusting your filters or check if there are any visitor records in the system."
                    />
                ) : (
                    <>
                        <div className="md:hidden space-y-3">
                            {visitors.map((visitor) => (
                                <div key={visitor.id} className="border border-gray-200 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {visitor.first_name} {visitor.last_name}
                                            </p>
                                            <p className="text-xs text-gray-500">{visitor.branch?.name || 'N/A'}</p>
                                        </div>
                                        {getStatusBadge(visitor.is_active)}
                                    </div>

                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Contact</p>
                                            <p className="text-gray-900">{visitor.email || '-'}</p>
                                            <p className="text-gray-500">{visitor.phone || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Visiting</p>
                                            <p className="text-gray-900">{visitor.visiting_resident?.name || visitor.visiting_staff?.name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Purpose</p>
                                            <p className="text-gray-900">{visitor.visit_purpose || '-'}</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-gray-500">Check In</p>
                                                <p className="text-gray-900">
                                                    {visitor.check_in_at ? format(new Date(visitor.check_in_at), 'MM/dd/yyyy HH:mm') : 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wide text-gray-500">Check Out</p>
                                                <p className="text-gray-900">
                                                    {visitor.check_out_at ? format(new Date(visitor.check_out_at), 'MM/dd/yyyy HH:mm') : '-'}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Duration</p>
                                            <p className="font-medium text-gray-900">{getDuration(visitor)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Visitor</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contact</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Branch</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Visiting</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Purpose</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Check In</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Check Out</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Duration</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visitors.map((visitor) => (
                                        <tr key={visitor.id} className="border-b border-gray-100 hover:bg-gray-50">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <span className="font-medium text-gray-900">
                                                        {visitor.first_name} {visitor.last_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                <div>{visitor.email || '-'}</div>
                                                <div className="text-xs text-gray-500">{visitor.phone || '-'}</div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {visitor.branch?.name || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {visitor.visiting_resident?.name || visitor.visiting_staff?.name || 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {visitor.visit_purpose || '-'}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {visitor.check_in_at 
                                                    ? format(new Date(visitor.check_in_at), 'MM/dd/yyyy HH:mm')
                                                    : 'N/A'
                                                }
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">
                                                {visitor.check_out_at 
                                                    ? format(new Date(visitor.check_out_at), 'MM/dd/yyyy HH:mm')
                                                    : <span className="text-gray-400">-</span>
                                                }
                                            </td>
                                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                                {getDuration(visitor)}
                                            </td>
                                            <td className="py-3 px-4">
                                                {getStatusBadge(visitor.is_active)}
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

