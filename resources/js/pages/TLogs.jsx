import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, X, FileText, Calendar, User, Search, Filter, ArrowLeft, AlertTriangle, ExternalLink, Download } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import { toast } from 'sonner';
import TLogForm from './TLogForm';
import logger from '../utils/logger';
import { RESIDENT_CONTEXT_QUERY_KEY } from '../utils/headerResidentSwitcher';

const NOTIFICATION_LEVEL_COLORS = {
    urgent: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300',
};

const TYPE_COLORS = {
    health: 'bg-blue-100 text-blue-800',
    notes: 'bg-gray-100 text-gray-800',
    'follow-up': 'bg-purple-100 text-purple-800',
    behavior: 'bg-orange-100 text-orange-800',
    contacts: 'bg-cyan-100 text-cyan-800',
    general: 'bg-green-100 text-green-800',
};

export default function TLogs() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [showForm, setShowForm] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedTLog, setSelectedTLog] = useState(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [filters, setFilters] = useState({
        type: searchParams.get('type') || 'all',
        notification_level: searchParams.get('notification_level') || 'all',
        resident_id: searchParams.get('resident_id') || searchParams.get(RESIDENT_CONTEXT_QUERY_KEY) || '',
        branch_id: searchParams.get('branch_id') || '',
        search: searchParams.get('search') || '',
        date_from: searchParams.get('date_from') || '',
        date_to: searchParams.get('date_to') || '',
    });

    // Fetch progress notes
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['t-logs', filters],
        queryFn: async () => {
            const params = { per_page: 50 };
            Object.keys(filters).forEach(key => {
                if (filters[key] && filters[key] !== 'all') {
                    params[key] = filters[key];
                }
            });
            const response = await api.get('/t-logs', { params });
            return response.data;
        },
        retry: 1,
    });

    // Fetch current user to check if caregiver
    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const res = await api.get('/user');
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Determine if user is a caregiver
    const isCaregiver = useMemo(() => {
        if (!currentUser) {
            return false;
        }

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

        const roles = currentUser.roles;
        if (Array.isArray(roles)) {
            roles.forEach((roleItem) => {
                if (!roleItem) return;
                if (typeof roleItem === 'string') {
                    collectCandidate(roleItem);
                } else {
                    collectCandidate(roleItem.name);
                    collectCandidate(roleItem.title);
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
                }
            });
        }

        return candidateValues.some((value) => {
            const lower = value.toLowerCase().trim();
            if (!lower) {
                return false;
            }
            const normalized = lower.replace(/[\s_-]/g, '');
            if (normalized === 'caregiver') {
                return true;
            }
            return lower.includes('care') && lower.includes('giver');
        });
    }, [currentUser]);

    const caregiverBranchId = useMemo(() => {
        if (!isCaregiver) {
            return null;
        }
        return currentUser?.assigned_branch_id ? String(currentUser.assigned_branch_id) : null;
    }, [isCaregiver, currentUser?.assigned_branch_id]);

    // Fetch residents for filter (filtered by branch if caregiver, all residents for admins)
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list', isCaregiver ? caregiverBranchId || 'none' : 'all'],
        queryFn: async () => {
            const params = { per_page: 100 };
            // For caregivers, only show residents from their assigned branch
            // For admins and other non-caregivers, show all residents (no branch_id filter)
            if (isCaregiver && caregiverBranchId) {
                params.branch_id = caregiverBranchId;
            }
            return (await api.get('/residents', { params })).data;
        },
        enabled: currentUser !== undefined, // Wait for user data to load
    });

    // Fetch branches for filter
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

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return await api.delete(`/t-logs/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['t-logs']);
            toast.success('Progress note deleted successfully');
        },
        onError: (error) => {
            logger.error('Error deleting progress note:', error);
            toast.error(error.response?.data?.message || 'Failed to delete progress note');
        },
    });

    const handleOpenForm = (tLog = null) => {
        setSelectedTLog(tLog);
        setShowForm(true);
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setSelectedTLog(null);
    };

    const handleView = (tLog) => {
        setSelectedTLog(tLog);
        setShowViewModal(true);
    };

    const handleCloseView = () => {
        setShowViewModal(false);
        setSelectedTLog(null);
    };

    const handleConfirmDelete = () => {
        if (deleteConfirmId == null) return;
        deleteMutation.mutate(deleteConfirmId, { onSuccess: () => setDeleteConfirmId(null) });
    };

    const canModifyProgressNotes = !isCaregiver;

    // Caregivers must not open the edit form (defense if state gets out of sync)
    useEffect(() => {
        if (!showForm || !selectedTLog || !isCaregiver) {
            return;
        }
        toast.error('You can add new progress notes or view existing ones, but not edit them.');
        setShowForm(false);
        setSelectedTLog(null);
    }, [showForm, selectedTLog, isCaregiver]);

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        
        // Update URL params
        const newParams = new URLSearchParams();
        Object.keys(newFilters).forEach(k => {
            if (newFilters[k] && newFilters[k] !== 'all') {
                newParams.set(k, newFilters[k]);
            }
        });
        setSearchParams(newParams);
    };

    // Header resident switcher uses `residentId`; keep filters in sync when URL changes.
    useEffect(() => {
        const rid = searchParams.get(RESIDENT_CONTEXT_QUERY_KEY) || searchParams.get('resident_id') || '';
        setFilters((f) => (f.resident_id === rid ? f : { ...f, resident_id: rid }));
    }, [searchParams.toString()]);

    const tLogs = data?.data || [];
    const residents = residentsData?.data || [];
    const branches = branchesData?.data || [];

    // If view modal is open, show view as full page
    if (showViewModal && selectedTLog) {
        return (
            <ViewTLog
                tLog={selectedTLog}
                canEdit={canModifyProgressNotes}
                onClose={() => {
                    setShowViewModal(false);
                    setSelectedTLog(null);
                }}
                onEdit={() => {
                    setShowViewModal(false);
                    handleOpenForm(selectedTLog);
                }}
            />
        );
    }

    return (
        <>
            <ConfirmDialog
                isOpen={deleteConfirmId != null}
                onClose={() => !deleteMutation.isPending && setDeleteConfirmId(null)}
                onConfirm={handleConfirmDelete}
                title="Delete this progress note?"
                description="This action cannot be undone."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
            <Modal
                isOpen={showForm}
                onClose={handleCloseForm}
                title={selectedTLog ? 'Edit progress note' : 'New progress note'}
                size="xl"
            >
                <TLogForm
                    key={selectedTLog?.id ?? 'new'}
                    tLog={selectedTLog}
                    inModal
                    onClose={handleCloseForm}
                    onSuccess={() => {
                        queryClient.invalidateQueries(['t-logs']);
                        handleCloseForm();
                    }}
                />
            </Modal>
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">T-Logs</h1>
                <button
                    onClick={() => handleOpenForm()}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary-dark)] transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    New progress note
                </button>
            </div>

            {/* Filters */}
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                placeholder="Search T-Logs..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                            value={filters.type}
                            onChange={(e) => handleFilterChange('type', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="all">All Types</option>
                            <option value="health">Health</option>
                            <option value="notes">Notes</option>
                            <option value="follow-up">Follow-up</option>
                            <option value="behavior">Behavior</option>
                            <option value="contacts">Contacts</option>
                            <option value="general">General</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notification Level</label>
                        <select
                            value={filters.notification_level}
                            onChange={(e) => handleFilterChange('notification_level', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="all">All Levels</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Resident</label>
                        <select
                            value={filters.resident_id}
                            onChange={(e) => handleFilterChange('resident_id', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">All Residents</option>
                            {residents.map((resident) => (
                                <option key={resident.id} value={resident.id}>
                                    {resident.name || `${resident.first_name} ${resident.last_name}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                        <input
                            type="date"
                            value={filters.date_from}
                            onChange={(e) => handleFilterChange('date_from', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                        <input
                            type="date"
                            value={filters.date_to}
                            onChange={(e) => handleFilterChange('date_to', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>
                </div>
            </Card>

            {/* Progress notes list */}
            {isLoading ? (
                <Card>
                    <div className="text-center py-8">Loading...</div>
                </Card>
            ) : error ? (
                <Card>
                    <div className="text-center py-8 text-red-600">Error loading T-Logs</div>
                </Card>
            ) : tLogs.length === 0 ? (
                <Card>
                    <div className="text-center py-8 text-gray-500">No T-Logs found</div>
                </Card>
            ) : (
                <div className="space-y-4">
                    {tLogs.map((tLog) => (
                        <Card key={tLog.id} className="hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{tLog.summary}</h3>
                                        <div className="flex gap-2 flex-wrap">
                                            {tLog.types?.map((type) => (
                                                <span
                                                    key={type}
                                                    className={`px-2 py-1 text-xs font-medium rounded ${TYPE_COLORS[type] || 'bg-gray-100 text-gray-800'}`}
                                                >
                                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                                </span>
                                            ))}
                                        </div>
                                        <span
                                            className={`px-2 py-1 text-xs font-medium rounded border ${NOTIFICATION_LEVEL_COLORS[tLog.notification_level] || 'bg-gray-100 text-gray-800'}`}
                                        >
                                            {tLog.notification_level || 'low'}
                                        </span>
                                    </div>
                                    
                                    {tLog.description && (
                                        <p className="text-gray-600 mb-3 line-clamp-2">{tLog.description}</p>
                                    )}

                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        {tLog.resident && (
                                            <div className="flex items-center gap-1">
                                                <User className="w-4 h-4" />
                                                <span>{tLog.resident.name || `${tLog.resident.first_name} ${tLog.resident.last_name}`}</span>
                                            </div>
                                        )}
                                        {tLog.reported_on && (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>{new Date(tLog.reported_on).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                        {tLog.attachments && tLog.attachments.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                <FileText className="w-4 h-4" />
                                                <span>{tLog.attachments.length} attachment(s)</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="ml-4 flex gap-2">
                                    <Tooltip content="View" position="top">
                                        <button
                                            type="button"
                                            onClick={() => handleView(tLog)}
                                            className="rounded-lg border-2 border-gray-300 bg-white p-2.5 text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50"
                                            aria-label="View progress note"
                                        >
                                            <Eye className="h-5 w-5 !text-slate-700" strokeWidth={2.5} />
                                        </button>
                                    </Tooltip>
                                    {canModifyProgressNotes && (
                                        <>
                                            <Tooltip content="Edit" position="top">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenForm(tLog)}
                                                    className="rounded-lg border-2 border-gray-300 bg-white p-2.5 text-[var(--theme-primary)] shadow-sm transition-all hover:border-[var(--theme-primary-dark)] hover:bg-[var(--theme-primary-bg)]"
                                                    aria-label="Edit progress note"
                                                >
                                                    <Edit className="h-5 w-5 !text-emerald-700" strokeWidth={2.5} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Delete" position="top">
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteConfirmId(tLog.id)}
                                                    className="rounded-lg border-2 border-red-400 bg-white p-2.5 text-red-700 shadow-sm transition-all hover:border-red-500 hover:bg-red-50"
                                                    aria-label="Delete progress note"
                                                >
                                                    <Trash2 className="h-5 w-5 !text-red-700" strokeWidth={2.5} />
                                                </button>
                                            </Tooltip>
                                        </>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {data && data.last_page > 1 && (
                <div className="flex justify-center gap-2">
                    <button
                        onClick={() => handleFilterChange('page', data.current_page - 1)}
                        disabled={data.current_page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2">
                        Page {data.current_page} of {data.last_page}
                    </span>
                    <button
                        onClick={() => handleFilterChange('page', data.current_page + 1)}
                        disabled={data.current_page === data.last_page}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}

        </div>
        </>
    );
}

// View progress note (full page view)
function ViewTLog({ tLog, onClose, onEdit, canEdit = true }) {
    const handleDownload = async (attachmentId, fileName) => {
        try {
            const response = await api.get(
                `/t-logs/${tLog.id}/attachments/${attachmentId}/download`,
                { responseType: 'blob' }
            );
            
            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            logger.error('Error downloading file:', error);
            toast.error('Failed to download file');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-hover)] p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Tooltip content="Go back" position="bottom">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white"
                                    aria-label="Go back"
                                >
                                    <ArrowLeft className="w-5 h-5" strokeWidth={2.25} />
                                </button>
                            </Tooltip>
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <FileText className="w-8 h-8" />
                                    Progress note details
                                </h1>
                                <p className="text-white/90 mt-1">Comprehensive progress note information and documentation</p>
                            </div>
                        </div>
                        {canEdit && (
                            <button
                                onClick={onEdit}
                                className="px-6 py-2 bg-white text-[var(--theme-primary)] rounded-lg hover:bg-gray-50 font-semibold transition-colors flex items-center gap-2"
                            >
                                <Edit className="w-4 h-4" />
                                Edit progress note
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Info Cards */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-700 mb-1">Types</p>
                                <div className="flex gap-1.5 flex-wrap">
                                    {tLog.types?.slice(0, 2).map((type) => (
                                        <span
                                            key={type}
                                            className={`px-2 py-0.5 text-xs font-semibold rounded-md ${TYPE_COLORS[type] || 'bg-gray-100 text-gray-800'}`}
                                        >
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </span>
                                    ))}
                                    {tLog.types?.length > 2 && (
                                        <span className="px-2 py-0.5 text-xs font-semibold text-blue-700">
                                            +{tLog.types.length - 2}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <FileText className="w-8 h-8 text-blue-400 opacity-50" />
                        </div>
                    </div>

                    <div className={`bg-gradient-to-br rounded-xl p-4 border ${
                        tLog.notification_level === 'urgent' ? 'from-red-50 to-red-100 border-red-200' :
                        tLog.notification_level === 'high' ? 'from-orange-50 to-orange-100 border-orange-200' :
                        tLog.notification_level === 'medium' ? 'from-yellow-50 to-yellow-100 border-yellow-200' :
                        'from-green-50 to-green-100 border-green-200'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className={`text-sm font-medium mb-1 ${
                                    tLog.notification_level === 'urgent' ? 'text-red-700' :
                                    tLog.notification_level === 'high' ? 'text-orange-700' :
                                    tLog.notification_level === 'medium' ? 'text-yellow-700' :
                                    'text-green-700'
                                }`}>
                                    Notification Level
                                </p>
                                <span className={`inline-block px-3 py-1 text-sm font-bold rounded-md border-2 ${
                                    NOTIFICATION_LEVEL_COLORS[tLog.notification_level] || 'bg-gray-100 text-gray-800 border-gray-300'
                                }`}>
                                    {(tLog.notification_level || 'low').toUpperCase()}
                                </span>
                            </div>
                            <AlertTriangle className={`w-8 h-8 opacity-50 ${
                                tLog.notification_level === 'urgent' ? 'text-red-400' :
                                tLog.notification_level === 'high' ? 'text-orange-400' :
                                tLog.notification_level === 'medium' ? 'text-yellow-400' :
                                'text-green-400'
                            }`} />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-700 mb-1">Resident</p>
                                <p className="text-lg font-semibold text-purple-900">
                                    {tLog.resident?.name || `${tLog.resident?.first_name || ''} ${tLog.resident?.last_name || ''}`.trim() || 'N/A'}
                                </p>
                            </div>
                            <User className="w-8 h-8 text-purple-400 opacity-50" />
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-cyan-700 mb-1">Reported On</p>
                                <p className="text-lg font-semibold text-cyan-900">
                                    {tLog.reported_on 
                                        ? new Date(tLog.reported_on).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                        : 'N/A'}
                                </p>
                                {tLog.reported_on && (
                                    <p className="text-xs text-cyan-600 mt-0.5">
                                        {new Date(tLog.reported_on).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                )}
                            </div>
                            <Calendar className="w-8 h-8 text-cyan-400 opacity-50" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Summary Card */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[var(--theme-primary)]" />
                            Summary
                        </h2>
                        <p className="text-gray-700 text-lg leading-relaxed">{tLog.summary}</p>
                    </div>

                    {/* Description Card */}
                    {tLog.description && (
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[var(--theme-primary)]" />
                                Description
                            </h2>
                            <div className="prose max-w-none">
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{tLog.description}</p>
                            </div>
                        </div>
                    )}

                    {/* Types Card */}
                    {tLog.types && tLog.types.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">All Types</h2>
                            <div className="flex flex-wrap gap-2">
                                {tLog.types.map((type) => (
                                    <span
                                        key={type}
                                        className={`px-4 py-2 text-sm font-semibold rounded-lg ${TYPE_COLORS[type] || 'bg-gray-100 text-gray-800'}`}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Attachments Card */}
                    {tLog.attachments && tLog.attachments.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[var(--theme-primary)]" />
                                Attachments ({tLog.attachments.length})
                            </h2>
                            <div className="grid grid-cols-1 gap-3">
                                {tLog.attachments.map((attachment) => (
                                    <div
                                        key={attachment.id}
                                        className="flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-[var(--theme-primary)] hover:bg-[var(--theme-primary-bg)] transition-all group"
                                    >
                                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[var(--theme-primary-bg)] to-[var(--theme-primary)] rounded-lg flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-[var(--theme-primary)] group-hover:text-white transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-[var(--theme-primary)] transition-colors">
                                                {attachment.file_name}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {attachment.file_size_human || 'Unknown size'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Tooltip content="View" position="top">
                                                <a
                                                    href={attachment.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-gray-600 hover:text-[var(--theme-primary)] hover:bg-white rounded-lg transition-colors inline-flex"
                                                    aria-label="View attachment"
                                                >
                                                    <Eye className="w-5 h-5" strokeWidth={2.25} />
                                                </a>
                                            </Tooltip>
                                            <Tooltip content="Download" position="top">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDownload(attachment.id, attachment.file_name)}
                                                    className="p-2 text-gray-600 hover:text-[var(--theme-primary)] hover:bg-white rounded-lg transition-colors"
                                                    aria-label="Download attachment"
                                                >
                                                    <Download className="w-5 h-5" strokeWidth={2.25} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Metadata */}
                <div className="space-y-6">
                    {/* Information Card */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Information</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Resident
                                </label>
                                <p className="text-base font-medium text-gray-900">
                                    {tLog.resident?.name || `${tLog.resident?.first_name || ''} ${tLog.resident?.last_name || ''}`.trim() || 'N/A'}
                                </p>
                                {tLog.resident?.room_number && (
                                    <p className="text-sm text-gray-500 mt-0.5">Room {tLog.resident.room_number}</p>
                                )}
                            </div>

                            <div className="border-t border-gray-200 pt-4">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Branch / Program
                                </label>
                                <p className="text-base font-medium text-gray-900">{tLog.branch?.name || 'N/A'}</p>
                            </div>

                            {tLog.reporter && (
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                        Reporter
                                    </label>
                                    <p className="text-base font-medium text-gray-900">
                                        {tLog.reporter.name || tLog.reporter.email || 'N/A'}
                                    </p>
                                </div>
                            )}

                            {tLog.reported_on && (
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                        Reported On
                                    </label>
                                    <p className="text-base font-medium text-gray-900">
                                        {new Date(tLog.reported_on).toLocaleDateString('en-US', { 
                                            weekday: 'long',
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {new Date(tLog.reported_on).toLocaleTimeString('en-US', { 
                                            hour: '2-digit', 
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </p>
                                </div>
                            )}

                            {tLog.created_at && (
                                <div className="border-t border-gray-200 pt-4">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                        Created
                                    </label>
                                    <p className="text-sm text-gray-600">
                                        {new Date(tLog.created_at).toLocaleString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

