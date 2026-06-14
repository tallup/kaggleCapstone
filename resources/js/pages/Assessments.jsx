import React, { useState, useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import logger from '../utils/logger';
import { ClipboardList, Plus, Search, Filter, Edit, Trash2, Calendar, User, CheckCircle, XCircle, Clock, FileText, AlertCircle, X } from 'lucide-react';
import SectionCard from '../components/SectionCard';
import Card from '../components/Card';
import CalendarComponent from '../components/ui/Calendar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import { hasModuleAccess } from '../utils/moduleAccess';
import { RESIDENT_CONTEXT_QUERY_KEY } from '../utils/headerResidentSwitcher';
import { isCaregiverRole } from '../utils/userRoles';

export default function Assessments({ embedded = false, embeddedResidentId = null } = {}) {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const fromUrl = searchParams.get(RESIDENT_CONTEXT_QUERY_KEY) || searchParams.get('resident_id') || '';
    const headerResidentScope =
        embeddedResidentId != null && embeddedResidentId !== ''
            ? String(embeddedResidentId)
            : fromUrl;
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);

    // Fetch current user with React Query for better caching
    const { data: currentUser, isLoading: isLoadingUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            try {
                const response = await api.get('/user');
                return response.data;
            } catch (err) {
                logger.error('Failed to fetch current user:', err);
                return null;
            }
        },
        staleTime: 0, // Always fetch fresh
        retry: 1,
    });

    // Check module access
    const isSuperAdmin = currentUser?.role === 'super_admin';
    const enabledModules = currentUser?.enabled_modules || [];
    const hasModuleAccessCheck = isSuperAdmin || hasModuleAccess('/assessments', enabledModules, isSuperAdmin);
    
    // Check if user is an admin (needed for permission checks)
    const isAdmin = useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator' || role === 'admin' || role === 'super_admin';
    }, [currentUser]);
    
    // Check if user is a facility administrator (can access all branches in facility)
    const isFacilityAdmin = useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator';
    }, [currentUser]);
    
    // Check if user is a branch-level admin (restricted to assigned branch)
    const isBranchAdmin = useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'admin';
    }, [currentUser]);

    const isCaregiver = useMemo(() => isCaregiverRole(currentUser?.role), [currentUser?.role]);
    
    // Permission checks
    const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
    const canCreate = !isCaregiver && (isSuperAdmin || isAdmin || permissions.includes('create_assessments'));
    const canEdit = !isCaregiver && (isSuperAdmin || isAdmin || permissions.includes('edit_assessments'));
    const canDelete = !isCaregiver && (isSuperAdmin || isAdmin || permissions.includes('delete_assessments'));

    // Show loading state
    if (isLoadingUser) {
        return (
            <div className={`flex items-center justify-center ${embedded ? 'min-h-[200px]' : 'min-h-screen'}`}>
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // Redirect if module access is denied
    if (!hasModuleAccessCheck) {
        return (
            <div className={`flex items-center justify-center ${embedded ? 'min-h-[200px] py-6' : 'min-h-screen'}`}>
                <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Module Not Available</h2>
                    <p className="text-gray-600 mb-4">
                        The Assessments module is not available for your facility. Please contact your administrator.
                    </p>
                    <Link
                        to="/dashboard"
                        className="inline-block px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-hover)]"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch residents for form
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list'],
        queryFn: async () => (await api.get('/residents', { params: { per_page: 100 } })).data,
    });

    // Fetch branches for form
    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    // Fetch all assessments for calendar
    const { data: allAssessmentsForCalendar } = useQuery({
        queryKey: ['assessments-calendar', statusFilter, typeFilter, headerResidentScope],
        queryFn: async () => {
            const params = { per_page: 1000 };
            if (statusFilter) params.status = statusFilter;
            if (typeFilter) params.assessment_type = typeFilter;
            if (headerResidentScope) params.resident_id = headerResidentScope;
            const response = await api.get('/assessments', { params });
            return response.data;
        },
    });

    // Fetch assessments
    const { data, isLoading, error } = useQuery({
        queryKey: ['assessments', search, statusFilter, typeFilter, dateFilter, selectedCalendarDate, headerResidentScope],
        queryFn: async () => {
            const params = { per_page: 20 };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            if (typeFilter) params.assessment_type = typeFilter;
            if (headerResidentScope) params.resident_id = headerResidentScope;
            
            if (selectedCalendarDate) {
                params.date_from = selectedCalendarDate;
                params.date_to = selectedCalendarDate;
            } else if (dateFilter === 'today') {
                params.today = 'true';
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                params.date_from = weekAgo.toISOString().split('T')[0];
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                params.date_from = monthAgo.toISOString().split('T')[0];
            }
            
            const response = await api.get('/assessments', { params });
            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => api.delete(`/assessments/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['assessments']);
            queryClient.invalidateQueries(['assessments-calendar']);
        },
    });

    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const handleConfirmDeleteAssessment = () => {
        if (deleteConfirmId == null) return;
        deleteMutation.mutate(deleteConfirmId, { onSuccess: () => setDeleteConfirmId(null) });
    };

    // Process assessments for calendar
    const calendarData = useMemo(() => {
        if (!allAssessmentsForCalendar?.data) return [];

        const dateMap = new Map();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        allAssessmentsForCalendar.data.forEach((assessment) => {
            if (!assessment.assessment_date) return;

            const assessmentDate = new Date(assessment.assessment_date);
            assessmentDate.setHours(0, 0, 0, 0);
            const dateStr = assessmentDate.toISOString().split('T')[0];

            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, {
                    date: dateStr,
                    indicators: [],
                    count: 0,
                });
            }

            const dayData = dateMap.get(dateStr);
            dayData.count += 1;

            // Determine status and color
            let statusColor = 'bg-gray-400';
            let statusType = 'draft';

            if (assessment.status === 'approved' || assessment.status === 'completed') {
                statusColor = 'bg-green-500';
                statusType = 'completed';
            } else if (assessment.status === 'in_progress' || assessment.status === 'pending_review') {
                statusColor = 'bg-yellow-500';
                statusType = 'in_progress';
            } else if (assessment.status === 'draft') {
                statusColor = 'bg-gray-400';
                statusType = 'draft';
            }

            // Check if overdue (assuming due_date field exists, or use assessment_date + some period)
            const dueDate = assessment.due_date ? new Date(assessment.due_date) : null;
            if (dueDate && dueDate < today && assessment.status !== 'completed' && assessment.status !== 'approved') {
                statusColor = 'bg-red-500';
                statusType = 'overdue';
            }

            dayData.indicators.push({
                type: statusType,
                color: statusColor,
                status: assessment.status,
            });

            // Set background color based on most critical status
            if (statusType === 'overdue') {
                dayData.backgroundColor = 'bg-red-100';
            } else if (statusType === 'in_progress' && !dayData.backgroundColor) {
                dayData.backgroundColor = 'bg-yellow-100';
            } else if (statusType === 'completed' && !dayData.backgroundColor && !dayData.backgroundColor?.includes('red') && !dayData.backgroundColor?.includes('yellow')) {
                dayData.backgroundColor = 'bg-green-100';
            }
        });

        return Array.from(dateMap.values());
    }, [allAssessmentsForCalendar]);

    const handleCalendarDateSelect = (dateStr) => {
        setSelectedCalendarDate(dateStr);
        setDateFilter('all'); // Reset date filter when calendar date is selected
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'bg-green-50 text-[var(--theme-primary)] border border-[var(--theme-primary)]';
            case 'completed':
                return 'bg-amber-50 text-[var(--theme-secondary)] border border-[var(--theme-secondary)]';
            case 'reviewed':
                return 'bg-amber-50 text-[var(--theme-secondary)] border border-[var(--theme-secondary)]';
            case 'in_progress':
                return 'bg-yellow-100 text-yellow-800 border border-yellow-400';
            case 'draft':
                return 'bg-gray-100 text-gray-800 border border-gray-400';
            case 'archived':
                return 'bg-gray-100 text-gray-600 border border-gray-400';
            default:
                return 'bg-gray-100 text-gray-800 border border-gray-400';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return <CheckCircle className="w-4 h-4 text-[var(--theme-primary)]" />;
            case 'completed':
            case 'reviewed':
                return <CheckCircle className="w-4 h-4 text-[var(--theme-secondary)]" />;
            default:
                return <Clock className="w-4 h-4 text-gray-600" />;
        }
    };

    // Full-page route: allow caregivers with module access (read-only). Block other non-admin roles.
    if (currentUser && !isAdmin && !isCaregiver && !embedded) {
        return (
            <div>
                <SectionCard>
                    <div className="text-center py-12">
                        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
                        <p className="text-gray-600">This page is not available for your role. Please contact an administrator.</p>
                    </div>
                </SectionCard>
            </div>
        );
    }

    return (
        <>
            <ConfirmDialog
                isOpen={deleteConfirmId != null}
                onClose={() => !deleteMutation.isPending && setDeleteConfirmId(null)}
                onConfirm={handleConfirmDeleteAssessment}
                title="Delete this assessment?"
                description="This assessment will be permanently removed."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
            <Modal
                isOpen={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditing(null);
                }}
                title={editing ? 'Edit Assessment' : 'Add Assessment'}
                size="xl"
            >
                <AssessmentForm
                    key={editing?.id ?? 'new'}
                    record={editing}
                    residents={residentsData?.data || []}
                    branches={branchesData?.data || []}
                    currentUser={currentUser}
                    isFacilityAdmin={isFacilityAdmin}
                    isBranchAdmin={isBranchAdmin}
                    inModal
                    defaultResidentId={editing ? '' : headerResidentScope}
                    onClose={() => {
                        setShowForm(false);
                        setEditing(null);
                    }}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditing(null);
                        queryClient.invalidateQueries(['assessments']);
                        queryClient.invalidateQueries(['assessments-calendar']);
                    }}
                />
            </Modal>
        <div>
            <SectionCard>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Assessment Management</h2>
                        <p className="text-gray-600">
                            {isCaregiver
                                ? 'View resident assessments. Only administrators can add or change assessments.'
                                : 'View and manage resident assessments.'}
                        </p>
                    </div>
                    {canCreate && (
                        <button
                            onClick={() => {
                                setEditing(null);
                                setShowForm(true);
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Assessment</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search assessments..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="approved">Approved</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    {/* Type Filter */}
                    <div>
                        <input
                            type="text"
                            placeholder="Assessment Type"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>

                    {/* Date Filter */}
                    <div>
                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="week">Last Week</option>
                            <option value="month">Last Month</option>
                        </select>
                    </div>
                </div>
            </SectionCard>

            <div className="mb-6"></div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800 text-sm">
                        Error loading assessments: {error.response?.data?.message || error.message}
                    </p>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading assessments...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {data?.data?.length > 0 ? (
                        data.data.map((assessment) => (
                            <Card 
                                key={assessment.id} 
                                borderColor="border-[var(--theme-secondary)]"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-gray-900 mb-2">
                                            {assessment.resident?.first_name} {assessment.resident?.last_name}
                                            {assessment.branch && ` • ${assessment.branch.name}`}
                                        </p>
                                        <h3 className="text-lg text-gray-700 mb-4">
                                            {assessment.assessment_type || 'Assessment'}
                                        </h3>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {getStatusIcon(assessment.status)}
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assessment.status)}`}>
                                            {assessment.status?.replace('_', ' ')}
                                        </span>
                                        <div className="flex flex-col items-end space-y-1">
                                            {isCaregiver ? (
                                                <Link
                                                    to={`/assessments/${assessment.id}/review`}
                                                    className="px-3 py-1 text-sm text-[var(--theme-text-on-primary)] bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] rounded-lg transition-colors"
                                                >
                                                    View
                                                </Link>
                                            ) : (
                                                <>
                                                    {assessment.status === 'completed' || assessment.status === 'approved' ? (
                                                        <Tooltip content="Assessment is already completed or approved" position="top">
                                                            <span className="inline-flex">
                                                                <button
                                                                    type="button"
                                                                    disabled
                                                                    className="px-3 py-1 text-sm text-gray-400 bg-gray-200 cursor-not-allowed rounded-lg transition-colors"
                                                                    aria-label="Start assessment unavailable: assessment is already completed or approved"
                                                                >
                                                                    Start Assessment
                                                                </button>
                                                            </span>
                                                        </Tooltip>
                                                    ) : (
                                                        <Link
                                                            to={`/assessments/${assessment.id}`}
                                                            className="px-3 py-1 text-sm text-[var(--theme-text-on-primary)] bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] rounded-lg transition-colors"
                                                        >
                                                            Start Assessment
                                                        </Link>
                                                    )}
                                                    <Link
                                                        to={`/assessments/${assessment.id}/review`}
                                                        className="px-3 py-1 text-sm text-[var(--theme-text-on-primary)] bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] rounded-lg transition-colors"
                                                    >
                                                        Review
                                                    </Link>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                            <div className="flex items-center space-x-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <div>
                                                    <p className="text-xs text-gray-500">Assessment Date</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {new Date(assessment.assessment_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            {assessment.assessor && (
                                                <div className="flex items-center space-x-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Assessed By</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {assessment.assessor.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {assessment.completed_at && (
                                                <div className="flex items-center space-x-2">
                                                    <CheckCircle className="w-4 h-4 text-gray-400" />
                                                    <div>
                                                        <p className="text-xs text-gray-500">Completed</p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {new Date(assessment.completed_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                </div>

                                {assessment.notes && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-gray-700">
                                            <span className="font-medium">Notes: </span>
                                            {assessment.notes}
                                        </p>
                                    </div>
                                )}

                                {!isCaregiver && (canEdit || canDelete) && (
                                    <div className="mt-4 flex space-x-2">
                                        {canEdit && (
                                            <Tooltip content="Edit" position="top">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditing(assessment);
                                                        setShowForm(true);
                                                    }}
                                                    className="rounded-lg border border-amber-200 bg-amber-50/80 p-2 transition-colors hover:bg-amber-100"
                                                    aria-label="Edit assessment"
                                                >
                                                    <Edit className="h-4 w-4 !text-amber-800" strokeWidth={2.5} />
                                                </button>
                                            </Tooltip>
                                        )}
                                        {canDelete && (
                                            <Tooltip content="Delete" position="top">
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteConfirmId(assessment.id)}
                                                    className="rounded-lg border border-red-200 bg-red-50/80 p-2 transition-colors hover:bg-red-100"
                                                    aria-label="Delete assessment"
                                                >
                                                    <Trash2 className="h-4 w-4 !text-red-700" strokeWidth={2.5} />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                )}
                            </Card>
                        ))
                    ) : (
                        <div className="bg-white rounded-lg shadow p-12 text-center">
                            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg font-medium">No assessments found</p>
                            <p className="text-gray-500 text-sm mt-2">
                                {search || statusFilter || typeFilter
                                    ? 'No assessments match your filters.'
                                    : 'No assessments found in the system.'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
        </>
    );
}

// Assessment Form Component
function AssessmentForm({
    record,
    residents,
    branches,
    onClose,
    onSuccess,
    currentUser,
    isFacilityAdmin,
    isBranchAdmin,
    inModal = false,
    defaultResidentId = '',
}) {
    const initialResidentId = record?.resident_id
        ? String(record.resident_id)
        : (defaultResidentId ? String(defaultResidentId) : '');
    const [formData, setFormData] = useState({
        resident_id: initialResidentId,
        branch_id: record?.branch_id || (isBranchAdmin && currentUser?.assigned_branch_id ? String(currentUser.assigned_branch_id) : ''),
        assessment_type: record?.assessment_type || '',
        assessment_date: record?.assessment_date || new Date().toISOString().split('T')[0],
        status: record?.status || 'draft',
        notes: record?.notes || '',
    });

    // When URL/default resident loads after residents fetch, set resident + branch
    React.useEffect(() => {
        if (record || !defaultResidentId || residents.length === 0) return;
        const rid = String(defaultResidentId);
        const resident = residents.find((r) => String(r.id) === rid);
        if (!resident) return;
        setFormData((prev) => ({
            ...prev,
            resident_id: rid,
            branch_id: prev.branch_id || String(resident.branch_id || ''),
        }));
    }, [record, defaultResidentId, residents]);
    
    // Auto-fill branch for admin users on mount
    React.useEffect(() => {
        if (isBranchAdmin && currentUser?.assigned_branch_id && !record && !formData.branch_id) {
            setFormData(prev => ({ ...prev, branch_id: String(currentUser.assigned_branch_id) }));
        }
    }, [isBranchAdmin, currentUser, record, formData.branch_id]);

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter residents by selected branch
    const filteredResidents = React.useMemo(() => {
        if (!formData.branch_id) {
            return [];
        }
        // Convert both to strings for comparison to handle type mismatches
        const selectedBranchId = String(formData.branch_id);
        return residents.filter(r => {
            if (!r.branch_id) return false;
            return String(r.branch_id) === selectedBranchId;
        });
    }, [formData.branch_id, residents]);

    // Auto-select branch when resident is selected
    React.useEffect(() => {
        if (formData.resident_id && !formData.branch_id) {
            const resident = residents.find(r => String(r.id) === String(formData.resident_id));
            if (resident?.branch_id) {
                setFormData(prev => ({...prev, branch_id: String(resident.branch_id)}));
            }
        }
    }, [formData.resident_id, residents, formData.branch_id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                resident_id: parseInt(formData.resident_id),
                branch_id: parseInt(formData.branch_id),
            };

            if (record) {
                await api.put(`/assessments/${record.id}`, payload);
            } else {
                await api.post('/assessments', payload);
            }
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: error.response?.data?.message || 'Failed to save assessment' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={inModal ? '' : 'bg-white rounded-lg shadow p-6'}>
            {!inModal && (
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {record ? 'Edit Assessment' : 'Add Assessment'}
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

            {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{errors.general}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Branch *
                                </label>
                                <select
                                    value={formData.branch_id}
                                    onChange={(e) => setFormData({ ...formData, branch_id: e.target.value, resident_id: '' })}
                                    required
                                    disabled={!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id}
                                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                                >
                                    <option value="">Select Branch</option>
                                    {branches.map(branch => (
                                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                                    ))}
                                </select>
                                {errors.branch_id && <p className="text-xs text-red-600 mt-1">{errors.branch_id[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Resident *
                                </label>
                                <select
                                    value={formData.resident_id}
                                    onChange={(e) => setFormData({ ...formData, resident_id: e.target.value })}
                                    required
                                    disabled={!formData.branch_id}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent disabled:bg-gray-100"
                                >
                                    <option value="">Select Resident</option>
                                    {filteredResidents.map(resident => (
                                        <option key={resident.id} value={resident.id}>
                                            {resident.first_name} {resident.last_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.resident_id && <p className="text-xs text-red-600 mt-1">{errors.resident_id[0]}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Assessment Type *
                                </label>
                                <input
                                    type="text"
                                    value={formData.assessment_type}
                                    onChange={(e) => setFormData({...formData, assessment_type: e.target.value})}
                                    required
                                    placeholder="e.g., Initial Assessment, Follow-up"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                                {errors.assessment_type && <p className="text-xs text-red-600 mt-1">{errors.assessment_type[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Assessment Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.assessment_date}
                                    onChange={(e) => setFormData({...formData, assessment_date: e.target.value})}
                                    required
                                    max={new Date().toISOString().split('T')[0]}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                                {errors.assessment_date && <p className="text-xs text-red-600 mt-1">{errors.assessment_date[0]}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status *
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({...formData, status: e.target.value})}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            >
                                <option value="draft">Draft</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="reviewed">Reviewed</option>
                                <option value="approved">Approved</option>
                                <option value="archived">Archived</option>
                            </select>
                            {errors.status && <p className="text-xs text-red-600 mt-1">{errors.status[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                placeholder="Additional notes about the assessment..."
                            />
                            {errors.notes && <p className="text-xs text-red-600 mt-1">{errors.notes[0]}</p>}
                        </div>

                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Saving...' : (record ? 'Update' : 'Create')}
                            </button>
                        </div>
                    </form>
        </div>
    );
}
