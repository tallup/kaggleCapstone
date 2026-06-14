import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import logger from '../utils/logger';
import { Users, Plus, Edit, Trash2, Search, Filter, Upload, X, Eye, Mail, Phone, Calendar, Briefcase, MapPin, Award, Shield, Clock, User as UserIcon, AlertCircle, Building2 } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import Tooltip from '../components/ui/Tooltip';
import EntityCardShell, { EntityCardHeader } from '../components/ui/EntityCardShell';
import CardIconButton from '../components/ui/CardIconButton';
import DataPill from '../components/ui/DataPill';
import { formatPhoneNumber } from '../utils/phoneFormatter';

export default function UsersPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [facilityFilter, setFacilityFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewingProfile, setViewingProfile] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['users', search, branchFilter, facilityFilter, activeFilter, currentPage],
        queryFn: async () => {
            const params = {
                per_page: 20,
                page: currentPage,
            };
            if (search) params.search = search;
            if (branchFilter) params.branch_id = branchFilter;
            if (facilityFilter) params.facility_id = facilityFilter;
            if (activeFilter === 'active') {
                params.status = 'active';
            } else if (activeFilter === 'inactive') {
                params.status = 'inactive';
            }
            const response = await api.get('/users', { params });
            return response.data;
        },
    });

    const { data: branchesData } = useQuery({
        queryKey: ['branches-options'],
        queryFn: async () => (await api.get('/branches', { params: { per_page: 100 } })).data,
    });

    const { data: rolesData } = useQuery({
        queryKey: ['roles-options'],
        queryFn: async () => (await api.get('/roles', { params: { per_page: 100 } })).data,
    });

    const { data: currentUser } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => (await api.get('/user')).data,
    });

    const isSuperAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = String(currentUser.role || '').toLowerCase().trim();
        return role === 'super_admin' || role === 'superadmin';
    }, [currentUser]);

    const isAdmin = React.useMemo(() => {
        if (!currentUser) return false;
        const role = String(currentUser.role || '').toLowerCase().trim();
        return role === 'administrator' || role === 'admin';
    }, [currentUser]);

    const permissions = Array.isArray(currentUser?.permissions) ? currentUser.permissions : [];
    const canCreate = isSuperAdmin || isAdmin || permissions.includes('create_users');
    const canEdit = isSuperAdmin || isAdmin || permissions.includes('edit_users');
    const canDelete = isSuperAdmin || isAdmin || permissions.includes('delete_users');

    const { data: facilitiesData } = useQuery({
        queryKey: ['facilities-options'],
        queryFn: async () => (await api.get('/facilities', { params: { per_page: 100 } })).data,
        enabled: isSuperAdmin,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => api.delete(`/users/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['users']),
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, isActive }) => {
            const response = await api.put(`/users/${id}`, { is_active: isActive });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
        },
    });

    const handleToggleActive = (user, newStatus) => {
        toggleActiveMutation.mutate({ id: user.id, isActive: newStatus });
    };

    const handleConfirmDeleteUser = () => {
        if (!deleteConfirmUser) return;
        deleteMutation.mutate(deleteConfirmUser.id, { onSuccess: () => setDeleteConfirmUser(null) });
    };

    const clearUserFormQuery = () => {
        const next = new URLSearchParams(searchParams);
        next.delete('create');
        next.delete('editUserId');
        next.delete('facility_id');
        setSearchParams(next, { replace: true });
    };

    const handleCloseUserForm = () => {
        setShowForm(false);
        setEditing(null);
        clearUserFormQuery();
    };

    const openUserCreate = () => {
        setEditing(null);
        setShowForm(true);
        const next = new URLSearchParams(searchParams);
        next.set('create', '1');
        next.delete('editUserId');
        setSearchParams(next, { replace: true });
    };

    const openUserEdit = async (user) => {
        await handleEditFromProfile(user);
        const next = new URLSearchParams(searchParams);
        next.delete('create');
        next.set('editUserId', String(user.id));
        setSearchParams(next, { replace: true });
    };

    React.useEffect(() => {
        const create = searchParams.get('create');
        const editIdRaw = searchParams.get('editUserId');
        if (editIdRaw) {
            const id = parseInt(editIdRaw, 10);
            if (Number.isNaN(id)) return;
            let cancelled = false;
            (async () => {
                try {
                    const response = await api.get(`/users/${id}`);
                    if (!cancelled) {
                        setEditing(response.data);
                        setShowForm(true);
                    }
                } catch (error) {
                    logger.error('Error loading user for edit:', error);
                    if (!cancelled) clearUserFormQuery();
                }
            })();
            return () => {
                cancelled = true;
            };
        }
        if (create === '1') {
            setEditing(null);
            setShowForm(true);
        }
    }, [searchParams]);

    const handleEditFromProfile = async (user) => {
        try {
            // Fetch full user details to ensure all fields are loaded
            const response = await api.get(`/users/${user.id}`);
            setEditing(response.data);
            setShowForm(true);
        } catch (error) {
            logger.error('Error fetching user details:', error);
            // Fallback to using the user object from the list
            setEditing(user);
            setShowForm(true);
        }
    };

    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search, branchFilter, facilityFilter, activeFilter]);

    const usersList = data?.data || [];
    const isUserActive = (user) => {
        const value = user?.is_active;
        return value === true || value === 1 || value === '1';
    };
    const activeUsers = usersList.filter((user) => isUserActive(user));
    const inactiveUsers = usersList.filter((user) => !isUserActive(user));
    const showActiveSection = activeFilter !== 'inactive';
    const showInactiveSection = activeFilter !== 'active';

    const renderUserCard = (user) => {
        const isInactive = !isUserActive(user);

        return (
            <EntityCardShell
                key={user.id}
                className={
                    isInactive
                        ? 'border-red-200/90 bg-red-50/60 hover:border-red-300/90'
                        : ''
                }
            >
                <EntityCardHeader
                    left={
                        <div className="flex flex-wrap items-start gap-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[var(--theme-primary)] shadow-sm">
                                {user.profile_image_url ? (
                                    <img
                                        src={user.profile_image_url}
                                        alt={user.name || ''}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            const next = e.target.nextElementSibling;
                                            if (next) next.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div
                                    className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--theme-primary)] to-[#4a7a2a] text-lg font-bold text-white ${
                                        user.profile_image_url ? 'hidden' : 'flex'
                                    }`}
                                >
                                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                            </div>
                            <div className="min-w-0 space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                    <span
                                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                            isInactive
                                                ? 'border-red-200 bg-red-50 text-red-800'
                                                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                        }`}
                                    >
                                        {isInactive ? 'Inactive' : 'Active'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    }
                    right={
                        <>
                            <Tooltip content="View profile" position="top">
                                <CardIconButton
                                    variant="view"
                                    icon={Eye}
                                    aria-label="View profile"
                                    onClick={() => navigate(`/team/users/${user.id}`)}
                                />
                            </Tooltip>
                            {canEdit && (
                                <Tooltip content="Edit user" position="top">
                                    <CardIconButton
                                        variant="edit"
                                        icon={Edit}
                                        aria-label="Edit user"
                                        onClick={() => void openUserEdit(user)}
                                    />
                                </Tooltip>
                            )}
                            {canDelete && (
                                <Tooltip content="Delete user" position="top">
                                    <CardIconButton
                                        variant="delete"
                                        icon={Trash2}
                                        aria-label="Delete user"
                                        onClick={() => setDeleteConfirmUser(user)}
                                    />
                                </Tooltip>
                            )}
                        </>
                    }
                />

                <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl truncate">
                    {user.name || user.email}
                </h3>
                <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>
                {isSuperAdmin && user.facility && (
                    <p className="mt-1 flex items-center truncate text-xs text-slate-400">
                        <Building2 className="mr-1 h-3 w-3 shrink-0" />
                        {user.facility.name}
                    </p>
                )}

                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {user.assigned_branch && (
                        <DataPill icon={MapPin}>
                            <span className="font-normal text-slate-600">{user.assigned_branch.name}</span>
                        </DataPill>
                    )}
                    {user.roles && user.roles.length > 0 && (
                        <DataPill icon={Shield} className="sm:col-span-2">
                            <span className="font-normal text-slate-600 line-clamp-2">
                                {user.roles.map((r) => r.name).join(', ')}
                            </span>
                        </DataPill>
                    )}
                    {user.phone_number && (
                        <DataPill icon={Phone}>
                            <span className="font-normal text-slate-600">
                                {formatPhoneNumber(user.phone_number) || user.phone_number}
                            </span>
                        </DataPill>
                    )}
                </div>
            </EntityCardShell>
        );
    };


    return (
        <>
            <ConfirmDialog
                isOpen={deleteConfirmUser != null}
                onClose={() => !deleteMutation.isPending && setDeleteConfirmUser(null)}
                onConfirm={handleConfirmDeleteUser}
                title="Delete this user?"
                description={
                    deleteConfirmUser
                        ? `Delete ${deleteConfirmUser.name || deleteConfirmUser.email}? This cannot be undone.`
                        : ''
                }
                confirmLabel="Delete"
                cancelLabel="Cancel"
                variant="danger"
                isPending={deleteMutation.isPending}
            />
        <div>
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">All Users</h2>
                        <p className="text-gray-600">Search and manage users in the system.</p>
                    </div>
                    {canCreate && (
                        <button
                            type="button"
                            onClick={openUserCreate}
                            className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 text-sm md:text-base"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add User</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>

                    {/* Facility Filter (Super Admin only) */}
                    {isSuperAdmin && (
                        <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                value={facilityFilter}
                                onChange={(e) => setFacilityFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                            >
                                <option value="">All Facilities</option>
                                {facilitiesData?.data?.map(facility => (
                                    <option key={facility.id} value={facility.id}>{facility.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Branch Filter */}
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                        >
                            <option value="">All Branches</option>
                            {branchesData?.data?.map(branch => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Active Filter */}
                    <div className="relative">
                        <select
                            value={activeFilter}
                            onChange={(e) => setActiveFilter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent appearance-none bg-white"
                        >
                            <option value="all">All Users</option>
                            <option value="active">Active Only</option>
                            <option value="inactive">Inactive Only</option>
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading users...</p>
                </div>
            ) : (
                <>
                    {showActiveSection && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Active Users</h3>
                                <span className="text-sm text-gray-500">{activeUsers.length} total</span>
                            </div>
                            {activeUsers.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                                    {activeUsers.map(renderUserCard)}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <EmptyState
                                        icon={Users}
                                        title="No active users found"
                                        description="Try adjusting your filters or invite a new user."
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {showInactiveSection && (
                        <div className={showActiveSection ? 'mt-10' : ''}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Deactivated Users</h3>
                                <span className="text-sm text-gray-500">{inactiveUsers.length} total</span>
                            </div>
                            {inactiveUsers.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                                    {inactiveUsers.map(renderUserCard)}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm p-6">
                                    <EmptyState
                                        icon={AlertCircle}
                                        title="No deactivated users found"
                                        description="Deactivated user accounts will appear here."
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Pagination */}
            {data && data.last_page > 1 && (
                <div className="mt-6 flex justify-center space-x-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-gray-700">
                        Page {currentPage} of {data.last_page}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(data.last_page, p + 1))}
                        disabled={currentPage === data.last_page}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>

            <Modal
                isOpen={showForm}
                onClose={handleCloseUserForm}
                title={editing ? 'Edit User' : 'Add User'}
                size="xl"
            >
                <UserForm
                    key={editing?.id ?? 'new'}
                    inModal
                    prefillFacilityId={searchParams.get('facility_id') || undefined}
                    record={editing}
                    branches={branchesData?.data || []}
                    roles={rolesData?.data || []}
                    facilities={facilitiesData?.data || []}
                    isSuperAdmin={isSuperAdmin}
                    onClose={handleCloseUserForm}
                    onSuccess={() => {
                        handleCloseUserForm();
                        queryClient.invalidateQueries({ queryKey: ['users'] });
                    }}
                />
            </Modal>
        </>
    );
}

// User Form Component
function UserForm({ record, branches, roles, facilities, isSuperAdmin, onClose, onSuccess, inModal = false, prefillFacilityId }) {
    const queryClient = useQueryClient();

    // Format date helper function
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        if (dateString instanceof Date) {
            return dateString.toISOString().split('T')[0];
        }
        if (typeof dateString !== 'string') return '';
        // If it's already in YYYY-MM-DD format, return it
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
        // Otherwise parse and format it
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    // Determine role value from record
    const getRoleValue = (rec) => {
        if (!rec) return '';
        return rec.role || (rec.roles && rec.roles.length > 0 ? rec.roles[0].name : '') || '';
    };

    const [formData, setFormData] = useState({
        first_name: record?.first_name || '',
        middle_names: record?.middle_names || '',
        last_name: record?.last_name || '',
        email: record?.email || '',
        password: '',
        phone_number: record?.phone_number ? formatPhoneNumber(record.phone_number) : '',
        date_of_birth: formatDateForInput(record?.date_of_birth),
        marital_status: record?.marital_status || '',
        sex: record?.sex || '',
        credentials: record?.credentials || '',
        credential_details: record?.credential_details || '',
        date_employed: formatDateForInput(record?.date_employed),
        supervisor_name: record?.supervisor_name || '',
        role: getRoleValue(record),
        facility_id: record?.facility_id || '',
        assigned_branch_id: record?.assigned_branch_id || '',
        is_active: record?.is_active ?? true,
        notes: record?.notes || '',
    });

    const [profileImage, setProfileImage] = useState(null);
    const [profileImagePreview, setProfileImagePreview] = useState(null);
    const [imageRemoved, setImageRemoved] = useState(false);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        if (!record && prefillFacilityId && isSuperAdmin) {
            setFormData((prev) => ({ ...prev, facility_id: String(prefillFacilityId) }));
        }
    }, [record, prefillFacilityId, isSuperAdmin]);

    // Update form when record changes (for editing)
    React.useEffect(() => {
        if (record) {
            const roleValue = getRoleValue(record);

            // Use functional update to ensure state is set correctly
            setFormData(prevFormData => {
                const newFormData = {
                    ...prevFormData,
                    first_name: record.first_name || '',
                    middle_names: record.middle_names || '',
                    last_name: record.last_name || '',
                    email: record.email || '',
                    password: '',
                    phone_number: record.phone_number ? formatPhoneNumber(record.phone_number) : '',
                    date_of_birth: formatDateForInput(record.date_of_birth),
                    marital_status: record.marital_status || '',
                    sex: record.sex || '',
                    credentials: record.credentials || '',
                    credential_details: record.credential_details || '',
                    date_employed: formatDateForInput(record.date_employed),
                    supervisor_name: record.supervisor_name || '',
                    provider_name: record.provider_name || '',
                    role: roleValue,
                    facility_id: record.facility_id || '',
                    assigned_branch_id: record.assigned_branch_id || '',
                    is_active: record.is_active ?? true,
                    notes: record.notes || '',
                };
                return newFormData;
            });
        } else {
            // Reset form when no record (creating new user)
            setFormData({
                first_name: '',
                middle_names: '',
                last_name: '',
                email: '',
                password: '',
                phone_number: '',
                date_of_birth: '',
                marital_status: '',
                sex: '',
                credentials: '',
                credential_details: '',
                date_employed: '',
                supervisor_name: '',
                provider_name: '',
                role: '',
                facility_id: '',
                assigned_branch_id: '',
                is_active: true,
                notes: '',
            });
        }
    }, [record]);

    // Set profile image preview when editing
    React.useEffect(() => {
        if (record) {
            if (record.profile_image_url) {
                // Use the profile_image_url from the API response
                setProfileImagePreview(record.profile_image_url);
            } else if (record.profile_image) {
                // Fallback: If profile_image_url is not available, construct the URL
                const imageUrl = record.profile_image.startsWith('http')
                    ? record.profile_image
                    : `/storage/${record.profile_image}`;
                setProfileImagePreview(imageUrl);
            } else {
                setProfileImagePreview(null);
            }
            // Reset profile image file when record changes
            setProfileImage(null);
            // Reset image removed flag when record changes
            setImageRemoved(false);
        } else {
            // Reset when no record (creating new user)
            setProfileImagePreview(null);
            setProfileImage(null);
            setImageRemoved(false);
        }
    }, [record]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            // Validate file type
            if (!file.type.startsWith('image/')) {
                setErrors({ profile_image: ['Please select an image file'] });
                return;
            }

            // Validate file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                setErrors({ profile_image: ['Image size must be less than 5MB'] });
                return;
            }

            setProfileImage(file);
            // Clear the removed flag since user selected a new image
            setImageRemoved(false);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImagePreview(reader.result);
            };
            reader.readAsDataURL(file);

            // Clear any previous errors
            if (errors.profile_image) {
                setErrors({ ...errors, profile_image: null });
            }
        } else {
            // No file selected
            setProfileImage(null);
        }
    };

    const handleRemoveImage = () => {
        setProfileImage(null);
        setProfileImagePreview(null);
        // Mark image as explicitly removed
        setImageRemoved(true);
        // Reset file input
        const fileInput = document.getElementById('profile_image');
        if (fileInput) {
            fileInput.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setErrors({});
        setIsSubmitting(true);

        try {
            // Auto-generate name from first, middle, last name
            const nameParts = [
                formData.first_name,
                formData.middle_names,
                formData.last_name
            ].filter(Boolean);
            const name = nameParts.join(' ') || formData.email;

            let response;

            // Use FormData if there's an image or image removal, otherwise use JSON (like residents)
            if (profileImage || (imageRemoved && record)) {
                const formDataToSend = new FormData();

                // Add all form fields
                formDataToSend.append('name', name);
                formDataToSend.append('first_name', formData.first_name);
                formDataToSend.append('middle_names', formData.middle_names || '');
                formDataToSend.append('last_name', formData.last_name);
                formDataToSend.append('email', formData.email);
                formDataToSend.append('phone_number', formData.phone_number || '');
                formDataToSend.append('date_of_birth', formData.date_of_birth || '');
                formDataToSend.append('marital_status', formData.marital_status || '');
                formDataToSend.append('sex', formData.sex || '');
                formDataToSend.append('credentials', formData.credentials || '');
                formDataToSend.append('credential_details', formData.credential_details || '');
                formDataToSend.append('date_employed', formData.date_employed || '');
                formDataToSend.append('supervisor_name', formData.supervisor_name || '');
                formDataToSend.append('role', formData.role || '');
                if (formData.assigned_branch_id) {
                    formDataToSend.append('assigned_branch_id', formData.assigned_branch_id);
                }
                if (formData.facility_id) {
                    formDataToSend.append('facility_id', formData.facility_id);
                }
                formDataToSend.append('is_active', formData.is_active ? '1' : '0');
                formDataToSend.append('notes', formData.notes || '');

                // Add password if provided
                if (formData.password) {
                    formDataToSend.append('password', formData.password);
                }

                // Handle profile image
                if (profileImage) {
                    formDataToSend.append('profile_image', profileImage);
                } else if (imageRemoved && record) {
                    formDataToSend.append('remove_profile_image', '1');
                }

                // Don't set Content-Type - let browser set it automatically for FormData
                const config = {};

                if (record) {
                    // For file uploads with PUT, use POST with _method override (like residents)
                    formDataToSend.append('_method', 'PUT');
                    response = await api.post(`/users/${record.id}`, formDataToSend, config);
                } else {
                    if (!formData.password) {
                        setErrors({ password: ['Password is required for new users'] });
                        setIsSubmitting(false);
                        return;
                    }
                    response = await api.post('/users', formDataToSend, config);
                }
            } else {
                // No image, use JSON payload (like residents do)
                const payload = {
                    name: name,
                    first_name: formData.first_name,
                    middle_names: formData.middle_names || null,
                    last_name: formData.last_name,
                    email: formData.email,
                    phone_number: formData.phone_number || null,
                    date_of_birth: formData.date_of_birth || null,
                    marital_status: formData.marital_status || null,
                    sex: formData.sex,
                    credentials: formData.credentials || null,
                    credential_details: formData.credential_details || null,
                    date_employed: formData.date_employed || null,
                    supervisor_name: formData.supervisor_name || null,
                    role: formData.role,
                    facility_id: formData.facility_id || null,
                    assigned_branch_id: formData.assigned_branch_id || null,
                    is_active: formData.is_active,
                    notes: formData.notes || null,
                };

                // Add password if provided
                if (formData.password) {
                    payload.password = formData.password;
                }

                if (record) {
                    response = await api.put(`/users/${record.id}`, payload);
                } else {
                    if (!formData.password) {
                        setErrors({ password: ['Password is required for new users'] });
                        setIsSubmitting(false);
                        return;
                    }
                    response = await api.post('/users', payload);
                }
            }

            // Invalidate queries to refresh the user list BEFORE showing alert
            await queryClient.invalidateQueries({ queryKey: ['users'] });

            // If user was created/updated with a facility_id, invalidate the facility-users query for that facility
            const userFacilityId = response.data?.facility_id || record?.facility_id || formData?.facility_id;
            if (userFacilityId) {
                await queryClient.invalidateQueries({ queryKey: ['facility-users', userFacilityId] });
            }

            // Wait a bit for the invalidation to trigger refetch
            await new Promise(resolve => setTimeout(resolve, 200));

            // Show success message
            alert(record ? 'User updated successfully!' : 'User created successfully!');

            // Close form and refresh
            onSuccess();
        } catch (error) {
            logger.error('User creation/update error:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                // Scroll to top to show errors
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                const errorMessage = error.response?.data?.message || error.message || 'Failed to save user. Please check all required fields.';
                setErrors({ general: errorMessage });
                // Scroll to top to show error
                window.scrollTo({ top: 0, behavior: 'smooth' });
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
                    {record ? 'Edit User' : 'Add User'}
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
                <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                    <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-red-800">Error</p>
                            <p className="text-sm text-red-700 mt-1">{errors.general}</p>
                        </div>
                    </div>
                </div>
            )}

            {Object.keys(errors).filter(key => key !== 'general').length > 0 && (
                <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-yellow-800">Please fix the following errors:</p>
                            <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                                {Object.entries(errors).filter(([key]) => key !== 'general').map(([key, messages]) => (
                                    <li key={key}>{key}: {Array.isArray(messages) ? messages.join(', ') : messages}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information Section */}
                <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Email *
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                placeholder="staff@serenityafh.com"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">This will be used for login</p>
                            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email[0]}</p>}
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Profile Picture
                            </label>
                            <div className="space-y-3">
                                {profileImagePreview && (
                                    <div className="relative inline-block">
                                        <img
                                            src={profileImagePreview}
                                            alt="Profile preview"
                                            className="h-32 w-32 rounded-full object-cover border-4 border-gray-200"
                                        />
                                        <Tooltip content="Remove image" position="top">
                                            <button
                                                type="button"
                                                onClick={handleRemoveImage}
                                                className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                                                aria-label="Remove image"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </Tooltip>
                                    </div>
                                )}
                                <div className="flex items-center space-x-3">
                                    <label
                                        htmlFor="profile_image"
                                        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                    >
                                        <Upload className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm text-gray-700">
                                            {profileImagePreview ? 'Change Picture' : 'Upload Picture'}
                                        </span>
                                    </label>
                                    <input
                                        id="profile_image"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </div>
                                <p className="text-xs text-gray-500">
                                    Upload a profile picture (max 5MB). Supported formats: JPG, PNG, GIF
                                </p>
                                {errors.profile_image && <p className="text-xs text-red-600 mt-1">{errors.profile_image[0]}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                First Name *
                            </label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                required
                                placeholder="Enter first name"
                                maxLength={255}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                            {errors.first_name && <p className="text-xs text-red-600 mt-1">{errors.first_name[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Middle Names
                            </label>
                            <input
                                type="text"
                                value={formData.middle_names}
                                onChange={(e) => setFormData({ ...formData, middle_names: e.target.value })}
                                placeholder="Enter middle names (optional)"
                                maxLength={255}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Last Name *
                            </label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                required
                                placeholder="Enter last name"
                                maxLength={255}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                            {errors.last_name && <p className="text-xs text-red-600 mt-1">{errors.last_name[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                value={formData.phone_number || ''}
                                onChange={(e) => {
                                    const formatted = formatPhoneNumber(e.target.value);
                                    setFormData({ ...formData, phone_number: formatted });
                                }}
                                required
                                placeholder="(425) 555-0123"
                                maxLength={14}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                            {errors.phone_number && <p className="text-xs text-red-600 mt-1">{errors.phone_number[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Date of Birth *
                            </label>
                            <input
                                type="date"
                                value={formData.date_of_birth}
                                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                                required
                                max={new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: MM/DD/YYYY - Must be 18+ years old</p>
                            {errors.date_of_birth && <p className="text-xs text-red-600 mt-1">{errors.date_of_birth[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Marital Status
                            </label>
                            <select
                                value={formData.marital_status}
                                onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            >
                                <option value="">Choose marital status</option>
                                <option value="single">Single</option>
                                <option value="married">Married</option>
                                <option value="divorced">Divorced</option>
                                <option value="widowed">Widowed</option>
                                <option value="separated">Separated</option>
                                <option value="n/a">N/A</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Sex *
                            </label>
                            <div className="flex space-x-6">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="sex"
                                        value="male"
                                        checked={formData.sex === 'male'}
                                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                                        required
                                        className="w-4 h-4 text-[var(--theme-primary)] border-gray-300 focus:ring-[var(--theme-primary)]"
                                    />
                                    <span className="text-sm text-gray-700">Male</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="sex"
                                        value="female"
                                        checked={formData.sex === 'female'}
                                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                                        required
                                        className="w-4 h-4 text-[var(--theme-primary)] border-gray-300 focus:ring-[var(--theme-primary)]"
                                    />
                                    <span className="text-sm text-gray-700">Female</span>
                                </label>
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="sex"
                                        value="other"
                                        checked={formData.sex === 'other'}
                                        onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                                        required
                                        className="w-4 h-4 text-[var(--theme-primary)] border-gray-300 focus:ring-[var(--theme-primary)]"
                                    />
                                    <span className="text-sm text-gray-700">Other</span>
                                </label>
                            </div>
                            {errors.sex && <p className="text-xs text-red-600 mt-1">{errors.sex[0]}</p>}
                        </div>
                    </div>
                </div>

                {/* Employment Details Section */}
                <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Credentials
                            </label>
                            <input
                                type="text"
                                value={formData.credentials}
                                onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
                                placeholder="e.g., RN, LPN, CNA, etc."
                                maxLength={255}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Credential Details
                            </label>
                            <input
                                type="text"
                                value={formData.credential_details}
                                onChange={(e) => setFormData({ ...formData, credential_details: e.target.value })}
                                placeholder="Additional credential information (optional)"
                                maxLength={255}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Date Employed *
                            </label>
                            <input
                                type="date"
                                value={formData.date_employed}
                                onChange={(e) => setFormData({ ...formData, date_employed: e.target.value })}
                                required
                                max={new Date().toISOString().split('T')[0]}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">Format: MM/DD/YYYY - Cannot be in the future</p>
                            {errors.date_employed && <p className="text-xs text-red-600 mt-1">{errors.date_employed[0]}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Supervisor Name
                            </label>
                            <input
                                type="text"
                                value={formData.supervisor_name}
                                onChange={(e) => setFormData({ ...formData, supervisor_name: e.target.value })}
                                placeholder="Enter supervisor name"
                                maxLength={255}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Role *
                            </label>
                            <select
                                key={`role-select-${record?.id || 'new'}-${formData.role}`}
                                value={formData.role || ''}
                                onChange={(e) => {
                                    setFormData({ ...formData, role: e.target.value });
                                }}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            >
                                <option value="">Choose role</option>
                                <option value="administrator">Administrator (Facility-wide)</option>
                                <option value="admin">Admin (Branch-level)</option>
                                <option value="caregiver">Caregiver</option>
                                <option value="care_giver">Care Giver</option>
                                <option value="nurse">Nurse</option>
                                <option value="registered_nurse">Registered Nurse</option>
                                <option value="licensed_nurse">Licensed Nurse</option>
                            </select>
                            {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role[0]}</p>}
                            <p className="text-xs text-gray-500 mt-1">
                                {formData.role ? `Current role: ${formData.role}` : 'No role selected'}
                            </p>
                        </div>

                        {isSuperAdmin && (
                            <div>
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                    Facility *
                                </label>
                                <select
                                    value={formData.facility_id}
                                    onChange={(e) => {
                                        setFormData({
                                            ...formData,
                                            facility_id: e.target.value,
                                            assigned_branch_id: '' // Reset branch when facility changes
                                        });
                                    }}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                                >
                                    <option value="">Select facility</option>
                                    {facilities.map(facility => (
                                        <option key={facility.id} value={facility.id}>{facility.name}</option>
                                    ))}
                                </select>
                                {errors.facility_id && <p className="text-xs text-red-600 mt-1">{errors.facility_id[0]}</p>}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-900 mb-2">
                                Assigned Branch
                            </label>
                            <select
                                value={formData.assigned_branch_id}
                                onChange={(e) => setFormData({ ...formData, assigned_branch_id: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                            >
                                <option value="">Select branch assignment</option>
                                {branches
                                    .filter(branch => !isSuperAdmin || !formData.facility_id || branch.facility_id == formData.facility_id)
                                    .map(branch => (
                                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                                    ))
                                }
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-[var(--theme-primary)] border-gray-300 rounded focus:ring-[var(--theme-primary)]"
                                />
                                <span className="text-sm font-medium text-gray-700">Active Employee</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-1">Enable this staff member for work assignments</p>
                        </div>
                    </div>
                </div>

                {/* Account Security Section */}
                <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Security</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password {record ? '(leave blank to keep current)' : '*'}
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required={!record}
                            placeholder="Enter secure password"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">Minimum 8 characters, include numbers and special characters</p>
                        {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password[0]}</p>}
                    </div>
                </div>

                {/* Additional Information Section */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            placeholder="Any additional notes about this staff member..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
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

// User Profile Viewer Component
function UserProfileViewer({ user, onClose, onEdit, onToggleActive }) {
    const [toggleConfirm, setToggleConfirm] = React.useState(null);

    return (
        <>
            <ConfirmDialog
                isOpen={toggleConfirm != null}
                onClose={() => setToggleConfirm(null)}
                onConfirm={() => {
                    if (toggleConfirm == null) return;
                    onToggleActive(user, toggleConfirm.nextActive);
                    setToggleConfirm(null);
                }}
                title={toggleConfirm?.nextActive ? 'Activate this user?' : 'Deactivate this user?'}
                description={
                    toggleConfirm?.nextActive
                        ? 'This user will be able to sign in again.'
                        : 'This user will not be able to sign in until reactivated.'
                }
                confirmLabel={toggleConfirm?.nextActive ? 'Activate' : 'Deactivate'}
                cancelLabel="Cancel"
                variant={toggleConfirm?.nextActive ? 'primary' : 'danger'}
            />
        <div className="bg-white rounded-lg shadow p-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-[var(--theme-primary)] to-[#4a7a2a] p-4 md:p-8 text-white rounded-t-xl mb-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-4 md:space-y-0">
                    <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-4 md:space-y-0">
                        {/* Profile Picture */}
                        {user.profile_image_url ? (
                            <img
                                src={user.profile_image_url}
                                alt={user.name}
                                className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover border-4 border-white shadow-lg mx-auto md:mx-0"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextElementSibling.style.display = 'flex';
                                }}
                            />
                        ) : null}
                        <div className={`w-24 h-24 md:w-32 md:h-32 rounded-full bg-white flex items-center justify-center border-4 border-white shadow-lg ${user.profile_image_url ? 'hidden' : ''} mx-auto md:mx-0`}>
                            <span className="text-[var(--theme-primary)] font-bold text-4xl md:text-5xl">
                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        <div className="text-center md:text-left">
                            <h2 className="text-2xl md:text-3xl font-bold mb-2">{user.name || user.email}</h2>
                            {user.email && (
                                <div className="flex items-center justify-center md:justify-start space-x-2 mt-2 text-sm md:text-base text-green-50">
                                    <Mail className="w-4 h-4" />
                                    <span className="break-all">{user.email}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-green-200 transition-colors absolute top-4 right-4 md:relative md:top-0 md:right-0"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 md:p-8 overflow-y-auto flex-1">
                {/* Personal Information */}
                <div className="mb-6 md:mb-8">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <UserIcon className="w-5 h-5 mr-2 text-[var(--theme-primary)]" />
                        Personal Information
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {user.first_name && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">First Name</p>
                                    <p className="font-semibold text-gray-900">{user.first_name}</p>
                                </div>
                            )}
                            {user.middle_names && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Middle Names</p>
                                    <p className="font-semibold text-gray-900">{user.middle_names}</p>
                                </div>
                            )}
                            {user.last_name && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Last Name</p>
                                    <p className="font-semibold text-gray-900">{user.last_name}</p>
                                </div>
                            )}
                            {user.date_of_birth && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                                        <Calendar className="w-4 h-4 mr-1" />
                                        Date of Birth
                                    </p>
                                    <p className="font-semibold text-gray-900">
                                        {new Date(user.date_of_birth).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            )}
                            {user.marital_status && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Marital Status</p>
                                    <p className="font-semibold text-gray-900 capitalize">{user.marital_status}</p>
                                </div>
                            )}
                            {user.sex && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Sex</p>
                                    <p className="font-semibold text-gray-900 capitalize">{user.sex}</p>
                                </div>
                            )}
                            {user.phone_number && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                                        <Phone className="w-4 h-4 mr-1" />
                                        Phone Number
                                    </p>
                                    <p className="font-semibold text-gray-900">{user.phone_number}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Employment Details */}
                <div className="mb-6 md:mb-8">
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center">
                        <Briefcase className="w-5 h-5 mr-2 text-[var(--theme-primary)]" />
                        Employment Details
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {user.role && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                                        <Shield className="w-4 h-4 mr-1" />
                                        Role
                                    </p>
                                    <p className="font-semibold text-gray-900 capitalize">{user.role.replace('_', ' ')}</p>
                                </div>
                            )}
                            {user.facility && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                                        <Building2 className="w-4 h-4 mr-1" />
                                        Facility
                                    </p>
                                    <p className="font-semibold text-gray-900">{user.facility.name}</p>
                                </div>
                            )}
                            {user.assigned_branch && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                                        <MapPin className="w-4 h-4 mr-1" />
                                        Assigned Branch
                                    </p>
                                    <p className="font-semibold text-gray-900">{user.assigned_branch.name}</p>
                                </div>
                            )}
                            {user.credentials && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                                        <Award className="w-4 h-4 mr-1" />
                                        Credentials
                                    </p>
                                    <p className="font-semibold text-gray-900">{user.credentials}</p>
                                </div>
                            )}
                            {user.credential_details && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Credential Details</p>
                                    <p className="font-semibold text-gray-900">{user.credential_details}</p>
                                </div>
                            )}
                            {user.date_employed && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1 flex items-center">
                                        <Clock className="w-4 h-4 mr-1" />
                                        Date Employed
                                    </p>
                                    <p className="font-semibold text-gray-900">
                                        {new Date(user.date_employed).toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            )}
                            {user.supervisor_name && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Supervisor</p>
                                    <p className="font-semibold text-gray-900">{user.supervisor_name}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Status</p>
                                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${user.is_active
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {user.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Information */}
                {user.notes && (
                    <div>
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-4">Additional Notes</h3>
                        <div className="bg-gray-50 rounded-lg p-4 md:p-6">
                            <p className="text-gray-700 whitespace-pre-wrap">{user.notes}</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 md:mt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-0">
                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">Account Status:</span>
                        <label className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={user.is_active}
                                    readOnly
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setToggleConfirm({ nextActive: !user.is_active });
                                    }}
                                    className="sr-only peer"
                                />
                                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--theme-primary)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-700">
                                {user.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </label>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
                        <button
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                                if (onEdit) onEdit(user);
                            }}
                            className="px-6 py-2 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] rounded-lg hover:bg-[var(--theme-primary-hover)] transition-colors flex items-center justify-center space-x-2 w-full sm:w-auto"
                        >
                            <Edit className="w-4 h-4" />
                            <span>Edit User</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}

