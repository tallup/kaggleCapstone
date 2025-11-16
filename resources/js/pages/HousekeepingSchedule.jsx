import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Sparkles,
    Plus,
    Loader2,
    Calendar,
    Clock3,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    Edit3,
    Trash2,
    Building2,
} from 'lucide-react';
import api from '../services/api';

const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'adhoc', label: 'Ad hoc' },
];

const dayOptions = [
    { value: 'sunday', label: 'Sunday' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
];

export default function HousekeepingSchedule() {
    const formatTime = (value) => {
        if (!value) return '';
        try {
            return new Intl.DateTimeFormat('en-US', {
                hour: 'numeric',
                minute: '2-digit',
            }).format(new Date(`1970-01-01T${value}`));
        } catch (err) {
            return value;
        }
    };

    const formatDateLabel = (value) => {
        if (!value) return '';
        try {
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            }).format(new Date(value));
        } catch (err) {
            return value;
        }
    };

    const queryClient = useQueryClient();
    const [selectedAreaId, setSelectedAreaId] = React.useState(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingTask, setEditingTask] = React.useState(null);
    const [isAreaModalOpen, setIsAreaModalOpen] = React.useState(false);
    const [assignmentDate, setAssignmentDate] = React.useState(() => new Date().toISOString().slice(0, 10));
    const [assignmentTask, setAssignmentTask] = React.useState(null);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = React.useState(false);

    const { data: areasData, isLoading: areasLoading, error: areasError } = useQuery({
        queryKey: ['cleaning-areas'],
        queryFn: async () => {
            const response = await api.get('/cleaning/areas');
            return response.data.data || [];
        },
    });

    React.useEffect(() => {
        if (!selectedAreaId && Array.isArray(areasData) && areasData.length > 0) {
            setSelectedAreaId(areasData[0].id);
        }
    }, [areasData, selectedAreaId]);

    const { data: currentUser } = useQuery({
        queryKey: ['housekeeping-current-user'],
        queryFn: async () => {
            const response = await api.get('/user');
            return response.data;
        },
    });

