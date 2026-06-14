import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Moon, Plus, Search, Calendar, Clock, User, Edit, Trash2, Filter, ChevronDown, X } from 'lucide-react';
import { getLocalDateString } from '../utils/pacificTime';
import CalendarComponent from '../components/ui/Calendar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import EntityCardShell, { EntityCardHeader } from '../components/ui/EntityCardShell';
import CardIconButton from '../components/ui/CardIconButton';
import DataPill, { DataPillSection } from '../components/ui/DataPill';
import ResidentAvatarInline from '../components/ui/ResidentAvatarInline';
import { RESIDENT_CONTEXT_QUERY_KEY } from '../utils/headerResidentSwitcher';

export default function Sleep() {
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();
    const [dateFilter, setDateFilter] = useState('all');
    const [residentFilter, setResidentFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [selectedCalendarDate, setSelectedCalendarDate] = useState(null);
    const [sleepDeleteId, setSleepDeleteId] = useState(null);

    React.useEffect(() => {
        const rid =
            searchParams.get(RESIDENT_CONTEXT_QUERY_KEY) ||
            searchParams.get('resident_id') ||
            searchParams.get('resident') ||
            '';
        setResidentFilter(rid);
    }, [searchParams]);

    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const response = await api.get('/user');
            if (response?.data && typeof response.data === 'object') {
                if (response.data.user) {
                    return response.data.user;
                }
                if (response.data.data) {
                    return response.data.data;
                }
                return response.data;
            }
            return null;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Check if user is a facility administrator (can access all branches in facility)
    const isFacilityAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'administrator';
    }, [currentUser]);
    
    // Check if user is a branch-level admin (restricted to assigned branch)
    const isBranchAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = currentUser.role?.toLowerCase().trim() || '';
        return role === 'admin';
    }, [currentUser]);
    
    const isCaregiver = React.useMemo(() => {
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

    const caregiverBranchId = React.useMemo(() => {
        if (!isCaregiver) {
            return '';
        }
        const assignedId = currentUser?.assigned_branch_id;
        return assignedId ? String(assignedId) : '';
    }, [isCaregiver, currentUser?.assigned_branch_id]);

    // Fetch residents for filter
    const { data: residentsData } = useQuery({
        queryKey: ['residents-list', isCaregiver ? caregiverBranchId || 'none' : 'all'],
        queryFn: async () => {
            const params = { per_page: 100 };
            if (isCaregiver && caregiverBranchId) {
                params.branch_id = caregiverBranchId;
            }
            const response = await api.get('/residents', { params });
            return response.data;
        },
    });

    const residentOptions = React.useMemo(() => {
        const residents = residentsData?.data || [];
        if (isCaregiver && caregiverBranchId) {
            return residents.filter((resident) => String(resident.branch_id) === String(caregiverBranchId));
        }
        return residents;
    }, [residentsData?.data, isCaregiver, caregiverBranchId]);

    const caregiverBranchName = React.useMemo(() => {
        if (!isCaregiver || !caregiverBranchId) {
            return '';
        }

        const residentMatch = residentOptions.find(
            (resident) => String(resident.branch_id) === String(caregiverBranchId)
        );
        if (residentMatch?.branch?.name) {
            return residentMatch.branch.name;
        }

        if (currentUser?.assigned_branch?.name) {
            return currentUser.assigned_branch.name;
        }

        if (currentUser?.assigned_branch_name) {
            return currentUser.assigned_branch_name;
        }

        return '';
    }, [isCaregiver, caregiverBranchId, residentOptions, currentUser]);

    // Fetch all sleep records for calendar
    const { data: allSleepRecordsForCalendar } = useQuery({
        queryKey: ['sleep-records-calendar', residentFilter, isCaregiver ? caregiverBranchId || 'none' : 'all'],
        queryFn: async () => {
            const params = { per_page: 1000 };
            
            if (residentFilter) {
                params.resident_id = residentFilter;
            }

            if (isCaregiver && caregiverBranchId) {
                params.branch_id = caregiverBranchId;
            }

            const response = await api.get('/sleep-records', { params });
            return response.data;
        },
    });

    // Fetch sleep records
    const { data, isLoading } = useQuery({
        queryKey: ['sleep-records', dateFilter, residentFilter, search, selectedCalendarDate],
        queryFn: async () => {
            const params = { per_page: 20 };
            
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
            
            if (residentFilter) {
                params.resident_id = residentFilter;
            }

            if (search) {
                params.search = search;
            }

            if (isCaregiver && caregiverBranchId) {
                params.branch_id = caregiverBranchId;
            }

            const response = await api.get('/sleep-records', { params });
            return response.data;
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/sleep-records/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['sleep-records']);
            queryClient.invalidateQueries(['sleep-records-calendar']);
        },
    });

    const handleConfirmSleepDelete = () => {
        if (sleepDeleteId == null) return;
        deleteMutation.mutate(sleepDeleteId, { onSuccess: () => setSleepDeleteId(null) });
    };

    // Process sleep records for calendar
    const calendarData = useMemo(() => {
        if (!allSleepRecordsForCalendar?.data) return [];

        const dateMap = new Map();

        allSleepRecordsForCalendar.data.forEach((record) => {
            if (!record.sleep_date) return;

            const date = new Date(record.sleep_date);
            const dateStr = date.toISOString().split('T')[0];

            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, {
                    date: dateStr,
                    indicators: [],
                    count: 0,
                });
            }

            const dayData = dateMap.get(dateStr);
            dayData.count += 1;

            // Color-code by sleep quality
            let qualityColor = 'bg-gray-400';
            if (record.sleep_quality) {
                const quality = Number(record.sleep_quality);
                if (quality >= 8) {
                    qualityColor = 'bg-green-500';
                } else if (quality >= 6) {
                    qualityColor = 'bg-yellow-500';
                } else {
                    qualityColor = 'bg-red-500';
                }
            }

            dayData.indicators.push({
                type: 'sleep_record',
                color: qualityColor,
                quality: record.sleep_quality,
            });

            // Set background color based on average quality if multiple records
            if (dayData.count > 1) {
                // Calculate average quality for the day
                const recordsForDay = allSleepRecordsForCalendar.data.filter(r => {
                    const rDate = new Date(r.sleep_date);
                    return rDate.toISOString().split('T')[0] === dateStr;
                });
                const avgQuality = recordsForDay.reduce((sum, r) => sum + (Number(r.sleep_quality) || 0), 0) / recordsForDay.length;
                
                if (avgQuality >= 8) {
                    dayData.backgroundColor = 'bg-green-100';
                } else if (avgQuality >= 6) {
                    dayData.backgroundColor = 'bg-yellow-100';
                } else {
                    dayData.backgroundColor = 'bg-red-100';
                }
            } else {
                // Single record - use its quality
                if (record.sleep_quality) {
                    const quality = Number(record.sleep_quality);
                    if (quality >= 8) {
                        dayData.backgroundColor = 'bg-green-100';
                    } else if (quality >= 6) {
                        dayData.backgroundColor = 'bg-yellow-100';
                    } else {
                        dayData.backgroundColor = 'bg-red-100';
                    }
                }
            }
        });

        return Array.from(dateMap.values());
    }, [allSleepRecordsForCalendar]);

    const handleCalendarDateSelect = (dateStr) => {
        setSelectedCalendarDate(dateStr);
        setDateFilter('all'); // Reset date filter when calendar date is selected
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        try {
            const time = new Date(`2000-01-01T${timeString}`);
            return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch {
            return timeString;
        }
    };

    const getQualityColor = (quality) => {
        if (!quality) return 'gray';
        if (quality >= 8) return 'green';
        if (quality >= 6) return 'yellow';
        return 'red';
    };

    const getDurationColor = (hours) => {
        if (!hours) return 'gray';
        if (hours >= 8) return 'green';
        if (hours >= 6) return 'yellow';
        return 'red';
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setShowForm(true);
    };

    const handleDelete = (id) => {
        setSleepDeleteId(id);
    };

    return (
        <>
            <ConfirmDialog
                isOpen={sleepDeleteId != null}
                onClose={() => !deleteMutation.isPending && setSleepDeleteId(null)}
                onConfirm={handleConfirmSleepDelete}
                title="Delete sleep record?"
                description="This record will be permanently removed."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
            <Modal
                isOpen={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditingRecord(null);
                }}
                title={editingRecord ? 'Edit Sleep Record' : 'Add Sleep Record'}
                size="xl"
            >
                <SleepRecordForm
                    key={editingRecord?.id ?? 'new'}
                    record={editingRecord}
                    residents={residentOptions}
                    isCaregiver={isCaregiver}
                    caregiverBranchId={caregiverBranchId}
                    caregiverBranchName={caregiverBranchName}
                    currentUser={currentUser}
                    isFacilityAdmin={isFacilityAdmin}
                    isBranchAdmin={isBranchAdmin}
                    inModal
                    defaultResidentId={editingRecord ? '' : residentFilter}
                    onClose={() => {
                        setShowForm(false);
                        setEditingRecord(null);
                    }}
                    onSuccess={() => {
                        setShowForm(false);
                        setEditingRecord(null);
                        queryClient.invalidateQueries(['sleep-records']);
                        queryClient.invalidateQueries(['sleep-records-calendar']);
                    }}
                />
            </Modal>
        <div>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Sleep Records Management</h2>
                        <p className="text-gray-600">View and track resident sleep records.</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingRecord(null);
                            setShowForm(true);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Sleep Record</span>
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range:</label>
                        <div className="flex flex-wrap gap-2">
                            {['all', 'today', 'week', 'month'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setDateFilter(filter)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                                        dateFilter === filter
                                            ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)]'
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Resident:</label>
                        <select
                            value={residentFilter}
                            onChange={(e) => setResidentFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        >
                            <option value="">All Residents</option>
                            {residentOptions.map((resident) => (
                                <option key={resident.id} value={resident.id}>
                                    {resident.first_name} {resident.last_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search:</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search residents..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sleep Records List */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading sleep records...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data?.data?.length > 0 ? (
                        data.data.map((record) => (
                            <EntityCardShell key={record.id}>
                                <EntityCardHeader
                                    left={
                                        <div className="flex min-w-0 items-start gap-3">
                                            <ResidentAvatarInline resident={record.resident} />
                                            <div className="min-w-0">
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {record.resident?.first_name} {record.resident?.last_name}
                                                </h3>
                                                <p className="text-sm text-gray-500">
                                                    {record.branch?.name} • {new Date(record.sleep_date).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    }
                                    right={
                                        <>
                                            <Tooltip content="Edit" position="top">
                                                <CardIconButton
                                                    variant="edit"
                                                    type="button"
                                                    onClick={() => handleEdit(record)}
                                                    aria-label="Edit sleep record"
                                                >
                                                    <Edit className="h-4 w-4" strokeWidth={2.5} />
                                                </CardIconButton>
                                            </Tooltip>
                                            <Tooltip content="Delete" position="top">
                                                <CardIconButton
                                                    variant="delete"
                                                    type="button"
                                                    onClick={() => handleDelete(record.id)}
                                                    aria-label="Delete sleep record"
                                                >
                                                    <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                                                </CardIconButton>
                                            </Tooltip>
                                        </>
                                    }
                                />

                                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                    <DataPill icon={Clock} contentClassName="!block">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sleep</span>
                                        <span className="block font-semibold text-slate-800">{formatTime(record.sleep_time)}</span>
                                    </DataPill>
                                    <DataPill icon={Clock} contentClassName="!block">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Wake</span>
                                        <span className="block font-semibold text-slate-800">{formatTime(record.wake_time)}</span>
                                    </DataPill>
                                    <DataPill icon={Moon} contentClassName="!block">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</span>
                                        <span
                                            className={`block font-semibold ${
                                                getDurationColor(record.total_sleep_hours) === 'green'
                                                    ? 'text-green-600'
                                                    : getDurationColor(record.total_sleep_hours) === 'yellow'
                                                      ? 'text-yellow-600'
                                                      : getDurationColor(record.total_sleep_hours) === 'red'
                                                        ? 'text-red-600'
                                                        : 'text-slate-800'
                                            }`}
                                        >
                                            {Number.isFinite(Number(record.total_sleep_hours))
                                                ? `${Number(record.total_sleep_hours).toFixed(2)} hrs`
                                                : 'N/A'}
                                        </span>
                                    </DataPill>
                                    {record.sleep_quality != null && record.sleep_quality !== '' && (
                                        <DataPill icon={Moon} contentClassName="!block">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quality</span>
                                            <span
                                                className={`block font-semibold ${
                                                    getQualityColor(record.sleep_quality) === 'green'
                                                        ? 'text-green-600'
                                                        : getQualityColor(record.sleep_quality) === 'yellow'
                                                          ? 'text-yellow-600'
                                                          : getQualityColor(record.sleep_quality) === 'red'
                                                            ? 'text-red-600'
                                                            : 'text-slate-800'
                                                }`}
                                            >
                                                {record.sleep_quality}/10
                                            </span>
                                        </DataPill>
                                    )}
                                    {record.restlessness_episodes !== null && (
                                        <DataPill icon={Moon} contentClassName="!block">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Restlessness</span>
                                            <span className="block font-semibold text-slate-800">
                                                {record.restlessness_episodes} episodes
                                            </span>
                                        </DataPill>
                                    )}
                                </div>

                                {record.notes && (
                                    <DataPillSection label="Notes" className="mt-4">
                                        {record.notes}
                                    </DataPillSection>
                                )}

                                {record.created_by && (
                                    <p className="mt-3 text-xs text-gray-500">
                                        Recorded by: {record.created_by?.name || 'Unknown'}
                                    </p>
                                )}
                            </EntityCardShell>
                        ))
                    ) : (
                        <div className="bg-white rounded-lg shadow p-12 text-center">
                            <Moon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600 text-lg font-medium">No sleep records found</p>
                            <p className="text-gray-500 text-sm mt-2">
                                {dateFilter === 'today' 
                                    ? 'No sleep records recorded today.' 
                                    : 'Try adjusting your filters or add a new sleep record.'}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
        </>
    );
}

// Sleep Record Form Component
function SleepRecordForm({
    record,
    residents,
    isCaregiver,
    caregiverBranchId,
    caregiverBranchName,
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
        : defaultResidentId
          ? String(defaultResidentId)
          : '';
    const [formData, setFormData] = useState({
        resident_id: initialResidentId,
        branch_id:
            record?.branch_id != null && record.branch_id !== ''
                ? String(record.branch_id)
                : caregiverBranchId
                  ? String(caregiverBranchId)
                  : isBranchAdmin && currentUser?.assigned_branch_id
                    ? String(currentUser.assigned_branch_id)
                    : '',
        sleep_date: record?.sleep_date || getLocalDateString(),
        sleep_time: record?.sleep_time || '',
        wake_time: record?.wake_time || '',
        total_sleep_hours: record?.total_sleep_hours || '',
        sleep_quality: record?.sleep_quality || '',
        restlessness_episodes: record?.restlessness_episodes || 0,
        notes: record?.notes || '',
    });

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
    }, [isBranchAdmin, currentUser, record]);

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch branches (show all; caregivers will be limited by assigned_branch)
    const { data: branchesData } = useQuery({
        queryKey: ['branches-options-sleep'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 200 } })).data,
    });

    const branches = React.useMemo(() => {
        const list = branchesData?.data || [];
        if (isCaregiver && caregiverBranchId) {
            return list.filter((b) => String(b.id) === String(caregiverBranchId));
        }
        return list;
    }, [branchesData?.data, isCaregiver, caregiverBranchId]);

    React.useEffect(() => {
        if (isCaregiver && caregiverBranchId && formData.branch_id !== caregiverBranchId) {
            setFormData((prev) => ({
                ...prev,
                branch_id: caregiverBranchId,
            }));
        }
    }, [isCaregiver, caregiverBranchId, formData.branch_id]);

    // Filter residents by selected branch
    const filteredResidents = React.useMemo(() => {
        if (isCaregiver && caregiverBranchId) {
            return residents.filter(r => String(r.branch_id) === String(caregiverBranchId));
        }
        if (!formData.branch_id) return residents;
        return residents.filter(r => r.branch_id == formData.branch_id);
    }, [isCaregiver, caregiverBranchId, formData.branch_id, residents]);

    React.useEffect(() => {
        if (formData.sleep_time && formData.wake_time) {
            const sleepTime = new Date(`2000-01-01T${formData.sleep_time}`);
            const wakeTime = new Date(`2000-01-01T${formData.wake_time}`);
            
            let calculatedWakeTime = wakeTime;
            if (calculatedWakeTime < sleepTime) {
                calculatedWakeTime = new Date(calculatedWakeTime.getTime() + 24 * 60 * 60 * 1000);
            }
            
            const diffMs = calculatedWakeTime - sleepTime;
            const diffHours = diffMs / (1000 * 60 * 60);
            setFormData(prev => ({...prev, total_sleep_hours: diffHours.toFixed(2)}));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.sleep_time, formData.wake_time]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setIsSubmitting(true);

        try {
            const payload = {
                ...formData,
                resident_id: parseInt(formData.resident_id),
                branch_id: formData.branch_id ? parseInt(formData.branch_id) : null,
            };

            if (record) {
                await api.put(`/sleep-records/${record.id}`, payload);
            } else {
                await api.post('/sleep-records', payload);
            }
            onSuccess();
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrors({ general: error.response?.data?.message || 'Failed to save sleep record' });
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
                        {record ? 'Edit Sleep Record' : 'Add Sleep Record'}
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
                                {isCaregiver ? (
                                    <>
                                        <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-900 min-h-[42px] flex items-center">
                                            <span>{caregiverBranchName || 'No branch assigned'}</span>
                                        </div>
                                        <input type="hidden" value={formData.branch_id} />
                                    </>
                                ) : (
                                    <select
                                        value={formData.branch_id}
                                        onChange={(e) => setFormData({...formData, branch_id: e.target.value, resident_id: ''})}
                                        required
                                        disabled={!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id}
                                        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent ${!isFacilityAdmin && isBranchAdmin && currentUser?.assigned_branch_id ? 'bg-gray-100 cursor-not-allowed opacity-75' : ''}`}
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map(branch => (
                                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                                        ))}
                                    </select>
                                )}
                                {errors.branch_id && <p className="text-xs text-red-600 mt-1">{errors.branch_id[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Resident *
                                </label>
                                <select
                                    value={formData.resident_id}
                                    onChange={(e) => setFormData({...formData, resident_id: e.target.value})}
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Sleep Date *
                            </label>
                            <input
                                type="date"
                                value={formData.sleep_date}
                                onChange={(e) => setFormData({...formData, sleep_date: e.target.value})}
                                required
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                            {errors.sleep_date && <p className="text-xs text-red-600 mt-1">{errors.sleep_date[0]}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sleep Time *
                                </label>
                                <TimePicker
                                    value={formData.sleep_time}
                                    onChange={(value) => setFormData({...formData, sleep_time: value})}
                                    className={errors.sleep_time ? 'border-red-300' : ''}
                                />
                                {errors.sleep_time && <p className="text-xs text-red-600 mt-1">{errors.sleep_time[0]}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Wake Time *
                                </label>
                                <TimePicker
                                    value={formData.wake_time}
                                    onChange={(value) => setFormData({...formData, wake_time: value})}
                                    className={errors.wake_time ? 'border-red-300' : ''}
                                />
                                {errors.wake_time && <p className="text-xs text-red-600 mt-1">{errors.wake_time[0]}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Total Sleep Hours
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="24"
                                    value={formData.total_sleep_hours}
                                    readOnly
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Sleep Quality (1-10)
                                </label>
                                <select
                                    value={formData.sleep_quality}
                                    onChange={(e) => setFormData({...formData, sleep_quality: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                >
                                    <option value="">Select Quality</option>
                                    {[1,2,3,4,5,6,7,8,9,10].map(num => (
                                        <option key={num} value={num}>{num}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Restlessness Episodes
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.restlessness_episodes}
                                    onChange={(e) => setFormData({...formData, restlessness_episodes: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                placeholder="Additional notes about the sleep session..."
                            />
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

// TimePicker Component
function TimePicker({ value, onChange, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [hours, setHours] = useState(() => {
        if (value) {
            const [h] = value.split(':');
            return parseInt(h) || 12;
        }
        return 12;
    });
    const [minutes, setMinutes] = useState(() => {
        if (value) {
            const [, m] = value.split(':');
            return parseInt(m) || 0;
        }
        return 0;
    });
    const [period, setPeriod] = useState(() => {
        if (value) {
            const [h] = value.split(':');
            const hour = parseInt(h) || 0;
            return hour >= 12 ? 'PM' : 'AM';
        }
        return 'AM';
    });

    React.useEffect(() => {
        if (value) {
            const [h, m] = value.split(':');
            const hour = parseInt(h) || 0;
            const min = parseInt(m) || 0;
            setHours(hour % 12 || 12);
            setMinutes(min);
            setPeriod(hour >= 12 ? 'PM' : 'AM');
        }
    }, [value]);

    const formatTime = (h, m, p) => {
        let hour24 = h;
        if (p === 'PM' && h !== 12) hour24 = h + 12;
        if (p === 'AM' && h === 12) hour24 = 0;
        return `${hour24.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const handleTimeChange = (newHours, newMinutes, newPeriod) => {
        const timeValue = formatTime(newHours, newMinutes, newPeriod);
        onChange(timeValue);
        setIsOpen(false);
    };

    const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1);
    const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

    const displayValue = value 
        ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`
        : '--:-- --';

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent bg-white text-left flex items-center justify-between ${className}`}
            >
                <span className={value ? 'text-gray-900' : 'text-gray-400'}>
                    {displayValue}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsOpen(false)}
                    ></div>
                    <div className="absolute z-20 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-full">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            {/* Hours */}
                            <select
                                value={hours}
                                onChange={(e) => {
                                    const newHours = parseInt(e.target.value);
                                    handleTimeChange(newHours, minutes, period);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-center text-lg font-semibold"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {hourOptions.map(h => (
                                    <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                                ))}
                            </select>
                            
                            <span className="text-2xl font-bold text-gray-700">:</span>
                            
                            {/* Minutes */}
                            <select
                                value={minutes}
                                onChange={(e) => {
                                    const newMinutes = parseInt(e.target.value);
                                    handleTimeChange(hours, newMinutes, period);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-center text-lg font-semibold"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {minuteOptions.map(m => (
                                    <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                                ))}
                            </select>
                            
                            {/* AM/PM */}
                            <select
                                value={period}
                                onChange={(e) => {
                                    const newPeriod = e.target.value;
                                    handleTimeChange(hours, minutes, newPeriod);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent text-center text-lg font-semibold"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                            </select>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
