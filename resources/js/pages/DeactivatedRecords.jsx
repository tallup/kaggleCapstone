import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserX, RefreshCcw, Home, Building, Mail, Phone, Calendar, Repeat2 } from 'lucide-react';
import api from '../services/api';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Tooltip from '../components/ui/Tooltip';
import EntityCardShell, { EntityCardHeader } from '../components/ui/EntityCardShell';
import CardIconButton from '../components/ui/CardIconButton';
import DataPill from '../components/ui/DataPill';
import ResidentAvatarInline from '../components/ui/ResidentAvatarInline';
import ResidentStatusBadges from '../components/residents/ResidentStatusBadges';

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
    const [reactivateConfirm, setReactivateConfirm] = useState(null);
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
        mutationFn: async (residentId) => api.post(`/residents/${residentId}/status`, { lifecycle_status: 'active' }),
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
                    title="No non-active residents"
                    description="All residents are currently active. Discharged, transferred, deceased, or inactive residents will appear here for review."
                />
            );
        }

        return (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {residents.map((resident) => {
                    const displayName =
                        resident.first_name || resident.last_name
                            ? `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
                            : resident.name || 'Resident';
                    return (
                        <EntityCardShell
                            key={resident.id}
                            className="border-red-200/90 bg-red-50/60 hover:border-red-300/90"
                        >
                            <EntityCardHeader
                                left={
                                    <div className="flex flex-wrap items-start gap-3">
                                        <ResidentAvatarInline resident={resident} className="h-10 w-10 text-xs" />
                                        <div className="space-y-2">
                                            <ResidentStatusBadges resident={resident} showCensus />
                                        </div>
                                    </div>
                                }
                                right={
                                    <Tooltip content="Reactivate resident" position="top">
                                        <CardIconButton
                                            variant="primary"
                                            icon={Repeat2}
                                            aria-label="Reactivate resident"
                                            disabled={
                                                reactivateResidentMutation.isPending &&
                                                reactivateResidentMutation.variables === resident.id
                                            }
                                            onClick={() => handleReactivateResident(resident)}
                                        />
                                    </Tooltip>
                                }
                            />
                            <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">{displayName}</h3>
                            <div className="mt-4 grid grid-cols-1 gap-2.5">
                                {resident.branch && (
                                    <DataPill icon={Building}>
                                        <span className="font-normal text-slate-600">{resident.branch.name}</span>
                                    </DataPill>
                                )}
                                {resident.room_number && (
                                    <DataPill icon={Home}>
                                        <span className="font-normal text-slate-600">Room {resident.room_number}</span>
                                    </DataPill>
                                )}
                                {resident.admission_date && (
                                    <DataPill icon={Calendar}>
                                        <span className="font-normal text-slate-600">
                                            Admitted {new Date(resident.admission_date).toLocaleDateString()}
                                        </span>
                                    </DataPill>
                                )}
                            </div>
                            <p className="mt-4 text-xs text-slate-400">
                                Last updated{' '}
                                {resident.updated_at ? new Date(resident.updated_at).toLocaleDateString() : 'N/A'}
                            </p>
                        </EntityCardShell>
                    );
                })}
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {users.map((user) => (
                    <EntityCardShell
                        key={user.id}
                        className="border-red-200/90 bg-red-50/60 hover:border-red-300/90"
                    >
                        <EntityCardHeader
                            left={
                                <div className="flex flex-wrap items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-bold uppercase text-slate-700">
                                        {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div className="space-y-2">
                                        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-800">
                                            Inactive
                                        </span>
                                    </div>
                                </div>
                            }
                            right={
                                <Tooltip content="Reactivate user" position="top">
                                    <CardIconButton
                                        variant="primary"
                                        icon={Repeat2}
                                        aria-label="Reactivate user"
                                        disabled={
                                            reactivateUserMutation.isPending &&
                                            reactivateUserMutation.variables === user.id
                                        }
                                        onClick={() => handleReactivateUser(user)}
                                    />
                                </Tooltip>
                            }
                        />
                        <h3 className="text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                            {user.name || 'User'}
                        </h3>
                        <p className="mt-1 text-sm capitalize text-slate-500">
                            {user.role?.replace(/_/g, ' ') || 'Role not set'}
                        </p>
                        <div className="mt-4 grid grid-cols-1 gap-2.5">
                            {user.email && (
                                <DataPill icon={Mail}>
                                    <span className="truncate font-normal text-slate-600">{user.email}</span>
                                </DataPill>
                            )}
                            {user.phone_number && (
                                <DataPill icon={Phone}>
                                    <span className="font-normal text-slate-600">{user.phone_number}</span>
                                </DataPill>
                            )}
                            {user.assigned_branch && (
                                <DataPill icon={Building}>
                                    <span className="font-normal text-slate-600">{user.assigned_branch.name}</span>
                                </DataPill>
                            )}
                        </div>
                        <p className="mt-4 text-xs text-slate-400">
                            Last updated{' '}
                            {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'}
                        </p>
                    </EntityCardShell>
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
                        <h1 className="text-2xl font-semibold text-gray-900">Non-active Records</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Review non-active residents and deactivated staff members in one place and reactivate them when needed.
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
