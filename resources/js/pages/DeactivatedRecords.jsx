import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserX, RefreshCcw, Home, Building, Mail, Phone, Calendar, Repeat2 } from 'lucide-react';
import api from '../services/api';
import ConfirmDialog from '../components/ui/ConfirmDialog';

function EmptyState({ title, description }) {
    return (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
            <UserX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">{description}</p>
        </div>
    );
}

export default function DeactivatedRecords() {
    const [activeTab, setActiveTab] = useState('residents');
    const queryClient = useQueryClient();

    const {
        data: residentsData,
        isLoading: isLoadingResidents,
        isError: residentsError,
        error: residentsErrorContent,
        isFetching: isFetchingResidents,
    } = useQuery({
        queryKey: ['deactivated-residents'],
        queryFn: async () => (await api.get('/residents', { params: { status: 'inactive', per_page: 100 } })).data,
        staleTime: 60 * 1000,
    });

    const {
        data: usersData,
        isLoading: isLoadingUsers,
        isError: usersError,
        error: usersErrorContent,
        isFetching: isFetchingUsers,
    } = useQuery({
        queryKey: ['deactivated-users'],
        queryFn: async () => (await api.get('/users', { params: { status: 'inactive', per_page: 100 } })).data,
        staleTime: 60 * 1000,
    });

    const reactivateResidentMutation = useMutation({
        mutationFn: async (residentId) => api.put(`/residents/${residentId}`, { is_active: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deactivated-residents'] });
            queryClient.invalidateQueries({ queryKey: ['residents'] });
        },
    });

    const reactivateUserMutation = useMutation({
        mutationFn: async (userId) => api.put(`/users/${userId}`, { is_active: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['deactivated-users'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });

    const isResidentsTab = activeTab === 'residents';

    const handleReactivateResident = (resident) => {
        if (!resident?.id) return;
        const label =
            `${resident.first_name || ''} ${resident.last_name || ''}`.trim() ||
            resident.name ||
            'this resident';
        setReactivateConfirm({ type: 'resident', id: resident.id, label });
    };

    const handleReactivateUser = (user) => {
        if (!user?.id) return;
        setReactivateConfirm({ type: 'user', id: user.id, label: user.name || user.email || 'this user' });
    };

    const handleConfirmReactivate = () => {
        if (!reactivateConfirm) return;
        const done = () => setReactivateConfirm(null);
        if (reactivateConfirm.type === 'resident') {
            reactivateResidentMutation.mutate(reactivateConfirm.id, { onSuccess: done });
        } else {
            reactivateUserMutation.mutate(reactivateConfirm.id, { onSuccess: done });
        }
    };

    const renderResidents = () => {
        if (isLoadingResidents) {
            return (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading deactivated residents...</p>
                </div>
            );
        }

        if (residentsError) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                    Failed to load residents: {residentsErrorContent?.response?.data?.message || residentsErrorContent?.message || 'Unknown error'}
                </div>
            );
        }

        const residents = residentsData?.data || [];

        if (!residents.length) {
            return (
                <EmptyState
                    title="No deactivated residents"
                    description="All residents are currently active. When a resident is deactivated, they will appear here for quick review and reactivation."
                />
            );
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {residents.map((resident) => (
                    <div key={resident.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {resident.first_name || resident.last_name
                                        ? `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
                                        : resident.name || 'Resident'}
                                </h3>
                                {resident.status && (
                                    <p className="text-xs uppercase tracking-wide text-gray-500 mt-1">Status: {resident.status}</p>
                                )}
                            </div>
                            <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                Inactive
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                            {resident.branch && (
                                <div className="flex items-center text-gray-600">
                                    <Building className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>{resident.branch.name}</span>
                                </div>
                            )}
                            {resident.room_number && (
                                <div className="flex items-center text-gray-600">
                                    <Home className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>Room {resident.room_number}</span>
                                </div>
                            )}
                            {resident.admission_date && (
                                <div className="flex items-center text-gray-600">
                                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>Admitted {new Date(resident.admission_date).toLocaleDateString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <div className="text-xs text-gray-500">
                                Last updated {resident.updated_at ? new Date(resident.updated_at).toLocaleDateString() : 'N/A'}
                            </div>
                            <button
                                onClick={() => handleReactivateResident(resident)}
                                disabled={reactivateResidentMutation.isPending && reactivateResidentMutation.variables === resident.id}
                                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] transition"
                            >
                                <Repeat2 className="w-4 h-4 mr-2" />
                                Reactivate
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderUsers = () => {
        if (isLoadingUsers) {
            return (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
                    <p className="mt-4 text-gray-600">Loading deactivated users...</p>
                </div>
            );
        }

        if (usersError) {
            return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                    Failed to load users: {usersErrorContent?.response?.data?.message || usersErrorContent?.message || 'Unknown error'}
                </div>
            );
        }

        const users = usersData?.data || [];

        if (!users.length) {
            return (
                <EmptyState
                    title="No deactivated users"
                    description="All staff accounts are currently active. When a user is deactivated, they will appear here for review and reactivation."
                />
            );
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {users.map((user) => (
                    <div key={user.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{user.name || 'User'}</h3>
                                <p className="text-sm text-gray-500 capitalize">{user.role?.replace(/_/g, ' ') || 'Role not set'}</p>
                            </div>
                            <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                Inactive
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                            {user.email && (
                                <div className="flex items-center text-gray-600">
                                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                                    <span className="truncate">{user.email}</span>
                                </div>
                            )}
                            {user.phone_number && (
                                <div className="flex items-center text-gray-600">
                                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>{user.phone_number}</span>
                                </div>
                            )}
                            {user.assigned_branch && (
                                <div className="flex items-center text-gray-600">
                                    <Building className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>{user.assigned_branch.name}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <div className="text-xs text-gray-500">
                                Last updated {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                            </div>
                            <button
                                onClick={() => handleReactivateUser(user)}
                                disabled={reactivateUserMutation.isPending && reactivateUserMutation.variables === user.id}
                                className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] transition"
                            >
                                <Repeat2 className="w-4 h-4 mr-2" />
                                Reactivate
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <ConfirmDialog
                isOpen={reactivateConfirm != null}
                onClose={() =>
                    !reactivateResidentMutation.isPending &&
                    !reactivateUserMutation.isPending &&
                    setReactivateConfirm(null)
                }
                onConfirm={handleConfirmReactivate}
                title="Reactivate this record?"
                description={reactivateConfirm ? `Reactivate ${reactivateConfirm.label}?` : ''}
                confirmLabel="Reactivate"
                cancelLabel="Cancel"
                variant="primary"
                isPending={reactivateResidentMutation.isPending || reactivateUserMutation.isPending}
            />
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Inactive Records</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Review all deactivated residents and staff members in one place and quickly reactivate them when needed.
                        </p>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                        {(isFetchingResidents || isFetchingUsers) && (
                            <>
                                <RefreshCcw className="w-4 h-4 animate-spin" />
                                <span>Refreshing...</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-6 inline-flex rounded-lg border border-gray-200 bg-gray-100 p-1">
                    <button
                        onClick={() => setActiveTab('residents')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                            isResidentsTab
                                ? 'bg-white shadow-sm text-[var(--theme-primary)]'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Residents
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                            !isResidentsTab
                                ? 'bg-white shadow-sm text-[var(--theme-primary)]'
                                : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Users
                    </button>
                </div>
            </div>

            {isResidentsTab ? renderResidents() : renderUsers()}
        </div>
    );
}
