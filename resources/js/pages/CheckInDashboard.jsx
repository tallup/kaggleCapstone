import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { clearStoredAuth } from '../services/api';
import {
    clearCachedCurrentUser,
    clearFacilityBrandingStash,
    CURRENT_USER_QUERY_KEY,
    currentUserQueryOptions,
} from '../queries/currentUser';
import { 
    Clock, 
    User, 
    Users, 
    MapPin, 
    Calendar, 
    AlertCircle,
    CheckCircle,
    XCircle,
    RefreshCw,
    TrendingUp,
    Timer,
    ArrowRight,
    Download,
    Filter,
    Search,
    X,
    Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { getUserLocation } from '../utils/location';
import logger from '../utils/logger';
import { useToastContext } from '../contexts/ToastContext';

// Helper function to calculate time difference in minutes
const getTimeDifference = (startTime) => {
    if (!startTime) return 0;
    const start = new Date(startTime);
    const now = new Date();
    return Math.floor((now - start) / (1000 * 60)); // Return minutes
};

// Helper function to format duration
const formatDuration = (minutes) => {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Progress bar component
const ProgressBar = ({ value, max, color = 'var(--theme-primary)', label }) => {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    
    return (
        <div className="w-full">
            {label && (
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                    <span className="text-xs font-semibold" style={{ color }}>{formatDuration(value)}</span>
                </div>
            )}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                        width: `${percentage}%`,
                        backgroundColor: color,
                    }}
                />
            </div>
        </div>
    );
};

