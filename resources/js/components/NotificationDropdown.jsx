import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Bell, Calendar, Activity, ClipboardList, Pill, Moon, UserCheck,
    Check, CheckCheck, AlertCircle, Clock, X, User, UserPlus, Building2, Sparkles,
    Trash2, Filter
} from 'lucide-react';
import {
    getNotificationPermission,
    requestNotificationPermission,
    showDesktopNotification
} from '../utils/desktopNotifications';
import Tooltip from './ui/Tooltip';

// Map notification types to filter categories
const TYPE_CATEGORIES = {
    medications: ['medication_due', 'medication_created', 'medication_administered', 'late_medication_email'],
    vitals: ['vital_due', 'vital_recorded', 'vital_critical', 'late_vital_sign_email'],
    incidents: ['incident_reported', 'incident_assigned', 'incident_resolved', 'incident_closed', 'incident_escalated'],
    appointments: ['appointment_upcoming', 'appointment_completed', 'appointment_reminder'],
};

function getCategoryForType(type) {
    for (const [cat, types] of Object.entries(TYPE_CATEGORIES)) {
        if (types.includes(type)) return cat;
    }
    return 'other';
}

// Group notifications by date
function getDateGroup(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);

    if (date >= today) return 'Today';
    if (date >= yesterday) return 'Yesterday';
    if (date >= weekAgo) return 'This Week';
    return 'Older';
}

const FILTER_TABS = [
    { key: 'all', label: 'All' },
    { key: 'medications', label: 'Meds' },
    { key: 'vitals', label: 'Vitals' },
    { key: 'incidents', label: 'Incidents' },
    { key: 'appointments', label: 'Appts' },
    { key: 'other', label: 'Other' },
];

