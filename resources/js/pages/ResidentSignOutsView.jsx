import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Users, User, Calendar, Search, Filter, Download, MapPin, Clock, AlertCircle } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/ui/EmptyState';
import { format } from 'date-fns';

export default function ResidentSignOutsView() {
    const [search, setSearch] = useState('');
    const [selectedResident, setSelectedResident] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [page, setPage] = useState(1);

    // Fetch all residents (for filter dropdown)
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list'],
        queryFn: async () => {
            const response = await api.get('/residents', {
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

    // Fetch resident sign-outs with filters
    const { data: signOutsData, isLoading, error } = useQuery({
        queryKey: ['residents-sign-outs-all', page, selectedResident, selectedBranch, statusFilter, dateFrom, dateTo, search],
        queryFn: async () => {
            const params = {
                per_page: 50,
                page: page,
            };
            
            if (selectedResident) params.resident_id = selectedResident;
            if (selectedBranch) params.branch_id = selectedBranch;
            if (statusFilter !== '') params.is_active = statusFilter === 'active';
            if (dateFrom) params.start_date = dateFrom;
            if (dateTo) params.end_date = dateTo;
            if (search) params.search = search;
            
            const response = await api.get('/residents/sign-outs/history', { params });
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

    const signOuts = signOutsData?.data || [];
    const pagination = signOutsData?.meta || { total: 0, from: 0, to: 0, last_page: 1, current_page: 1 };

    const clearFilters = () => {
        setSelectedResident('');
        setSelectedBranch('');
        setStatusFilter('');
        setDateFrom('');
        setDateTo('');
        setSearch('');
        setPage(1);
    };

    const exportData = () => {
        const headers = ['Resident', 'Branch', 'Destination', 'Purpose', 'Sign Out', 'Sign In', 'Expected Return', 'Duration', 'Status', 'Accompanied By'];
        const rows = signOuts.map(so => {
            const signOut = so.sign_out_at ? format(new Date(so.sign_out_at), 'MM/dd/yyyy HH:mm') : '';
            const signIn = so.sign_in_at ? format(new Date(so.sign_in_at), 'MM/dd/yyyy HH:mm') : '';
            const expectedReturn = so.expected_return_at ? format(new Date(so.expected_return_at), 'MM/dd/yyyy HH:mm') : '';
            let duration = 'N/A';
            if (so.sign_out_at && so.sign_in_at) {
                const hours = Math.floor((new Date(so.sign_in_at) - new Date(so.sign_out_at)) / (1000 * 60 * 60));
                const minutes = Math.floor(((new Date(so.sign_in_at) - new Date(so.sign_out_at)) % (1000 * 60 * 60)) / (1000 * 60));
                duration = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            } else if (so.sign_out_at && so.is_active) {
                const hours = Math.floor((new Date() - new Date(so.sign_out_at)) / (1000 * 60 * 60));
                const minutes = Math.floor(((new Date() - new Date(so.sign_out_at)) % (1000 * 60 * 60)) / (1000 * 60));
                duration = hours > 0 ? `${hours}h ${minutes}m (ongoing)` : `${minutes}m (ongoing)`;
            }
            
            return [
                so.resident?.name || 'N/A',
                so.branch?.name || 'N/A',
                so.destination || '',
                so.purpose || '',
                signOut,
                signIn || '-',
                expectedReturn || '-',
                duration,
                so.is_active ? 'Active' : 'Returned',
                so.accompanied_by || ''
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
        a.download = `resident-sign-outs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getStatusBadge = (signOut) => {
        if (signOut.is_active) {
            const expectedReturn = signOut.expected_return_at ? new Date(signOut.expected_return_at) : null;
            const isOverdue = expectedReturn && new Date() > expectedReturn;
            
            if (isOverdue) {
                return (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Overdue
                    </span>
                );
            }
            return (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Active
                </span>
            );
        }
        return (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                Returned
            </span>
        );
    };

    const getDuration = (signOut) => {
        if (signOut.sign_out_at && signOut.sign_in_at) {
            const hours = Math.floor((new Date(signOut.sign_in_at) - new Date(signOut.sign_out_at)) / (1000 * 60 * 60));
            const minutes = Math.floor(((new Date(signOut.sign_in_at) - new Date(signOut.sign_out_at)) % (1000 * 60 * 60)) / (1000 * 60));
            return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        } else if (signOut.sign_out_at && signOut.is_active) {
            const hours = Math.floor((new Date() - new Date(signOut.sign_out_at)) / (1000 * 60 * 60));
            const minutes = Math.floor(((new Date() - new Date(signOut.sign_out_at)) % (1000 * 60 * 60)) / (1000 * 60));
            return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
        return 'N/A';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Resident Sign-Outs</h1>
                    <p className="text-sm text-gray-600 mt-1">View and manage all resident sign-out/in records</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportData}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
                                Search Resident
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
                                    placeholder="Search by name..."
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Resident
                            </label>
                            <select
                                value={selectedResident}
                                onChange={(e) => {
                                    setSelectedResident(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Residents</option>
                                {residentsData?.map((resident) => (
                                    <option key={resident.id} value={resident.id}>
                                        {resident.name}
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Status</option>
                                <option value="active">Active (Out)</option>
                                <option value="completed">Returned</option>
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        <Users className="w-8 h-8 text-blue-500" />
                    </div>
                </SectionCard>
                <SectionCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Active Sign-Outs</p>
                            <p className="text-2xl font-bold text-orange-600 mt-1">
                                {signOuts.filter(so => so.is_active).length}
                            </p>
                        </div>
                        <User className="w-8 h-8 text-orange-500" />
                    </div>
                </SectionCard>
                <SectionCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Showing</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                                {signOuts.length} of {pagination.total || 0}
                            </p>
                        </div>
                        <Calendar className="w-8 h-8 text-purple-500" />
                    </div>
                </SectionCard>
            </div>

            {/* Sign-Outs Table */}
            <SectionCard>
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Loading sign-outs...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-gray-900 mb-2">Error Loading Sign-Outs</p>
                        <p className="text-sm text-gray-600 mb-4">
                            {error.response?.data?.message || error.message || 'An error occurred while loading sign-out records.'}
                        </p>
                        {error.response?.status === 403 && (
                            <p className="text-sm text-gray-500">
                                Admin access is required to view resident sign-out history.
                            </p>
                        )}
                    </div>
                ) : signOuts.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No Sign-Outs Found"
                        description="No resident sign-out records match your filters. Try adjusting your filters or check if there are any sign-out records in the system."
                    />
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Resident</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Branch</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Destination</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Purpose</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sign Out</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sign In</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Expected Return</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Duration</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {signOuts.map((signOut) => {
                                        const expectedReturn = signOut.expected_return_at ? new Date(signOut.expected_return_at) : null;
                                        const isOverdue = expectedReturn && new Date() > expectedReturn && signOut.is_active;
                                        
                                        return (
                                            <tr 
                                                key={signOut.id} 
                                                className={`border-b border-gray-100 hover:bg-gray-50 ${
                                                    isOverdue ? 'bg-red-50' : ''
                                                }`}
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                        <span className="font-medium text-gray-900">
                                                            {signOut.resident?.name || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600">
                                                    {signOut.branch?.name || 'N/A'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600">
                                                    {signOut.destination || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600">
                                                    {signOut.purpose || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600">
                                                    {signOut.sign_out_at 
                                                        ? format(new Date(signOut.sign_out_at), 'MM/dd/yyyy HH:mm')
                                                        : 'N/A'
                                                    }
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600">
                                                    {signOut.sign_in_at 
                                                        ? format(new Date(signOut.sign_in_at), 'MM/dd/yyyy HH:mm')
                                                        : <span className="text-gray-400">-</span>
                                                    }
                                                </td>
                                                <td className={`py-3 px-4 text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                                                    {expectedReturn 
                                                        ? format(expectedReturn, 'MM/dd/yyyy HH:mm')
                                                        : <span className="text-gray-400">-</span>
                                                    }
                                                </td>
                                                <td className="py-3 px-4 text-sm font-medium text-gray-900">
                                                    {getDuration(signOut)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {getStatusBadge(signOut)}
                                                </td>
                                            </tr>
                                        );
                                    })}
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

