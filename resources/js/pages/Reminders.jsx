import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pause, Play, Trash2 } from 'lucide-react';
import api from '../services/api';
import SectionCard from '../components/SectionCard';
import { toast } from 'sonner';

const categories = ['medication', 'bill', 'appointment', 'renewal', 'general'];
const frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'interval', label: 'Custom interval' },
];

export default function Reminders() {
    const queryClient = useQueryClient();
    const inputClass = "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base shadow-sm focus:border-[var(--theme-primary)] focus:ring-[var(--theme-primary)]";
    const [form, setForm] = useState({
        title: '',
        category: 'general',
        schedule_type: 'one_time',
        due_date: '',
        due_time: '',
        recurrence_pattern: {
            frequency: 'daily',
            interval: 1,
            days_of_week: ['mon'],
            time_of_day: '09:00',
            interval_unit: 'days',
        },
    });

    const { data, isLoading } = useQuery({
        queryKey: ['reminders'],
        queryFn: async () => {
            const response = await api.get('/reminders');
            return response.data?.reminders;
        },
    });

    const reminders = data?.data || [];

    const createMutation = useMutation({
        mutationFn: async (payload) => api.post('/reminders', payload),
        onSuccess: () => {
            queryClient.invalidateQueries(['reminders']);
            queryClient.invalidateQueries(['reminders', 'upcoming']);
            toast.success('Reminder created', '', { isFormSubmission: true });
            resetForm();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Unable to create reminder');
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, action }) => {
            if (action === 'pause') return api.post(`/reminders/${id}/pause`);
            if (action === 'resume') return api.post(`/reminders/${id}/resume`);
            if (action === 'cancel') return api.delete(`/reminders/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['reminders']);
            queryClient.invalidateQueries(['reminders', 'upcoming']);
        },
        onError: () => toast.error('Failed to update reminder'),
    });

    const resetForm = () => {
        setForm({
            title: '',
            category: 'general',
            schedule_type: 'one_time',
            due_date: '',
            due_time: '',
            recurrence_pattern: {
                frequency: 'daily',
                interval: 1,
                days_of_week: ['mon'],
                time_of_day: '09:00',
                interval_unit: 'days',
            },
        });
    };

    const onSubmit = (e) => {
        e.preventDefault();

        const payload = {
            title: form.title,
            category: form.category,
            schedule_type: form.schedule_type,
            channel: 'in_app',
            metadata: {},
        };

        if (form.schedule_type === 'one_time') {
            if (!form.due_date || !form.due_time) {
                toast.error('Provide date and time for the reminder');
                return;
            }
            payload.due_at = new Date(`${form.due_date}T${form.due_time}:00`).toISOString();
        } else {
            payload.recurrence_pattern = {
                ...form.recurrence_pattern,
                time_of_day: form.recurrence_pattern.time_of_day || '09:00',
            };
        }

        createMutation.mutate(payload);
    };

    const recurrenceSummary = useMemo(() => {
        const freq = form.recurrence_pattern.frequency;
        const interval = form.recurrence_pattern.interval;
        if (freq === 'daily') return `Every ${interval} day(s)`;
        if (freq === 'weekly') return `Every ${interval} week(s) on ${form.recurrence_pattern.days_of_week.join(', ') || 'all days'}`;
        if (freq === 'monthly') return `Every ${interval} month(s)`;
        return `Every ${interval} ${form.recurrence_pattern.interval_unit || 'minutes'}`;
    }, [form.recurrence_pattern]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Reminders</h1>
                    <p className="text-sm text-gray-600">Create and manage medication, bill, appointment, and renewal reminders.</p>
                </div>
            </div>

            <SectionCard title="Create reminder" actions={
                <div className="text-xs text-gray-500">{recurrenceSummary}</div>
            }>
                <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Title</label>
                        <input
                            type="text"
                            className={inputClass}
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <select
                            className={inputClass}
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value })}
                        >
                            {categories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Schedule type</label>
                        <select
                            className={inputClass}
                            value={form.schedule_type}
                            onChange={(e) => setForm({ ...form, schedule_type: e.target.value })}
                        >
                            <option value="one_time">One time</option>
                            <option value="recurring">Recurring</option>
                        </select>
                    </div>

                    {form.schedule_type === 'one_time' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date</label>
                                <input
                                    type="date"
                                    className={inputClass}
                                    value={form.due_date}
                                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Time</label>
                                <input
                                    type="time"
                                    className={inputClass}
                                    value={form.due_time}
                                    onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Frequency</label>
                                <select
                                    className={inputClass}
                                    value={form.recurrence_pattern.frequency}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            recurrence_pattern: { ...form.recurrence_pattern, frequency: e.target.value },
                                        })
                                    }
                                >
                                    {frequencies.map((f) => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Interval</label>
                                <input
                                    type="number"
                                    min="1"
                                    className={inputClass}
                                    value={form.recurrence_pattern.interval}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            recurrence_pattern: { ...form.recurrence_pattern, interval: Number(e.target.value) },
                                        })
                                    }
                                />
                            </div>
                            {form.recurrence_pattern.frequency === 'weekly' && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Days of week</label>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {['mon','tue','wed','thu','fri','sat','sun'].map((day) => {
                                            const selected = form.recurrence_pattern.days_of_week.includes(day);
                                            return (
                                                <button
                                                    type="button"
                                                    key={day}
                                                    className={`px-3 py-1 rounded-full text-xs border ${selected ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)]' : 'border-gray-300 text-gray-700'}`}
                                                    onClick={() => {
                                                        const days = selected
                                                            ? form.recurrence_pattern.days_of_week.filter((d) => d !== day)
                                                            : [...form.recurrence_pattern.days_of_week, day];
                                                        setForm({
                                                            ...form,
                                                            recurrence_pattern: { ...form.recurrence_pattern, days_of_week: days },
                                                        });
                                                    }}
                                                >
                                                    {day.toUpperCase()}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Time of day</label>
                                <input
                                    type="time"
                                    className={inputClass}
                                    value={form.recurrence_pattern.time_of_day}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            recurrence_pattern: { ...form.recurrence_pattern, time_of_day: e.target.value },
                                        })
                                    }
                                />
                            </div>
                        </>
                    )}

                    <div className="md:col-span-2 flex items-center justify-end space-x-3">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Reset
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-md text-sm hover:bg-[var(--theme-primary-hover)] flex items-center space-x-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create reminder</span>
                        </button>
                    </div>
                </form>
            </SectionCard>

            <SectionCard title="Your reminders">
                {isLoading ? (
                    <p className="text-sm text-gray-600">Loading reminders...</p>
                ) : reminders.length === 0 ? (
                    <p className="text-sm text-gray-600">No reminders yet. Create one above.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {reminders.map((reminder) => (
                                    <tr key={reminder.id}>
                                        <td className="px-4 py-3 text-sm text-gray-900">{reminder.title}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{reminder.category || 'general'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {reminder.schedule_type === 'one_time'
                                                ? new Date(reminder.due_at).toLocaleString()
                                                : reminder.recurrence_pattern?.frequency || 'recurring'}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700">
                                                {reminder.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right space-x-2">
                                            {reminder.status === 'active' ? (
                                                <button
                                                    className="inline-flex items-center px-3 py-1 text-xs bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100"
                                                    onClick={() => updateStatusMutation.mutate({ id: reminder.id, action: 'pause' })}
                                                >
                                                    <Pause className="w-4 h-4 mr-1" /> Pause
                                                </button>
                                            ) : (
                                                <button
                                                    className="inline-flex items-center px-3 py-1 text-xs bg-green-50 text-green-700 rounded-md hover:bg-green-100"
                                                    onClick={() => updateStatusMutation.mutate({ id: reminder.id, action: 'resume' })}
                                                >
                                                    <Play className="w-4 h-4 mr-1" /> Resume
                                                </button>
                                            )}
                                            <button
                                                className="inline-flex items-center px-3 py-1 text-xs bg-red-50 text-red-700 rounded-md hover:bg-red-100"
                                                onClick={() => updateStatusMutation.mutate({ id: reminder.id, action: 'cancel' })}
                                            >
                                                <Trash2 className="w-4 h-4 mr-1" /> Cancel
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}

