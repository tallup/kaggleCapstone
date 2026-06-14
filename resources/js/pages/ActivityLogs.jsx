import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { 
    FileText, Search, Filter, Calendar, User, Activity, 
    Clock, ChevronDown, ChevronUp, Eye
} from 'lucide-react';

export default function ActivityLogsPage() {
    const [search, setSearch] = useState('');
    const [logTypeFilter, setLogTypeFilter] = useState('');
    const [eventFilter, setEventFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateUntil, setDateUntil] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedLog, setExpandedLog] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ['activity-logs', search, logTypeFilter, eventFilter, userFilter, branchFilter, dateFrom, dateUntil, currentPage],
        queryFn: async () => {
            const params = {
                per_page: 20,
                page: currentPage,
            };
            if (search) params.search = search;
            if (logTypeFilter) params.log_type = logTypeFilter;
            if (eventFilter) params.event = eventFilter;
            if (userFilter) params.user_id = userFilter;
            if (branchFilter) params.branch_id = branchFilter;
            if (dateFrom) params.logged_from = dateFrom;
            if (dateUntil) params.logged_until = dateUntil;

            const response = await api.get('/activity-logs', { params });
            return response.data;
        },
        refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
        refetchOnWindowFocus: true, // Refetch when window gains focus
    });

    const { data: usersData } = useQuery({
        queryKey: ['users-for-logs'],
        queryFn: async () => (await api.get('/users', { params: { per_page: 100 } })).data,
    });

    const { data: branchesData } = useQuery({
        queryKey: ['branches-for-logs'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    const getLogTypeColor = (type) => {
        switch (type) {
            case 'activity': return 'bg-blue-100 text-blue-800';
            case 'audit': return 'bg-yellow-100 text-yellow-800';
            case 'error': return 'bg-red-100 text-red-800';
            case 'system': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getEventColor = (event) => {
        switch (event) {
            case 'created': return 'bg-green-100 text-green-800';
            case 'updated': return 'bg-blue-100 text-blue-800';
            case 'deleted': return 'bg-red-100 text-red-800';
            case 'viewed': return 'bg-gray-100 text-gray-800';
            case 'login': return 'bg-green-100 text-green-800';
            case 'logout': return 'bg-gray-100 text-gray-800';
            default: return 'bg-indigo-100 text-indigo-800';
        }
    };

    const formatRole = (role) => {
        if (!role) return 'N/A';
        // Convert role to a more readable format
        return role.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleClearFilters = () => {
        setSearch('');
        setLogTypeFilter('');
        setEventFilter('');
        setUserFilter('');
        setBranchFilter('');
        setDateFrom('');
        setDateUntil('');
        setCurrentPage(1);
    };

    React.useEffect(() => {
        setCurrentPage(1);
    }, [search, logTypeFilter, eventFilter, userFilter, branchFilter, dateFrom, dateUntil]);

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Error loading activity logs: {error.message}</p>
            </div>
        );
    }

    return (
        <div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">Activity Logs</h2>
                            {!isLoading && (
                                <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                    Live
                                </span>
                            )}
                        </div>
                        <p className="text-gray-600">View and filter system activity and audit logs (updates every 5 seconds)</p>
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                    >
                        <Filter className="w-4 h-4" />
                        <span>Filters</span>
                        {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search logs by description, event, or user..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                    />
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Log Type</label>
                            <select
                                value={logTypeFilter}
                                onChange={(e) => setLogTypeFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            >
                                <option value="">All Types</option>
                                <option value="activity">Activity</option>
                                <option value="audit">Audit</option>
                                <option value="error">Error</option>
                                <option value="system">System</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
                            <select
                                value={eventFilter}
                                onChange={(e) => setEventFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            >
                                <option value="">All Events</option>
                                <option value="created">Created</option>
                                <option value="updated">Updated</option>
                                <option value="deleted">Deleted</option>
                                <option value="viewed">Viewed</option>
                                <option value="login">Login</option>
                                <option value="logout">Logout</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                            <select
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            >
                                <option value="">All Users</option>
                                {usersData?.data?.map(user => (
                                    <option key={user.id} value={user.id}>{user.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                            <select
                                value={branchFilter}
                                onChange={(e) => setBranchFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            >
                                <option value="">All Branches</option>
                                {branchesData?.data?.map(branch => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                            <input
                                type="date"
                                value={dateUntil}
                                onChange={(e) => setDateUntil(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={handleClearFilters}
                                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Logs Table */}
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                        <p className="mt-4 text-gray-600">Loading activity logs...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {data?.data?.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                                            <p>No activity logs found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    data?.data?.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                <div className="flex items-center">
                                                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                                    {formatDate(log.logged_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.user ? (
                                                    <div className="flex items-center">
                                                        <User className="w-4 h-4 mr-2 text-gray-400" />
                                                        {log.user.name}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">System</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {log.user?.role ? (
                                                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">
                                                        {formatRole(log.user.role)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLogTypeColor(log.log_type)}`}>
                                                    {log.log_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getEventColor(log.event)}`}>
                                                    {log.event}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-sm text-gray-900">
                                                <div className="max-w-xs truncate" title={log.description}>
                                                    {log.description}
                                                </div>
                                                {log.subject_type && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {log.subject_type.split('\\').pop()} {log.subject_id}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-right">
                                                <button
                                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                                    className="px-3 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center gap-2 font-medium"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    {expandedLog === log.id ? 'Hide' : 'View'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Expanded Log Details */}
                        {expandedLog && data?.data?.find(log => log.id === expandedLog) && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                {(() => {
                                    const log = data.data.find(l => l.id === expandedLog);
                                    return (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Branch</h4>
                                                    <p className="text-sm text-gray-900">{log.branch?.name || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-1">IP Address</h4>
                                                    <p className="text-sm text-gray-900">{log.ip_address || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Subject Type</h4>
                                                    <p className="text-sm text-gray-900">{log.subject_type ? log.subject_type.split('\\').pop() : 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Subject ID</h4>
                                                    <p className="text-sm text-gray-900">{log.subject_id || 'N/A'}</p>
                                                </div>
                                            </div>
                                            {log.properties && Object.keys(log.properties).length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Properties</h4>
                                                    <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                                                        {JSON.stringify(log.properties, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {log.context && Object.keys(log.context).length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Context</h4>
                                                    <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                                                        {JSON.stringify(log.context, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Pagination */}
                        {data?.last_page > 1 && (
                            <div className="mt-6 flex items-center justify-between">
                                <div className="text-sm text-gray-700">
                                    Showing {data.from} to {data.to} of {data.total} results
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(data.last_page, p + 1))}
                                        disabled={currentPage === data.last_page}
                                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

