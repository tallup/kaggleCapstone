import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Clock3, Check, AlarmClockOff } from 'lucide-react';
import api from '../services/api';

export default function ReminderPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['reminders', 'upcoming'],
        queryFn: async () => {
            const response = await api.get('/reminders/upcoming', { params: { limit: 50 } });
            return response.data;
        },
        refetchInterval: 60000,
        refetchOnWindowFocus: true,
    });

    const events = data?.events ?? [];

    const acknowledgeMutation = useMutation({
        mutationFn: async (id) => api.post(`/reminder-events/${id}/acknowledge`),
        onSuccess: () => queryClient.invalidateQueries(['reminders', 'upcoming']),
    });

    const snoozeMutation = useMutation({
        mutationFn: async ({ id, minutes }) => api.post(`/reminder-events/${id}/snooze`, { minutes }),
        onSuccess: () => queryClient.invalidateQueries(['reminders', 'upcoming']),
    });

    const snooze = (eventId, minutes = 15) => snoozeMutation.mutate({ id: eventId, minutes });
    const acknowledge = (eventId) => acknowledgeMutation.mutate(eventId);

    const formatWhen = (value) => {
        if (!value) return '';
        const date = new Date(value);
        return date.toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    return (
        <div className="relative">
            <button
                onClick={() => {
                    const next = !isOpen;
                    setIsOpen(next);
                    if (next) {
                        refetch();
                    }
                }}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Reminders"
            >
                <Clock3 className="w-5 h-5 text-gray-600" />
                {events.length > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-4 px-1 bg-blue-500 text-white text-[11px] leading-4 rounded-full text-center">
                        {events.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
                    <div className="fixed md:absolute top-16 md:top-auto md:mt-2 right-2 md:right-0 w-[calc(100vw-1rem)] md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[calc(100vh-5rem)] md:max-h-[600px] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Reminders</h3>
                                <p className="text-xs text-gray-500">Upcoming and due items</p>
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1">
                            {isLoading ? (
                                <div className="p-4 text-center">
                                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--theme-primary)]"></div>
                                    <p className="mt-2 text-sm text-gray-600">Loading...</p>
                                </div>
                            ) : events.length > 0 ? (
                                <div className="divide-y divide-gray-200">
                                    {events.map((event) => (
                                        <div key={event.id} className="p-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between space-x-3">
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-900">{event.title}</p>
                                                    <p className="text-xs text-gray-500 capitalize">
                                                        {event.category || 'general'} • {formatWhen(event.scheduled_for)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        onClick={() => acknowledge(event.id)}
                                                        className="p-2 rounded-full bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                                                        title="Acknowledge"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => snooze(event.id)}
                                                        className="p-2 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                                                        title="Snooze 15m"
                                                    >
                                                    <AlarmClockOff className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            {event.metadata?.note && (
                                                <p className="mt-2 text-xs text-gray-600">{event.metadata.note}</p>
                                            )}
                                        </div>
                                    ))}
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