export default function CheckInDashboard() {
    const toast = useToastContext();
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    useQuery(currentUserQueryOptions);
    const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
    
    // History filters
    const [showHistory, setShowHistory] = useState(false);
    const [historyFilters, setHistoryFilters] = useState({
        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
        end_date: new Date().toISOString().split('T')[0], // Today
        resident_id: '',
        branch_id: '',
        is_active: '',
        search: '',
        page: 1,
    });

    // Fetch active staff clock-ins
    const { data: activeClockIns, isLoading: clockInsLoading } = useQuery({
        queryKey: ['staff-clock-ins-active'],
        queryFn: async () => {
            const response = await api.get('/staff/clock-ins', {
                params: { 
                    is_active: true,
                    per_page: 100 
                }
            });
            // Handle paginated response
            return response.data?.data || response.data || [];
        },
        refetchInterval: refreshInterval,
        staleTime: 10000,
    });

    // Fetch active resident sign-outs
    const { data: activeSignOuts, isLoading: signOutsLoading } = useQuery({
        queryKey: ['residents-sign-outs-active'],
        queryFn: async () => {
            const response = await api.get('/residents/sign-outs/active', {
                params: { per_page: 100 }
            });
            // Handle paginated response
            return response.data?.data || response.data || [];
        },
        refetchInterval: refreshInterval,
        staleTime: 10000,
    });

    // Fetch active visitors
    const { data: activeVisitors, isLoading: visitorsLoading } = useQuery({
        queryKey: ['visitors-active'],
        queryFn: async () => {
            const response = await api.get('/visitors/active');
            // Handle paginated response
            return response.data?.data || response.data || [];
        },
        refetchInterval: refreshInterval,
        staleTime: 10000,
    });

    // Calculate stats
    const stats = React.useMemo(() => {
        const clockIns = activeClockIns || [];
        const signOuts = activeSignOuts || [];
        const visitors = activeVisitors || [];

        return {
            totalStaff: clockIns.length,
            totalResidents: signOuts.length,
            totalVisitors: visitors.length,
            overdueResidents: signOuts.filter(so => {
                if (!so.expected_return_at) return false;
                return new Date(so.expected_return_at) < new Date();
            }).length,
        };
    }, [activeClockIns, activeSignOuts, activeVisitors]);

    // Fetch resident sign-out history
    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['residents-sign-outs-history', historyFilters],
        queryFn: async () => {
            const params = { ...historyFilters };
            // Remove empty values
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });
            const response = await api.get('/residents/sign-outs/history', { params });
            // Handle paginated response
            return {
                data: response.data?.data || response.data || [],
                meta: response.data?.meta || null,
            };
        },
        enabled: showHistory,
        staleTime: 30000,
    });

    // Fetch residents and branches for filters
    const { data: residents } = useQuery({
        queryKey: ['residents-list'],
        queryFn: async () => {
            const response = await api.get('/residents', { params: { per_page: 1000 } });
            return response.data?.data || response.data || [];
        },
        staleTime: 300000, // 5 minutes
    });

    const { data: branches } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 1000 } });
            return response.data?.data || response.data || [];
        },
        staleTime: 300000, // 5 minutes
    });

    // Auto-refresh time calculations every minute
    useEffect(() => {
        const interval = setInterval(() => {
            queryClient.invalidateQueries(['staff-clock-ins-active']);
            queryClient.invalidateQueries(['residents-sign-outs-active']);
            queryClient.invalidateQueries(['visitors-active']);
            if (showHistory) {
                queryClient.invalidateQueries(['residents-sign-outs-history']);
            }
        }, 60000); // Refresh every minute

        return () => clearInterval(interval);
    }, [queryClient, showHistory]);

    const handleRefresh = () => {
        queryClient.invalidateQueries(['staff-clock-ins-active']);
        queryClient.invalidateQueries(['residents-sign-outs-active']);
        queryClient.invalidateQueries(['visitors-active']);
        if (showHistory) {
            queryClient.invalidateQueries(['residents-sign-outs-history']);
        }
    };

    // Staff clock-out mutation (for admins to clock out other staff)
    const staffClockOutMutation = useMutation({
        mutationFn: async ({ clockInId }) => {
            // Try to get location (optional for clock-out)
            let location = null;
            try {
                location = await getUserLocation({
                    timeout: 5000,
                    maximumAge: 0,
                    enableHighAccuracy: true,
                });
            } catch (err) {
                logger.warn('Could not get location for clock-out:', err);
            }

            const payload = {};
            if (location) {
                payload.latitude = location.latitude;
                payload.longitude = location.longitude;
            }

            // Use admin endpoint to clock out specific staff member
            return api.post(`/staff/clock-ins/${clockInId}/clock-out`, payload);
        },
        onSuccess: async (_data, variables) => {
            queryClient.invalidateQueries(['staff-clock-ins-active']);
            queryClient.invalidateQueries(['staff-clock-ins']);
            const me = queryClient.getQueryData(CURRENT_USER_QUERY_KEY);
            const staffId = variables?.staffId;
            if (
                me?.id != null &&
                staffId != null &&
                Number(me.id) === Number(staffId)
            ) {
                try {
                    await api.post('/logout');
                } catch (err) {
                    logger.error('Logout after clock-out failed:', err);
                } finally {
                    clearCachedCurrentUser(queryClient);
                    clearStoredAuth();
                    clearFacilityBrandingStash();
                    window.location.href = '/login';
                }
                return;
            }
            toast.success('Success', 'Successfully clocked out', { isFormSubmission: true });
        },
        onError: (err) => {
            toast.error('Error', err.response?.data?.message || 'Failed to clock out');
        },
    });

    // Resident sign-in mutation
    const residentSignInMutation = useMutation({
        mutationFn: async ({ residentId }) => {
            return api.post(`/residents/${residentId}/sign-in`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['residents-sign-outs-active']);
            queryClient.invalidateQueries(['residents-sign-outs']);
            toast.success('Success', 'Resident signed in successfully', { isFormSubmission: true });
        },
        onError: (err) => {
            toast.error('Error', err.response?.data?.message || 'Failed to sign in resident');
        },
    });

    // Visitor check-out mutation
    const visitorCheckOutMutation = useMutation({
        mutationFn: async ({ visitorId }) => {
            return api.post(`/visitors/${visitorId}/check-out`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['visitors-active']);
            queryClient.invalidateQueries(['visitors']);
            toast.success('Success', 'Visitor checked out successfully', { isFormSubmission: true });
        },
        onError: (err) => {
            toast.error('Error', err.response?.data?.message || 'Failed to check out visitor');
        },
    });

    /** staffClockOut | residentSignIn | visitorCheckOut */
    const [dashboardConfirm, setDashboardConfirm] = useState(null);

    const dashboardConfirmPending =
        staffClockOutMutation.isPending ||
        residentSignInMutation.isPending ||
        visitorCheckOutMutation.isPending;

    const handleDashboardConfirm = () => {
        if (!dashboardConfirm) return;
        const done = () => setDashboardConfirm(null);
        if (dashboardConfirm.type === 'staffClockOut') {
            staffClockOutMutation.mutate(
                { clockInId: dashboardConfirm.clockInId, staffId: dashboardConfirm.staffId },
                { onSuccess: done }
            );
        } else if (dashboardConfirm.type === 'residentSignIn') {
            residentSignInMutation.mutate({ residentId: dashboardConfirm.residentId }, { onSuccess: done });
        } else if (dashboardConfirm.type === 'visitorCheckOut') {
            visitorCheckOutMutation.mutate({ visitorId: dashboardConfirm.visitorId }, { onSuccess: done });
        }
    };

    const dashboardConfirmCopy =
        dashboardConfirm == null
            ? { title: '', description: '', confirmLabel: 'Confirm', variant: 'neutral' }
            : dashboardConfirm.type === 'staffClockOut'
              ? {
                    title: 'Clock out staff member?',
                    description: `Clock out ${dashboardConfirm.name}?`,
                    confirmLabel: 'Clock out',
                    variant: 'primary',
                }
              : dashboardConfirm.type === 'residentSignIn'
                ? {
                      title: 'Sign resident in?',
                      description: `Sign in ${dashboardConfirm.name}?`,
                      confirmLabel: 'Sign in',
                      variant: 'primary',
                  }
                : {
                      title: 'Check out visitor?',
                      description: `Check out ${dashboardConfirm.name}?`,
                      confirmLabel: 'Check out',
                      variant: 'primary',
                  };

    const handleExportHistory = () => {
        if (!historyData?.data || historyData.data.length === 0) {
            toast.warning('No data', 'No data to export');
            return;
        }

        // Prepare CSV data
        const headers = [
            'Resident Name',
            'Branch',
            'Sign Out Date',
            'Sign Out Time',
            'Sign In Date',
            'Sign In Time',
            'Duration (Hours)',
            'Destination',
            'Purpose',
            'Expected Return',
            'Status',
            'Accompanied By',
            'Emergency Contact Notified',
            'Signed Out By',
            'Signed In By',
            'Notes'
        ];

        const rows = historyData.data.map(signOut => {
            const signOutDate = signOut.sign_out_at ? new Date(signOut.sign_out_at) : null;
            const signInDate = signOut.sign_in_at ? new Date(signOut.sign_in_at) : null;
            const expectedReturn = signOut.expected_return_at ? new Date(signOut.expected_return_at) : null;
            
            let duration = '';
            if (signOutDate && signInDate) {
                const hours = (signInDate - signOutDate) / (1000 * 60 * 60);
                duration = hours.toFixed(2);
            } else if (signOutDate && !signInDate && signOut.is_active) {
                const hours = (new Date() - signOutDate) / (1000 * 60 * 60);
                duration = `${hours.toFixed(2)} (ongoing)`;
            }

            return [
                signOut.resident?.name || 'N/A',
                signOut.branch?.name || 'N/A',
                signOutDate ? signOutDate.toLocaleDateString() : 'N/A',
                signOutDate ? signOutDate.toLocaleTimeString() : 'N/A',
                signInDate ? signInDate.toLocaleDateString() : 'N/A',
                signInDate ? signInDate.toLocaleTimeString() : 'N/A',
                duration || 'N/A',
                signOut.destination || 'N/A',
                signOut.purpose || 'N/A',
                expectedReturn ? expectedReturn.toLocaleString() : 'N/A',
                signOut.is_active ? 'Active' : 'Returned',
                signOut.accompanied_by || 'N/A',
                signOut.emergency_contact_notified ? 'Yes' : 'No',
                signOut.created_by?.name || 'N/A',
                signOut.signed_in_by?.name || 'N/A',
                signOut.notes || 'N/A'
            ];
        });

        // Create CSV content
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => {
                // Escape commas and quotes in cell values
                const cellStr = String(cell || '');
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(',') + '\n';
        });

        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `resident-sign-out-history-${historyFilters.start_date}-to-${historyFilters.end_date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isLoading = clockInsLoading || signOutsLoading || visitorsLoading;

    return (
        <>
            <ConfirmDialog
                isOpen={dashboardConfirm != null}
                onClose={() => !dashboardConfirmPending && setDashboardConfirm(null)}
                onConfirm={handleDashboardConfirm}
                title={dashboardConfirmCopy.title}
                description={dashboardConfirmCopy.description}
                confirmLabel={dashboardConfirmCopy.confirmLabel}
                cancelLabel="Cancel"
                variant={dashboardConfirmCopy.variant}
                isPending={dashboardConfirmPending}
            />
        <div className="space-y-6">
            {/* Header */}
            <header 
                className="rounded-3xl p-6 text-white shadow-lg" 
                style={{ 
                    background: `linear-gradient(to right, var(--theme-primary), var(--theme-primary-light), var(--theme-primary))`
                }}
            >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--theme-text-on-primary)' }}>
                            Check-In/Check-Out Dashboard
                        </p>
                        <h1 className="text-3xl font-semibold">Activity Monitor</h1>
                        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--theme-text-on-primary)' }}>
                            Real-time tracking of staff clock-ins, resident sign-outs, and visitor check-ins
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white/20 px-5 py-3 text-sm font-semibold shadow-inner transition hover:bg-white/25"
                        style={{ color: 'var(--theme-text-on-primary)' }}
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SectionCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Staff Clocked In</p>
                            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--theme-primary)' }}>
                                {stats.totalStaff}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                            <Clock className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Residents Out</p>
                            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--theme-primary)' }}>
                                {stats.totalResidents}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                            <Users className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Active Visitors</p>
                            <p className="text-3xl font-bold mt-1" style={{ color: 'var(--theme-primary)' }}>
                                {stats.totalVisitors}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                            <User className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} />
                        </div>
                    </div>
                </SectionCard>

                <SectionCard>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Overdue Returns</p>
                            <p className="text-3xl font-bold mt-1 text-red-600">
                                {stats.overdueResidents}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </SectionCard>
            </div>

            {/* Staff Clock-Ins Section */}
            <SectionCard>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                            <Clock className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Staff Clocked In</h2>
                            <p className="text-sm text-gray-600">Active staff members currently on duty</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: 'var(--theme-primary-bg)', color: 'var(--theme-primary)' }}>
                            {activeClockIns?.length || 0}
                        </span>
                        <button
                            onClick={() => navigate('/staff/clock-ins')}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                            View All
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--theme-primary)' }}></div>
                        <p className="text-gray-600 mt-4">Loading...</p>
                    </div>
                ) : !activeClockIns || activeClockIns.length === 0 ? (
                    <EmptyState
                        icon={Clock}
                        title="No Staff Clocked In"
                        description="No staff members are currently clocked in."
                    />
                ) : (
                    <div className="space-y-4">
                        {activeClockIns.map((clockIn) => {
                            const minutesLoggedIn = getTimeDifference(clockIn.clock_in_at);
                            const maxMinutes = 8 * 60; // 8 hours max for progress bar
                            
                            return (
                                <div 
                                    key={clockIn.id} 
                                    className="p-5 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                                                    <User className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">
                                                        {clockIn.staff?.name || 'Unknown Staff'}
                                                    </h3>
                                                    <p className="text-sm text-gray-600">
                                                        {clockIn.branch?.name || 'No Branch'}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-3">
                                                <ProgressBar
                                                    value={minutesLoggedIn}
                                                    max={maxMinutes}
                                                    color="var(--theme-primary)"
                                                    label={`Logged in for ${formatDuration(minutesLoggedIn)}`}
                                                />
                                            </div>
                                            
                                            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Clocked in: {new Date(clockIn.clock_in_at).toLocaleTimeString()}
                                                </span>
                                                {clockIn.clock_method && (
                                                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">
                                                        {clockIn.clock_method === 'public' ? 'Public' : 'Authenticated'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setDashboardConfirm({
                                                    type: 'staffClockOut',
                                                    clockInId: clockIn.id,
                                                    staffId: clockIn.staff_id ?? clockIn.staff?.id ?? null,
                                                    name: clockIn.staff?.name || 'this staff member',
                                                });
                                            }}
                                            disabled={staffClockOutMutation.isPending}
                                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            style={{ backgroundColor: 'var(--theme-primary)' }}
                                        >
                                            {staffClockOutMutation.isPending ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Clocking out...
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-4 h-4" />
                                                    Clock Out
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            {/* Resident Sign-Outs Section */}
            <SectionCard>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                            <Users className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Residents Out</h2>
                            <p className="text-sm text-gray-600">Residents currently signed out</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: 'var(--theme-primary-bg)', color: 'var(--theme-primary)' }}>
                            {activeSignOuts?.length || 0}
                        </span>
                        <button
                            onClick={() => navigate('/residents/sign-outs/view-all')}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                            View All
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--theme-primary)' }}></div>
                        <p className="text-gray-600 mt-4">Loading...</p>
                    </div>
                ) : !activeSignOuts || activeSignOuts.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No Residents Out"
                        description="All residents are currently in the facility."
                    />
                ) : (
                    <div className="space-y-4">
                        {activeSignOuts.map((signOut) => {
                            const minutesOut = getTimeDifference(signOut.sign_out_at);
                            const expectedReturn = signOut.expected_return_at ? new Date(signOut.expected_return_at) : null;
                            const now = new Date();
                            const isOverdue = expectedReturn && now > expectedReturn;
                            const minutesUntilReturn = expectedReturn 
                                ? Math.max(0, Math.floor((expectedReturn - now) / (1000 * 60)))
                                : null;
                            
                            return (
                                <div 
                                    key={signOut.id} 
                                    className={`p-5 rounded-xl border-2 transition-shadow ${
                                        isOverdue 
                                            ? 'border-red-300 bg-red-50' 
                                            : 'border-gray-200 bg-white hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                                                    <Users className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-gray-900">
                                                            {signOut.resident?.name || 'Unknown Resident'}
                                                        </h3>
                                                        {isOverdue && (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 flex items-center gap-1">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600">
                                                        {signOut.destination || 'No destination'}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-3">
                                                {expectedReturn ? (
                                                    <ProgressBar
                                                        value={minutesOut}
                                                        max={minutesOut + minutesUntilReturn}
                                                        color={isOverdue ? '#EF4444' : 'var(--theme-primary)'}
                                                        label={
                                                            isOverdue 
                                                                ? `Out for ${formatDuration(minutesOut)} (Overdue by ${formatDuration(Math.abs(minutesUntilReturn))})`
                                                                : `Out for ${formatDuration(minutesOut)} • Returns in ${formatDuration(minutesUntilReturn)}`
                                                        }
                                                    />
                                                ) : (
                                                    <ProgressBar
                                                        value={minutesOut}
                                                        max={minutesOut + 60} // Default 1 hour buffer
                                                        color="var(--theme-primary)"
                                                        label={`Out for ${formatDuration(minutesOut)}`}
                                                    />
                                                )}
                                            </div>
                                            
                                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    Signed out: {new Date(signOut.sign_out_at).toLocaleString()}
                                                </span>
                                                {expectedReturn && (
                                                    <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                                                        <ArrowRight className="w-3 h-3" />
                                                        Expected: {new Date(expectedReturn).toLocaleString()}
                                                    </span>
                                                )}
                                                {signOut.purpose && (
                                                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">
                                                        {signOut.purpose}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setDashboardConfirm({
                                                    type: 'residentSignIn',
                                                    residentId: signOut.resident_id,
                                                    name: signOut.resident?.name || 'this resident',
                                                });
                                            }}
                                            disabled={residentSignInMutation.isPending}
                                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            style={{ backgroundColor: 'var(--theme-primary)' }}
                                        >
                                            {residentSignInMutation.isPending ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Signing in...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-4 h-4" />
                                                    Sign In
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            {/* Active Visitors Section */}
            <SectionCard>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                            <User className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Active Visitors</h2>
                            <p className="text-sm text-gray-600">Visitors currently checked in</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ backgroundColor: 'var(--theme-primary-bg)', color: 'var(--theme-primary)' }}>
                            {activeVisitors?.length || 0}
                        </span>
                        <button
                            onClick={() => navigate('/visitors/view-all')}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                            View All
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--theme-primary)' }}></div>
                        <p className="text-gray-600 mt-4">Loading...</p>
                    </div>
                ) : !activeVisitors || activeVisitors.length === 0 ? (
                    <EmptyState
                        icon={User}
                        title="No Active Visitors"
                        description="No visitors are currently checked in."
                    />
                ) : (
                    <div className="space-y-4">
                        {activeVisitors.map((visitor) => {
                            const minutesCheckedIn = getTimeDifference(visitor.check_in_at);
                            const expectedDuration = visitor.expected_duration_minutes || 60; // Default 1 hour
                            const isOverdue = minutesCheckedIn > expectedDuration;
                            
                            return (
                                <div 
                                    key={visitor.id} 
                                    className={`p-5 rounded-xl border-2 transition-shadow ${
                                        isOverdue 
                                            ? 'border-amber-300 bg-amber-50' 
                                            : 'border-gray-200 bg-white hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                                                    <User className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold text-gray-900">
                                                            {visitor.first_name} {visitor.last_name}
                                                        </h3>
                                                        {isOverdue && (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                                                Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600">
                                                        Visiting: {visitor.visiting_resident?.name || visitor.visiting_staff?.name || 'N/A'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {visitor.visit_purpose}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-3">
                                                <ProgressBar
                                                    value={minutesCheckedIn}
                                                    max={expectedDuration}
                                                    color={isOverdue ? '#F59E0B' : 'var(--theme-primary)'}
                                                    label={`Checked in for ${formatDuration(minutesCheckedIn)}`}
                                                />
                                            </div>
                                            
                                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Checked in: {new Date(visitor.check_in_at).toLocaleTimeString()}
                                                </span>
                                                {visitor.branch && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {visitor.branch.name}
                                                    </span>
                                                )}
                                                {visitor.expected_duration_minutes && (
                                                    <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">
                                                        Expected: {formatDuration(visitor.expected_duration_minutes)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setDashboardConfirm({
                                                    type: 'visitorCheckOut',
                                                    visitorId: visitor.id,
                                                    name: `${visitor.first_name} ${visitor.last_name}`,
                                                });
                                            }}
                                            disabled={visitorCheckOutMutation.isPending}
                                            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                            style={{ backgroundColor: 'var(--theme-primary)' }}
                                        >
                                            {visitorCheckOutMutation.isPending ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    Checking out...
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-4 h-4" />
                                                    Check Out
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </SectionCard>

            {/* Resident Sign-Out History Section (Admin Only) */}
            <SectionCard>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary-bg)' }}>
                            <Calendar className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Resident In/Out History</h2>
                            <p className="text-sm text-gray-600">View and export resident sign-out history for reporting</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold transition"
                        style={{ 
                            backgroundColor: showHistory ? 'var(--theme-primary)' : 'var(--theme-primary-bg)',
                            color: showHistory ? 'white' : 'var(--theme-primary)'
                        }}
                    >
                        {showHistory ? 'Hide History' : 'Show History'}
                    </button>
                </div>

                {showHistory && (
                    <div className="space-y-4">
                        {/* Filters */}
                        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2 mb-4">
                                <Filter className="w-4 h-4 text-gray-600" />
                                <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={historyFilters.start_date}
                                        onChange={(e) => setHistoryFilters({ ...historyFilters, start_date: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': 'var(--theme-primary-bg)' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={historyFilters.end_date}
                                        onChange={(e) => setHistoryFilters({ ...historyFilters, end_date: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': 'var(--theme-primary-bg)' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Resident</label>
                                    <select
                                        value={historyFilters.resident_id}
                                        onChange={(e) => setHistoryFilters({ ...historyFilters, resident_id: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': 'var(--theme-primary-bg)' }}
                                    >
                                        <option value="">All Residents</option>
                                        {residents?.map(resident => (
                                            <option key={resident.id} value={resident.id}>{resident.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
                                    <select
                                        value={historyFilters.branch_id}
                                        onChange={(e) => setHistoryFilters({ ...historyFilters, branch_id: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': 'var(--theme-primary-bg)' }}
                                    >
                                        <option value="">All Branches</option>
                                        {branches?.map(branch => (
                                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={historyFilters.is_active}
                                        onChange={(e) => setHistoryFilters({ ...historyFilters, is_active: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                        style={{ '--tw-ring-color': 'var(--theme-primary-bg)' }}
                                    >
                                        <option value="">All Status</option>
                                        <option value="true">Active (Out)</option>
                                        <option value="false">Returned</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            value={historyFilters.search}
                                            onChange={(e) => setHistoryFilters({ ...historyFilters, search: e.target.value })}
                                            placeholder="Search by resident name..."
                                            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                                            style={{ '--tw-ring-color': 'var(--theme-primary-bg)' }}
                                        />
                                        {historyFilters.search && (
                                            <button
                                                onClick={() => setHistoryFilters({ ...historyFilters, search: '' })}
                                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-end gap-2">
                                <button
                                    onClick={() => setHistoryFilters({
                                        start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                        end_date: new Date().toISOString().split('T')[0],
                                        resident_id: '',
                                        branch_id: '',
                                        is_active: '',
                                        search: '',
                                        page: 1,
                                    })}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                                >
                                    Reset Filters
                                </button>
                                <button
                                    onClick={handleExportHistory}
                                    disabled={!historyData?.data || historyData.data.length === 0}
                                    className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: 'var(--theme-primary)' }}
                                >
                                    <Download className="w-4 h-4" />
                                    Export CSV
                                </button>
                            </div>
                        </div>

                        {/* History Table */}
                        {historyLoading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: 'var(--theme-primary)' }}></div>
                                <p className="text-gray-600 mt-4">Loading history...</p>
                            </div>
                        ) : !historyData?.data || historyData.data.length === 0 ? (
                            <EmptyState
                                icon={Calendar}
                                title="No History Found"
                                description="No resident sign-out records match your filters."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b-2 border-gray-200">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Resident</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Branch</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sign Out</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Sign In</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Duration</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Destination</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {historyData.data.map((signOut) => {
                                            const signOutDate = signOut.sign_out_at ? new Date(signOut.sign_out_at) : null;
                                            const signInDate = signOut.sign_in_at ? new Date(signOut.sign_in_at) : null;
                                            const expectedReturn = signOut.expected_return_at ? new Date(signOut.expected_return_at) : null;
                                            
                                            let duration = '';
                                            if (signOutDate && signInDate) {
                                                const hours = (signInDate - signOutDate) / (1000 * 60 * 60);
                                                duration = `${hours.toFixed(1)}h`;
                                            } else if (signOutDate && !signInDate && signOut.is_active) {
                                                const hours = (new Date() - signOutDate) / (1000 * 60 * 60);
                                                duration = `${hours.toFixed(1)}h (ongoing)`;
                                            }

                                            const isOverdue = expectedReturn && new Date() > expectedReturn && signOut.is_active;

                                            return (
                                                <tr key={signOut.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-4 py-3 text-sm">
                                                        <div className="font-medium text-gray-900">{signOut.resident?.name || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{signOut.branch?.name || 'N/A'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {signOutDate ? (
                                                            <div>
                                                                <div>{signOutDate.toLocaleDateString()}</div>
                                                                <div className="text-xs text-gray-500">{signOutDate.toLocaleTimeString()}</div>
                                                            </div>
                                                        ) : 'N/A'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        {signInDate ? (
                                                            <div>
                                                                <div>{signInDate.toLocaleDateString()}</div>
                                                                <div className="text-xs text-gray-500">{signInDate.toLocaleTimeString()}</div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400">Not returned</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">{duration || 'N/A'}</td>
                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                        <div>{signOut.destination || 'N/A'}</div>
                                                        {signOut.purpose && (
                                                            <div className="text-xs text-gray-500">{signOut.purpose}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {signOut.is_active ? (
                                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                                isOverdue 
                                                                    ? 'bg-red-100 text-red-800' 
                                                                    : 'bg-blue-100 text-blue-800'
                                                            }`}>
                                                                {isOverdue ? 'Overdue' : 'Active'}
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                                Returned
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                
                                {/* Pagination */}
                                {historyData.meta && (
                                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                                        <div>
                                            Showing {historyData.meta.from || 0} to {historyData.meta.to || 0} of {historyData.meta.total || 0} records
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {historyData.meta && historyData.meta.current_page > 1 && (
                                                <button
                                                    onClick={() => {
                                                        setHistoryFilters({ ...historyFilters, page: historyData.meta.current_page - 1 });
                                                    }}
                                                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 transition"
                                                >
                                                    Previous
                                                </button>
                                            )}
                                            {historyData.meta && historyData.meta.current_page < historyData.meta.last_page && (
                                                <button
                                                    onClick={() => {
                                                        setHistoryFilters({ ...historyFilters, page: historyData.meta.current_page + 1 });
                                                    }}
                                                    className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 transition"
                                                >
                                                    Next
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </SectionCard>
        </div>
        </>
    );
}