export default function NotificationDropdown() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const previousUnreadCountRef = useRef(0);
    const [desktopPermission, setDesktopPermission] = useState(getNotificationPermission());
    const lastSeenTsRef = useRef(null);

    // Separate unread count query for independent badge updates
    const { data: countData } = useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn: async () => {
            const response = await api.get('/notifications/count');
            return response.data;
        },
        refetchInterval: 30000,
        refetchOnWindowFocus: true,
    });

    const unreadCount = countData?.count || 0;

    // Fetch notifications (only when dropdown is open)
    const { data: notificationsData, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ['notifications'],
        queryFn: async ({ pageParam }) => {
            const params = { limit: 30 };
            if (pageParam) params.before = pageParam;
            const response = await api.get('/notifications', { params });
            return response.data;
        },
        getNextPageParam: (lastPage) => {
            const notifs = lastPage?.notifications || [];
            if (notifs.length < 30) return undefined;
            return notifs[notifs.length - 1]?.id;
        },
        enabled: isOpen,
        refetchInterval: isOpen ? 30000 : false,
    });

    // Flatten pages into single array
    const allNotifications = React.useMemo(() => {
        if (!notificationsData?.pages) return [];
        return notificationsData.pages.flatMap(page => page?.notifications || []);
    }, [notificationsData]);

    // Filter by active tab
    const filteredNotifications = React.useMemo(() => {
        if (activeFilter === 'all') return allNotifications;
        return allNotifications.filter(n => getCategoryForType(n.type) === activeFilter);
    }, [allNotifications, activeFilter]);

    // Group by date
    const groupedNotifications = React.useMemo(() => {
        const groups = {};
        for (const n of filteredNotifications) {
            const group = getDateGroup(n.created_at);
            if (!groups[group]) groups[group] = [];
            groups[group].push(n);
        }
        return groups;
    }, [filteredNotifications]);

    const groupOrder = ['Today', 'Yesterday', 'This Week', 'Older'];

    // Initialize last seen timestamp for desktop notifications
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem('desktop_notification_last_seen_ts');
        if (stored) lastSeenTsRef.current = Number(stored);
    }, []);

    // Desktop notifications for new items
    useEffect(() => {
        if (desktopPermission !== 'granted' || !allNotifications?.length) return;
        const lastSeenTs = lastSeenTsRef.current || 0;
        const fresh = allNotifications.filter(n => {
            if (!n?.created_at) return false;
            const ts = new Date(n.created_at).getTime();
            return Number.isFinite(ts) && ts > lastSeenTs;
        });
        if (!fresh.length) return;
        fresh.slice(0, 5).forEach(n => {
            showDesktopNotification({
                title: n.title || 'New notification',
                body: n.message || '',
                icon: '/favicon.ico',
                url: n.action_url || null,
            });
        });
        const newestTs = Math.max(lastSeenTs, ...fresh.map(n => new Date(n.created_at).getTime()).filter(Number.isFinite));
        if (Number.isFinite(newestTs)) {
            lastSeenTsRef.current = newestTs;
            if (typeof window !== 'undefined') window.localStorage.setItem('desktop_notification_last_seen_ts', String(newestTs));
        }
    }, [allNotifications, desktopPermission]);

    const handleRequestDesktopPermission = async () => {
        const result = await requestNotificationPermission();
        setDesktopPermission(result);
    };

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    };

    // Mark as read
    const markAsReadMutation = useMutation({
        mutationFn: (id) => api.post(`/notifications/${id}/read`),
        onSuccess: invalidateAll,
    });

    // Mark all as read
    const markAllAsReadMutation = useMutation({
        mutationFn: () => api.post('/notifications/read-all'),
        onSuccess: invalidateAll,
    });

    // Delete single notification
    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/notifications/${id}`),
        onSuccess: invalidateAll,
    });

    // Clear all read notifications
    const clearReadMutation = useMutation({
        mutationFn: () => api.delete('/notifications/clear-read'),
        onSuccess: invalidateAll,
    });

    const handleNotificationClick = (notification) => {
        if (!notification.is_read) markAsReadMutation.mutate(notification.id);

        const normalizeUrl = (url) => {
            if (!url) return '/dashboard';
            if (url.startsWith('/admin/fire-drills')) return '/fire-drills';
            if (url.startsWith('/admin/medication-deliveries')) return '/medication-deliveries';
            if (url.startsWith('/admin/grocery-status-updates')) return '/grocery-status';
            if (url.startsWith('/app/')) return url.substring(5);
            if (!url.startsWith('/')) return '/' + url;
            return url;
        };

        if (notification.action_url) {
            navigate(normalizeUrl(notification.action_url));
            setIsOpen(false);
            return;
        }

        const metadata = notification.metadata || {};
        let navUrl = '/dashboard';

        switch (notification.type) {
            case 'reminder': case 'bill_reminder': case 'renewal_reminder':
                navUrl = '/reminders'; break;
            case 'appointment_upcoming':
                navUrl = metadata.resident_id ? `/appointments?resident_id=${metadata.resident_id}` : '/appointments'; break;
            case 'medication_created': case 'medication_administered':
                navUrl = metadata.resident_id ? `/medications?resident_id=${metadata.resident_id}` : '/medications'; break;
            case 'assessment_created': case 'assessment_completed':
                navUrl = metadata.assessment_id ? `/assessments/${metadata.assessment_id}/review` : '/assessments'; break;
            case 'appointment_completed':
                navUrl = '/appointments'; break;
            case 'leave_request': case 'leave_approved': case 'leave_rejected':
                navUrl = '/team/leave-requests'; break;
            case 'vital_recorded': case 'vital_critical':
                navUrl = metadata.resident_id ? `/vitals?resident_id=${metadata.resident_id}` : '/vitals'; break;
            case 'incident_reported':
                navUrl = metadata.resident_id ? `/incidents?resident_id=${metadata.resident_id}` : '/incidents'; break;
            case 'sleep_record':
                navUrl = metadata.resident_id ? `/sleep?resident_id=${metadata.resident_id}` : '/sleep'; break;
            case 'resident_created':
                navUrl = '/organization/residents'; break;
            case 'user_created':
                navUrl = '/team/users'; break;
            case 'facility_created':
                navUrl = '/super-admin/facilities'; break;
            case 'branch_created':
                navUrl = '/organization/branches'; break;
            case 'housekeeping_task_completed': case 'housekeeping_task_skipped':
                navUrl = '/housekeeping/dashboard'; break;
            case 'fire_drill_scheduled': case 'fire_drill_today': case 'fire_drill_reminder':
                navUrl = '/fire-drills'; break;
            case 'grocery_status_update':
                navUrl = '/grocery-status'; break;
            case 'staff_clock_in': case 'staff_clock_out':
            case 'resident_sign_out': case 'resident_sign_in':
            case 'visitor_check_in': case 'visitor_check_out':
                navUrl = '/check-in-dashboard'; break;
        }

        navigate(navUrl);
        setIsOpen(false);
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'appointment_reminder': case 'appointment_upcoming':
                return { Icon: Calendar, color: 'text-[var(--theme-primary)]' };
            case 'appointment_completed':
                return { Icon: CheckCheck, color: 'text-[var(--theme-primary)]' };
            case 'vital_due': case 'vital_recorded':
                return { Icon: Activity, color: 'text-[var(--theme-primary)]' };
            case 'vital_critical':
                return { Icon: AlertCircle, color: 'text-red-600' };
            case 'assessment_due': case 'assessment_created':
                return { Icon: ClipboardList, color: 'text-[var(--theme-secondary)]' };
            case 'assessment_completed':
                return { Icon: ClipboardList, color: 'text-green-600' };
            case 'leave_request':
                return { Icon: UserCheck, color: 'text-[var(--theme-secondary)]' };
            case 'leave_approved':
                return { Icon: Check, color: 'text-[var(--theme-primary)]' };
            case 'leave_rejected':
                return { Icon: X, color: 'text-red-600' };
            case 'incident_reported':
                return { Icon: AlertCircle, color: 'text-red-600' };
            case 'sleep_record':
                return { Icon: Moon, color: 'text-[var(--theme-primary)]' };
            case 'resident_created': case 'user_created':
                return { Icon: User, color: 'text-[var(--theme-primary)]' };
            case 'facility_created': case 'branch_created':
                return { Icon: Building2, color: 'text-[var(--theme-primary)]' };
            case 'medication_due': case 'medication_created':
                return { Icon: Pill, color: 'text-[var(--theme-secondary)]' };
            case 'medication_administered':
                return { Icon: Pill, color: 'text-green-600' };
            case 'reminder': case 'bill_reminder': case 'renewal_reminder':
                return { Icon: Clock, color: 'text-[var(--theme-primary)]' };
            case 'housekeeping_task_completed':
                return { Icon: Sparkles, color: 'text-green-600' };
            case 'housekeeping_task_skipped':
                return { Icon: Sparkles, color: 'text-amber-600' };
            case 'grocery_status_update':
                return { Icon: Calendar, color: 'text-[var(--theme-primary)]' };
            case 'staff_clock_in':
                return { Icon: Clock, color: 'text-green-600' };
            case 'staff_clock_out':
                return { Icon: Clock, color: 'text-blue-600' };
            case 'resident_sign_out':
                return { Icon: User, color: 'text-orange-600' };
            case 'resident_sign_in':
                return { Icon: UserCheck, color: 'text-green-600' };
            case 'visitor_check_in':
                return { Icon: UserPlus, color: 'text-blue-600' };
            case 'visitor_check_out':
                return { Icon: User, color: 'text-gray-600' };
            default:
                return { Icon: Bell, color: 'text-gray-600' };
        }
    };

    const getTimeAgo = (date) => {
        const now = new Date();
        const d = new Date(date);
        const diffInSeconds = Math.floor((now - d) / 1000);
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return d.toLocaleDateString();
    };

    return (
        <div className="relative">
            <Tooltip content="Notifications" position="bottom">
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (!isOpen) refetch();
                    }}
                    className="relative p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label="Notifications"
                >
                    <Bell className="w-4 h-4 text-gray-600" strokeWidth={2.25} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-0.5 leading-none">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </Tooltip>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Dropdown */}
                    <div className="fixed md:absolute top-16 md:top-auto md:mt-2 right-2 md:right-0 w-[calc(100vw-1rem)] md:w-80 lg:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[calc(100vh-5rem)] md:max-h-[600px] overflow-hidden flex flex-col">
                        {desktopPermission !== 'granted' && (
                            <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-3">
                                <span>Enable desktop alerts to get notified even when the dropdown is closed.</span>
                                <button
                                    onClick={handleRequestDesktopPermission}
                                    className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-xs font-semibold flex-shrink-0"
                                >
                                    Enable
                                </button>
                            </div>
                        )}

                        {/* Header */}
                        <div className="p-4 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={() => markAllAsReadMutation.mutate()}
                                            className="text-xs text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] font-medium flex items-center gap-1"
                                            title="Mark all as read"
                                        >
                                            <CheckCheck className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Read all</span>
                                        </button>
                                    )}
                                    {allNotifications.some(n => n.is_read) && (
                                        <button
                                            onClick={() => clearReadMutation.mutate()}
                                            className="text-xs text-gray-500 hover:text-red-600 font-medium flex items-center gap-1"
                                            title="Clear read notifications"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Clear</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Filter Tabs */}
                            <div className="flex gap-1 overflow-x-auto no-scrollbar">
                                {FILTER_TABS.map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveFilter(tab.key)}
                                        className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                                            activeFilter === tab.key
                                                ? 'bg-[var(--theme-primary)] text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto flex-1">
                            {isLoading ? (
                                <div className="p-4 text-center">
                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)]"></div>
                                    <p className="mt-2 text-sm text-gray-600">Loading...</p>
                                </div>
                            ) : filteredNotifications.length > 0 ? (
                                <div>
                                    {groupOrder.map(group => {
                                        const items = groupedNotifications[group];
                                        if (!items?.length) return null;
                                        return (
                                            <div key={group}>
                                                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{group}</span>
                                                </div>
                                                {items.map(notification => {
                                                    const { Icon, color } = getNotificationIcon(notification.type);
                                                    return (
                                                        <div
                                                            key={notification.id}
                                                            className={`group p-3.5 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 ${
                                                                !notification.is_read ? 'bg-green-50/50' : ''
                                                            }`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div
                                                                    className={`p-1.5 rounded-lg flex-shrink-0 ${
                                                                        color.includes('red') ? 'bg-red-50' :
                                                                        color.includes('green') ? 'bg-green-50' :
                                                                        color.includes('amber') ? 'bg-amber-50' :
                                                                        color.includes('blue') ? 'bg-blue-50' :
                                                                        'bg-gray-50'
                                                                    }`}
                                                                    onClick={() => handleNotificationClick(notification)}
                                                                >
                                                                    <Icon className={`w-4 h-4 ${color}`} />
                                                                </div>
                                                                <div className="flex-1 min-w-0" onClick={() => handleNotificationClick(notification)}>
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <p className={`text-sm leading-tight ${
                                                                            !notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                                                                        }`}>
                                                                            {notification.title}
                                                                        </p>
                                                                        {!notification.is_read && (
                                                                            <span className="mt-1 w-2 h-2 bg-[var(--theme-primary)] rounded-full flex-shrink-0" />
                                                                        )}
                                                                    </div>
                                                                    <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{notification.message}</p>
                                                                    <p className="mt-1 text-[11px] text-gray-400 flex items-center">
                                                                        <Clock className="w-3 h-3 mr-1" />
                                                                        {getTimeAgo(notification.created_at)}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        deleteMutation.mutate(notification.id);
                                                                    }}
                                                                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all flex-shrink-0"
                                                                    title="Delete notification"
                                                                >
                                                                    <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}

                                    {/* Load More */}
                                    {hasNextPage && (
                                        <button
                                            onClick={() => fetchNextPage()}
                                            disabled={isFetchingNextPage}
                                            className="w-full p-3 text-center text-sm font-medium text-[var(--theme-primary)] hover:bg-gray-50 transition-colors border-t border-gray-100"
                                        >
                                            {isFetchingNextPage ? 'Loading...' : 'Load more'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-600 text-sm font-medium">
                                        {activeFilter !== 'all' ? `No ${activeFilter} notifications` : 'No notifications'}
                                    </p>
                                    <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
