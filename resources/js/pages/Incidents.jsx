import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import api from '../services/api';
import { useFacilityUpdates } from '../hooks/useRealtimeUpdates';
import { offlinePost } from '../services/offlineApi';
import { 
    AlertTriangle, Plus, Edit, Trash2, Eye, X, 
    CheckCircle, Clock, User, MapPin, Calendar,
    FileText, Image as ImageIcon, ChevronLeft, ChevronRight, ShieldAlert
} from 'lucide-react';
import Card from '../components/Card';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import EntityCardShell, { EntityCardHeader } from '../components/ui/EntityCardShell';
import CardIconButton from '../components/ui/CardIconButton';
import DataPill, { DataPillSection } from '../components/ui/DataPill';
import ResidentAvatarInline from '../components/ui/ResidentAvatarInline';
import FormInput from '../components/forms/FormInput';
import FormTextarea from '../components/forms/FormTextarea';
import FormSelect from '../components/forms/FormSelect';
import { toast } from 'sonner';
import logger from '../utils/logger';

const SEVERITY_COLORS = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300',
};

const PRIORITY_COLORS = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)] border-[var(--theme-primary-light)]',
};

const STATUS_COLORS = {
    open: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    in_progress: 'bg-[var(--theme-primary-bg)] text-[var(--theme-primary)] border-[var(--theme-primary-light)]',
    resolved: 'bg-green-100 text-green-800 border-green-300',
    closed: 'bg-gray-100 text-gray-800 border-gray-300',
    on_hold: 'bg-red-100 text-red-800 border-red-300',
};

const INCIDENT_TYPES = [
    'Fall',
    'Medication Error',
    'Behavioral Incident',
    'Medical Emergency',
    'Equipment Malfunction',
    'Security Breach',
    'Fire/Safety',
    'Food Safety',
    'Infection Control',
    'Transportation',
    'Communication Error',
    'Environmental Hazard',
    'Staff Injury',
    'Resident Injury',
    'Property Damage',
];

