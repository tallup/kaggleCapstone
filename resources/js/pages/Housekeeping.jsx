import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, CalendarDays, RefreshCcw, CheckCircle2, XCircle, Loader2, StickyNote, Info, Building2 } from 'lucide-react';
import api from '../services/api';
import { getLocalDateString } from '../utils/pacificTime';
import BranchSelector from '../components/BranchSelector';
import Modal from '../components/ui/Modal';

const getStatusStyles = (status) => {
    switch (status) {
        case 'completed':
            return { backgroundColor: 'var(--theme-primary-bg)', color: 'var(--theme-primary)', borderColor: 'var(--theme-primary-bg)' };
        case 'skipped':
            return { backgroundColor: 'rgba(251, 191, 36, 0.1)', color: 'rgb(180, 83, 9)', borderColor: 'rgba(251, 191, 36, 0.3)' };
        case 'pending':
        default:
            return { backgroundColor: 'rgb(243, 244, 246)', color: 'rgb(75, 85, 99)', borderColor: 'rgb(229, 231, 235)' };
    }
};

export default function Housekeeping() {
    const [searchParams] = useSearchParams();
    const selectedBranchId = searchParams.get('branch');
    const queryClient = useQueryClient();
    const [selectedDate, setSelectedDate] = React.useState(() => getLocalDateString());
    const [skipNotesModal, setSkipNotesModal] = React.useState({ open: false, taskId: null, notes: '' });
    const [expandedSkipTask, setExpandedSkipTask] = React.useState(null); // Track which task is showing skip input
    const [skipNotes, setSkipNotes] = React.useState({}); // Store skip notes per task

    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const response = await api.get('/user');
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const { data, isLoading, error, isFetching } = useQuery({
        queryKey: ['cleaning-checklists', selectedDate, selectedBranchId],
        queryFn: async () => {
            const params = { date: selectedDate };
            if (selectedBranchId) {
                params.branch_id = selectedBranchId;
            }
            const response = await api.get('/cleaning/checklists', { params });
            return response.data;
        },
        enabled: !!selectedBranchId, // Only fetch if branch is selected
        staleTime: 30 * 1000, // Cache for 30 seconds - checklist data changes frequently
        keepPreviousData: true,
    });

    const mutation = useMutation({
        mutationFn: async ({ taskId, status, notes }) => {
            const payload = {
                task_id: taskId,
                status,
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

    const handleStatusUpdate = async (taskId, status, notes = '') => {
        try {
            await mutation.mutateAsync({ taskId, status, notes });
            if (status === 'skipped') {
                setSkipNotesModal({ open: false, taskId: null, notes: '' });
                setExpandedSkipTask(null);
                setSkipNotes({ ...skipNotes, [taskId]: '' });
            }
        } catch (err) {
            const apiMessage = err?.response?.data?.message ?? err?.message ?? 'Unable to update task.';
            window.alert(apiMessage);
        }
    };

    const handleSkipClick = (taskId) => {
        // Toggle inline skip input for this task
        if (expandedSkipTask === taskId) {
            setExpandedSkipTask(null);
        } else {
            setExpandedSkipTask(taskId);
            // Initialize notes if not already set
            if (!skipNotes[taskId]) {
                setSkipNotes({ ...skipNotes, [taskId]: '' });
            }
        }
    };

    const handleSkipSubmit = (taskId) => {
        const notes = skipNotes[taskId] || '';
        handleStatusUpdate(taskId, 'skipped', notes);
        setExpandedSkipTask(null);
        setSkipNotes({ ...skipNotes, [taskId]: '' });
    };

    const handleSkipCancel = (taskId) => {
        setExpandedSkipTask(null);
        setSkipNotes({ ...skipNotes, [taskId]: '' });
    };

    const isToday = React.useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);
        return selectedDate === today;
    }, [selectedDate]);

    const isWithinWindow = (task) => {
        // If no window defined, allow any time
        if (!task?.window_start && !task?.window_end) return true;
        // Only enforce window for today's checklist; other dates should be editable without realtime gating
        if (!isToday) return true;
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
        const badgeStyles = getStatusStyles(task.status);
        const windowOk = isWithinWindow(task);
        const completedOnSelectedDate =
            Boolean(task.completed_at) && String(task.completed_at).slice(0, 10) === selectedDate;
        const disabled = mutation.isLoading || completedOnSelectedDate || !windowOk;
        const isSkipExpanded = expandedSkipTask === task.id;

        return (
            <div key={task.id} className="rounded-2xl border border-gray-100 bg-white/80 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h4 className="text-base font-semibold text-gray-900">{task.title}</h4>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1" style={badgeStyles}>
                                {task.status === 'pending' ? 'Pending' : task.status === 'completed' ? 'Completed' : 'Skipped'}
                            </span>
                        </div>
                        {task.instructions ? <p className="mt-1 text-sm text-gray-500">{task.instructions}</p> : null}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            <span className="font-medium uppercase tracking-wide text-gray-500">{task.frequency}</span>
                            {task.completed_by_name ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                                    <StickyNote className="h-3 w-3" />
                                    {task.completed_by_name}
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
                        
                        {/* Inline Skip Reason Input */}
                        {isSkipExpanded && (
                            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                                <label htmlFor={`skip-reason-${task.id}`} className="block text-sm font-semibold text-gray-900 mb-2">
                                    Reason for skipping <span className="text-gray-500 font-normal text-xs">(optional)</span>
                                </label>
                                <textarea
                                    id={`skip-reason-${task.id}`}
                                    value={skipNotes[task.id] || ''}
                                    onChange={(e) => setSkipNotes({ ...skipNotes, [task.id]: e.target.value })}
                                    placeholder="Enter reason for skipping this task..."
                                    rows={3}
                                    maxLength={1000}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                                />
                                <div className="mt-2 flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                        {(skipNotes[task.id] || '').length}/1000 characters
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleSkipCancel(task.id)}
                                            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSkipSubmit(task.id)}
                                            disabled={mutation.isLoading}
                                            className="px-3 py-1.5 text-sm font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                                        >
                                            {mutation.isLoading ? (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    Skipping...
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="h-3.5 w-3.5" />
                                                    Skip Task
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-2">
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleStatusUpdate(task.id, 'completed')}
                            className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--theme-primary-hover)] disabled:cursor-not-allowed"
                            style={{ backgroundColor: 'var(--theme-primary)' }}
                        >
                            {mutation.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Complete
                        </button>
                        <button
                            type="button"
                            disabled={disabled || isSkipExpanded}
                            onClick={() => handleSkipClick(task.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300 disabled:text-amber-100"
                        >
                            <XCircle className="h-4 w-4" />
                            {isSkipExpanded ? 'Cancel' : 'Skip'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Show branch selector and wait for branch selection
    if (!selectedBranchId) {
        return (
            <div className="space-y-6">
                <BranchSelector currentUser={currentUser} />
                <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-4 text-sm font-semibold text-gray-700">Please select a branch to continue</p>
                    <p className="mt-2 text-xs text-gray-500">Select a branch from the dropdown above to view and manage housekeeping checklists.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <BranchSelector currentUser={currentUser} />
            <header 
                className="rounded-3xl p-6 text-white shadow-lg" 
                style={{ 
                    background: 'linear-gradient(to right, var(--theme-primary), var(--theme-primary-light), var(--theme-primary))'
                }}
            >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--theme-text-on-primary)' }}>Daily Operations</p>
                        <h1 className="text-3xl font-semibold">Housekeeping Checklist</h1>
                        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--theme-text-on-primary)' }}>
                            Track cleaning responsibilities across rooms, floats, and shifts. Mark tasks complete to keep the
                            log up to date.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <label className="text-xs uppercase tracking-wide" style={{ color: 'var(--theme-text-on-primary)' }}>Checklist Date</label>
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
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2 font-semibold text-gray-800">
                        <Info className="h-4 w-4" />
                        Reminder
                    </div>
                    <p className="mt-2">
                        Maintaining high standards of cleanliness and hygiene is essential for the health and safety of our residents. All staff members are expected to take their housekeeping responsibilities seriously, as state inspectors may conduct unannounced visits at any time. Please ensure all tasks are completed thoroughly and documented accurately.
                    </p>
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
                    <Sparkles className="mx-auto h-12 w-12" style={{ color: 'var(--theme-primary-bg)' }} />
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
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--theme-primary-bg)', color: 'var(--theme-primary)' }}>
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

            <Modal
                isOpen={skipNotesModal.open}
                onClose={() => !mutation.isLoading && setSkipNotesModal({ open: false, taskId: null, notes: '' })}
                title="Skip task"
                size="md"
            >
                <p className="text-sm text-gray-500 mb-4">
                    Add a note explaining why this task is being skipped (optional).
                </p>
                <div className="space-y-2">
                    <label htmlFor="skip-reason" className="block text-sm font-bold text-gray-900" style={{ color: '#111827' }}>
                        Reason <span className="text-gray-400 font-normal text-xs">(optional)</span>
                    </label>
                    <textarea
                        id="skip-reason"
                        value={skipNotesModal.notes}
                        onChange={(e) => setSkipNotesModal({ ...skipNotesModal, notes: e.target.value })}
                        placeholder="Enter reason for skipping..."
                        rows={4}
                        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-[var(--theme-primary)]"
                        style={{ '--tw-ring-color': 'var(--theme-primary-bg)' }}
                        maxLength={1000}
                    />
                    <p className="text-xs text-gray-500">
                        {skipNotesModal.notes.length}/1000 characters
                    </p>
                </div>
                <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={() => setSkipNotesModal({ open: false, taskId: null, notes: '' })}
                        disabled={mutation.isLoading}
                        className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSkipSubmit}
                        disabled={mutation.isLoading}
                        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: 'var(--theme-primary)' }}
                    >
                        {mutation.isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Skipping...
                            </>
                        ) : (
                            <>
                                <XCircle className="h-4 w-4" />
                                Skip Task
                            </>
                        )}
                    </button>
                </div>
            </Modal>
        </div>
    );
}




