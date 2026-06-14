import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
    Calendar, Flame, ClipboardList, Pill, ShoppingCart, 
    Sparkles, Clock, ArrowRight, AlertCircle 
} from 'lucide-react';
import api from '../../services/api';

/**
 * UpcomingEventsWidget - Displays upcoming events from all modules
 */
const cardShell = (dense) =>
    `bg-white ${dense ? 'rounded-lg shadow-sm' : 'rounded-2xl shadow-lg'} border border-gray-100 overflow-hidden`;

const headerRow = (dense) =>
    `${dense ? 'px-4 py-2.5' : 'px-6 py-4'} border-b border-gray-200`;

const titleCls = (dense) =>
    `${dense ? 'text-base' : 'text-lg'} font-bold text-[var(--theme-primary)]`;

export default function UpcomingEventsWidget({ limit = 10, dense = false }) {
    const navigate = useNavigate();

    const { data: events, isLoading, error } = useQuery({
        queryKey: ['dashboard-upcoming-events', limit],
        queryFn: async () => {
            const response = await api.get('/dashboard/upcoming-events', {
                params: { limit }
            });
            return response.data?.data || response.data || [];
        },
        retry: 1,
        refetchInterval: 60000, // Refresh every minute
    });

    const getIcon = (iconType) => {
        const icons = {
            calendar: Calendar,
            flame: Flame,
            clipboard: ClipboardList,
            pill: Pill,
            'shopping-cart': ShoppingCart,
            sparkles: Sparkles,
        };
        return icons[iconType] || Clock;
    };

    const getColorClasses = (color) => {
        const colors = {
            blue: 'bg-blue-50 text-blue-700 border-blue-200',
            orange: 'bg-orange-50 text-orange-700 border-orange-200',
            purple: 'bg-purple-50 text-purple-700 border-purple-200',
            green: 'bg-green-50 text-green-700 border-green-200',
            yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
            indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        };
        return colors[color] || 'bg-gray-50 text-gray-700 border-gray-200';
    };

    const formatDateTime = (dateStr, timeStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const isToday = date.toDateString() === new Date().toDateString();
            const isTomorrow = date.toDateString() === new Date(Date.now() + 86400000).toDateString();
            
            let dateText = '';
            if (isToday) {
                dateText = 'Today';
            } else if (isTomorrow) {
                dateText = 'Tomorrow';
            } else {
                dateText = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            if (timeStr) {
                try {
                    const time = new Date(`2000-01-01T${timeStr}`);
                    if (!isNaN(time.getTime())) {
                        const timeText = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        return `${dateText} at ${timeText}`;
                    }
                } catch (e) {
                    // Ignore time parsing errors
                }
            }
            return dateText;
        } catch (error) {
            return dateStr;
        }
    };

    if (isLoading) {
        return (
            <div className={cardShell(dense)}>
                <div className={headerRow(dense)}>
                    <h2 className={titleCls(dense)}>Upcoming Events</h2>
                </div>
                <div className={dense ? 'p-4' : 'p-6'}>
                    <div className={`flex items-center justify-center ${dense ? 'py-6' : 'py-8'}`}>
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)]"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={cardShell(dense)}>
                <div className={headerRow(dense)}>
                    <h2 className={titleCls(dense)}>Upcoming Events</h2>
                </div>
                <div className={dense ? 'p-4' : 'p-6'}>
                    <div className={`flex items-center justify-center text-gray-500 ${dense ? 'py-6' : 'py-8'}`}>
                        <AlertCircle className="w-5 h-5 mr-2" />
                        <span className="text-sm">Failed to load events</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!events || events.length === 0) {
        return (
            <div className={cardShell(dense)}>
                <div className={headerRow(dense)}>
                    <div className="flex items-center justify-between">
                        <h2 className={titleCls(dense)}>Upcoming Events</h2>
                    </div>
                </div>
                <div className={dense ? 'p-4' : 'p-6'}>
                    <div className={`text-center text-gray-500 ${dense ? 'py-6' : 'py-8'}`}>
                        <Clock className={`${dense ? 'w-8 h-8 mb-2' : 'w-12 h-12 mb-3'} mx-auto text-gray-400`} />
                        <p className="text-sm">No upcoming events</p>
                        <p className="text-xs mt-1">All caught up!</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cardShell(dense)}>
            <div className={headerRow(dense)}>
                <div className="flex items-center justify-between gap-2">
                    <h2 className={titleCls(dense)}>Upcoming Events</h2>
                    <span className={`text-gray-500 shrink-0 ${dense ? 'text-[10px]' : 'text-xs'}`}>From all modules</span>
                </div>
            </div>
            <div className={dense ? 'p-3' : 'p-4'}>
                <div className={dense ? 'space-y-2' : 'space-y-3'}>
                    {events.slice(0, dense ? 4 : 3).map((event) => {
                        const Icon = getIcon(event.icon);
                        const colorClasses = getColorClasses(event.color);
                        
                        return (
                            <div
                                key={event.id}
                                onClick={() => event.link && navigate(event.link)}
                                className={`flex items-start rounded-lg border cursor-pointer transition-all hover:shadow-md ${colorClasses} ${dense ? 'gap-2 p-2.5' : 'gap-3 p-3'}`}
                            >
                                <div className={`flex-shrink-0 p-2 rounded-lg ${colorClasses.split(' ')[0]}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{event.title}</p>
                                    <p className="text-xs opacity-90 mt-0.5">{event.description}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Clock className="w-3 h-3 opacity-70" />
                                        <span className="text-xs opacity-80">
                                            {formatDateTime(event.date, event.time)}
                                        </span>
                                        {event.branch && (
                                            <>
                                                <span className="text-xs opacity-60">•</span>
                                                <span className="text-xs opacity-70">{event.branch}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 opacity-70 flex-shrink-0 mt-1" />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

