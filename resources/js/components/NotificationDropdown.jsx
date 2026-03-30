import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
    Bell, Calendar, Activity, ClipboardList, Pill, Moon, UserCheck, 
    Check, CheckCheck, AlertCircle, Clock, X, User, UserPlus, Building2, Sparkles
} from 'lucide-react';
import { 
    getNotificationPermission, 
    requestNotificationPermission, 
    showDesktopNotification 
} from '../utils/desktopNotifications';
import Tooltip from './ui/Tooltip';

export default function NotificationDropdown() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const previousUnreadCountRef = useRef(0);
    const [desktopPermission, setDesktopPermission] = useState(getNotificationPermission());
    const lastSeenTsRef = useRef(null);

    // Fetch notifications with real-time polling
    const { data: notificationsData, isLoading, refetch } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await api.get('/notifications', { params: { limit: 50 } });
            return response.data;
        },
        refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
        refetchIntervalInBackground: false, // Don't poll when tab is in background to save resources
        refetchOnWindowFocus: true, // Refetch when user returns to the tab
    });

    const notifications = notificationsData?.notifications || [];
    const unreadCount = notificationsData?.unread_count || 0;
    const previousUnreadCount = previousUnreadCountRef.current;

    // Initialize last seen timestamp for desktop notifications
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = window.localStorage.getItem('desktop_notification_last_seen_ts');
        if (stored) {
            lastSeenTsRef.current = Number(stored);
        }
    }, []);

    // Track unread count changes for visual feedback
    useEffect(() => {
        if (unreadCount > previousUnreadCount && previousUnreadCount > 0) {
            // New notification arrived - could add a toast notification here
            // For now, the badge will update automatically
        }
        previousUnreadCountRef.current = unreadCount;
    }, [unreadCount, previousUnreadCount]);

    // Trigger desktop notifications for new items
    useEffect(() => {
        if (desktopPermission !== 'granted') return;
        if (!notifications?.length) return;

        const lastSeenTs = lastSeenTsRef.current || 0;

        const fresh = notifications.filter((n) => {
            if (!n?.created_at) return false;
            const ts = new Date(n.created_at).getTime();
            return Number.isFinite(ts) && ts > lastSeenTs;
        });

        if (!fresh.length) return;

        fresh.slice(0, 5).forEach((n) => {
            showDesktopNotification({
                title: n.title || 'New notification',
                body: n.message || '',
                icon: '/favicon.ico',
                url: n.action_url || null,
            });
        });

        const newestTs = Math.max(
            lastSeenTs,
            ...fresh.map((n) => new Date(n.created_at).getTime()).filter(Number.isFinite),
        );
        if (Number.isFinite(newestTs)) {
            lastSeenTsRef.current = newestTs;
            if (typeof window !== 'undefined') {
                window.localStorage.setItem('desktop_notification_last_seen_ts', String(newestTs));
            }
        }
    }, [notifications, desktopPermission]);

    const handleRequestDesktopPermission = async () => {
        const result = await requestNotificationPermission();
        setDesktopPermission(result);
    };

    // Mark as read mutation
    const markAsReadMutation = useMutation({
        mutationFn: async (id) => {
            await api.post(`/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        },
    });

    // Mark all as read mutation
    const markAllAsReadMutation = useMutation({
        mutationFn: async () => {
            await api.post('/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        },
    });

    const handleNotificationClick = (notification) => {
        // Mark as read
        if (!notification.is_read) {
            markAsReadMutation.mutate(notification.id);
        }

        // Navigate based on notification type and metadata
        const metadata = notification.metadata || {};
        
        // Helper function to normalize URLs
        const normalizeUrl = (url) => {
            if (!url) return '/dashboard';
            
            // Convert Filament admin routes to React frontend routes
            if (url.startsWith('/admin/fire-drills')) {
                return '/fire-drills';
            }
            if (url.startsWith('/admin/medication-deliveries')) {
                return '/medication-deliveries';
            }
            if (url.startsWith('/admin/grocery-status-updates')) {
                return '/grocery-status';
            }
            
            // Remove /app/ prefix if present (for backward compatibility)
            if (url.startsWith('/app/')) {
                return url.substring(5); // Remove '/app'
            }
            // Ensure it starts with /
            if (!url.startsWith('/')) {
                return '/' + url;
            }
            return url;
        };
        
        // If action_url is set, normalize it and use it directly
        if (notification.action_url) {
            const normalizedUrl = normalizeUrl(notification.action_url);
            navigate(normalizedUrl);
            setIsOpen(false);
            return;
        }
        
        // Build navigation URL based on notification type
        let navUrl = '/dashboard';
        
        switch (notification.type) {
            case 'reminder':
            case 'bill_reminder':
            case 'renewal_reminder':
                navUrl = '/reminders';
                break;
            case 'appointment_upcoming':
                if (metadata.appointment_id && metadata.resident_id) {
                    navUrl = `/appointments?resident_id=${metadata.resident_id}&appointment_id=${metadata.appointment_id}`;
                } else {
                    navUrl = '/appointments';
                }
                break;
            case 'medication_created':
                if (metadata.medication_id && metadata.resident_id) {
                    navUrl = `/medications?resident_id=${metadata.resident_id}&medication_id=${metadata.medication_id}`;
                } else {
                    navUrl = '/medications';
                }
                break;
            case 'medication_administered':
                if (metadata.medication_id && metadata.resident_id) {
                    navUrl = `/medications?resident_id=${metadata.resident_id}&medication_id=${metadata.medication_id}`;
                } else {
                    navUrl = '/medications';
                }
                break;
            case 'assessment_created':
            case 'assessment_completed':
                if (metadata.assessment_id) {
                    // Navigate directly to the assessment review page
                    navUrl = `/assessments/${metadata.assessment_id}/review`;
                } else if (metadata.resident_id) {
                    // Fallback to assessments list filtered by resident
                    navUrl = `/assessments?resident_id=${metadata.resident_id}`;
                } else {
                    navUrl = '/assessments';
                }
                break;
            case 'appointment_completed':
                navUrl = '/appointments';
                break;
            case 'leave_request':
            case 'leave_approved':
            case 'leave_rejected':
                if (metadata.leave_request_id) {
                    navUrl = `/administration/leave-requests?leave_request_id=${metadata.leave_request_id}`;
                } else {
                    navUrl = '/administration/leave-requests';
                }
                break;
            case 'vital_recorded':
            case 'vital_critical':
                if (metadata.vital_sign_id && metadata.resident_id) {
                    navUrl = `/vitals?resident_id=${metadata.resident_id}&vital_id=${metadata.vital_sign_id}`;
                } else {
                    navUrl = '/vitals';
                }
                break;
            case 'incident_reported':
                if (metadata.incident_id && metadata.resident_id) {
                    navUrl = `/incidents?resident_id=${metadata.resident_id}&incident_id=${metadata.incident_id}`;
                } else {
                    navUrl = '/incidents';
                }
                break;
            case 'sleep_record':
                if (metadata.sleep_record_id && metadata.resident_id) {
                    navUrl = `/sleep?resident_id=${metadata.resident_id}&sleep_record_id=${metadata.sleep_record_id}`;
                } else {
                    navUrl = '/sleep';
                }
                break;
            case 'resident_created':
                if (metadata.resident_id) {
                    navUrl = `/administration/residents?resident_id=${metadata.resident_id}`;
                } else {
                    navUrl = '/administration/residents';
                }
                break;
            case 'user_created':
                if (metadata.user_id) {
                    navUrl = `/administration/users?user_id=${metadata.user_id}`;
                } else {
                    navUrl = '/administration/users';
                }
                break;
            case 'facility_created':
                if (metadata.facility_id) {
                    navUrl = `/administration/facilities?facility_id=${metadata.facility_id}`;
                } else {
                    navUrl = '/administration/facilities';
                }
                break;
            case 'branch_created':
                if (metadata.branch_id) {
                    navUrl = `/administration/branches?branch_id=${metadata.branch_id}`;
                } else {
                    navUrl = '/administration/branches';
                }
                break;
            case 'housekeeping_task_completed':
            case 'housekeeping_task_skipped':
                navUrl = '/housekeeping/dashboard';
                break;
            case 'fire_drill_scheduled':
            case 'fire_drill_today':
            case 'fire_drill_reminder':
                if (metadata.fire_drill_id) {
                    navUrl = `/fire-drills?fire_drill_id=${metadata.fire_drill_id}`;
                } else {
                    navUrl = '/fire-drills';
                }
                break;
            case 'grocery_status_update':
                navUrl = '/grocery-status';
                break;
            case 'staff_clock_in':
            case 'staff_clock_out':
                navUrl = '/check-in-dashboard';
                break;
            case 'resident_sign_out':
            case 'resident_sign_in':
                navUrl = '/check-in-dashboard';
                break;
            case 'visitor_check_in':
            case 'visitor_check_out':
                navUrl = '/check-in-dashboard';
                break;
            default:
                navUrl = '/dashboard';
        }
        
        navigate(navUrl);
        setIsOpen(false);
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'appointment_reminder':
                return { Icon: Calendar, color: 'text-[var(--theme-primary)]' };
            case 'appointment_upcoming':
                return { Icon: Calendar, color: 'text-[var(--theme-primary)]' };
            case 'appointment_completed':
                return { Icon: CheckCheck, color: 'text-[var(--theme-primary)]' };
            case 'vital_due':
                return { Icon: Activity, color: 'text-[var(--theme-primary)]' };
            case 'assessment_due':
                return { Icon: ClipboardList, color: 'text-[var(--theme-secondary)]' };
            case 'assessment_created':
                return { Icon: ClipboardList, color: 'text-[var(--theme-secondary)]' };
            case 'assessment_completed':
                return { Icon: ClipboardList, color: 'text-green-600' };
            case 'leave_request':
                return { Icon: UserCheck, color: 'text-[var(--theme-secondary)]' };
            case 'leave_approved':
                return { Icon: Check, color: 'text-[var(--theme-primary)]' };
            case 'leave_rejected':
                return { Icon: X, color: 'text-red-600' };
            case 'vital_recorded':
                return { Icon: Activity, color: 'text-[var(--theme-primary)]' };
            case 'vital_critical':
                return { Icon: AlertCircle, color: 'text-red-600' };
            case 'incident_reported':
                return { Icon: AlertCircle, color: 'text-red-600' };
            case 'sleep_record':
                return { Icon: Moon, color: 'text-[var(--theme-primary)]' };
            case 'resident_created':
                return { Icon: User, color: 'text-[var(--theme-primary)]' };
            case 'user_created':
                return { Icon: User, color: 'text-[var(--theme-primary)]' };
            case 'facility_created':
                return { Icon: Building2, color: 'text-[var(--theme-primary)]' };
            case 'branch_created':
                return { Icon: Building2, color: 'text-[var(--theme-primary)]' };
            case 'medication_due':
                return { Icon: Pill, color: 'text-[var(--theme-secondary)]' };
            case 'reminder':
            case 'bill_reminder':
            case 'renewal_reminder':
                return { Icon: Clock, color: 'text-[var(--theme-primary)]' };
            case 'medication_created':
                return { Icon: Pill, color: 'text-[var(--theme-secondary)]' };
            case 'medication_administered':
                return { Icon: Pill, color: 'text-green-600' };
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
        const notificationDate = new Date(date);
        const diffInSeconds = Math.floor((now - notificationDate) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return notificationDate.toLocaleDateString();
    };

    return (
        <div className="relative">
            <Tooltip content="Notifications" position="bottom">
                <button
                    type="button"
                    onClick={() => {
                        setIsOpen(!isOpen);
                        // Refetch notifications when opening dropdown for immediate updates
                        if (!isOpen) {
                            refetch();
                        }
                    }}
                    className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Notifications"
                >
                    <Bell className="w-5 h-5 text-gray-600" strokeWidth={2.25} />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                </button>
            </Tooltip>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)}
                    ></div>
                    
                    {/* Dropdown */}
                    <div className="fixed md:absolute top-16 md:top-auto md:mt-2 right-2 md:right-0 w-[calc(100vw-1rem)] md:w-80 lg:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[calc(100vh-5rem)] md:max-h-[600px] overflow-hidden flex flex-col">
                        {desktopPermission !== 'granted' && (
                            <div className="p-3 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-3">
                                <span>Enable desktop alerts to get notified even when the dropdown is closed.</span>
                                <button
                                    onClick={handleRequestDesktopPermission}
                                    className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-xs font-semibold"
                                >
                                    Enable
                                </button>
                            </div>
                        )}
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsReadMutation.mutate()}
                                    className="text-sm text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] font-medium flex items-center space-x-1"
                                >
                                    <CheckCheck className="w-4 h-4" />
                                    <span>Mark all as read</span>
                                </button>
                            )}
                        </div>

                        {/* Notifications List */}
                        <div className="overflow-y-auto flex-1">
                            {isLoading ? (
                                <div className="p-4 text-center">
                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)]"></div>
                                    <p className="mt-2 text-sm text-gray-600">Loading...</p>
                                </div>
                            ) : notifications.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                    {notifications.map((notification) => {
                                        const { Icon, color } = getNotificationIcon(notification.type);
                                        return (
                                            <div
                                                key={notification.id}
                                                onClick={() => handleNotificationClick(notification)}
                                                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                                    !notification.is_read ? 'bg-green-50' : ''
                                                }`}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <div className={`p-2 rounded-lg ${color.includes('text-[var(--theme-primary)]') ? 'bg-green-50' : 'bg-amber-50'}`}>
                                                        <Icon className={`w-5 h-5 ${color}`} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between">
                                                            <p className={`text-sm font-medium ${
                                                                !notification.is_read ? 'text-gray-900' : 'text-gray-700'
                                                            }`}>
                                                                {notification.title}
                                                            </p>
                                                            {!notification.is_read && (
                                                                <span className="ml-2 w-2 h-2 bg-[var(--theme-primary)] rounded-full flex-shrink-0"></span>
                                                            )}
                                                        </div>
                                                        <p className="mt-1 text-sm text-gray-600 truncate">
                                                            {notification.message}
                                                        </p>
                                                        <p className="mt-1 text-xs text-gray-500 flex items-center">
                                                            <Clock className="w-3 h-3 mr-1" />
                                                            {getTimeAgo(notification.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600 text-sm font-medium">No notifications</p>
                                    <p className="text-gray-500 text-xs mt-1">You're all caught up!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}