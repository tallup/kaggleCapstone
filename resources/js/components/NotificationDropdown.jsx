import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
    Bell, Calendar, Activity, ClipboardList, Pill, Moon, UserCheck, 
    Check, CheckCheck, AlertCircle, Clock, X
} from 'lucide-react';

export default function NotificationDropdown() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    // Fetch notifications
    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await api.get('/notifications', { params: { limit: 50 } });
            return response.data;
        },
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    const notifications = notificationsData?.notifications || [];
    const unreadCount = notificationsData?.unread_count || 0;

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

        // Navigate if there's an action URL
        if (notification.action_url) {
            navigate(notification.action_url);
            setIsOpen(false);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'appointment_reminder':
                return { Icon: Calendar, color: 'text-[#2D5016]' };
            case 'appointment_upcoming':
                return { Icon: Calendar, color: 'text-[#2D5016]' };
            case 'vital_due':
                return { Icon: Activity, color: 'text-[#2D5016]' };
            case 'assessment_due':
                return { Icon: ClipboardList, color: 'text-[#8B4513]' };
            case 'medication_due':
                return { Icon: Pill, color: 'text-[#8B4513]' };
            case 'sleep_record':
                return { Icon: Moon, color: 'text-[#2D5016]' };
            case 'leave_request':
                return { Icon: UserCheck, color: 'text-[#8B4513]' };
            case 'leave_approved':
                return { Icon: Check, color: 'text-[#2D5016]' };
            case 'leave_rejected':
                return { Icon: X, color: 'text-red-600' };
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
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
                <Bell className="w-5 h-5 text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)}
                    ></div>
                    
                    {/* Dropdown */}
                    <div className="fixed md:absolute top-16 md:top-auto md:mt-2 right-2 md:right-0 w-[calc(100vw-1rem)] md:w-80 lg:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[calc(100vh-5rem)] md:max-h-[600px] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllAsReadMutation.mutate()}
                                    className="text-sm text-[#2D5016] hover:text-[#1a3009] font-medium flex items-center space-x-1"
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
                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[#2D5016]"></div>
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
                                                    <div className={`p-2 rounded-lg ${color.includes('text-[#2D5016]') ? 'bg-green-50' : 'bg-amber-50'}`}>
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
                                                                <span className="ml-2 w-2 h-2 bg-[#2D5016] rounded-full flex-shrink-0"></span>
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

