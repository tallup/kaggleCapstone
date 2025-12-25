import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import {
    Sparkles,
    Plus,
    Loader2,
    Calendar,
    Clock3,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    X,
    Edit3,
    Trash2,
    Building2,
    ArrowLeft,
} from 'lucide-react';
import api from '../services/api';
import { getLocalDateString } from '../utils/pacificTime';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormCheckbox from '../components/forms/FormCheckbox';
import FormSelect from '../components/forms/FormSelect';

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
    const [editingArea, setEditingArea] = React.useState(null);
    const [assignmentDate, setAssignmentDate] = React.useState(() => getLocalDateString());
    const [assignmentTask, setAssignmentTask] = React.useState(null);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = React.useState(false);

    const { data: areasData, isLoading: areasLoading, error: areasError } = useQuery({
        queryKey: ['cleaning-areas'],
        queryFn: async () => {
            const response = await api.get('/cleaning/areas');
            return response.data.data || [];
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    React.useEffect(() => {
        if (!selectedAreaId && Array.isArray(areasData) && areasData.length > 0) {
            setSelectedAreaId(areasData[0].id);
        }
    }, [areasData, selectedAreaId]);

    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const response = await api.get('/user');
            return response.data;
        },
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes - reuse global user query
    });

const { data: caregiversData } = useQuery({
    queryKey: ['caregiver-users'],
    queryFn: async () => {
        const response = await api.get('/users', {
            params: { per_page: 100, status: 'active', role: 'caregiver' },
        });
        return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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
        staleTime: 30 * 1000, // Cache for 30 seconds
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
            // cleaning_area_id comes from formData if provided, otherwise use selectedAreaId (for backward compatibility)
            cleaning_area_id: formData.cleaning_area_id || selectedAreaId,
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

    // Fetch branches for task form
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 100 } });
            return response.data;
        },
    });

    // If task form is open, show the form instead of the main content
    if (isModalOpen) {
        return (
            <TaskForm
                onClose={closeModal}
                onSubmit={handleSubmit}
                initialValues={editingTask}
                isSaving={createTask.isLoading || updateTask.isLoading}
                currentUser={currentUser}
                branches={branchesData?.data || []}
            />
        );
    }

    // If assignment form is open, show the form instead of the main content
    if (isAssignmentModalOpen && assignmentTask) {
        // Find the latest task data from the query to ensure we have up-to-date assignments
        const latestTask = tasksData?.find(t => t.id === assignmentTask.id) || assignmentTask;
        
        return (
            <AssignmentForm
                task={latestTask}
                date={assignmentDate}
                caregivers={caregivers}
                onAssign={async (userId) => {
                    try {
                        await assignCaregiver.mutateAsync({ taskId: assignmentTask.id, userId });
                        await queryClient.invalidateQueries({ queryKey: ['cleaning-tasks'] });
                    } catch (err) {
                        const errorMessage = err?.response?.data?.message 
                            || err?.response?.data?.error 
                            || err?.message 
                            || 'Failed to assign caregiver. Please try again.';
                        window.alert(errorMessage);
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
        );
    }

    return (
        <div className="space-y-6">
            <header 
                className="rounded-3xl p-6 text-white shadow-lg" 
                style={{ 
                    background: 'linear-gradient(to right, var(--theme-primary), var(--theme-primary-light), var(--theme-primary))'
                }}
            >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--theme-text-on-primary)' }}>Scheduling</p>
                        <h1 className="text-3xl font-semibold">Housekeeping Schedule Builder</h1>
                        <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--theme-text-on-primary)' }}>
                            Create and manage cleaning tasks for every room, float, and shift. These tasks flow directly into the daily checklist.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        disabled={!selectedAreaId}
                        className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold shadow-lg transition-colors hover:bg-[var(--theme-primary-bg-light)] disabled:cursor-not-allowed disabled:bg-white/70"
                        style={{ color: 'var(--theme-primary)' }}
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
                        <Calendar className="h-5 w-5" style={{ color: 'var(--theme-primary)' }} />
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
                            onClick={() => {
                                setEditingArea(null);
                                setIsAreaModalOpen(true);
                            }}
                            disabled={!branchId && !currentUser?.facility_id}
                            className="inline-flex items-center gap-1 rounded-xl border-2 bg-white px-3 py-1.5 text-xs font-bold transition-colors hover:bg-[var(--theme-primary-bg-light)] disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
                            style={{ borderColor: 'var(--theme-primary-bg)', color: 'var(--theme-primary)' }}
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
                                    <div 
                                        key={area.id} 
                                        className={`w-full rounded-2xl border px-4 py-3 transition-all cursor-pointer ${isActive ? '' : 'border-gray-100 bg-white text-gray-700 hover:border-[var(--theme-primary-bg)]'}`}
                                        style={isActive ? { borderColor: 'var(--theme-primary-bg)', backgroundColor: 'var(--theme-primary-bg)' } : {}}
                                        onClick={() => setSelectedAreaId(area.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-semibold ${isActive ? 'text-white' : 'text-gray-900'}`}>{area.name}</div>
                                                <p className={`text-xs ${isActive ? 'text-white/90' : 'text-gray-500'}`}>
                                                    {[area.shift_label, area.location].filter(Boolean).join(' • ') || 'On-site'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingArea(area);
                                                        setIsAreaModalOpen(true);
                                                    }}
                                                    className={`inline-flex items-center rounded-lg border p-2 transition-colors ${
                                                        isActive 
                                                            ? 'border-white/30 bg-white/20 text-white hover:bg-white/30' 
                                                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                                                    }`}
                                                    aria-label="Edit area"
                                                >
                                                    <Edit3 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (!window.confirm(`Delete area "${area.name}"? This cannot be undone.`)) {
                                                            return;
                                                        }
                                                        try {
                                                            await api.delete(`/cleaning/areas/${area.id}`);
                                                            if (selectedAreaId === area.id) {
                                                                setSelectedAreaId(null);
                                                            }
                                                            await queryClient.invalidateQueries({ queryKey: ['cleaning-areas'] });
                                                        } catch (err) {
                                                            window.alert(err?.response?.data?.message || err.message);
                                                        }
                                                    }}
                                                    className={`inline-flex items-center rounded-lg border p-2 transition-colors ${
                                                        isActive 
                                                            ? 'border-white/30 bg-white/20 text-white hover:bg-white/30' 
                                                            : 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                                                    }`}
                                                    aria-label="Delete area"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </aside>

                <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                    {!selectedAreaId ? (
                        <div className="flex min-h-[240px] flex-col items-center justify-center text-center text-sm text-gray-500">
                            <Sparkles className="mb-3 h-10 w-10" style={{ color: 'var(--theme-primary-bg)' }} />
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
                            <Sparkles className="mb-3 h-10 w-10" style={{ color: 'var(--theme-primary-bg)' }} />
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
                                                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: 'var(--theme-primary-bg)', color: 'var(--theme-primary)' }}>
                                                        <ShieldCheck className="h-3 w-3" />
                                                        Required
                                                    </span>
                                                ) : null}
                                            </div>
                                            {task.instructions ? (
                                                <p className="mt-2 text-sm text-gray-600">{task.instructions}</p>
                                            ) : null}
                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: 'var(--theme-primary-bg)', color: 'var(--theme-primary)' }}>
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
                                                            className="inline-flex items-center gap-1 rounded-full px-3 py-0.5 font-semibold"
                                                            style={{ backgroundColor: 'var(--theme-primary-bg)', color: 'var(--theme-primary)' }}
                                                        >
                                                            {assignment.user?.name || 'Caregiver'}
                                                            <span className="text-[10px] uppercase" style={{ color: 'var(--theme-primary)' }}>
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
                                                className="inline-flex items-center gap-1.5 rounded-lg border-2 px-4 py-2.5 text-sm font-bold transition-colors hover:bg-[var(--theme-primary-bg-light)] bg-white shadow-md"
                                                style={{ borderColor: 'var(--theme-primary-bg)', color: 'var(--theme-primary)' }}
                                            >
                                                <Sparkles className="h-4 w-4" />
                                                Assign
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(task)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-gray-400 px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-gray-100 bg-white shadow-md"
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
                                                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-red-400 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 bg-white shadow-md"
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

            {isAreaModalOpen ? (
                <AreaForm
                    onClose={() => {
                        setIsAreaModalOpen(false);
                        setEditingArea(null);
                    }}
                    branchId={branchId}
                    currentUser={currentUser}
                    initialValues={editingArea}
                    onSuccess={async () => {
                        await queryClient.invalidateQueries({ queryKey: ['cleaning-areas'] });
                        setIsAreaModalOpen(false);
                        setEditingArea(null);
                    }}
                />
            ) : null}

        </div>
    );
}

function TaskForm({ onClose, onSubmit, initialValues, isSaving, currentUser, branches }) {
    // Determine initial branch_id - use area's branch if editing, or current user's branch
    const getInitialBranchId = () => {
        if (initialValues?.area?.branch_id) {
            return initialValues.area.branch_id.toString();
        }
        if (initialValues?.cleaning_area_id) {
            // We'll fetch the area to get branch_id
            return null;
        }
        if (currentUser?.assigned_branch_id) {
            return currentUser.assigned_branch_id.toString();
        }
        return '';
    };

    const [selectedBranchId, setSelectedBranchId] = React.useState(getInitialBranchId());

    // Determine if user is facility admin or branch admin
    const isFacilityAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator';
    }, [currentUser]);

    const isBranchAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'admin';
    }, [currentUser]);

    // Fetch areas for selected branch
    const { data: areasForBranch } = useQuery({
        queryKey: ['cleaning-areas', selectedBranchId],
        queryFn: async () => {
            if (!selectedBranchId) return [];
            const response = await api.get('/cleaning/areas', {
                params: { branch_id: selectedBranchId }
            });
            return response.data.data || [];
        },
        enabled: Boolean(selectedBranchId),
    });

    const methods = useForm({
        defaultValues: {
            branch_id: getInitialBranchId(),
            cleaning_area_id: initialValues?.cleaning_area_id ? initialValues.cleaning_area_id.toString() : '',
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
        },
    });

    const { watch, setValue } = methods;

    // Fetch all areas to find branch_id when editing (if area doesn't have branch_id in relationship)
    const { data: allAreasData } = useQuery({
        queryKey: ['cleaning-areas-all'],
        queryFn: async () => {
            const response = await api.get('/cleaning/areas');
            return response.data.data || [];
        },
        enabled: Boolean(initialValues?.cleaning_area_id && !selectedBranchId && !initialValues?.area?.branch_id),
    });

    // If editing and we don't have branch_id yet, fetch the area to get it
    React.useEffect(() => {
        if (initialValues?.cleaning_area_id && !selectedBranchId) {
            // Try to get branch_id from area relationship first
            if (initialValues?.area?.branch_id) {
                setSelectedBranchId(initialValues.area.branch_id.toString());
                setValue('branch_id', initialValues.area.branch_id.toString());
            } else if (allAreasData) {
                // Fallback: find area in all areas data
                const area = allAreasData.find(a => a.id === initialValues.cleaning_area_id);
                if (area?.branch_id) {
                    setSelectedBranchId(area.branch_id.toString());
                    setValue('branch_id', area.branch_id.toString());
                }
            }
        }
    }, [initialValues, selectedBranchId, allAreasData, setValue]);
    const daysOfWeek = watch('days_of_week') || [];
    const isRequired = watch('is_required');
    const formBranchId = watch('branch_id');

    // Update selectedBranchId when form branch_id changes
    React.useEffect(() => {
        if (formBranchId !== selectedBranchId) {
            setSelectedBranchId(formBranchId || '');
            // Reset area when branch changes (unless editing existing task)
            if (formBranchId && !initialValues?.cleaning_area_id) {
                setValue('cleaning_area_id', '');
            }
        }
    }, [formBranchId, selectedBranchId, setValue, initialValues]);

    const toggleDay = (day) => {
        const current = Array.isArray(daysOfWeek) ? daysOfWeek : [];
        if (current.includes(day)) {
            setValue('days_of_week', current.filter((value) => value !== day), { shouldValidate: true });
        } else {
            setValue('days_of_week', [...current, day], { shouldValidate: true });
        }
    };

    const handleSubmit = async (data) => {
        try {
            await onSubmit({
                cleaning_area_id: parseInt(data.cleaning_area_id),
                title: data.title.trim(),
                instructions: data.instructions?.trim() || null,
                frequency: data.frequency,
                window_start: data.window_start || null,
                window_end: data.window_end || null,
                days_of_week: data.days_of_week,
                estimated_minutes: data.estimated_minutes ? Number(data.estimated_minutes) : null,
                display_order: Number(data.display_order ?? 0),
                is_required: Boolean(data.is_required),
                is_active: Boolean(data.is_active),
            });
        } catch (err) {
            window.alert(err?.response?.data?.message || err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to schedule
                </button>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {initialValues ? 'Edit Task' : 'New Task'}
                </p>
            </div>

            <div className="rounded-3xl bg-white shadow-lg ring-1 ring-gray-100">
                <div className="border-b border-gray-100 px-6 py-4 sm:px-8 sm:py-5">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {initialValues ? initialValues.title : 'Create New Task'}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {initialValues ? 'Update task details below.' : 'Fill in the details to create a new cleaning task.'}
                    </p>
                </div>

                <div className="px-6 py-6 sm:px-8 sm:py-8">
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-6">
                            {/* Branch Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Branch *
                                </label>
                                <select
                                    {...methods.register('branch_id', { required: true })}
                                    disabled={!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${
                                        !isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id 
                                            ? 'bg-gray-100 cursor-not-allowed opacity-75' 
                                            : ''
                                    }`}
                                >
                                    <option value="">Select Branch</option>
                                    {(branches || []).map(branch => (
                                        <option key={branch.id} value={branch.id.toString()}>
                                            {branch.name}
                                        </option>
                                    ))}
                                </select>
                                {methods.formState.errors.branch_id && (
                                    <p className="text-xs text-red-600 mt-1">Branch selection is required</p>
                                )}
                            </div>

                            {/* Area Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Cleaning Area *
                                </label>
                                <select
                                    {...methods.register('cleaning_area_id', { required: true })}
                                    disabled={!selectedBranchId || (areasForBranch?.length === 0)}
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${
                                        !selectedBranchId || (areasForBranch?.length === 0)
                                            ? 'bg-gray-100 cursor-not-allowed opacity-75'
                                            : ''
                                    }`}
                                >
                                    <option value="">
                                        {!selectedBranchId 
                                            ? 'Select a branch first' 
                                            : areasForBranch?.length === 0 
                                                ? 'No areas found for this branch'
                                                : 'Select Area'
                                        }
                                    </option>
                                    {(areasForBranch || []).map(area => (
                                        <option key={area.id} value={area.id.toString()}>
                                            {area.name}
                                        </option>
                                    ))}
                                </select>
                                {methods.formState.errors.cleaning_area_id && (
                                    <p className="text-xs text-red-600 mt-1">Cleaning area selection is required</p>
                                )}
                            </div>

                            <FormInput
                                name="title"
                                label="Task Title"
                                placeholder="e.g. Clean kitchen counters"
                                required
                            />

                            <FormTextarea
                                name="instructions"
                                label="Instructions"
                                placeholder="Detailed instructions for completing this task..."
                                rows={4}
                            />

                            <div className="grid gap-4 md:grid-cols-3">
                                <FormSelect
                                    name="frequency"
                                    label="Frequency"
                                    options={frequencyOptions}
                                />
                                <FormInput
                                    name="window_start"
                                    label="Start Window"
                                    type="time"
                                />
                                <FormInput
                                    name="window_end"
                                    label="End Window"
                                    type="time"
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <FormInput
                                    name="display_order"
                                    label="Display Order"
                                    type="number"
                                    min={0}
                                />
                                <FormInput
                                    name="estimated_minutes"
                                    label="Estimated Minutes"
                                    type="number"
                                    min={1}
                                    placeholder="e.g. 10"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">
                                    Days of Week
                                </label>
                                <p className="text-xs text-gray-500 mb-3">Leave blank to show on every day.</p>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {dayOptions.map((day) => {
                                        const checked = Array.isArray(daysOfWeek) && daysOfWeek.includes(day.value);
                                        return (
                                            <label
                                                key={day.value}
                                                className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                                                    checked
                                                        ? isRequired
                                                            ? 'border-[var(--theme-primary-bg)] bg-[var(--theme-primary-bg)] text-[var(--theme-primary)]'
                                                            : 'border-gray-300 bg-gray-100 text-gray-700'
                                                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                                style={checked && isRequired ? { borderColor: 'var(--theme-primary-bg)', backgroundColor: 'var(--theme-primary-bg)', color: 'var(--theme-primary)' } : {}}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleDay(day.value)}
                                                    className="rounded border-gray-300"
                                                />
                                                {day.label}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        {...methods.register('is_required')}
                                        className="rounded border-gray-300"
                                    />
                                    <div>
                                        <div className="text-sm font-semibold text-gray-800">Required before shift ends</div>
                                        <p className="text-xs text-gray-500">Task must be marked complete before closing the shift.</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                                    <input
                                        type="checkbox"
                                        {...methods.register('is_active')}
                                        className="rounded border-gray-300"
                                    />
                                    <div>
                                        <div className="text-sm font-semibold text-gray-800">Active task</div>
                                        <p className="text-xs text-gray-500">Inactive tasks are hidden from daily checklists.</p>
                                    </div>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--theme-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--theme-primary)' }}
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    {initialValues ? 'Save Changes' : 'Create Task'}
                                </button>
                            </div>
                        </form>
                    </FormProvider>
                </div>
            </div>
        </div>
    );
}

function AreaForm({ onClose, branchId, currentUser, initialValues, onSuccess }) {
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const isAdmin = currentUser && ['super_admin', 'administrator', 'admin', 'facility_admin'].includes(currentUser.role?.toLowerCase());
    const isFacilityAdmin = currentUser?.role === 'facility_admin' || currentUser?.role === 'administrator';
    const canSelectBranch = isAdmin;

    const { data: branchesData } = useQuery({
        queryKey: ['branches-for-area', currentUser?.facility_id],
        queryFn: async () => {
            const params = { per_page: 100, is_active: true };
            if (isFacilityAdmin && currentUser?.facility_id) {
                params.facility_id = currentUser.facility_id;
            }
            const response = await api.get('/branches', { params });
            return response.data?.data ?? [];
        },
        enabled: canSelectBranch,
        staleTime: 5 * 60 * 1000,
    });

    const branches = branchesData ?? [];

    const methods = useForm({
        defaultValues: {
            branch_id: initialValues?.branch_id ?? branchId ?? '',
            name: initialValues?.name ?? '',
            shift_label: initialValues?.shift_label ?? '',
            location: initialValues?.location ?? '',
            description: initialValues?.description ?? '',
            display_order: initialValues?.display_order ?? 0,
            is_active: initialValues?.is_active ?? true,
        },
    });

    const selectedBranchId = methods.watch('branch_id');

    const onSubmit = async (data) => {
        const finalBranchId = data.branch_id || branchId;
        
        if (!finalBranchId) {
            window.alert('Please select a branch or assign one to your profile first.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...data,
                branch_id: finalBranchId,
                name: data.name.trim(),
                shift_label: data.shift_label?.trim() || null,
                location: data.location?.trim() || null,
                description: data.description?.trim() || null,
                display_order: Number(data.display_order ?? 0),
            };

            if (initialValues) {
                await api.put(`/cleaning/areas/${initialValues.id}`, payload);
            } else {
                await api.post('/cleaning/areas', payload);
            }
            
            await queryClient.invalidateQueries({ queryKey: ['cleaning-areas'] });
            onSuccess();
        } catch (err) {
            window.alert(err?.response?.data?.message || err.message || 'Failed to save area');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-gray-50">
            <div className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-8 sm:px-6 lg:px-8">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to schedule
                    </button>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {initialValues ? 'Edit Area' : 'New Area'}
                    </p>
                </div>

                <div className="mt-4 rounded-3xl bg-white shadow-lg ring-1 ring-gray-100">
                    <div
                        className="rounded-t-3xl px-6 py-5 text-white"
                        style={{
                            background: 'linear-gradient(90deg, var(--theme-primary), var(--theme-primary-light))',
                            color: 'var(--theme-text-on-primary)',
                        }}
                    >
                        <div>
                            <h2 className="text-2xl font-semibold leading-6">Cleaning Area</h2>
                            <p className="mt-1 text-sm opacity-90">
                                Define the space and shift label used across the housekeeping schedule.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6 px-6 py-6 sm:px-8 sm:py-8">
                        <FormProvider {...methods}>
                            <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
                                {canSelectBranch && branches.length > 0 ? (
                                    <FormSelect
                                        name="branch_id"
                                        label="Branch"
                                        placeholder="Select a branch"
                                        required
                                        options={branches.map(branch => ({
                                            value: branch.id,
                                            label: branch.name,
                                        }))}
                                    />
                                ) : !branchId ? (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                        <p className="font-semibold">Branch Required</p>
                                        <p className="mt-1 text-xs">Please assign a branch to your profile or select one above to create a cleaning area.</p>
                                    </div>
                                ) : null}

                                <FormInput
                                    name="name"
                                    label="Area Name"
                                    placeholder="e.g. Kitchen, Float #1"
                                    required
                                />

                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormInput
                                        name="shift_label"
                                        label="Shift / Assignment Label"
                                        placeholder="e.g. Day Shift"
                                    />
                                    <FormInput
                                        name="location"
                                        label="Location"
                                        placeholder="e.g. Main Level"
                                    />
                                </div>

                                <FormTextarea
                                    name="description"
                                    label="Description / Notes"
                                    placeholder="Responsibilities, reminders, etc."
                                    rows={3}
                                />

                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormInput
                                        name="display_order"
                                        label="Display Order"
                                        type="number"
                                        min={0}
                                    />
                                    <div>
                                        <div className="mb-2 text-sm font-medium text-gray-700">Status</div>
                                        <div className="rounded-2xl border border-gray-200 px-4 py-3 transition hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <FormCheckbox
                                                    name="is_active"
                                                    label="Active area"
                                                />
                                            </div>
                                            <p className="mt-2 ml-7 text-xs text-gray-500">Inactive areas stay hidden but are never deleted.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--theme-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                                        style={{ backgroundColor: 'var(--theme-primary)' }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Building2 className="h-4 w-4" />
                                                {initialValues ? 'Save Changes' : 'Save Area'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </FormProvider>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AssignmentForm({ task, date, caregivers, onAssign, onRemove, isSaving, onClose }) {
    const [selectedCaregiver, setSelectedCaregiver] = React.useState('');
    const assignments = task.assignments ?? [];

    const handleAssign = async (event) => {
        event.preventDefault();
        if (!selectedCaregiver) {
            window.alert('Select a caregiver first.');
            return;
        }
        const userId = selectedCaregiver;
        await onAssign(userId);
        setSelectedCaregiver('');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to schedule
                </button>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Assign Caregiver
                </p>
            </div>

            <div className="rounded-3xl bg-white shadow-lg ring-1 ring-gray-100">
                <div className="border-b border-gray-100 px-6 py-4 sm:px-8 sm:py-5">
                    <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Assign caregivers for {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </p>
                </div>

                <div className="px-6 py-6 sm:px-8 sm:py-8">
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">Assign New Caregiver</h3>
                            <form onSubmit={handleAssign} className="flex flex-col gap-3 md:flex-row">
                                <select
                                    value={selectedCaregiver}
                                    onChange={(event) => setSelectedCaregiver(event.target.value)}
                                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:border-[var(--theme-primary)]"
                                    style={{ '--tw-ring-color': 'var(--theme-primary-bg)' }}
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
                                    className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--theme-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                                    style={{ backgroundColor: 'var(--theme-primary)' }}
                                >
                                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Assign
                                </button>
                            </form>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4">
                                Assigned Caregivers ({assignments.length})
                            </h3>
                            {assignments.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                                    <p className="text-sm text-gray-500">No caregivers assigned for this date.</p>
                                    <p className="mt-1 text-xs text-gray-400">Use the form above to assign a caregiver.</p>
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {assignments.map((assignment) => (
                                        <li
                                            key={assignment.id}
                                            className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-900">
                                                    {assignment.user?.name || 'Caregiver'}
                                                </div>
                                                <p className="text-xs text-gray-500 capitalize mt-0.5">{assignment.status}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!window.confirm('Remove this caregiver from the task for this date?')) {
                                                        return;
                                                    }
                                                    await onRemove(assignment.id);
                                                }}
                                                disabled={isSaving}
                                                className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-red-600"
                                            >
                                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Remove'}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