export default function Incidents() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [showForm, setShowForm] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [resolveConfirmIncident, setResolveConfirmIncident] = useState(null);
    /** When set, confirm modal will PUT update (e.g. status resolved from edit form). */
    const [resolveFormPayload, setResolveFormPayload] = useState(null);
    const [deleteConfirmIncident, setDeleteConfirmIncident] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [filters, setFilters] = useState({
        status: searchParams.get('status') || 'all',
        priority: searchParams.get('priority') || 'all',
        severity: searchParams.get('severity') || 'all',
        incident_type: searchParams.get('incident_type') || 'all',
        resident_id: searchParams.get('resident_id') || '',
        branch_id: searchParams.get('branch_id') || '',
        assigned_to: searchParams.get('assigned_to') || 'all',
        search: searchParams.get('search') || '',
        date_from: searchParams.get('date_from') || '',
        date_to: searchParams.get('date_to') || '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const PER_PAGE = 10;
    const [attachments, setAttachments] = useState([]);
    
    // Initialize react-hook-form
    const methods = useForm({
        defaultValues: {
            resident_id: '',
            branch_id: '',
            incident_type: '',
            description: '',
            incident_date: new Date().toISOString().slice(0, 16),
            location: '',
            severity: 'low',
            priority: 'medium',
            status: 'open',
            action_taken: '',
            witnesses: '',
            follow_up: '',
            assigned_to: '',
        },
    });

    // Fetch incidents (paginated)
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['incidents', filters, currentPage],
        queryFn: async () => {
            const params = { per_page: PER_PAGE, page: currentPage };
            Object.keys(filters).forEach(key => {
                if (filters[key] && filters[key] !== 'all') {
                    params[key] = filters[key];
                }
            });
            const response = await api.get('/incidents', { params });
            return response.data;
        },
        retry: 1,
    });

    // Watch branch_id from form to fetch residents and reset resident when branch changes
    const branchId = methods.watch('branch_id');
    
    useEffect(() => {
        if (branchId) {
            methods.setValue('resident_id', '');
        }
    }, [branchId, methods]);
    
    // Fetch residents
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list', branchId],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (branchId) params.branch_id = branchId;
            return (await api.get('/residents', { params })).data;
        },
        enabled: !!branchId, // Only fetch when branch is selected
    });

    // Fetch branches
    const { data: branchesData } = useQuery({
        queryKey: ['branches-list'],
        queryFn: async () => {
            const response = await api.get('/branches', { params: { per_page: 100 } });
            const branches = response.data?.data || response.data || [];
            return {
                ...response.data,
                data: branches.filter(b => b.is_active !== false)
            };
        },
    });

    // Fetch current user
    React.useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await api.get('/user');
                setCurrentUser(response.data);
            } catch (err) {
                logger.error('Failed to fetch current user:', err);
            }
        };
        fetchUser();
    }, []);

    // Real-time: refresh incident list when a new incident is created
    useFacilityUpdates(
        currentUser?.facility_id,
        ['incident.created'],
        {
            queryKeys: [['incidents']],
            showToast: true,
            getToastMessage: (_event, data) => {
                const severity = data.severity ? ` (${data.severity})` : '';
                return `New incident reported for ${data.resident?.name || 'resident'}${severity}`;
            },
        }
    );

    // Check if user is a caregiver
    const isCaregiver = React.useMemo(() => {
        if (!currentUser) return false;

        const truthyValues = [
            currentUser.is_caregiver,
            currentUser.isCaregiver,
            currentUser.caregiver,
            currentUser.is_care_giver,
        ];

        const normalizeToBoolean = (value) => {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value === 1;
            if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase();
                return ['1', 'true', 'yes', 'y', 'caregiver', 'care_giver'].includes(normalized);
            }
            return false;
        };

        if (truthyValues.some(normalizeToBoolean)) {
            return true;
        }

        const candidateValues = [];
        const collectCandidate = (value) => {
            if (value !== null && value !== undefined && value !== '') {
                candidateValues.push(String(value));
            }
        };

        collectCandidate(currentUser.role);
        collectCandidate(currentUser.position);
        collectCandidate(currentUser.primary_role);
        collectCandidate(currentUser.job_title);
        collectCandidate(currentUser.primaryRole);
        collectCandidate(currentUser.title);

        const roles = currentUser.roles;
        if (Array.isArray(roles)) {
            roles.forEach((roleItem) => {
                if (!roleItem) return;
                if (typeof roleItem === 'string') {
                    collectCandidate(roleItem);
                } else {
                    collectCandidate(roleItem.name);
                    collectCandidate(roleItem.title);
                    if (roleItem?.pivot?.role_name) {
                        collectCandidate(roleItem.pivot.role_name);
                    }
                }
            });
        } else if (roles?.data && Array.isArray(roles.data)) {
            roles.data.forEach((roleItem) => {
                if (!roleItem) return;
                if (typeof roleItem === 'string') {
                    collectCandidate(roleItem);
                } else {
                    collectCandidate(roleItem.name);
                    collectCandidate(roleItem.title);
                    if (roleItem?.pivot?.role_name) {
                        collectCandidate(roleItem.pivot.role_name);
                    }
                }
            });
        }

        return candidateValues.some((value) => {
            const lower = value.toLowerCase().trim();
            if (!lower) return false;
            const normalized = lower.replace(/[\s_-]/g, '');
            return normalized === 'caregiver' || (lower.includes('care') && lower.includes('giver'));
        });
    }, [currentUser]);

    // Filter branches for caregivers - only show their assigned branch
    const availableBranches = React.useMemo(() => {
        const branches = branchesData?.data || [];
        if (isCaregiver && currentUser?.assigned_branch_id) {
            return branches.filter(b => b.id === currentUser.assigned_branch_id);
        }
        return branches;
    }, [branchesData, isCaregiver, currentUser]);

    // Fetch users for assignment
    const { data: usersData } = useQuery({
        queryKey: ['users-list'],
        queryFn: async () => {
            return (await api.get('/users', { params: { per_page: 100 } })).data;
        },
    });

    const createMutation = useMutation({
        mutationFn: async (formDataToSend) => {
            // Check if FormData has files (requires online)
            const hasFiles = formDataToSend instanceof FormData && Array.from(formDataToSend.values()).some(v => v instanceof File);
            
            if (hasFiles) {
                // File uploads require online connection
                if (!navigator.onLine) {
                    throw new Error('File uploads require an internet connection. Please connect to the internet and try again.');
                }
            return await api.post('/incidents', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            } else {
                // Convert FormData to object for offline storage
                const data = formDataToSend instanceof FormData 
                    ? Object.fromEntries(formDataToSend.entries())
                    : formDataToSend;
                
                const result = await offlinePost('/incidents', data);
                if (!result.online) {
                    // Return offline response
                    return { data: result.data };
                }
                return result;
            }
        },
        onSuccess: (response) => {
            queryClient.invalidateQueries(['incidents']);
            handleCloseForm();
            if (response.data?.offline) {
                toast.success('Incident saved offline - will sync when online', '', { isFormSubmission: true });
            } else {
            toast.success('Incident created successfully', '', { isFormSubmission: true });
            }
        },
        onError: (error) => {
            logger.error('Error creating incident:', error);
            if (error.message && error.message.includes('internet connection')) {
                toast.error(error.message);
            } else if (error.response?.status === 413) {
                toast.error('File size too large. Maximum file size is 2MB per file, and total request size is 8MB. Please reduce file sizes and try again.');
            } else if (error.response?.status === 422) {
                // Validation errors
                const errors = error.response?.data?.errors;
                if (errors) {
                    const firstError = Object.values(errors)[0];
                    toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
                } else {
                    toast.error(error.response?.data?.message || 'Validation failed');
                }
            } else if (error.response?.status === 500) {
                toast.error(error.response?.data?.message || 'Server error occurred. Please try again or contact support.');
            } else {
                toast.error(error.response?.data?.message || 'Failed to create incident');
            }
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            return await api.put(`/incidents/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['incidents']);
            handleCloseForm();
            toast.success('Incident updated successfully', '', { isFormSubmission: true });
        },
        onError: (error) => {
            logger.error('Error updating incident:', error);
            toast.error(error.response?.data?.message || 'Failed to update incident');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return await api.delete(`/incidents/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['incidents']);
            toast.success('Incident deleted successfully');
        },
        onError: (error) => {
            logger.error('Error deleting incident:', error);
            toast.error(error.response?.data?.message || 'Failed to delete incident');
        },
    });

    const markResolvedMutation = useMutation({
        mutationFn: async ({ id, notes }) => {
            return await api.post(`/incidents/${id}/mark-resolved`, { notes });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['incidents']);
            toast.success('Incident marked as resolved');
        },
    });

    const handleOpenForm = (incident = null) => {
        if (incident) {
            setSelectedIncident(incident);
            methods.reset({
                resident_id: incident.resident_id || '',
                branch_id: incident.branch_id || '',
                incident_type: incident.incident_type || '',
                description: incident.description || '',
                incident_date: incident.incident_date ? new Date(incident.incident_date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
                location: incident.location || '',
                severity: incident.severity || 'low',
                priority: incident.priority || 'medium',
                status: incident.status || 'open',
                action_taken: incident.action_taken || '',
                witnesses: incident.witnesses || '',
                follow_up: incident.follow_up || '',
                assigned_to: incident.assigned_to || '',
            });
        } else {
            setSelectedIncident(null);
            // Prefill branch for caregivers
            const caregiverBranchId = isCaregiver && currentUser?.assigned_branch_id ? currentUser.assigned_branch_id : '';
            methods.reset({
                resident_id: '',
                branch_id: caregiverBranchId,
                incident_type: '',
                description: '',
                incident_date: new Date().toISOString().slice(0, 16),
                location: '',
                severity: 'low',
                priority: 'medium',
                status: 'open',
                action_taken: '',
                witnesses: '',
                follow_up: '',
                assigned_to: '',
            });
        }
        setAttachments([]);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setSelectedIncident(null);
        setResolveFormPayload(null);
        methods.reset();
        setAttachments([]);
    };

    const handleSubmit = (data) => {
        if (selectedIncident) {
            updateMutation.mutate({ id: selectedIncident.id, data });
        } else {
            // Validate file sizes before submission
            const maxFileSize = 2 * 1024 * 1024; // 2MB in bytes
            const maxTotalSize = 8 * 1024 * 1024; // 8MB in bytes
            let totalSize = 0;
            const oversizedFiles = [];

            attachments.forEach((file, index) => {
                if (file instanceof File) {
                    if (file.size > maxFileSize) {
                        oversizedFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                    }
                    totalSize += file.size;
                }
            });

            if (oversizedFiles.length > 0) {
                toast.error(`File size too large. Maximum file size is 2MB per file. Please reduce the size of: ${oversizedFiles.join(', ')}`);
                return;
            }

            if (totalSize > maxTotalSize) {
                toast.error(`Total file size too large. Maximum total size is 8MB. Current total: ${(totalSize / 1024 / 1024).toFixed(2)}MB. Please reduce file sizes and try again.`);
                return;
            }

            // For create, we need to handle file uploads
            const formDataToSend = new FormData();
            
            Object.keys(data).forEach(key => {
                if (data[key] && key !== 'attachments') {
                    formDataToSend.append(key, data[key]);
                }
            });

            // Add attachments
            attachments.forEach((file, index) => {
                if (file instanceof File) {
                    formDataToSend.append(`attachments[${index}][file]`, file);
                    formDataToSend.append(`attachments[${index}][file_type]`, file.type.startsWith('image/') ? 'photo' : 'document');
                }
            });

            createMutation.mutate(formDataToSend);
        }
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        setCurrentPage(1);

        // Update URL params
        const newParams = new URLSearchParams();
        Object.keys(newFilters).forEach(k => {
            if (newFilters[k] && newFilters[k] !== 'all') {
                newParams.set(k, newFilters[k]);
            }
        });
        setSearchParams(newParams);
    };

    const incidents = data?.data || [];
    const totalIncidents = data?.total ?? incidents.length;
    const lastPage = Math.max(1, data?.last_page ?? 1);
    const residents = residentsData?.data || [];
    const branches = branchesData?.data || [];
    const users = usersData?.data || [];

    return (
        <>
            <Modal
                isOpen={!!resolveConfirmIncident || !!resolveFormPayload}
                onClose={() => {
                    if (markResolvedMutation.isPending || updateMutation.isPending) return;
                    setResolveConfirmIncident(null);
                    setResolveFormPayload(null);
                }}
                title="Mark incident as resolved?"
                size="sm"
                className="border-t-4 border-emerald-500"
                closeOnBackdropClick={!markResolvedMutation.isPending && !updateMutation.isPending}
            >
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 shadow-inner">
                            <CheckCircle className="h-7 w-7 text-emerald-600" strokeWidth={2} />
                        </div>
                        <p className="text-sm leading-relaxed text-slate-600">
                            This will update the incident status to <span className="font-semibold text-slate-800">resolved</span>.
                            It will remain in the list for your records and compliance review.
                        </p>
                    </div>
                    {(resolveConfirmIncident || resolveFormPayload) && (
                        <div className="rounded-xl border border-slate-200/90 bg-slate-50/90 px-4 py-3">
                            <p className="font-mono text-xs font-bold tracking-wide text-emerald-800">
                                {(resolveConfirmIncident || resolveFormPayload).incident_number}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                {(resolveConfirmIncident || resolveFormPayload).incident_type}
                            </p>
                        </div>
                    )}
                </div>
                <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
                    <button
                        type="button"
                        disabled={markResolvedMutation.isPending || updateMutation.isPending}
                        onClick={() => {
                            setResolveConfirmIncident(null);
                            setResolveFormPayload(null);
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={markResolvedMutation.isPending || updateMutation.isPending}
                        onClick={() => {
                            if (resolveFormPayload) {
                                updateMutation.mutate(
                                    { id: resolveFormPayload.id, data: resolveFormPayload.data },
                                    {
                                        onSuccess: () => setResolveFormPayload(null),
                                    }
                                );
                                return;
                            }
                            if (!resolveConfirmIncident) return;
                            markResolvedMutation.mutate(
                                { id: resolveConfirmIncident.id, notes: '' },
                                {
                                    onSuccess: () => setResolveConfirmIncident(null),
                                }
                            );
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {markResolvedMutation.isPending || updateMutation.isPending ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4" strokeWidth={2.5} />
                                Mark as resolved
                            </>
                        )}
                    </button>
                </div>
            </Modal>

            <Modal
                isOpen={!!deleteConfirmIncident}
                onClose={() => !deleteMutation.isPending && setDeleteConfirmIncident(null)}
                title="Delete this incident?"
                size="sm"
                className="border-t-4 border-red-500"
                closeOnBackdropClick={!deleteMutation.isPending}
            >
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 shadow-inner">
                            <Trash2 className="h-6 w-6 text-red-600" strokeWidth={2} />
                        </div>
                        <p className="text-sm leading-relaxed text-slate-600">
                            This action cannot be undone. Attachments and history for this incident will be permanently removed.
                        </p>
                    </div>
                    {deleteConfirmIncident && (
                        <div className="rounded-xl border border-red-100 bg-red-50/80 px-4 py-3">
                            <p className="font-mono text-xs font-bold tracking-wide text-red-800">
                                {deleteConfirmIncident.incident_number}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">
                                {deleteConfirmIncident.incident_type}
                            </p>
                        </div>
                    )}
                </div>
                <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-6">
                    <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => setDeleteConfirmIncident(null)}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                            if (!deleteConfirmIncident) return;
                            deleteMutation.mutate(deleteConfirmIncident.id, {
                                onSuccess: () => setDeleteConfirmIncident(null),
                            });
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-600/20 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {deleteMutation.isPending ? (
                            <>
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Deleting…
                            </>
                        ) : (
                            <>
                                <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                Delete incident
                            </>
                        )}
                    </button>
                </div>
            </Modal>

            {showViewModal && selectedIncident ? (
                <ViewIncident
                    incident={selectedIncident}
                    onClose={() => {
                        setShowViewModal(false);
                        setSelectedIncident(null);
                    }}
                    onEdit={() => {
                        setShowViewModal(false);
                        handleOpenForm(selectedIncident);
                    }}
                />
            ) : (
        <div className="space-y-6">
            <EntityCardShell>
                <EntityCardHeader
                    left={
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50">
                                <ShieldAlert className="h-5 w-5 text-red-600" strokeWidth={2} aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {'Safety & compliance'}
                                </p>
                                <h1 className="mt-1 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">Incidents</h1>
                            </div>
                        </div>
                    }
                    right={
                        <button
                            type="button"
                            onClick={() => handleOpenForm()}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-sm font-bold text-[var(--theme-text-on-primary)] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-primary)] focus-visible:ring-offset-2"
                        >
                            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                            New Incident
                        </button>
                    }
                />
                <p className="text-sm leading-snug text-slate-600">
                    Manage and track facility incidents with a clear, auditable record.
                </p>
                {totalIncidents > 0 && (
                    <p className="mt-2 text-xs font-medium text-slate-500">
                        {totalIncidents} record{totalIncidents !== 1 ? 's' : ''}
                        {data?.last_page > 1 ? ` · Page ${currentPage} of ${lastPage}` : ''}
                    </p>
                )}
            </EntityCardShell>

            {/* Incidents grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 py-20 shadow-sm">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--theme-primary)]" />
                    <p className="mt-4 text-sm font-medium text-slate-600">Loading incidents…</p>
                </div>
            ) : error ? (
                <Card className="border-slate-200/80 shadow-lg">
                    <div className="py-16 text-center">
                        <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                        <p className="text-red-600">Failed to load incidents</p>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="mt-4 rounded-xl bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)]"
                        >
                            Retry
                        </button>
                    </div>
                </Card>
            ) : incidents.length === 0 ? (
                <Card className="border-slate-200/80 shadow-lg">
                    <div className="py-16 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                            <AlertTriangle className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-slate-600">No incidents found</p>
                        <button
                            type="button"
                            onClick={() => handleOpenForm()}
                            className="mt-6 rounded-xl bg-[var(--theme-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)]"
                        >
                            Create first incident
                        </button>
                    </div>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {incidents.map((incident) => (
                            <EntityCardShell key={incident.id}>
                                <EntityCardHeader
                                    left={
                                        <>
                                            <span className="font-mono text-xs font-bold tracking-wide text-[var(--theme-primary)]">
                                                {incident.incident_number}
                                            </span>
                                            <div className="flex flex-wrap gap-1.5">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.low}`}
                                                >
                                                    {incident.severity}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_COLORS[incident.priority] || PRIORITY_COLORS.medium}`}
                                                >
                                                    {incident.priority}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[incident.status] || STATUS_COLORS.open}`}
                                                >
                                                    {incident.status?.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </>
                                    }
                                    right={
                                        <>
                                            <Tooltip content="View details" position="top">
                                                <CardIconButton
                                                    variant="view"
                                                    icon={Eye}
                                                    aria-label="View details"
                                                    onClick={() => {
                                                        setSelectedIncident(incident);
                                                        setShowViewModal(true);
                                                    }}
                                                />
                                            </Tooltip>
                                            <Tooltip content="Edit incident" position="top">
                                                <CardIconButton
                                                    variant="edit"
                                                    icon={Edit}
                                                    aria-label="Edit incident"
                                                    onClick={() => handleOpenForm(incident)}
                                                />
                                            </Tooltip>
                                            {incident.status !== 'resolved' && incident.status !== 'closed' && (
                                                <Tooltip content="Mark as resolved" position="top">
                                                    <CardIconButton
                                                        variant="resolve"
                                                        icon={CheckCircle}
                                                        aria-label="Mark as resolved"
                                                        onClick={() => setResolveConfirmIncident(incident)}
                                                    />
                                                </Tooltip>
                                            )}
                                            {!isCaregiver && (
                                                <Tooltip content="Delete incident" position="top">
                                                    <CardIconButton
                                                        variant="delete"
                                                        icon={Trash2}
                                                        aria-label="Delete incident"
                                                        onClick={() => setDeleteConfirmIncident(incident)}
                                                    />
                                                </Tooltip>
                                            )}
                                        </>
                                    }
                                />

                                <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                                    {incident.incident_type}
                                </h3>

                                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                    <DataPill
                                        leading={
                                            incident.resident ? (
                                                <ResidentAvatarInline resident={incident.resident} />
                                            ) : null
                                        }
                                        icon={!incident.resident ? User : undefined}
                                        contentClassName="font-medium"
                                    >
                                        {incident.resident
                                            ? `${incident.resident.first_name ?? ''} ${incident.resident.last_name ?? ''}`.trim() ||
                                              '—'
                                            : '—'}
                                    </DataPill>
                                    {incident.location && (
                                        <DataPill icon={MapPin}>
                                            <span className="font-normal text-slate-600">{incident.location}</span>
                                        </DataPill>
                                    )}
                                    <DataPill icon={Calendar} className="sm:col-span-2">
                                        <span className="font-normal text-slate-600">
                                            {new Date(incident.incident_date).toLocaleString()}
                                        </span>
                                    </DataPill>
                                    {incident.assigned_to && incident.assigned_to_user && (
                                        <DataPill icon={User} className="sm:col-span-2">
                                            <span className="font-normal text-slate-600">
                                                Assigned: {incident.assigned_to_user.name}
                                            </span>
                                        </DataPill>
                                    )}
                                </div>

                                <DataPillSection label="Description">
                                    <p className="line-clamp-3">{incident.description || '—'}</p>
                                </DataPillSection>

                                {incident.attachments && incident.attachments.length > 0 && (
                                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <FileText className="h-3.5 w-3.5" />
                                        {incident.attachments.length} attachment(s)
                                    </div>
                                )}
                            </EntityCardShell>
                        ))}
                    </div>

                    {lastPage > 1 && (
                        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm sm:flex-row sm:px-6">
                            <p className="text-sm text-slate-600">
                                Showing{' '}
                                <span className="font-semibold text-slate-900">
                                    {data?.from ?? (incidents.length ? (currentPage - 1) * PER_PAGE + 1 : 0)}
                                </span>
                                –
                                <span className="font-semibold text-slate-900">
                                    {data?.to ?? (currentPage - 1) * PER_PAGE + incidents.length}
                                </span>{' '}
                                of <span className="font-semibold text-slate-900">{totalIncidents}</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={currentPage <= 1}
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </button>
                                <span className="min-w-[5rem] text-center text-sm font-medium tabular-nums text-slate-600">
                                    {currentPage} / {lastPage}
                                </span>
                                <button
                                    type="button"
                                    disabled={currentPage >= lastPage}
                                    onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
            )}

            <Modal
                isOpen={showForm}
                onClose={handleCloseForm}
                title={selectedIncident ? 'Edit Incident' : 'Add Incident'}
                size="xl"
            >
                <IncidentForm
                    key={selectedIncident?.id ?? 'new'}
                    inModal
                    record={selectedIncident}
                    branches={availableBranches}
                    residents={residents}
                    users={users}
                    attachments={attachments}
                    setAttachments={setAttachments}
                    currentUser={currentUser}
                    isCaregiver={isCaregiver}
                    onClose={handleCloseForm}
                    onSuccess={() => {
                        handleCloseForm();
                        queryClient.invalidateQueries(['incidents']);
                    }}
                    onRequestResolveConfirm={(payload) => setResolveFormPayload(payload)}
                    createMutation={createMutation}
                    updateMutation={updateMutation}
                    methods={methods}
                    branchId={branchId}
                />
            </Modal>
        </>
    );
}

// Incident Form Component (Full Page Form like Expenses)
function IncidentForm({ record, branches, residents, users, attachments, setAttachments, currentUser, isCaregiver, onClose, onSuccess, onRequestResolveConfirm, createMutation, updateMutation, methods, branchId, inModal = false }) {
    const handleSubmit = (data) => {
        if (record) {
            if (
                data.status === 'resolved' &&
                record.status !== 'resolved' &&
                onRequestResolveConfirm
            ) {
                onRequestResolveConfirm({
                    id: record.id,
                    data,
                    incident_number: record.incident_number,
                    incident_type: record.incident_type,
                });
                return;
            }
            updateMutation.mutate({ id: record.id, data });
        } else {
            // Validate file sizes before submission
            const maxFileSize = 2 * 1024 * 1024; // 2MB in bytes
            const maxTotalSize = 8 * 1024 * 1024; // 8MB in bytes
            let totalSize = 0;
            const oversizedFiles = [];

            attachments.forEach((file, index) => {
                if (file instanceof File) {
                    if (file.size > maxFileSize) {
                        oversizedFiles.push(`${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
                    }
                    totalSize += file.size;
                }
            });

            if (oversizedFiles.length > 0) {
                toast.error(`File size too large. Maximum file size is 2MB per file. Please reduce the size of: ${oversizedFiles.join(', ')}`);
                return;
            }

            if (totalSize > maxTotalSize) {
                toast.error(`Total file size too large. Maximum total size is 8MB. Current total: ${(totalSize / 1024 / 1024).toFixed(2)}MB. Please reduce file sizes and try again.`);
                return;
            }

            // For create, we need to handle file uploads
            const formDataToSend = new FormData();
            
            Object.keys(data).forEach(key => {
                if (data[key] && key !== 'attachments') {
                    formDataToSend.append(key, data[key]);
                }
            });

            // Add attachments
            attachments.forEach((file, index) => {
                if (file instanceof File) {
                    formDataToSend.append(`attachments[${index}][file]`, file);
                    formDataToSend.append(`attachments[${index}][file_type]`, file.type.startsWith('image/') ? 'photo' : 'document');
                }
            });

            createMutation.mutate(formDataToSend);
        }
    };

    return (
        <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6'}>
            {!inModal && (
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                    {record ? 'Edit Incident' : 'Add Incident'}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
            )}

            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(handleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormSelect
                                    name="branch_id"
                                    label="Branch"
                                    required
                                    placeholder="Select Branch"
                                    options={branches.map(branch => ({ value: branch.id, label: branch.name }))}
                                    disabled={isCaregiver && currentUser?.assigned_branch_id}
                                />

                                <FormSelect
                                    name="resident_id"
                                    label="Resident"
                                    required
                                    placeholder="Select Resident"
                                    options={residents
                                        .filter(r => !branchId || r.branch_id == branchId)
                                        .map(resident => ({ 
                                            value: resident.id, 
                                            label: `${resident.first_name} ${resident.last_name}` 
                                        }))}
                                    disabled={!branchId}
                                />

                                <FormSelect
                                    name="incident_type"
                                    label="Incident Type"
                                    required
                                    placeholder="Select Type"
                                    options={INCIDENT_TYPES.map(type => ({ value: type, label: type }))}
                                />

                                <FormInput
                                    name="incident_date"
                                    label="Incident Date & Time"
                                    type="datetime-local"
                                    required
                                />

                                <FormInput
                                    name="location"
                                    label="Location"
                                    placeholder="e.g., Room 101, Main Hallway"
                                />

                                <FormSelect
                                    name="severity"
                                    label="Severity"
                                    required
                                    options={[
                                        { value: 'low', label: 'Low' },
                                        { value: 'medium', label: 'Medium' },
                                        { value: 'high', label: 'High' },
                                        { value: 'critical', label: 'Critical' },
                                    ]}
                                />

                                <FormSelect
                                    name="priority"
                                    label="Priority"
                                    required
                                    options={[
                                        { value: 'low', label: 'Low' },
                                        { value: 'medium', label: 'Medium' },
                                        { value: 'high', label: 'High' },
                                        { value: 'critical', label: 'Critical' },
                                    ]}
                                />

                                <FormSelect
                                    name="status"
                                    label="Status"
                                    required
                                    options={[
                                        { value: 'open', label: 'Open' },
                                        { value: 'in_progress', label: 'In Progress' },
                                        { value: 'resolved', label: 'Resolved' },
                                        { value: 'closed', label: 'Closed' },
                                        { value: 'on_hold', label: 'On Hold' },
                                    ]}
                                />

                                <FormSelect
                                    name="assigned_to"
                                    label="Assigned To"
                                    placeholder="Unassigned"
                                    options={[
                                        { value: '', label: 'Unassigned' },
                                        ...users
                                            .filter(u => u.is_active !== false)
                                            .map(user => ({ value: user.id, label: user.name }))
                                    ]}
                                />
                            </div>

                    <FormTextarea
                        name="description"
                        label="Description"
                        required
                        rows={4}
                        placeholder="Provide a detailed description of the incident..."
                    />

                    <FormTextarea
                        name="action_taken"
                        label="Action Taken"
                        rows={3}
                        placeholder="Describe the immediate actions taken..."
                    />

                    <FormTextarea
                        name="witnesses"
                        label="Witnesses"
                        rows={2}
                        placeholder="List any witnesses (names and roles)..."
                    />

                    <FormTextarea
                        name="follow_up"
                        label="Follow-up Actions"
                        rows={3}
                        placeholder="Describe planned or completed follow-up actions..."
                    />

                    {!record && (
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Attachments
                            </label>
                            <input
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx"
                                onChange={(e) => setAttachments(Array.from(e.target.files))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                            {attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {attachments.map((file, index) => (
                                        <span key={index} className="px-2 py-1 bg-[var(--theme-primary-bg)] text-[var(--theme-primary)] rounded text-sm">
                                            {file.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)] disabled:opacity-50"
                        >
                            {createMutation.isPending || updateMutation.isPending
                                ? 'Saving...'
                                : record
                                ? 'Update Incident'
                                : 'Create Incident'}
                        </button>
                    </div>
                </form>
            </FormProvider>
        </div>
    );
}

// View Incident Component (Full Page View)
function ViewIncident({ incident, onClose, onEdit }) {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-hover)] p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <AlertTriangle className="w-8 h-8" />
                                    Incident Details
                                </h1>
                                <p className="text-white/90 mt-1">Comprehensive incident information and documentation</p>
                            </div>
                        </div>
                        <button
                            onClick={onEdit}
                            className="px-6 py-2 bg-white text-[var(--theme-primary)] rounded-lg hover:bg-gray-50 font-semibold transition-colors flex items-center gap-2"
                        >
                            <Edit className="w-4 h-4" />
                            Edit Incident
                        </button>
                    </div>
                </div>

                {/* Quick Info Cards */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Status</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${STATUS_COLORS[incident.status] || STATUS_COLORS.open}`}>
                                {incident.status?.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <p className="text-sm text-blue-900 font-medium">Current Status</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Severity</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${SEVERITY_COLORS[incident.severity] || SEVERITY_COLORS.low}`}>
                                {incident.severity?.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-sm text-red-900 font-medium">Severity Level</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Priority</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${PRIORITY_COLORS[incident.priority] || PRIORITY_COLORS.medium}`}>
                                {incident.priority?.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-sm text-orange-900 font-medium">Priority Level</p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">ID</span>
                            <FileText className="w-4 h-4 text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-900 font-mono font-semibold">{incident.incident_number}</p>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Incident Information */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-[var(--theme-primary)]">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <AlertTriangle className="w-6 h-6 text-[var(--theme-primary)]" />
                                Incident Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                        <FileText className="w-4 h-4" />
                                        Incident Type
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900">{incident.incident_type}</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                        <Calendar className="w-4 h-4" />
                                        Date & Time
                                    </div>
                                    <p className="text-lg font-semibold text-gray-900">{new Date(incident.incident_date).toLocaleString()}</p>
                                </div>
                                {incident.location && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                            <MapPin className="w-4 h-4" />
                                            Location
                                        </div>
                                        <p className="text-lg font-semibold text-gray-900">{incident.location}</p>
                                    </div>
                                )}
                                {incident.resident && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                            <User className="w-4 h-4" />
                                            Resident
                                        </div>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {incident.resident.first_name} {incident.resident.last_name}
                                        </p>
                                    </div>
                                )}
                                {incident.assigned_to_user && (
                                    <div className="space-y-1 md:col-span-2">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                                            <User className="w-4 h-4" />
                                            Assigned To
                                        </div>
                                        <p className="text-lg font-semibold text-gray-900">{incident.assigned_to_user.name}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-blue-500">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-6 h-6 text-blue-500" />
                                Description
                            </h2>
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{incident.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action Taken */}
                    {incident.action_taken && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-green-500">
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <CheckCircle className="w-6 h-6 text-green-500" />
                                    Action Taken
                                </h2>
                                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{incident.action_taken}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Follow-up Actions */}
                    {incident.follow_up && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-purple-500">
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Clock className="w-6 h-6 text-purple-500" />
                                    Follow-up Actions
                                </h2>
                                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{incident.follow_up}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Attachments */}
                    {incident.attachments && incident.attachments.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-indigo-500">
                            <div className="p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-6 h-6 text-[var(--theme-primary)]" />
                                    Attachments ({incident.attachments.length})
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {incident.attachments.map((attachment, index) => (
                                        <div key={index} className="group relative border-2 border-gray-200 rounded-xl overflow-hidden hover:border-[var(--theme-primary)] transition-all hover:shadow-lg">
                                            {attachment.file_type === 'photo' ? (
                                                <div className="relative">
                                                    <img 
                                                        src={attachment.file_url} 
                                                        alt={`Attachment ${index + 1}`}
                                                        className="w-full h-40 object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-40 bg-gradient-to-br from-gray-100 to-gray-200">
                                                    <FileText className="w-12 h-12 text-gray-400" />
                                                </div>
                                            )}
                                            <div className="p-3 bg-white">
                                                <p className="text-xs font-medium text-gray-900 truncate">{attachment.file_name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Sidebar Info */}
                <div className="space-y-6">
                    {/* Witnesses */}
                    {incident.witnesses && (
                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden border-l-4 border-l-yellow-500">
                            <div className="p-6">
                                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <User className="w-5 h-5 text-yellow-500" />
                                    Witnesses
                                </h2>
                                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{incident.witnesses}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                            <div className="space-y-3">
                                <button
                                    onClick={onEdit}
                                    className="w-full px-4 py-3 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] font-semibold transition-colors flex items-center justify-center gap-2"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit Incident
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                                >
                                    Back to List
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