const { data: caregiversData } = useQuery({
    queryKey: ['caregiver-users'],
    queryFn: async () => {
        const response = await api.get('/users', {
            params: { per_page: 100, status: 'active', role: 'caregiver' },
        });
        return response.data;
    },
});
const caregivers = caregiversData?.data ?? [];

    const {
        data: tasksData,
        isLoading: tasksLoading,
        error: tasksError,
    } = useQuery({
        queryKey: ['cleaning-tasks', selectedAreaId, assignmentDate],
        queryFn: async () => {
            const response = await api.get('/cleaning/tasks', {
                params: {
                    area_id: selectedAreaId,
                    per_page: 200,
                    date: assignmentDate,
                },
            });
            return response.data?.data ?? [];
        },
        enabled: Boolean(selectedAreaId),
    });

    const createTask = useMutation({
        mutationFn: (payload) => api.post('/cleaning/tasks', payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cleaning-tasks'] });
        },
    });

    const updateTask = useMutation({
        mutationFn: ({ id, ...payload }) => api.put(`/cleaning/tasks/${id}`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cleaning-tasks'] });
        },
    });

    const deleteTask = useMutation({
        mutationFn: (id) => api.delete(`/cleaning/tasks/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cleaning-tasks'] });
        },
    });

const assignCaregiver = useMutation({
    mutationFn: ({ taskId, userId }) =>
        api.post(`/cleaning/tasks/${taskId}/assignments`, {
            user_id: userId,
            scheduled_date: assignmentDate,
        }),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['cleaning-tasks'] });
    },
});

const removeAssignment = useMutation({
    mutationFn: (assignmentId) => api.delete(`/cleaning/task-assignments/${assignmentId}`),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['cleaning-tasks'] });
    },
});

    const openCreateModal = () => {
        setEditingTask(null);
        setIsModalOpen(true);
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setEditingTask(null);
        setIsModalOpen(false);
    };

const openAssignmentModal = (task) => {
    setAssignmentTask(task);
    setIsAssignmentModalOpen(true);
};

const closeAssignmentModal = () => {
    setAssignmentTask(null);
    setIsAssignmentModalOpen(false);
};

    const handleSubmit = async (formData) => {
        const payload = {
            ...formData,
            cleaning_area_id: selectedAreaId,
        };

        if (editingTask) {
            await updateTask.mutateAsync({ id: editingTask.id, ...payload });
        } else {
            await createTask.mutateAsync(payload);
        }

        closeModal();
    };

    const selectedArea = areasData?.find((area) => area.id === selectedAreaId);
    const branchId = currentUser?.assigned_branch_id ?? currentUser?.assigned_branch?.id ?? null;

    return (
        <div className="space-y-6">
            <header className="rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 p-6 text-white shadow-lg">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wide text-emerald-100">Scheduling</p>
                        <h1 className="text-3xl font-semibold">Housekeeping Schedule Builder</h1>
                        <p className="mt-2 max-w-2xl text-sm text-emerald-50">
                            Create and manage cleaning tasks for every room, float, and shift. These tasks flow directly into the daily checklist.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        disabled={!selectedAreaId}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-emerald-600 shadow-lg transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/70"
                    >
                        <Plus className="h-4 w-4" />
                        Add Task
                    </button>
                </div>
            </header>

            <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <label className="text-sm font-semibold text-gray-700">
                    Assignment Date
                    <div className="mt-2 flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-2">
                        <Calendar className="h-5 w-5 text-emerald-500" />
                        <input
                            type="date"
                            value={assignmentDate}
                            onChange={(event) => setAssignmentDate(event.target.value)}
                            className="flex-1 border-0 bg-transparent text-sm text-gray-700 outline-none"
                        />
                        <span className="text-xs font-semibold text-gray-400">{formatDateLabel(assignmentDate)}</span>
                    </div>
                </label>
            </section>

            <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
                <aside className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Cleaning Areas</h2>
                            {!branchId ? (
                                <p className="text-xs text-red-500">Assign a branch to your profile first.</p>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsAreaModalOpen(true)}
                            disabled={!branchId}
                            className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Plus className="h-3 w-3" />
                            Area
                        </button>
                    </div>
                    {areasLoading ? (
                        <div className="mt-6 flex items-center text-sm text-gray-500">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading areas...
                        </div>
                    ) : areasError ? (
                        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            Unable to load areas. {areasError.response?.data?.message || areasError.message}
                        </div>
                    ) : !areasData?.length ? (
                        <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
                            No cleaning areas found. Use the “Area” button above to create your first one.
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {areasData.map((area) => {
                                const isActive = area.id === selectedAreaId;
                                return (
                                    <button
                                        key={area.id}
                                        type="button"
                                        onClick={() => setSelectedAreaId(area.id)}
                                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                                            isActive
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                : 'border-gray-100 bg-white text-gray-700 hover:border-emerald-100'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold">{area.name}</div>
                                            <span className="text-xs text-gray-400">{area.tasks_count} tasks</span>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {[area.shift_label, area.location].filter(Boolean).join(' • ') || 'On-site'}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </aside>

                <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                    {!selectedAreaId ? (
                        <div className="flex min-h-[240px] flex-col items-center justify-center text-center text-sm text-gray-500">
                            <Sparkles className="mb-3 h-10 w-10 text-emerald-200" />
                            Select an area to start managing its tasks.
                        </div>
                    ) : tasksLoading ? (
                        <div className="flex min-h-[240px] items-center justify-center text-sm text-gray-500">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading tasks...
                        </div>
                    ) : tasksError ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                            Unable to load tasks. {tasksError.response?.data?.message || tasksError.message}
                        </div>
                    ) : !tasksData.length ? (
                        <div className="flex min-h-[240px] flex-col items-center justify-center text-center text-sm text-gray-500">
                            <Sparkles className="mb-3 h-10 w-10 text-emerald-200" />
                            No tasks for this area yet. Click “Add Task” to create one.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tasksData.map((task) => (
                                <article key={task.id} className="rounded-2xl border border-gray-100 p-4 shadow-sm">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                                                {!task.is_active ? (
                                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
                                                        Inactive
                                                    </span>
                                                ) : null}
                                                {task.is_required ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Required
                                                    </span>
                                                ) : null}
                                            </div>
                                            {task.instructions ? (
                                                <p className="mt-2 text-sm text-gray-600">{task.instructions}</p>
                                            ) : null}
                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                                                    <Calendar className="h-3 w-3" />
                                                    {task.frequency ? task.frequency.charAt(0).toUpperCase() + task.frequency.slice(1) : 'Daily'}
                                                </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-gray-500 ring-1 ring-gray-200">
                                <Clock3 className="h-3 w-3" />
                                {task.window_start || task.window_end
                                    ? `${task.window_start ? formatTime(task.window_start) : 'Start'} – ${
                                          task.window_end ? formatTime(task.window_end) : 'End'
                                      }`
                                    : 'Anytime'}
                            </span>
                                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                                                    <Clock3 className="h-3 w-3" />
                                                    {task.estimated_minutes ? `${task.estimated_minutes} min` : 'Flexible'}
                                                </span>
                                                {Array.isArray(task.days_of_week) && task.days_of_week.length ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-gray-500 ring-1 ring-gray-200">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {task.days_of_week.map((day) => day.substring(0, 3).toUpperCase()).join(', ')}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-gray-400 ring-1 ring-gray-200">
                                                        <XCircle className="h-3 w-3" />
                                                        All days
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                                                {task.assignments?.length ? (
                                                    task.assignments.map((assignment) => (
                                                        <span
                                                            key={assignment.id}
                                                            className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-0.5 font-semibold text-emerald-700"
                                                        >
                                                            {assignment.user?.name || 'Caregiver'}
                                                            <span className="text-[10px] uppercase text-emerald-500">
                                                                {assignment.status}
                                                            </span>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-400">
                                                        No caregiver assigned for {formatDateLabel(assignmentDate)}.
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openAssignmentModal(task)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50"
                                            >
                                                <Sparkles className="h-4 w-4" />
                                                Assign
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(task)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (window.confirm('Delete this task? This cannot be undone.')) {
                                                        try {
                                                            await deleteTask.mutateAsync(task.id);
                                                        } catch (err) {
                                                            window.alert(err?.response?.data?.message || err.message);
                                                        }
                                                    }
                                                }}
                                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </section>

            {isModalOpen ? (
                <TaskModal
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                    initialValues={editingTask}
                    isSaving={createTask.isLoading || updateTask.isLoading}
                />
            ) : null}

            {isAreaModalOpen ? (
                <AreaModal
                    onClose={() => setIsAreaModalOpen(false)}
                    branchId={branchId}
                    onCreated={async (payload) => {
                        try {
                            await api.post('/cleaning/areas', payload);
                            await queryClient.invalidateQueries({ queryKey: ['cleaning-areas'] });
                            setIsAreaModalOpen(false);
                        } catch (err) {
                            window.alert(err?.response?.data?.message || err.message);
                        }
                    }}
                />
            ) : null}

            {isAssignmentModalOpen && assignmentTask ? (
                <AssignmentModal
                    task={assignmentTask}
                    date={assignmentDate}
                    caregivers={caregivers}
                    onAssign={async (userId) => {
                        try {
                            await assignCaregiver.mutateAsync({ taskId: assignmentTask.id, userId });
                            await queryClient.invalidateQueries({ queryKey: ['cleaning-tasks'] });
                        } catch (err) {
                            window.alert(err?.response?.data?.message || err.message);
                        }
                    }}
                    onRemove={async (assignmentId) => {
                        try {
                            await removeAssignment.mutateAsync(assignmentId);
                            await queryClient.invalidateQueries({ queryKey: ['cleaning-tasks'] });
                        } catch (err) {
                            window.alert(err?.response?.data?.message || err.message);
                        }
                    }}
                    isSaving={assignCaregiver.isLoading || removeAssignment.isLoading}
                    onClose={closeAssignmentModal}
                />
            ) : null}
        </div>
    );
}

function TaskModal({ onClose, onSubmit, initialValues, isSaving }) {
    const [formValues, setFormValues] = React.useState(() => ({
        title: initialValues?.title ?? '',
        instructions: initialValues?.instructions ?? '',
        frequency: initialValues?.frequency ?? 'daily',
        window_start: initialValues?.window_start ?? '',
        window_end: initialValues?.window_end ?? '',
        days_of_week: initialValues?.days_of_week ?? [],
        estimated_minutes: initialValues?.estimated_minutes ?? '',
        display_order: initialValues?.display_order ?? 0,
        is_required: initialValues?.is_required ?? true,
        is_active: initialValues?.is_active ?? true,
    }));

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormValues((prev) => ({
            ...prev,
            [name]: type === 'checkbox' && name !== 'is_required' && name !== 'is_active' ? value : type === 'checkbox' ? checked : value,
        }));
    };

    const toggleDay = (day) => {
        setFormValues((prev) => {
            const current = Array.isArray(prev.days_of_week) ? prev.days_of_week : [];
            if (current.includes(day)) {
                return { ...prev, days_of_week: current.filter((value) => value !== day) };
            }
            return { ...prev, days_of_week: [...current, day] };
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            await onSubmit({
                title: formValues.title.trim(),
                instructions: formValues.instructions?.trim() || null,
                frequency: formValues.frequency,
                window_start: formValues.window_start || null,
                window_end: formValues.window_end || null,
                days_of_week: formValues.days_of_week,
                estimated_minutes: formValues.estimated_minutes ? Number(formValues.estimated_minutes) : null,
                display_order: Number(formValues.display_order ?? 0),
                is_required: Boolean(formValues.is_required),
                is_active: Boolean(formValues.is_active),
            });
        } catch (err) {
            window.alert(err?.response?.data?.message || err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">
                            {initialValues ? 'Edit Task' : 'Create Task'}
                        </p>
                        <h2 className="text-2xl font-semibold text-gray-900">{initialValues ? initialValues.title : 'New Task'}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="text-sm font-semibold text-gray-700">Task Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formValues.title}
                            onChange={handleChange}
                            required
                            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-gray-700">Instructions</label>
                        <textarea
                            name="instructions"
                            value={formValues.instructions}
                            onChange={handleChange}
                            rows={3}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Frequency</label>
                            <select
                                name="frequency"
                                value={formValues.frequency}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            >
                                {frequencyOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Start Window</label>
                            <input
                                type="time"
                                name="window_start"
                                value={formValues.window_start || ''}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700">End Window</label>
                            <input
                                type="time"
                                name="window_end"
                                value={formValues.window_end || ''}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Display Order</label>
                            <input
                                type="number"
                                name="display_order"
                                value={formValues.display_order}
                                onChange={handleChange}
                                min={0}
                                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Estimated Minutes</label>
                            <input
                                type="number"
                                name="estimated_minutes"
                                value={formValues.estimated_minutes}
                                onChange={handleChange}
                                min={1}
                                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                placeholder="e.g. 10"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-gray-700">Days of week</label>
                        <p className="text-xs text-gray-400">Leave blank to show on every day.</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {dayOptions.map((day) => {
                                const checked = Array.isArray(formValues.days_of_week) && formValues.days_of_week.includes(day.value);
                                return (
                                    <label
                                        key={day.value}
                                        className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                                            checked
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                : 'border-gray-200 text-gray-600'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleDay(day.value)}
                                        />
                                        {day.label}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                            <input
                                type="checkbox"
                                name="is_required"
                                checked={Boolean(formValues.is_required)}
                                onChange={(event) =>
                                    setFormValues((prev) => ({ ...prev, is_required: event.target.checked }))
                                }
                            />
                            <div>
                                <div className="text-sm font-semibold text-gray-800">Required before shift ends</div>
                                <p className="text-xs text-gray-500">Task must be marked complete before closing the shift.</p>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={Boolean(formValues.is_active)}
                                onChange={(event) =>
                                    setFormValues((prev) => ({ ...prev, is_active: event.target.checked }))
                                }
                            />
                            <div>
                                <div className="text-sm font-semibold text-gray-800">Active task</div>
                                <p className="text-xs text-gray-500">Inactive tasks are hidden from daily checklists.</p>
                            </div>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            {initialValues ? 'Save Changes' : 'Create Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AreaModal({ onClose, branchId, onCreated }) {
    const [formValues, setFormValues] = React.useState({
        name: '',
        shift_label: '',
        location: '',
        description: '',
        display_order: 0,
        is_active: true,
    });

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormValues((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!branchId) {
            window.alert('Please assign a branch to your profile first.');
            return;
        }

        await onCreated({
            ...formValues,
            branch_id: branchId,
            name: formValues.name.trim(),
            shift_label: formValues.shift_label?.trim() || null,
            location: formValues.location?.trim() || null,
            description: formValues.description?.trim() || null,
            display_order: Number(formValues.display_order ?? 0),
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">New Area</p>
                        <h2 className="text-2xl font-semibold text-gray-900">Cleaning Area</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-gray-700">Area Name</label>
                        <input
                            type="text"
                            name="name"
                            value={formValues.name}
                            onChange={handleChange}
                            required
                            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            placeholder="e.g. Kitchen, Float #1"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Shift / Assignment Label</label>
                            <input
                                type="text"
                                name="shift_label"
                                value={formValues.shift_label}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                placeholder="e.g. Day Shift"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formValues.location}
                                onChange={handleChange}
                                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                placeholder="e.g. Main Level"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-gray-700">Description / Notes</label>
                        <textarea
                            name="description"
                            value={formValues.description}
                            onChange={handleChange}
                            rows={3}
                            className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            placeholder="Responsibilities, reminders, etc."
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-semibold text-gray-700">Display Order</label>
                            <input
                                type="number"
                                name="display_order"
                                value={formValues.display_order}
                                onChange={handleChange}
                                min={0}
                                className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            />
                        </div>
                        <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
                            <input
                                type="checkbox"
                                name="is_active"
                                checked={formValues.is_active}
                                onChange={handleChange}
                            />
                            <div>
                                <div className="text-sm font-semibold text-gray-800">Active area</div>
                                <p className="text-xs text-gray-500">Inactive areas stay hidden but aren’t deleted.</p>
                            </div>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                        >
                            <Building2 className="h-4 w-4" />
                            Save Area
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AssignmentModal({ task, date, caregivers, onAssign, onRemove, isSaving, onClose }) {
    const [selectedCaregiver, setSelectedCaregiver] = React.useState('');
    const assignments = task.assignments ?? [];

    const handleAssign = async (event) => {
        event.preventDefault();
        if (!selectedCaregiver) {
            window.alert('Select a caregiver first.');
            return;
        }
        const userId = selectedCaregiver;
        // Close immediately per request, then perform the mutation in background
        onClose?.();
        await onAssign(userId);
        setSelectedCaregiver('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-500">Assignments</p>
                        <h2 className="text-2xl font-semibold text-gray-900">{task.title}</h2>
                        <p className="text-sm text-gray-500">For {new Date(date).toLocaleDateString()}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                    >
                        <XCircle className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <h3 className="text-sm font-semibold text-gray-800">Assign Caregiver</h3>
                        <form onSubmit={handleAssign} className="mt-3 flex flex-col gap-3 md:flex-row">
                            <select
                                value={selectedCaregiver}
                                onChange={(event) => setSelectedCaregiver(event.target.value)}
                                className="flex-1 rounded-2xl border border-gray-200 px-4 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                            >
                                <option value="">Select caregiver</option>
                                {caregivers.map((caregiver) => (
                                    <option key={caregiver.id} value={caregiver.id}>
                                        {caregiver.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="submit"
                                disabled={isSaving || !selectedCaregiver}
                                className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                            >
                                Assign
                            </button>
                        </form>
                    </div>

                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-800">
                            Assigned Caregivers ({assignments.length})
                        </h3>
                        {assignments.length === 0 ? (
                            <p className="mt-2 text-sm text-gray-500">No caregivers assigned for this date.</p>
                        ) : (
                            <ul className="mt-3 space-y-2">
                                {assignments.map((assignment) => (
                                    <li
                                        key={assignment.id}
                                        className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-2 text-sm"
                                    >
                                        <div>
                                            <div className="font-semibold text-gray-900">
                                                {assignment.user?.name || 'Caregiver'}
                                            </div>
                                            <p className="text-xs text-gray-500 capitalize">{assignment.status}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onRemove(assignment.id)}
                                            disabled={isSaving}
                                            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed"
                                        >
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

