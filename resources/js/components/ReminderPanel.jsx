import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Clock3, Check, AlarmClockOff, Flame, Pill } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useFacilityUpdates } from '../hooks/useRealtimeUpdates';
import logger from '../utils/logger';
import Tooltip from './ui/Tooltip';

const PACIFIC_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

export default function ReminderPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/user')
            .then((r) => setCurrentUser(r.data))
            .catch((e) => logger.error('[ReminderPanel] user fetch failed:', e));
    }, []);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['reminders', 'upcoming'],
        queryFn: async () => {
            const response = await api.get('/reminders/upcoming', { params: { limit: 50 } });
            return response.data;
        },
        refetchInterval: 60000,
        refetchOnWindowFocus: true,
    });

    // Real-time: refresh reminders whenever a new medication administration is recorded
    useFacilityUpdates(
        currentUser?.facility_id,
        ['medication.administration.created'],
        {
            queryKeys: [['reminders', 'upcoming']],
            invalidateQueries: true,
        }
    );

    const events = data?.events ?? [];

    const acknowledgeMutation = useMutation({
        mutationFn: async (id) => api.post(`/reminder-events/${id}/acknowledge`),
        onSuccess: () => queryClient.invalidateQueries(['reminders', 'upcoming']),
    });

    const snoozeMutation = useMutation({
        mutationFn: async ({ id, minutes }) => api.post(`/reminder-events/${id}/snooze`, { minutes }),
        onSuccess: () => queryClient.invalidateQueries(['reminders', 'upcoming']),
    });

    const snooze = (eventId, minutes = 15) => {
        // Only snooze reminder events, not fire drills
        if (eventId.startsWith('reminder_')) {
            const actualId = eventId.replace('reminder_', '');
            snoozeMutation.mutate({ id: actualId, minutes });
        }
    };
    
    const acknowledge = (eventId) => {
        // Only acknowledge reminder events, not fire drills
        if (eventId.startsWith('reminder_')) {
            const actualId = eventId.replace('reminder_', '');
            acknowledgeMutation.mutate(actualId);
        }
    };
    
    const handleEventClick = (event) => {
        if ((event.type === 'fire_drill' || event.type === 'medication_window') && event.action_url) {
            setIsOpen(false);
            navigate(event.action_url);
        }
    };

    const formatWhen = (value) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return PACIFIC_FORMATTER.format(date);
    };

    const formatTimeUntilClose = (closeTime) => {
        if (!closeTime) return '';
        const now = Date.now();
        const close = new Date(closeTime);
        const diffMs = close.getTime() - now;
        
        if (diffMs <= 0) return 'Closed';
        
        const minutes = Math.floor(diffMs / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `Closes in ${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `Closes in ${minutes}m`;
        } else {
            return 'Closes soon';
        }
    };

    return (
        <div className="relative">
            <Tooltip content="Reminders & upcoming items" position="bottom">
                <button
                    type="button"
                    onClick={() => {
                        const next = !isOpen;
                        setIsOpen(next);
                        if (next) {
                            refetch();
                        }
                    }}
                    className="relative p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label="Reminders and upcoming items"
                >
                    <Clock3 className="w-4 h-4 text-gray-600" strokeWidth={2.25} />
                {events.length > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-4 px-1 bg-blue-500 text-white text-[11px] leading-4 rounded-full text-center">
                        {events.length}
                    </span>
                )}
                </button>
            </Tooltip>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="fixed md:absolute top-16 md:top-auto md:mt-2 right-2 md:right-0 w-[calc(100vw-1rem)] md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[calc(100vh-5rem)] md:max-h-[600px] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Reminders & Fire Drills</h3>
                                <p className="text-xs text-gray-500">Upcoming and due items</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate('/reminders');
                                }}
                                className="px-3 py-1.5 text-xs font-semibold rounded-md bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] transition-colors"
                            >
                                Add reminder
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {isLoading ? (
                                <div className="p-4 text-center">
                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)]"></div>
                                    <p className="mt-2 text-sm text-gray-600">Loading...</p>
                                </div>
                            ) : events.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                    {events.map((event) => {
                                        const isFireDrill = event.type === 'fire_drill';
                                        const isMedicationWindow = event.type === 'medication_window';
                                        const isClickable = isFireDrill || isMedicationWindow;
                                        
                                        return (
                                            <div 
                                                key={event.id} 
                                                className={`p-4 transition-colors ${
                                                    isFireDrill 
                                                        ? 'hover:bg-orange-50 cursor-pointer' 
                                                        : isMedicationWindow 
                                                            ? 'hover:bg-blue-50 cursor-pointer' 
                                                            : 'hover:bg-gray-50'
                                                }`}
                                                onClick={() => isClickable && handleEventClick(event)}
                                            >
                                            <div className="flex items-start justify-between space-x-3">
                                                    <div className="flex-1 flex items-start gap-2">
                                                        {isFireDrill && (
                                                            <Flame className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                                        )}
                                                        {isMedicationWindow && (
                                                            <Pill className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                                        )}
                                                <div className="flex-1">
                                                            <p className={`text-sm font-semibold ${
                                                                isFireDrill 
                                                                    ? 'text-orange-900' 
                                                                    : isMedicationWindow 
                                                                        ? 'text-blue-900' 
                                                                        : 'text-gray-900'
                                                            }`}>
                                                                {event.title}
                                                            </p>
                                                            <p className={`text-xs capitalize ${
                                                                isFireDrill 
                                                                    ? 'text-orange-600' 
                                                                    : isMedicationWindow 
                                                                        ? 'text-blue-600' 
                                                                        : 'text-gray-500'
                                                            }`}>
                                                                {isMedicationWindow 
                                                                    ? `Medication Window • ${formatWhen(event.scheduled_for)}`
                                                                    : event.category === 'fire_drill' 
                                                                        ? 'Fire Drill' 
                                                                        : event.category || 'general'
                                                                } {isMedicationWindow && event.window_closes_at && ` • ${formatTimeUntilClose(event.window_closes_at)}`}
                                                    </p>
                                                </div>
                                                    </div>
                                                    {!isFireDrill && !isMedicationWindow && (
                                                <div className="flex items-center space-x-2">
                                                    <Tooltip content="Acknowledge" position="top">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                acknowledge(event.id);
                                                            }}
                                                            className="p-2 rounded-full bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                                            aria-label="Acknowledge"
                                                        >
                                                            <Check className="w-4 h-4" strokeWidth={2.25} />
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip content="Snooze 15 minutes" position="top">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                snooze(event.id);
                                                            }}
                                                            className="p-2 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                                                            aria-label="Snooze 15 minutes"
                                                        >
                                                            <AlarmClockOff className="w-4 h-4" strokeWidth={2.25} />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                                    )}
                                                </div>
                                                {(event.metadata?.note || event.metadata?.notes) && (
                                                    <p className={`mt-2 text-xs ${
                                                        isFireDrill 
                                                            ? 'text-orange-700' 
                                                            : isMedicationWindow 
                                                                ? 'text-blue-700' 
                                                                : 'text-gray-600'
                                                    }`}>
                                                        {event.metadata.note || event.metadata.notes}
                                                    </p>
                                                )}
                                                {isMedicationWindow && event.metadata?.scheduled_time && (
                                                    <p className="mt-1 text-xs text-blue-600">
                                                        Scheduled: {event.metadata.scheduled_time} • Window closes: {formatWhen(event.window_closes_at)}
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600 text-sm font-medium">No upcoming reminders</p>
                                    <p className="text-gray-500 text-xs mt-1">All set for now.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

