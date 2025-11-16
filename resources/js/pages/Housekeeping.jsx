import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, CalendarDays, RefreshCcw, CheckCircle2, XCircle, Loader2, StickyNote, Info } from 'lucide-react';
import api from '../services/api';

const statusStyles = {
    pending: 'bg-gray-100 text-gray-600 ring-gray-200',
    completed: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    skipped: 'bg-amber-100 text-amber-700 ring-amber-200',
};

export default function Housekeeping() {
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = React.useState(() => new Date().toISOString().slice(0, 10));
    const [initials, setInitials] = React.useState(() => localStorage.getItem('housekeeping_initials') ?? '');

    const { data, isLoading, error, isFetching } = useQuery({
        queryKey: ['cleaning-checklists', selectedDate],
        queryFn: async () => {
            const response = await api.get('/cleaning/checklists', {
                params: { date: selectedDate },
            });
            return response.data;
        },
        keepPreviousData: true,
    });

    const mutation = useMutation({
        mutationFn: async ({ taskId, status, notes }) => {
            if (!initials.trim()) {
                throw new Error('Please enter your initials before updating tasks.');
            }

            const payload = {
                task_id: taskId,
                status,
                initials: initials.trim(),
                scheduled_date: selectedDate,
            };

            if (notes?.trim()) {
                payload.notes = notes.trim();
            }

            return api.post('/cleaning/task-logs', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cleaning-checklists'] });
        },
    });

    const areas = React.useMemo(() => data?.areas ?? [], [data?.areas]);

    const handleStatusUpdate = async (taskId, status) => {
        try {
            let notes = '';
            if (status === 'skipped') {
                notes = window.prompt('Add a note for skipping this task (optional)', '') || '';
            }
            await mutation.mutateAsync({ taskId, status, notes });
        } catch (err) {
            if (err instanceof Error && err.message.includes('initials')) {
                window.alert(err.message);
                return;
            }

            const apiMessage = err?.response?.data?.message ?? err?.message ?? 'Unable to update task.';
            window.alert(apiMessage);
        }
    };

    const isWithinWindow = (task) => {
        // If no window defined, allow any time
        if (!task?.window_start && !task?.window_end) return true;
        try {
            const dateStr = selectedDate; // 'YYYY-MM-DD'
            const now = new Date();
            // Build Date objects in local time
            const start = task.window_start ? new Date(`${dateStr}T${task.window_start}:00`) : null;
            const end = task.window_end ? new Date(`${dateStr}T${task.window_end}:00`) : null;
            // Extend by ±1 hour around provided times
            let windowStart = start ? new Date(start.getTime() - 60 * 60 * 1000) : null;
            let windowEnd = end ? new Date(end.getTime() + 60 * 60 * 1000) : null;
            // If only one side provided, use that bound with ±1h against itself
            if (!windowStart && end) windowStart = new Date(end.getTime() - 60 * 60 * 1000);
            if (!windowEnd && start) windowEnd = new Date(start.getTime() + 60 * 60 * 1000);
            return now >= windowStart && now <= windowEnd;
        } catch {
            return true;
        }
    };

    const renderTask = (task) => {
        const badgeStyle = statusStyles[task.status] ?? statusStyles.pending;
        const windowOk = isWithinWindow(task);
        const disabled = mutation.isLoading || task.status === 'completed' || !windowOk;

        return (
            <div key={task.id} className="rounded-2xl border border-gray-100 bg-white/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h4 className="text-base font-semibold text-gray-900">{task.title}</h4>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badgeStyle}`}>
                                {task.status === 'pending' ? 'Pending' : task.status === 'completed' ? 'Completed' : 'Skipped'}
                            </span>
                        </div>
                        {task.instructions ? <p className="mt-1 text-sm text-gray-500">{task.instructions}</p> : null}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span className="font-medium uppercase tracking-wide text-gray-500">{task.frequency}</span>
                            {task.initials ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                                    <StickyNote className="h-3 w-3" />
                                    {task.initials}
                                </span>
                            ) : null}
                            {task.window_start || task.window_end ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                                    Window{' '}
                                    {(task.window_start ?? '—') +
                                        ' — ' +
                                        (task.window_end ?? '—')}
                                </span>
                            ) : null}
                            {task.completed_at ? (
                                <span>Completed at {new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            ) : null}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleStatusUpdate(task.id, 'completed')}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                        >
                            {mutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Complete
                        </button>
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleStatusUpdate(task.id, 'skipped')}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-amber-50 disabled:text-amber-300"
                        >
                            <XCircle className="h-4 w-4" />
                            Skip
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <header className="rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wide text-emerald-100">Daily Operations</p>
                        <h1 className="text-3xl font-semibold">Housekeeping Checklist</h1>
                        <p className="mt-2 max-w-2xl text-sm text-emerald-50">
                            Track cleaning responsibilities across rooms, floats, and shifts. Mark tasks complete with your initials to keep the
                            log up to date.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <label className="text-xs uppercase tracking-wide text-emerald-100">Checklist Date</label>
                        <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-2 shadow-inner backdrop-blur">
                            <CalendarDays className="h-5 w-5 text-white" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(event) => setSelectedDate(event.target.value)}
                                className="rounded-lg border border-white/30 bg-transparent px-3 py-2 text-white placeholder:text-white/60 focus:border-white focus:outline-none"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['cleaning-checklists'] })}
                            className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white shadow-inner transition hover:bg-white/25"
                        >
                            <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>
            </header>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your Initials</label>
                        <input
                            type="text"
                            value={initials}
                            onChange={(event) => {
                                const value = event.target.value.toUpperCase().slice(0, 8);
                                setInitials(value);
                                localStorage.setItem('housekeeping_initials', value);
                            }}
                            placeholder="e.g. JD"
                            className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                    </div>
                    <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2 font-semibold text-gray-800">
                            <Info className="h-4 w-4" />
                            Reminder
                        </div>
                        <p className="mt-2">
                            Swing shift float staff are expected to close the house before the end of their shift. Use this log to confirm every
                            item is checked before leaving.
                        </p>
                    </div>
                </div>
            </section>

            {isLoading ? (
                <div className="flex items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-16 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-3 text-sm font-medium">Loading checklist...</span>
                </div>
            ) : error ? (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
                    Unable to load checklists. {error.response?.data?.message || error.message}
                </div>
            ) : areas.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-sm">
                    <Sparkles className="mx-auto h-12 w-12 text-emerald-200" />
                    <h3 className="mt-4 text-lg font-semibold text-gray-900">No cleaning areas configured</h3>
                    <p className="mt-2 text-sm text-gray-500">
                        Ask an administrator to configure cleaning areas for your branch so you can start tracking daily chores.
                    </p>
                </div>
            ) : (
                areas.map((area) => (
                    <section key={area.id} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                        <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                        <Sparkles className="h-5 w-5" />
                                    </span>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{area.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            {area.shift_label ? `${area.shift_label} • ` : ''}
                                            {area.location || 'On-site'}
                                        </p>
                                    </div>
                                </div>
                                {area.description ? <p className="mt-3 text-sm text-gray-600">{area.description}</p> : null}
                            </div>
                            <div className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                                {area.tasks?.length ?? 0} tasks
                            </div>
                        </div>
                        <div className="mt-4 space-y-4">{area.tasks?.length ? area.tasks.map(renderTask) : <p className="text-sm text-gray-500">No tasks scheduled for this date.</p>}</div>
                    </section>
                ))
            )}
        </div>
    );
}




